PS2 waste classifier - best model: mobilenet_v3_large

LAPTOP WEBCAM TEST (Windows/macOS/Linux, Python 3.10-3.13):
  pip install executorch==1.3.1 opencv-python pillow numpy
  python webcam_demo.py --pte mobilenet_v3_large_int8_xnnpack.pte --labels labels.json
  keys: q quit | s snapshot | space freeze | f full frame / centre box

RASPBERRY PI 5 BENCHMARK (64-bit Raspberry Pi OS):
  python3 -m venv ~/et && source ~/et/bin/activate
  pip install executorch==1.3.1 pillow numpy
  python3 pi_benchmark.py --pte mobilenet_v3_large_int8_xnnpack.pte --labels labels.json --testdir pi_testset --runs 300
