# Sorti: offline waste-sorting assistant

Show Sorti a piece of rubbish on the camera and it tells you **which bin it goes in**: green, blue, red or the e-waste collector. It explains why, plays a short documentary video and answers your questions **by voice in Tamil, Hindi or English**. Everything runs **offline on the CPU**. It is built for a **Raspberry Pi 5 (8 GB)**, and any Ubuntu laptop can stand in for the Pi.

```
camera ─► image classifier ─► bin (from a fixed rule table, never guessed by AI)
mic ─► speech-to-text (ta/hi/en) ─► intent match ─► rule answer
                                       └─ free-form question ─► translate ─► Llama 3.2 1B ─► translate back
answer ─► text-to-speech in the same language ─► speaker
```

---

## What you need

| | Minimum |
|---|---|
| Computer | Raspberry Pi 5 (8 GB) with 64-bit Raspberry Pi OS, **or** an x86-64 laptop with Ubuntu 22.04+ |
| RAM | 8 GB (the app peaks around 4 GB with every model loaded) |
| Disk | about 6 GB free (about 3 GB without Llama) |
| Hardware | webcam, microphone, speaker or headphones |
| Python | 3.10 or newer |

---

## Step-by-step installation

### Step 1: Install the system packages

```bash
sudo apt update
sudo apt install -y git curl bzip2 python3-venv python3-dev ffmpeg alsa-utils pulseaudio-utils
```

### Step 2: Clone the repo into `~/arm2026`

Use exactly this folder name: the start scripts expect it.

```bash
cd ~
git clone https://github.com/dharshan188/arm.git arm2026
cd ~/arm2026
```

### Step 3: Create the Python environment

The scripts expect the virtual environment at **`~/ps2_et`**.

```bash
python3 -m venv ~/ps2_et
~/ps2_et/bin/pip install --upgrade pip

# torch MUST come from the CPU index, otherwise pip pulls ~3 GB of NVIDIA CUDA libraries
~/ps2_et/bin/pip install torch==2.12.1 --index-url https://download.pytorch.org/whl/cpu

~/ps2_et/bin/pip install -r requirements.txt
```

> Keep **torch at 2.12.x**. ExecuTorch 1.3.1 is built against it, and a newer torch fails with `undefined symbol ... materialize_cow_storage`.

### Step 4: Download the speech and translation models (about 2.3 GB)

```bash
./download_models.sh
```

This fetches each model from its original public source, either Hugging Face or the sherpa-onnx GitHub releases. You can re-run it safely: it skips files that are already there. The vision model is already in the repo under `vision/`.

### Step 5: Start the app

```bash
lap/run.sh                 # starts on a welcome screen that asks your language by voice
lap/run.sh --lang ta       # skip the welcome screen: Tamil  (also: en, hi)
lap/run.sh --camera 1      # use a different webcam
lap/run.sh --mic USB       # pick a microphone by part of its PulseAudio name
```

The browser opens **http://127.0.0.1:8000** by itself. Hold a plastic bottle, battery or banana peel in the centre of the camera view. After about a second Sorti names the bin, explains it and plays the video. Then press **Ask** (or the **Space** bar) and speak your question.

No camera? Open the mock UI instead: http://127.0.0.1:8000/?mock=1&lang=ta

Stop the app with **Ctrl+C** in the terminal.

### Step 6 (optional): Add Llama for free-form questions

Without Llama, Sorti still answers every bin question, such as "which bin?", "is it recyclable?", "is it dangerous?" or "where do I give it?". Llama only adds answers to open questions like "how can I use less plastic at home?".

1. Create a free account at https://huggingface.co
2. Open https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct-QLORA_INT4_EO8 and accept Meta's licence. Approval usually takes a few minutes.
3. Make a token at https://huggingface.co/settings/tokens, then log in:
   ```bash
   ~/ps2_et/bin/hf auth login
   ```
4. Download the checkpoint and convert it. This takes about 6 minutes and needs about 6.5 GB of free RAM, so close other apps first:
   ```bash
   llama/setup_llama.sh
   ```
5. Test it:
   ```bash
   cd ~/arm2026/llama && env -u PYTHONPATH ~/ps2_et/bin/python chat.py "How can I reduce plastic at home?"
   ```

### Step 7: Quick checks

