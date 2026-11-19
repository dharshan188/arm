"""Detect -> padded square crops -> SortiVision -> IoU tracks and consecutive agreement."""
from pathlib import Path
import sys

import cv2
import numpy as np

try:
    from .detector import Detector, DEFAULT_PTE, iou
    from .sorti_model import SortiVision
except ImportError:
    from detector import Detector, DEFAULT_PTE, iou
    from sorti_model import SortiVision

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'lap'))
import content as C


def square_crop(rgb, box, pad=.10):
    """Preserve the full object, including at image boundaries, using replicated edges."""
    x0, y0, x1, y1 = box[:4]
    side = max(1, int(np.ceil(max(x1 - x0, y1 - y0) * (1 + 2 * pad))))
    left = int(round((x0 + x1 - side) / 2)); top = int(round((y0 + y1 - side) / 2))
    h, w = rgb.shape[:2]
    crop = rgb[max(0, top):min(h, top + side), max(0, left):min(w, left + side)]
    return cv2.copyMakeBorder(crop, max(0, -top), max(0, top + side - h),
                             max(0, -left), max(0, left + side - w), cv2.BORDER_REPLICATE)


class MultiVision:
    def __init__(self, detector_pte=DEFAULT_PTE, folder=HERE / 'v2_best', *, detector=None,
                 classifier=None, confirm_frames=6, confirm_conf=.65, exclude=None, centre_fallback=False):  # 6@0.65: ~2x coverage, 0 wrong/hallucinated on test video
        self.detector = detector if detector is not None else Detector(detector_pte, exclude=exclude)
        self.classifier = classifier if classifier is not None else SortiVision(str(Path(folder).expanduser()))
        self.meta = self.classifier.meta
        self.confirm_frames, self.confirm_conf = confirm_frames, confirm_conf
        self.centre_fallback = centre_fallback   # False: scan the whole frame, boxes only where waste is detected
        self.tracks = {}; self.next_id = 1

    def process(self, rgb):
        boxes = self.detector.detect(rgb)
        candidates = []
        for box in boxes:
            p = self.classifier.probs(square_crop(rgb, box, pad=.10))
            idx = int(p.argmax()); cls, conf = self.classifier.classes[idx], float(p[idx])
            if cls != 'background':
                candidates.append((box, cls, conf))
        # Background detections (e.g. room furniture) must not suppress the
        # single-object fallback when the actual waste has no COCO category.
        fallback = not candidates and self.centre_fallback
        if fallback:
            h, w = rgb.shape[:2]; side = int(min(h, w) * .6)
            left, top = (w - side) // 2, (h - side) // 2
            box = (left, top, left + side, top + side, 0.)
            p = self.classifier.probs(square_crop(rgb, box, pad=0))
            idx = int(p.argmax())
            candidates = [(box, self.classifier.classes[idx], float(p[idx]))]
        boxes = [c[0] for c in candidates]
        # Greedy global IoU matching, each track/detection used at most once.
        pairs = sorted(((float(iou(np.array(b[:4]), [t['box']])[0]), j, tid)
                        for j, b in enumerate(boxes) for tid, t in self.tracks.items()
                        if t['fallback'] == fallback), reverse=True)
        matched = {}; used = set()
        for overlap, j, tid in pairs:
            if overlap >= .3 and j not in matched and tid not in used:
                matched[j] = tid; used.add(tid)
        for tid in list(self.tracks):
            if tid not in used:
                t = self.tracks[tid]; t['missed'] += 1
                t.update(streak=0, confirmed=False)
                if t['missed'] > 3:
                    del self.tracks[tid]
        objects = []
        for j, (box, cls, conf) in enumerate(candidates):
            tid = matched.get(j)
            if tid is None:
                tid = self.next_id; self.next_id += 1
                self.tracks[tid] = dict(cls=None, streak=0, fallback=fallback)
            t = self.tracks[tid]
            streak = t['streak'] + 1 if t['cls'] == cls else 1
            if conf < self.confirm_conf or cls == 'background':
                streak = 0
            t.update(cls=cls, box=list(map(float, box[:4])), streak=streak, missed=0,
                     confirmed=streak >= self.confirm_frames)
            if cls == 'background':
                continue
            stream = self.meta['stream_map'].get(cls)
            objects.append(dict(id=tid, box=t['box'], cls=cls, conf=round(conf, 4),
                                score=round(float(box[4]), 4), stream=stream,
                                color=C.BINS.get(stream, {}).get('color', 'grey'),
                                confirmed=t['confirmed'], streak=streak, need=self.confirm_frames,
                                fallback=fallback))
        return objects


def signature(objects):
    """A multiset: replacing track IDs does not reannounce the same classes/counts."""
    return tuple(sorted(o['cls'] for o in objects if o['confirmed']))


def draw_objects(frame, objects, ms=0., fps=0.):
    """Clean overlay: one box per detected item. Confirmed = solid bin-coloured box + corner accents + filled tag;
    still checking = thin faint box + small tag. Header shows the item count."""
    colors = {'blue': (235, 140, 40), 'green': (60, 190, 70), 'red': (50, 50, 230), 'grey': (150, 150, 150),
              'purple': (190, 80, 170), 'black': (90, 90, 90)}
    font = cv2.FONT_HERSHEY_SIMPLEX
    h, w = frame.shape[:2]
    def tag(text, x, y, bg, scale=.55, th=1):
        (tw, tht), base = cv2.getTextSize(text, font, scale, th)
        x = min(max(0, x), max(0, w - tw - 10)); y0 = y - tht - 10
        if y0 < 0:                       # no room above the box -> put the tag inside it
            y0 = y; y = y + tht + 10
        cv2.rectangle(frame, (x, y0), (x + tw + 10, y), bg, -1)
        cv2.putText(frame, text, (x + 5, y - 6), font, scale, (255, 255, 255), th, cv2.LINE_AA)
    shown = 0
    for o in objects:
        x0, y0, x1, y1 = map(int, o['box'])
        color = colors.get(o.get('color'), (170, 170, 170))
        name = o['cls'].replace('_waste', '').replace('_', ' ').capitalize()
        dest = C.BIN_SHORT.get(o['stream'], {}).get('en', 'check')
        if o['confirmed']:
            shown += 1
            cv2.rectangle(frame, (x0, y0), (x1, y1), color, 2, cv2.LINE_AA)
            L = max(12, min(x1 - x0, y1 - y0) // 5)        # corner accents
            for (cx, cy, dx, dy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
                cv2.line(frame, (cx, cy), (cx + dx * L, cy), color, 5, cv2.LINE_AA)
                cv2.line(frame, (cx, cy), (cx, cy + dy * L), color, 5, cv2.LINE_AA)
            tag(f"{name} - {dest}  {o['conf']:.0%}", x0, y0, color, .6, 2)
        else:
            ov = frame.copy(); cv2.rectangle(ov, (x0, y0), (x1, y1), color, 1, cv2.LINE_AA)
            frame[:] = cv2.addWeighted(ov, .6, frame, .4, 0)
            tag(f"checking {o['streak']}/{o['need']}", x0, y0, (80, 80, 80), .45, 1)
    head = f"{shown} item{'s' if shown != 1 else ''}" if shown else "show waste to the camera"
    tag(head, 10, 34, (40, 40, 40), .65, 2)
    cv2.putText(frame, f'{fps:.1f} FPS', (w - 95, h - 12), font, .5, (120, 230, 120), 1, cv2.LINE_AA)
    return frame
