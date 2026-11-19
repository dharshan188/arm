# Fix the test video (vision/testvideo) — review by Claude of video_review.jpg

1. SCALE BUG: objects are far too small (often <10% of the classify box). Spec: the object's longest side must be
   35-80% of the centre 60% square (side = 0.6*min(H,W) = 432 px at 720p), i.e. ~150-345 px, and its centre must stay
   inside that square. Check make_video.py's scale maths and the photo crops (crops include too much empty border?).
   Add an assertion/log of the actual object bbox size per frame.
2. Ugly rectangles: some cut-outs are rectangles with white/background borders (general_waste cork board, battery on a
   white card, metal can on a grey card). Tighten crops to the object; feather edges (alpha mask from a soft ellipse or
   GrabCut with cv2.grabCut seeded by the crop rectangle) so it looks held/placed, not a sticker.
3. Keep everything else (segments, rotation sweep, truth.json format, credits). Re-render, regenerate video_review.jpg,
   rerun eval_video.py with ../mobilenet_v3_large_int8_xnnpack.pte ../labels.json, and update README.md with the result.
Run python with: env -u PYTHONPATH ~/ps2_et/bin/python
