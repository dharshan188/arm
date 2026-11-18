#!/usr/bin/env python3
"""Live waste classifier on the Pi, viewed from any browser on the same network (no screen needed on the Pi).

    python pi_stream.py --pte mobilenet_v3_large_int8_xnnpack.pte --camera 0 --port 8080
    then open  http://<pi-ip>:8080   on your laptop/phone

Same model + overlay as webcam_demo.py (class, bin, top-3, latency). Uses only the Python standard library
web server: no Flask/FastAPI. /pred returns the latest prediction as JSON.
"""
import argparse, json, os, sys, threading, time
from collections import deque
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
document.getElementById('p').textContent=r.cls?`${r.name}  ${(r.conf*100).toFixed(0)}%  ->  ${r.stream}   |   ${r.ms.toFixed(1)} ms   ${r.fps.toFixed(0)} FPS`:'starting...'}catch(e){}},500)
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
    hist = deque(maxlen=max(1, a.smooth)); t_prev = time.perf_counter(); fps = 0.0; n = 0
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
        x = torch.from_numpy(preprocess(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB), spec))
        t = time.perf_counter()
        logits = model.forward((x,))[0].numpy()[0]
        ms = (time.perf_counter() - t) * 1e3
        hist.append(softmax(logits)); probs = np.mean(hist, axis=0)
        now = time.perf_counter(); fps = 0.9 * fps + 0.1 / max(1e-6, now - t_prev); t_prev = now
        cls, stream, conf = draw(frame, meta, probs, ms, fps, roi, False, a.threshold)
        ok, jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        with COND:
            LATEST["jpg"] = jpg.tobytes()
            LATEST["pred"] = dict(cls=cls, name=meta.get("display_names", {}).get(cls, cls), stream=stream,
                                  conf=round(float(conf), 3), ms=ms, fps=fps)
            COND.notify_all()
        n += 1
        if a.print_every and n % a.print_every == 0:
            print(f"{cls:14s} {conf*100:5.1f}% -> {stream:13s} | model {ms:5.1f} ms | {fps:4.1f} FPS", flush=True)
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
    ap.add_argument("--smooth", type=int, default=5)
    ap.add_argument("--threshold", type=float, default=0.55)
    ap.add_argument("--box", type=float, default=0.6)
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--print-every", type=int, default=30, help="print a prediction line every N frames (0 = off)")
    a = ap.parse_args()

    meta = json.load(open(a.labels))
    import torch
    from executorch.extension.pybindings.portable_lib import _load_for_executorch
    model = _load_for_executorch(a.pte)
    model.forward((torch.zeros(meta["input"]["shape"]),))
    print("model loaded:", os.path.basename(a.pte), flush=True)
    threading.Thread(target=camera_loop, args=(a, meta, model, torch), daemon=True).start()
    srv = ThreadingHTTPServer((a.host, a.port), H)
    print(f"open http://<this-pi-ip>:{a.port}   (Ctrl+C to stop)", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
