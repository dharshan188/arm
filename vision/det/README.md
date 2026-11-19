Raw YOLO11 detector (FP32 XNNPACK, 320 square input). Runtime needs only the
existing torch, ExecuTorch, NumPy and OpenCV; Ultralytics is export-only.

Export (no training, no changes to torch/ExecuTorch):

```sh
cd ~/arm2026
~/ps2_et/bin/pip install --no-deps ultralytics ultralytics-thop py-cpuinfo
PATH=$HOME/ps2_et/bin:$PATH env -u PYTHONPATH YOLO_CONFIG_DIR=/tmp/sorti_yolo MPLCONFIGDIR=/tmp/sorti_mpl ~/ps2_et/bin/python vision/det/export_yolo.py --weights vision/det/yolo11n.pt
```

If site-packages is read-only, append `--target vision/det/_export_deps` to pip.
Download COCO weights from
https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt .
The exporter compares the saved PTE output with the original PyTorch model.

Track B swap: use `--weights waste_best.pt --output vision/det/waste_320.pte
--exclude ''` during export. Pass `--detector-pte vision/det/waste_320.pte` to
pi_stream.py or lap/server.py. The adjacent `.json` supplies imgsz and excluded
class IDs. Without a sidecar, pass `--detector-exclude ''` for a waste detector:
class 0 is excluded by default for COCO (person), but may be waste in Track B.
Raw output contract: `[1, 4+num_classes, N]`, xywh in input pixels followed by
class probabilities; no objectness column and no embedded NMS. Do not substitute
an end-to-end/NMS model. Sorti classification and bin rules stay the same.

COCO localises common objects, not all waste. Unknown waste uses the central
60% square fallback only when there are no retained foreground detections (including when all detected
crops classify as background). Confirmation
requires 8 consecutive matched frames with confidence >=0.70. No detections or
low confidence immediately reset that track's confirmation; IDs survive up to
3 missed frames. Two extra unchanged frames settle the set before auto speech.

Validation artifacts: `benchmark_laptop.json` is a full 1,025-frame run including
inference, overlay and JPEG encoding (no playback sleep). `smoke_multi.py`
creates a two-bottle scene from the existing Commons assets credited in
`../testvideo/credits.json`; both tracks must confirm after eight frames. Run it
from any directory with the same interpreter. The saved JPEG and JSON show the
actual detector/classifier outputs; the English reply is "2 plastic items:
Blue bin." Unit/integration checks: `python -m unittest vision.test_multi
lap.test_multi_flow`. Audio devices and Pi throughput were not exercised.
