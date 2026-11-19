# CODEX.md: run Sorti on the Raspberry Pi 5 (read ALL of this before doing anything)

You are setting up and testing **Sorti**, an offline waste-sorting assistant, on a Raspberry Pi 5. **Almost everything is already built and tested on the laptop.** Your job is to **install, connect the hardware, run, test and report**. Do **not** redesign, retrain or "improve" anything unless a step says so.

## 0. Facts (don't guess these)
| Item | Value |
|---|---|
| Pi | Raspberry Pi 5, 8 GB, 64-bit Raspberry Pi OS, Python 3.13, user `gokul`, IP `10.10.17.60` |
| Repo on Pi | `~/arm` (clone of https://github.com/dharshan188/arm, branch `main`) |
| Python env | `~/ps2_et` (venv). **Always** run Python as `env -u PYTHONPATH ~/ps2_et/bin/python ...` |
| Pinned versions | torch **2.12.1** (CPU index), executorch **1.3.1**, torchao 0.18.0. Never upgrade torch. |
| **Speaker** | **Bluetooth** speaker (paired over Bluetooth, played through PipeWire/PulseAudio) |
| **Microphone** | **USB** microphone |
| **Camera** | **USB** webcam (on a Pi 5 it is usually `/dev/video8` or higher, NOT `/dev/video0`) |

## 1. What is ALREADY DONE (do not redo)
- **Vision** (`vision/`): multi-object detection and classification.
  - **Detectors, three together:** `vision/det/waste_320.pte` (waste-trained YOLO11n), `det/yolo11n_320.pte` (COCO) and `det/world_320.pte` (YOLO-World, 23 waste prompts).
  - **Classifier:** an ensemble in `vision/v2_taught/` (MobileNetV3-L + MobileNetV4-M, dynamic INT8, 11 classes, Pi test set 94.3%).
  - **Tracking:** `vision/multi.py` tracks each object and confirms it after 6 steady frames, with per-class confidence bars.
  - **Display:** one box per item. Unsure items get a grey "Item – not sure" box. The whole frame is scanned (no centre square).
  - **Measured:** about 560 MB RAM and 5.5 FPS on the laptop.
- **Speech-to-text, including mic filtering. ALREADY DONE, do not rewrite:**
  - **Capture:** `arecord` at 16 kHz mono. `pick_mic()` picks the mic and sets **`MIC_VOL = "60%"`** (at 100% the noise floor was as loud as speech).
  - **Silero VAD** (`voice/vad/silero_vad.onnx`) cuts speech from silence and noise.
  - **Language ID** with Whisper base (`lap/lid.py`) runs on every question in parallel with STT, and switches language automatically.
  - **STT:** English uses **Moonshine base int8**; Hindi/Tamil use **AI4Bharat IndicConformer** int8 (sherpa-onnx). Only the active language is loaded.
  - **`lap/stt_fix.correct()`** fixes ASR slips (west→waste, bean→bin, wait→wet). `preprocess()` is deliberately **OFF** (it hurt accuracy in loud noise).
  - **`voice/domain_snap.py`** finds the item and intent. Bin answers come only from `lap/content.py` + `stream_map`, never from Llama.
- **Text-to-speech:** Piper (English lessac, Hindi pratham, Tamil rasa female), streamed sentence by sentence.
- **Llama 3.2 1B** (+ NLLB translation for hi/ta) answers only free-form questions. It loads lazily and unloads when RAM is low.
- **Web UI** (`lap/web/`, **v3 dark theme**, `theme_v3.css`): the live camera with boxes, a detection card, the chat, the ask button, the welcome language picker and the educational videos. Videos: 9 real-photo documentaries in `lap/videos/<class>/general_photo.mp4`.

## 2. Install (only what is missing)
```bash
cd ~/arm && git pull                                  # get everything on main
ls vision/det/*.pte vision/v2_taught/*.pte            # must list 3 detectors + 2 classifiers
./download_models.sh                                  # STT/TTS/VAD/NLLB models (skips files that exist)
~/ps2_et/bin/pip install -r requirements.txt          # only if imports fail; torch 2.12.1 from https://download.pytorch.org/whl/cpu
```
Llama is optional. Copy `llama/llama3_2_1b_qlora_int4_xnnpack.pte` and `llama/checkpoint/tokenizer.model` from the laptop (`scp`), or run `llama/setup_llama.sh`. The app works without it.

## 3. Connect the hardware

### 3a. Bluetooth speaker (output)
```bash
bluetoothctl            # then:  power on ; agent on ; scan on ; pair XX:XX.. ; trust XX:XX.. ; connect XX:XX.. ; quit
pactl list short sinks  # a bluez_output.XX_XX... sink must appear
pactl set-default-sink bluez_output.<the sink name>
speaker-test -t wav -c 2 -l 1        # or:  aplay /usr/share/sounds/alsa/Front_Center.wav   -> must be heard on the BT speaker
```
- **How sound reaches the speaker:** the server plays audio with `aplay` to the **default** device. Under PipeWire/PulseAudio that is the default sink, which is the BT speaker. **Leave `SORTI_SPK_DEV` unset** for Bluetooth.
- **No sound when running over SSH?** PipeWire is a per-user session service, so run the app as the same desktop user that's logged in (`gokul`). If needed, `export XDG_RUNTIME_DIR=/run/user/$(id -u)`.
- **Speaker disconnects:** BT speakers often go to sleep, so reconnect with `bluetoothctl connect XX:..` before the demo.
- **Delay:** Bluetooth adds about 150–300 ms of audio delay. The video voice-over sync tolerates it, so don't change the sync code.

### 3b. USB microphone (input)
```bash
arecord -l                                   # find the USB mic card
pactl list short sources                     # the USB mic appears as alsa_input.usb-...
# test 3 s recording, then play it back on the BT speaker:
arecord -f S16_LE -r 16000 -c 1 -d 3 /tmp/t.wav && aplay /tmp/t.wav
```
- Start the server with **`--mic <part of the USB source name>`** (for example `--mic usb`). `pick_mic()` selects it, unmutes it and sets the level to 60%.
- **Do NOT pick the Bluetooth speaker's own mic** (a `bluez_input` / headset profile). It switches the speaker to low-quality headset mode.
- **Level too low or too high?** Adjust only the mic volume (`pactl set-source-volume <source> 50%..80%`), not the code.

### 3c. USB webcam
```bash
v4l2-ctl --list-devices      # find the USB camera block; use its FIRST /dev/videoN number
```

## 4. Run the full app (camera + mic + Bluetooth speaker + UI)
```bash
cd ~/arm/lap && ./run.sh --host 0.0.0.0 --camera <N> --mic usb
# open from the laptop browser:  http://10.10.17.60:8000
```
- **No `run.sh` flag?** If `run.sh` doesn't pass `--host`, run `env -u PYTHONPATH PATH=$HOME/ps2_et/bin:$PATH ~/ps2_et/bin/python server.py --host 0.0.0.0 --camera <N> --mic usb`.
- **Vision only** (quick camera test, no audio): `env -u PYTHONPATH ~/ps2_et/bin/python ~/arm/vision/pi_stream.py --camera <N> --host 0.0.0.0 --port 8080`, then open `http://10.10.17.60:8080`.
- **Stopping the server:** never kill it with `pkill -f server.py` from a shell whose own command line contains that text (it kills your shell). Kill by PID.

## 5. Test checklist (write the results in `~/arm/PI_REPORT.md`)
1. **Camera:** put 2–4 items in view (paper, plastic bottle, battery, phone or charger). Each gets **its own box** with the correct bin, the header shows "N items", and boxes disappear about 0.2 s after an item is removed. Note the **FPS** shown.
2. **Speaker:** the welcome greeting plays on the **Bluetooth speaker**. Then the item explanation is spoken, and the educational video plays with its voice-over in sync.
3. **Mic and STT:** press "ask" and say "which bin is this?" in English, then Hindi, then Tamil. The transcript and the correct answer must appear in the chat and be spoken. Note the STT time per question (server log).
4. **Noise:** repeat question 3 with a fan or a person talking nearby. Report whether it still works. **Do not change the filters.** If it fails, report the transcripts.
5. **RAM:** read `ram_mb` / `ram_avail_mb` from `http://10.10.17.60:8000/api/state` after one question in each language, with Llama loaded. The total must stay under 8 GB, so report the numbers.
6. **Llama:** ask "how can I reduce plastic at home?". It should get a spoken answer.

## 6. If something fails
- **Fix only installation, device selection or configuration** (device numbers, `--mic`, default sink, missing package). **Don't edit the model logic, thresholds, filters or the UI.**
- Put the exact error lines, what you tried and the fix in `PI_REPORT.md`.
- Commit **only** `PI_REPORT.md` (plus any config fix) on a branch `pi-test`. **Do not push** and **do not add co-author lines.** The owner reviews it.
