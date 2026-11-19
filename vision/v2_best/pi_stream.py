#!/usr/bin/env python3
"""Live waste classifier on the Pi, viewed from any browser on the same network (no screen needed on the Pi).

    python pi_stream.py --pte mobilenet_v3_large_int8_xnnpack.pte --camera 0 --port 8080
    then open  http://<pi-ip>:8080   on your laptop/phone

Same model + overlay as webcam_demo.py (class, bin, top-3, latency). Uses only the Python standard library
web server: no Flask/FastAPI. /pred returns the latest prediction as JSON.
"""
import argparse, json, os, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from webcam_demo import centre_box, draw, preprocess, softmax  # noqa: E402

PAGE = b"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sorti vision</title><style>body{margin:0;background:#111;color:#eee;font-family:sans-serif;text-align:center}
img{max-width:100%;height:auto}#p{font-size:1.4em;padding:10px}</style></head><body>
<img src="/stream"><div id="p">...</div><script>
setInterval(async()=>{try{const r=await (await fetch('/pred')).json();
document.getElementById('p').textContent=r.confirmed?`${r.name}  ${(r.conf*100).toFixed(0)}%  ->  ${r.stream}   |   ${r.ms.toFixed(1)} ms   ${r.fps.toFixed(0)} FPS`:(r.need?`checking ${r.streak}/${r.need}`:'starting...')}catch(e){}},500)
</script></body></html>"""

LATEST = {"jpg": None, "pred": {}}
COND = threading.Condition()


def camera_loop(a, meta, model, torch):
    spec = meta["input"]
    src = a.video if a.video else a.camera
    cap = cv2.VideoCapture(src) if a.video else cv2.VideoCapture(src, cv2.CAP_V4L2)
    if not cap.isOpened():
        print(f"ERROR: could not open camera {src}. List cameras with:  v4l2-ctl --list-devices", flush=True)
        os._exit(1)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, a.width); cap.set(cv2.CAP_PROP_FRAME_HEIGHT, a.height)
    print(f"camera {src} open: {int(cap.get(3))}x{int(cap.get(4))}", flush=True)
    classes = meta["classes"]; streak = {"cls": -1, "n": 0, "probs": []}
    t_prev = time.perf_counter(); fps = 0.0; n = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            if a.video:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0); continue
            print("camera read failed, retrying", flush=True); time.sleep(0.5); continue
        if not a.video:
            frame = cv2.flip(frame, 1)
        roi = centre_box(frame, a.box)
        crop = frame[roi[1]:roi[1] + roi[2], roi[0]:roi[0] + roi[2]]
        t = time.perf_counter()
        p = model.probs(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))      # v2: 11 classes (v1 fallback: 9)
        ms = (time.perf_counter() - t) * 1e3
        top = int(p.argmax()); conf = float(p[top])
        # confirm only after N consecutive frames agree on the same class, each above the confidence bar;
        # no averaging with older frames, so the previous item (or the empty desk) cannot linger
        if conf >= a.confirm_conf and top == streak["cls"]:
            streak["n"] += 1; streak["probs"].append(p)
        elif conf >= a.confirm_conf:
            streak.update(cls=top, n=1, probs=[p])
        else:
            streak.update(cls=-1, n=0, probs=[])
        now = time.perf_counter(); fps = 0.9 * fps + 0.1 / max(1e-6, now - t_prev); t_prev = now
        name = classes[streak["cls"]] if streak["cls"] >= 0 else None
        confirmed = streak["n"] >= a.confirm_frames and name not in (None, "background")
        if confirmed:
            probs = np.mean(streak["probs"][-a.confirm_frames:], axis=0)
            cls, stream, conf = draw(frame, meta, probs, ms, fps, roi, False, 0.0)
        else:
            cls, stream = None, None
            msg = ("Show one item in the box" if name in (None, "background") else
                   f"Checking... {streak['n']}/{a.confirm_frames}")
            h, w = frame.shape[:2]
            cv2.rectangle(frame, (roi[0], roi[1]), (roi[0] + roi[2], roi[1] + roi[2]), (255, 255, 255), 2)
            ov = frame.copy(); cv2.rectangle(ov, (0, h - 70), (w, h), (20, 20, 20), -1)
            frame[:] = cv2.addWeighted(ov, 0.75, frame, 0.25, 0)
            cv2.putText(frame, msg, (14, h - 28), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 200, 255), 2, cv2.LINE_AA)
            cv2.putText(frame, f"model {ms:.1f} ms | {fps:.0f} FPS", (w - 260, h - 10), cv2.FONT_HERSHEY_SIMPLEX,
                        0.5, (160, 255, 160), 1, cv2.LINE_AA)
        ok, jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        with COND:
            LATEST["jpg"] = jpg.tobytes()
            LATEST["pred"] = dict(cls=cls, name=meta.get("display_names", {}).get(cls, cls) if cls else None,
                                  stream=stream, conf=round(float(conf), 3), ms=ms, fps=fps, confirmed=bool(confirmed),
                                  streak=streak["n"], need=a.confirm_frames)
            COND.notify_all()
        n += 1
        if a.print_every and n % a.print_every == 0:
            print(f"{(cls or 'checking'):14s} {conf*100:5.1f}% -> {(stream or '-'):13s} | model {ms:5.1f} ms | {fps:4.1f} FPS", flush=True)
        if a.video:
            time.sleep(1 / 25)


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path == "/":
            self.send_response(200); self.send_header("Content-Type", "text/html"); self.end_headers()
            self.wfile.write(PAGE)
        elif self.path == "/pred":
            b = json.dumps(LATEST["pred"]).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
            self.wfile.write(b)
        elif self.path == "/stream":
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame"); self.end_headers()
            try:
                while True:
                    with COND:
                        COND.wait(timeout=2)
                        jpg = LATEST["jpg"]
                    if jpg:
                        self.wfile.write(b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %d\r\n\r\n" % len(jpg))
                        self.wfile.write(jpg + b"\r\n")
            except (BrokenPipeError, ConnectionResetError):
                pass
        else:
            self.send_error(404)


def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument("--pte", default=os.path.join(here, "mobilenet_v3_large_int8_xnnpack.pte"))
    ap.add_argument("--labels", default=os.path.join(here, "labels.json"))
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--video", default=None, help="test with a video file instead of a camera")
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=720)
    ap.add_argument("--confirm-frames", type=int, default=8, help="consecutive frames that must agree")
    ap.add_argument("--confirm-conf", type=float, default=0.70, help="confidence each of those frames needs")
    ap.add_argument("--box", type=float, default=0.6)
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--print-every", type=int, default=30, help="print a prediction line every N frames (0 = off)")
    a = ap.parse_args()

    import torch
    from sorti_model import SortiVision
    model = SortiVision(os.path.dirname(os.path.abspath(a.labels)))
    meta = model.meta
    print("model loaded:", meta.get("version", "v1"), f"({len(model.classes)} classes)", flush=True)
    threading.Thread(target=camera_loop, args=(a, meta, model, torch), daemon=True).start()
    srv = ThreadingHTTPServer((a.host, a.port), H)
    print(f"open http://<this-pi-ip>:{a.port}   (Ctrl+C to stop)", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
