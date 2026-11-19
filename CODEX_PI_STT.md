# Codex task: put Sorti's speech-to-text (STT) pipeline on the Raspberry Pi 5 app (no speaker yet)

Repo: https://github.com/dharshan188/arm. On the Pi it is cloned at `~/arm`, user `gokul`, IP 10.10.17.60, Raspberry Pi OS 64-bit, Python 3.13, venv `~/ps2_et`. The laptop copy (`~/arm2026`) is the reference implementation: copy its behaviour exactly; don't redesign it.

**Hardware on the Pi:**
- **Present:** USB webcam and microphone.
- **Not present:** a speaker. All spoken answers must appear as **text in the web UI**, and nothing may try to play audio.

## The STT method we use (implemented in `lap/server.py`, `lap/lid.py`, `lap/stt_fix.py`, `voice/domain_snap.py`)

1. **Microphone capture:**
   - Recorder: `arecord -f S16_LE -r 16000 -c 1 -t raw` (16 kHz mono).
   - Device: the server accepts an ALSA device in env `SORTI_MIC_DEV` (e.g. `plughw:CARD=Device,DEV=0`). Without it, it uses the PulseAudio default, with `pick_mic()` and `--mic SUBSTR`.
   - Volume: `pick_mic()` sets the mic to `MIC_VOL = "60%"`. At 100% the noise floor was as loud as speech. On the Pi, check the USB mic level with `amixer`/`alsamixer` and aim for a noise RMS of about 0.03.
   - Input to the models: float32 at 16 kHz.
2. **Voice activity detection:** Silero VAD (`voice/vad/silero_vad.onnx`, through `sherpa_onnx.VoiceActivityDetector`) cuts speech segments in hands-free and welcome mode. Press-to-ask (button or Space) records until release.
3. **Language ID** (`lap/lid.py`):
   - **Model:** Whisper **base** multilingual (`voice/stt_whisper_base_en/`, sherpa-onnx int8). Only the language-token logits are used.
   - **Pooling:** ml/te/kn count as ta, and ur/mr count as hi. English must win by 0.2 over the best Indic pool.
   - **When it runs:** on the welcome reply, and **in parallel with STT on every question**.
   - **Switching:** if the speaker uses another language with p ≥ 0.8 (≥ 0.9 to switch to English), the server switches language, reloads STT, and re-transcribes the same audio.
   - **Language names:** a spoken language name ("Tamil", "தமிழ்", "हिन्दी", or Whisper's Urdu-script ہندی) beats the Whisper guess (`content.pick_lang`).
4. **Speech recognition, one model per language; only the active language is loaded (RAM):**
   - **English:** **Moonshine base int8** (`voice/stt_moonshine_base_en/`), `sherpa_onnx.OfflineRecognizer.from_moonshine(preprocessor=preprocess.onnx, encoder=encode.int8.onnx, uncached_decoder=uncached_decode.int8.onnx, cached_decoder=cached_decode.int8.onnx, tokens=tokens.txt)`.
   - **Hindi / Tamil:** **AI4Bharat IndicConformer 120M CTC int8** (`voice/stt_indicconformer_{hi,ta}/model.int8.onnx` + `tokens.txt`), `OfflineRecognizer.from_nemo_ctc(...)`.
   - Measured on the laptop: about 0.1–0.3 s per question. Use `num_threads=4` on the Pi.
5. **Post-correction** (`lap/stt_fix.py`):
   - `correct(text, lang)` makes context-gated fixes such as west→waste, bean→bin and wait→wet. It leaves "west Bengal" alone.
   - `preprocess()` stays **OFF**: it hurt routing in loud noise (see `lap/stt_eval/REPORT.md`).
6. **Understanding:** `voice/domain_snap.snap(text, lang)` returns item, intent and a confident flag (rapidfuzz fuzzy match; it handles ASR spelling errors and Tamil/Hindi word endings).
   - **No item named:** the camera's current class is used.
   - **Intent `other`:** the question goes to Llama (with NLLB translation for hi/ta).
   - **Bins:** answers come only from `content.py` + `labels.json` `stream_map`, never from Llama.

## What to do on the Pi
1. `cd ~/arm && git pull`.
2. **Models:** run `./download_models.sh` (Moonshine, Whisper base, IndicConformer hi/ta, Silero VAD, Piper voices, NLLB). Install the packages from `requirements.txt` into `~/ps2_et` (torch 2.12.1 from the CPU index first; aarch64 wheels exist for cp313). Llama is optional (`llama/setup_llama.sh`), or copy `llama/*.pte` + `llama/checkpoint/tokenizer.model` from the laptop.
3. **Add a `--no-speaker` flag** to `lap/server.py` and `lap/run.sh`. It must:
   - Skip all `aplay` calls (`Speech.say`, `play`). Never load Piper TTS (it saves RAM) and never generate welcome WAVs.
   - Still send every spoken sentence to the UI as text (the reply text and the welcome prompt) through the existing state/answer fields, so the browser shows it.
   - Make welcome mode work silently: show the prompt text and listen with the VAD as usual.
   - Turn off anything that waits for audio playback to finish (for example the video voice-over sync): videos play muted, and the voice-over start no longer waits for audio.
4. **Start for the Pi:** `lap/run.sh --host 0.0.0.0 --no-speaker --camera N [--mic SUBSTR]`. The `--host` flag already exists. Find the USB webcam with `v4l2-ctl --list-devices`; Pi 5 USB cams are often `/dev/video8` or higher. Open `http://10.10.17.60:8000` from the laptop.
5. **Vision:** keep the app on the current `vision/labels.json` model unless told otherwise. A v2 model (11 classes, `v2_best/`, loaded through `vision/sorti_model.py`) exists. Integrating it into `server.py` (Vision class, 8-consecutive-frames ≥ 0.70 confirmation, ignore class `background`, new stream `general`) is a separate step: do it only if asked.
6. **Test on the Pi and report the numbers:**
   - **Speed:** STT time per question for en/hi/ta, LID time, RAM (`/api/state` `ram_mb`) with one language loaded.
   - **Typed questions:** `/api/ask/text` with "which bin for a battery" (en), "बैटरी किस बिन में" (hi), "பேட்டரி எந்த பின்ல போடணும்" (ta) → correct rule answers shown as text.
   - **Spoken questions:** press-to-ask with a real voice in each language → transcript + answer shown, and no audio errors in the log.
   - **Mic gotcha:** if nothing is heard, check `arecord -l`, set `SORTI_MIC_DEV`, unmute or raise the mic in `alsamixer`.

**Rules:**
- **Commits:** don't change the laptop behaviour when `--no-speaker` is not given. Commit on a branch and don't push without asking.
- **Stopping the server:** never kill it with `pkill -f server.py` from a shell whose own command line contains that text (it kills the shell). Use a PID file.