```bash
# camera + classifier only (q = quit, space = freeze, f = full frame)
cd ~/arm2026/vision
env -u PYTHONPATH ~/ps2_et/bin/python webcam_demo.py --pte mobilenet_v3_large_int8_xnnpack.pte --labels labels.json

# ask a typed question while lap/run.sh is running
curl -s -X POST localhost:8000/api/ask/text -H 'Content-Type: application/json' -d '{"text":"which bin for a battery"}'
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Strange `ModuleNotFoundError` or a ROS / other Python package gets imported | Something in your shell sets `PYTHONPATH`. Always run Python as `env -u PYTHONPATH ~/ps2_et/bin/python ...` (`run.sh` already does this). |
| `undefined symbol ... materialize_cow_storage` | Wrong torch version: reinstall `torch==2.12.1` from the CPU index (step 3). |
| `Missing operator llama::custom_sdpa.out` | Run Llama through `chat.py` or the app, which load the ExecuTorch custom ops first. |
| Sorti hears nothing | The mic may be muted or the wrong one. Run `pactl list short sources`, then start with `lap/run.sh --mic <part of the name>`. Unmute it in Settings → Sound. |
| Sorti can't hear itself during the speaker→mic test | That's expected with headphones plugged in. Unplug them, or just speak yourself. |
| Wrong camera | `lap/run.sh --camera 1` (or 2, …). |
| Port 8000 is busy | `lap/run.sh --port 8010`, then open that port. |
| Computer freezes / runs out of memory | Close other heavy apps. Llama (~2 GB) and the translator (~1 GB) load only when needed and unload when idle. |
| Harmless warnings | Messages about torchao `_C_mxfp8` / cutlass, Qt fonts or cpuinfo `midr` can be ignored. |

---

## What's in the repo

```
arm2026/
├── download_models.sh   fetches all speech/translation models (step 4)
├── requirements.txt     Python packages (pinned)
├── vision/              image classifier: MobileNetV3-Large INT8 (ExecuTorch, 4.5 MB, 94% test accuracy)
│   ├── labels.json      9 classes, class → bin map, preprocessing
│   ├── webcam_demo.py   live camera demo
│   └── pi_benchmark.py  speed/accuracy benchmark on pi_testset/
├── voice/
│   ├── domain_snap.py   fuzzy intent/item matcher for ta/hi/en speech
│   └── (models)         STT: Moonshine (en), IndicConformer (hi, ta); TTS: Piper; Silero VAD
├── translate/           NLLB-200 600M (hi/ta ↔ en, around Llama)
├── llama/               Llama 3.2 1B QLoRA INT4: setup_llama.sh, chat.py
└── lap/                 the app ("Sorti"): FastAPI server + offline web UI
    ├── run.sh           start here
    ├── server.py        owns camera, mic, speaker; all the logic
    ├── content.py       every spoken/UI sentence in en/hi/ta; bins come only from here
    ├── web/             index.html, style.css, app.js (no internet needed)
    └── videos/          one real-photo documentary per waste type (en/hi/ta voice-overs)
```

**Waste types and bins:**

| Type | Bin |
|---|---|
| organic | 🟢 GREEN (compost) |
| plastic, paper, metal, glass, clothes | 🔵 BLUE (recyclable) |
| batteries, light bulbs | 🔴 RED (hazardous) |
| e-waste | authorised e-waste collector |

### Re-making the videos (optional)

The 9 documentary videos are already included. To rebuild one after editing its script in `lap/videos/specs/photo/<type>.json`, run:

```bash
cd ~/arm2026/lap/videos
env -u PYTHONPATH ~/ps2_et/bin/python photo_explainer.py specs/photo/plastic_waste.json --register
```

---

## Licences and credits

Each model keeps its own licence. The licence file comes with each model download.

| Part | Licence |
|---|---|
| Moonshine STT (Useful Sensors) | MIT |
| IndicConformer STT (AI4Bharat) | MIT |
| Whisper (OpenAI) | MIT |
| Piper voices: lessac (en), pratham (hi) | see each voice's MODEL_CARD |
| Piper Tamil voice, AI4Bharat Rasa (tinisoft) | CC-BY-4.0 |
| Silero VAD | MIT |
| **NLLB-200 translator (Meta)** | **CC-BY-NC-4.0: non-commercial use only** |
| Llama 3.2 1B (Meta) | Llama 3.2 Community Licence |
| Video photos | Wikimedia Commons (CC0 / PD / CC BY / CC BY-SA); author and licence are shown on every frame and listed in `lap/videos/photos/<type>/credits.json` |

Because of the NLLB licence, this project as a whole is for **non-commercial / educational use**.
