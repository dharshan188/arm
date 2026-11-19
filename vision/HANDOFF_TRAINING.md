# Sorti vision: retraining brief

Sorti is an offline waste-sorting assistant on a **Raspberry Pi 5** (CPU only). A camera classifies the item in a centre box, and the app says which bin it goes in. This zip holds the current model, its scripts and a test set. **Goal: train a better model that works with a live webcam.**

## What's in this zip
| File | What |
|---|---|
| `mobilenet_v3_large_int8_xnnpack.pte` | **current shipped model**: ExecuTorch 1.3.1, XNNPACK, INT8 PTQ (PT2E, per-channel), 4.5 MB |
| `mobilenet_v3_large_fp32_xnnpack.pte` | same model in FP32 |
| `efficientnet_b0_int8_xnnpack.pte`, `mobilenet_v3_small_int8_xnnpack.pte` | older candidates (small INT8 is broken, F1 0.29) |
| `labels.json` | classes, class → bin map, **preprocessing spec (must stay the same)** |
| `*_metrics.json`, `summary_final.csv` | v1 test metrics |
| `webcam_demo.py`, `pi_stream.py`, `sorti_model.py`, `pi_benchmark.py` | how the model is run on the Pi (`pi_stream.py` = browser live view) |
| `pi_testset/` | 540 held-out images, 60 per class; **test only, never train on it** |
| `extra/general_waste/` | 139 Wikimedia Commons photos (duster, eraser, sponge, tissue, cigarette butts, broken ceramic, toothbrush…) + `credits.json` (CC licences) |
| `train/` | draft scripts, **not yet run end to end**: `prep_data.py` (merge datasets → folders), `train_sorti.py` (GPU fine-tune, camera-style augmentation), `export_sorti.py` (ExecuTorch FP32 + INT8 export and scoring), `fast_head.py` (CPU-only shortcut) |

The original PyTorch checkpoint (`.pt`) is **not** available, and you can't fine-tune a `.pte`. Train from ImageNet weights.

## v1 model
- Trained on Hugging Face **`4w4kt/waste-dataset-image`**: 23,264 train / 5,576 test images, 9 classes of mostly clean web/product photos.
- Fine-tuned torchvision MobileNetV3-Large (ImageNet), 15 epochs on a Colab T4, then INT8 PTQ.
- Test results: macro-F1 0.929 (INT8), 94.1% accuracy. On `pi_testset` it scores 93.7%.

## Problems seen with the live camera (what to fix)
1. **It says e-waste first, then settles on the right answer.** Offline it is *not* biased toward e-waste: it predicts e-waste 62 times for 60 real e-waste test images. The real cause is that there's **no "nothing in view" class**, so an empty desk with a laptop, cables or the Pi gets forced into a class, and that class is usually e-waste. Out-of-distribution inputs come out confidently wrong too: a plain wood-colour image gave "light bulbs" at 60%, and noise gave "organic" at 29%.
2. **A duster (blackboard eraser) is called metal waste.** It isn't any of the 9 classes. The owner wants a new **general_waste** class (dusters, sponges, tissues, cigarette butts, broken ceramics, diapers, etc.).
3. **Mismatch between training photos and the camera.** The training data is clean web photos, while live frames have room backgrounds, blur, noise and odd lighting.

## Requirements for v2
- **Classes (keep this order; the first 9 match v1):**
  `battery_waste, clothes, e_waste, glass_waste, light_bulbs, metal_waste, organic_waste, paper_waste, plastic_waste, general_waste, background`
  - `general_waste` → new stream `general` (GREY/BLACK bin, general / reject waste)
  - `background` → stream `none` (nothing in view; the app stays quiet)
- **Bins (stream_map):**
  - organic → biodegradable (GREEN)
  - plastic, paper, metal, glass, clothes → recyclable (BLUE)
  - battery, light_bulbs → hazardous (RED)
  - e_waste → e_waste (authorised collector)
- **Preprocessing, exactly as in `labels.json`:**
  - PIL resize, short side 256, bilinear
  - centre crop 224
  - ImageNet mean/std, NCHW RGB float32 `[1,3,224,224]`
  - The app crops the **centre 60% square** of the camera frame before this step.
- **Deployment target:**
  - ExecuTorch **1.3.1** `.pte` with the XNNPACK backend, exported with **torch 2.12.x**. Newer torch breaks the Pi runtime.
  - Ideally INT8 PT2E per-channel (`XNNPACKQuantizer` + `torchao.quantization.pt2e`), which is ≤ ~20 ms on a Pi 5. FP32 is acceptable if INT8 loses accuracy.
  - Always score the exported `.pte` itself, not just the PyTorch model.
- **Output:** the `.pte` plus a `labels.json` in the same format (add the 2 classes to `classes`, `display_names` and `stream_map`).
- **Accuracy targets:**
  - ≥ 93% on `pi_testset` (9 classes)
  - background false positives under 2% on held-out empty-scene images
  - good recall on general_waste
  - still at least as good as v1 on the 9 classes

## Suggested data (all public)
| Source | Use |
|---|---|
| `4w4kt/waste-dataset-image` (HF) | the 9 classes |
| `shahzaibvohra/realwaste` (HF, CC-BY-4.0) | 4,752 real landfill photos, files named `<Class>_<n>.jpg`. Plastic → plastic, Metal → metal, Paper / Cardboard → paper, Vegetation / Food Organics → organic, Glass → glass, Textile Trash → clothes, **Miscellaneous Trash → general_waste** |
| `garythung/trashnet` (HF, MIT) | use `dataset-resized.zip` (43 MB); **trash → general_waste**, cardboard → paper, others map directly |
| `keremberke/indoor-scene-classification` (HF) | rooms, offices, kitchens → **background**; add synthetic plain surfaces too |
| `extra/general_waste/` (included) | more general_waste photos |

## Training tips (in `train/train_sorti.py`)
- **Paste-on-background augmentation:** shrink an item photo onto a random room photo at 45–90% of the frame, roughly centred. This is what a webcam sees.
- **Photometric augmentation:** colour jitter, blur, JPEG artefacts, noise, grayscale, random erasing.
- **Balance:** class-balanced sampling (clothes has about 7x more images than e-waste), label smoothing 0.1, EMA weights.
- **No leakage:** de-duplicate across splits by checksum or perceptual hash, because the v1 dataset had duplicates between train and test.
- **Model choice:** MobileNetV3-Large survived INT8 well (−1.5 F1 points). EfficientNet-B0 lost 4 points, and MobileNetV3-Small collapsed. If you try a bigger backbone, check INT8 accuracy on the `.pte`.

## How the app uses the model (already implemented)
`pi_stream.py` confirms an item only after **8 consecutive frames** agree on the same class, each with confidence ≥ 0.70, and never averages with older frames. The `background` class shows "show one item in the box".

## Constraints from the owner
- No GPU on the dev laptop, and its internet is slow (~0.3 MB/s). Train in **Google Colab or Kaggle (GPU)**. The deliverable is a **notebook that runs end to end** and saves the `.pte` + `labels.json` + a metrics report.
- Training should be fast: ideally about 10–20 minutes on a T4. Use fewer epochs and 224 px input, and cache the decoded dataset.
