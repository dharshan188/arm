# Task: build a ~40 s REAL-photo test video for the Sorti waste classifier + a frame-by-frame evaluator

Work in this directory (vision/testvideo). Network is allowed but SLOW (~0.3 MB/s) and Wikimedia rate-limits (HTTP 429):
download serially, small thumbnails (width 640), with retries. Use ONLY freely licensed Wikimedia Commons photos
(API: commons.wikimedia.org/w/api.php generator=search, prop=imageinfo, iiurlwidth=640; keep CC0/PD/CC BY/BY-SA, record
author+licence+page in credits.json). Do NOT use images from the training sets (HF 4w4kt/waste-dataset-image, RealWaste,
TrashNet) and do not reuse ../extra/general_waste.

Classes (exact names): battery_waste, clothes, e_waste, glass_waste, light_bulbs, metal_waste, organic_waste, paper_waste,
plastic_waste, general_waste, background.  Get 3 different real photos per waste class (e.g. AA batteries, phone charger,
glass bottle, CFL bulb, tin can, banana peel, newspaper, plastic bottle, T-shirt, kitchen sponge/duster) and 3 room/table
photos for backgrounds.

Video (make_video.py -> sorti_test_40s.mp4, 1280x720, 25 fps, ~40-45 s, H.264):
- one segment per class (~3.5 s each), segments in random order, plus 2 "background" segments (empty room/table, 2 s).
- within a segment the object photo (cropped to the object, rounded/soft edges) sits on a room/table background and
  MOVES: random position (keep its centre inside the middle 60% square of the frame, because the app classifies the
  centre 60% square), scale 35-80% of that square, rotation sweeping through 0..360 deg, a little perspective tilt,
  brightness/contrast changes, light motion blur, sensor noise. Switch to another photo of the same class mid-segment.
- 0.4 s crossfade between segments. No text/labels burned into the frame.
- truth.json: list of {"t0","t1","class"} for every segment (exclude crossfades).
Evaluator (eval_video.py): args --pte <model.pte> --labels <labels.json> --video sorti_test_40s.mp4 --truth truth.json.
- load with executorch: from executorch.extension.pybindings.portable_lib import _load_for_executorch; preprocessing
  exactly as ../webcam_demo.py preprocess() + centre_box(frame, 0.6) (import them from ..). Works for 9-class v1
  labels (vision/labels.json) and 11-class v2 labels.
- per frame: top-1; per segment: frame accuracy, and the app's confirmation rule (8 consecutive frames same class,
  each conf >= 0.70): was the confirmed class correct, and how many seconds until first confirmation; wrong confirmations.
- print a table + overall frame accuracy and segment accuracy; save eval_<model>.json.
Test the evaluator with ../mobilenet_v3_large_int8_xnnpack.pte + ../labels.json (run python via:
env -u PYTHONPATH ~/ps2_et/bin/python). Keep everything inside this directory.
