# arm2026 — PS2 offline waste-sorting assistant

Goal: an offline assistant on a **Raspberry Pi 5** (64-bit Raspberry Pi OS, CPU only). The camera classifies a waste item and tells the user which bin it goes in. The user can ask questions by voice in **Tamil, Hindi or English** and gets a spoken answer. Free-form questions that don't match a known intent go to a local Llama model, which isn't set up yet. Models were trained and exported in Google Colab, and this folder holds the deployable outputs.

```
arm2026/
├── vision/   image classifier (ExecuTorch .pte, XNNPACK backend)
├── voice/    offline STT + TTS models (ONNX) + intent matcher
├── llama/    Llama 3.2 1B QLoRA INT4 (.pte) for free-form questions
├── translate/ NLLB-200 600M INT8 (CTranslate2) for Hindi/Tamil <-> English around Llama
└── lap/      the integrated app, with the laptop standing in for the Pi (web UI "Sorti")
```

## vision/

- **Best model:** `mobilenet_v3_large_int8_xnnpack.pte` (4.5 MB, full INT8 PTQ).
  - Test results: 9-class F1 0.929, 4-stream F1 0.939, accuracy 94.0%.
  - Speed: about 16 ms per image (p50) on Colab CPU, about 2–3 ms on this laptop.
- **Other models:**
  - `mobilenet_v3_large_fp32_xnnpack.pte`: FP32 reference.
  - `efficientnet_b0_int8_xnnpack.pte`: F1 0.893.
  - `mobilenet_v3_small_int8_xnnpack.pte`: **broken after INT8** (F1 0.29). Don't use it.
- **Metrics:** `summary_final.csv` and `*_metrics.json` hold the full numbers.
- **`labels.json`:** classes, display names, the class→stream map and the preprocessing spec.
  - **Classes:** battery_waste, clothes, e_waste, glass_waste, light_bulbs, metal_waste, organic_waste, paper_waste, plastic_waste.
  - **Streams:**
    - biodegradable = GREEN bin
    - recyclable = BLUE bin
    - hazardous = RED bin (battery, bulbs)
    - e_waste = authorised e-waste collector
  - **Preprocessing:** resize the short side to 256, centre-crop 224, ImageNet mean/std, NCHW RGB float32 `[1,3,224,224]`.
- **`webcam_demo.py`:** live webcam overlay showing the class, bin, top-3 and latency.
  - Keys: `q` quit, `s` snapshot, `space` freeze, `f` full frame / centre box.
  - Other inputs: `--image x.jpg`, `--video x.mp4`, `--headless`, `--camera N`.
- **`pi_benchmark.py`:** Pi 5 latency and accuracy benchmark on `pi_testset/` (9 class folders, about 550 images).

### Running on this laptop (Ubuntu 22.04, Python 3.10)

The venv is at **`~/ps2_et`**, with executorch 1.3.1, **torch 2.12.1+cpu**, opencv-python, pillow and numpy.

```
cd ~/arm2026/vision
env -u PYTHONPATH ~/ps2_et/bin/python webcam_demo.py --pte mobilenet_v3_large_int8_xnnpack.pte --labels labels.json
```

Gotchas:
- **Pin torch 2.12.x.** ExecuTorch 1.3.1 was built against torch 2.12. With torch 2.14, loading fails with `undefined symbol ... materialize_cow_storage`.
- **Install torch from `https://download.pytorch.org/whl/cpu`.** A plain `pip install` on Linux pulls the CUDA build, which adds about 3 GB of NVIDIA libraries.
- **Unset PYTHONPATH.** The shell exports ROS Humble and IRC26 workspace paths into `PYTHONPATH`, so use `env -u PYTHONPATH` to keep them out.
- **Harmless warnings:** torchao `_C_mxfp8` / cutlass load failures, Qt font-directory warnings, cpuinfo `midr` messages.

Quick sanity check, one image per class: 6/9 correct. Plastic was confidently predicted as glass (89%). Metal and organic misses were low-confidence.

## voice/  (installed in `~/ps2_et` and round-trip tested on this laptop, 2026-11-16)

| Folder | Role | Engine | Licence |
|---|---|---|---|
| `stt_shruti_ta/` | Tamil STT | sherpa-onnx `from_moonshine` (preprocess/encode/uncached_decode/cached_decode .onnx + tokens.txt) | Apache-2.0, keep NOTICE |
| `stt_shruti_hi/` | Hindi STT | same as Tamil | Apache-2.0, keep NOTICE |
| `stt_whisper_base_en/` | English STT | sherpa-onnx `from_whisper`, INT8 | MIT |
| `tts_piper_hi/` | Hindi TTS (pratham, medium) | piper-tts | see MODEL_CARD |
| `tts_piper_en/` | English TTS (lessac, medium) | piper-tts | see MODEL_CARD |
| `tts_mms_ta_onnx/` | Tamil TTS, OLD fallback (Meta MMS, word by word) | onnxruntime + HF tokenizer | **CC-BY-NC-4.0, non-commercial only** |
| `tts_piper_ta_female/` (+`_male`) | **Tamil TTS in use** (Piper, AI4Bharat Rasa) | piper-tts | CC-BY-4.0 |

- **Packages:** `pip install sherpa-onnx piper-tts onnxruntime transformers rapidfuzz soundfile numpy`
- **STT input:** 16 kHz mono float32. `voice/README.txt` has copy-paste snippets for every model.
- **`domain_snap.py`:** `snap(transcript, lang)` returns `{'item', 'intent', 'item_score', 'intent_score', 'confident'}`. It fuzzy-matches the transcript against the keyword tables (rapidfuzz), which tolerates ASR spelling errors and Tamil/Hindi case endings.
  - `item=None` means no item was named, so use the camera classifier's result.
  - Intents: `which_bin`, `recyclable`, `hazardous`, `where_to_give`, `repeat`.
  - `intent='other'` means the question goes to Llama.
- **`speech_bench.py`:** benchmark (prep / stt / tts / roundtrip subcommands, each candidate run in its own subprocess).
- **Measured on Colab CPU with 2 threads** (the Pi 5 will be somewhat slower):

  | Model | RAM | Latency |
  |---|---|---|
  | STT Tamil | ~455 MB | ~1.1 s per 3 s question |
  | STT Hindi | ~420 MB | ~1.0 s per 3 s question |
  | STT English | ~740 MB | ~1.1 s per 3 s question |
  | TTS Tamil MMS | ~615 MB | ~2.2 s per 3 s of speech |
  | TTS Piper (Hindi / English) | ~200–230 MB | ~0.4 s |

  Intent accuracy was 96–100%, and item accuracy 83% ta, 92% hi, 99% en. These were measured on synthetic voices, so they need re-testing with real recordings.

## llama/

- **Model:** `llama3_2_1b_qlora_int4_xnnpack.pte` (1.1 GB), Llama 3.2 1B Instruct.
  - Source: Meta's QLoRA INT4 checkpoint `meta-llama/Llama-3.2-1B-Instruct-QLORA_INT4_EO8`, under the Llama 3.2 Community Licence.
  - Raw checkpoint plus `tokenizer.model` are in `checkpoint/`.
- **`setup_llama.sh`:** re-downloads the checkpoint and re-exports it.
  - Needs `hf auth login`.
  - The export peaks at about 6.2 GB of RAM and takes about 6 minutes on this laptop.
  - It needs `~/ps2_et/bin` on PATH, for `flatc`.
- **`chat.py`:** `env -u PYTHONPATH ~/ps2_et/bin/python chat.py "question"`.
  - `ask(runner, question)` returns a clean string, so it can be imported.
  - **Load the custom ops before creating a TextLLMRunner** (`executorch.extension.llm.custom_ops.custom_ops` and `executorch.kernels.quantized`). Otherwise it fails with `Missing operator llama::custom_sdpa.out`.
  - Uses the Llama 3 chat template, `num_bos=0`, greedy decoding, and a short waste-sorting system prompt.
- **Measured on this laptop:** about 32 tok/s decode, about 160 tok/s prefill, about 2.2 GB RSS, about 1.3 s per short answer. The Pi 5 will be slower.
- **Quality caveat:** it said a used AA battery goes in the GREEN bin, which is wrong. Never let Llama answer bin questions. Those must come from `domain_snap` + `labels.json` `stream_map`; Llama handles only intent `other`.

## translate/

- **Model:** `nllb_600m_ct2_int8/`, which is `JustFrederik/nllb-200-distilled-600M-ct2-int8` (594 MB).
  - **Licence: CC-BY-NC-4.0, non-commercial only** (the same as the Tamil TTS).
  - Needs `ctranslate2` and `sentencepiece`.
- **Why it's needed:** Llama 3.2 has no Tamil. Asked to translate the Tamil for "how to reduce plastic at home", it produced "basketball".
- **Measured on this laptop:** about 1.0 GB RSS, 0.5 s load, about 0.5 s for a question into English, about 2 s for an answer back.

## lap/  (the laptop as the Pi: its webcam, mic and speaker)

- **Run:** `lap/run.sh [--lang en|hi|ta] [--camera N] [--mic SUBSTR]`, which opens http://127.0.0.1:8000. `--lang` skips the welcome screen.
  - Mock UI without a camera: `/?mock=1&lang=ta`.
- **`server.py` (FastAPI):** the browser is only the screen. The server owns the camera (OpenCV, MJPEG at `/video`), the mic (`arecord`) and the speaker (`aplay`), as it would on the Pi.
  - **Camera:** classifies the centre 80% square. When it's stable (18 frames, mean conf ≥ 0.75), it explains the item aloud (bin + one fact, from `content.py`), then asks "any questions?".
  - **Questions:** press-to-ask (or Space), or typed at `/api/ask/text`.
  - **Answering:** STT → `domain_snap` → rule answer. Intent `other` goes NLLB → Llama (English) → NLLB back.
- **Welcome screen (asks the language by voice):** with no `--lang`, the app starts on a welcome overlay.
  - It plays cached greetings from `lap/audio/welcome_{en,hi,ta}.wav`, made once by a child process (`server.py --make-welcome`) so no extra TTS stays in RAM.
  - It then listens with **Silero VAD** (`voice/vad/silero_vad.onnx`) and identifies the language with **multilingual Whisper base, `language=""`**.
  - **Deciding the language** (`content.pick_lang`): a spoken language name ("Tamil", "தமிழ்", "हिन्दी", or Whisper's Urdu-script ہندی) wins over Whisper's guess. Otherwise ur/mr→hi and ml/te/kn→ta. Tags like `[Music]` are stripped, and empty means not heard.
  - Fallbacks: tap a language button, or use hold-to-talk. `/api/welcome` starts over, and so does 150 s of inactivity.
  - **Ask for a sentence, not a single word:** one word ("தமிழ்") was detected as Hindi, while a short sentence worked.
  - Mixed with real room noise, en, hi and ta were all detected correctly.
- **Speaker→mic self-test fails when headphones are plugged in.** The sink port switches to Headphones, so the mic hears only noise.
- **Tone:** like a friend talking, not a textbook. Tamil is spoken Chennai Tamil and Hindi is Hinglish, with English words in native script (ப்ளூ பின், रीसायकल), because the MMS Tamil voice can't read Latin letters. The user said formal Tamil sounded like "watching Ramayana".
  - `content.casual()` swaps NLLB's formal words for spoken ones in Llama answers.
  - Llama uses the `FRIEND` persona prompt.
  - `domain_snap` has casual cues (எந்த பின்ல, எங்க போடணும், किस बिन, डेंजरस).
- **Tamil voice is now Piper `voice/tts_piper_ta_female/`** (`tinisoft/piper-ta_IN-rasa_female-medium`, AI4Bharat Rasa, **CC-BY-4.0**). Use `--ta-voice male|mms` to switch.
  - **Why:** MMS read word by word, so sentences didn't flow.
  - **Measured on 4 casual Tamil lines:** MMS took 14.5 s to make 50 s of audio, with 27 long pauses. Piper female took 2.4 s for 36 s, with 16 pauses.
  - **Round-trip STT:** the Tamil recognizer heard the Piper female line almost word-perfect, including "super" and "square". Female beat male, which turned பின்ல into பிள்ளை.
  - **Side effects:** about 400 MB less RAM, and Tamil loads in 2.3 s.
  - **Pace:** Tamil runs at 1x speed (`TA_SLOW=1.0`, `--ta-slow`). The user tried 1.15 ("slightly slow") and then asked for 1x; earlier tuning used `TA_SLOW=1.15` (Piper `length_scale`, `--ta-slow`), with Tamil pauses kept at 110/320 ms. Averaged over 6 runs this is about 11% slower. `length_scale` alone barely shows because run-to-run variation is about ±5%.
- **Fluency:** the Tamil MMS voice paused 0.3–0.6 s between almost every word, which the user described as "one word one word". `tighten()` shrinks every TTS gap to 70 ms, or 220 ms at sentence ends. The Tamil welcome line went from 7 pauses in 7.0 s to 1 in 5.4 s.
- **`content.py`:** all spoken and UI text in en/hi/ta. Bins come only from here + `stream_map`.
- **`web/`:** `index.html`, `style.css`, `app.js` (vanilla, offline, no CDNs). The API is in `CONTRACT.md`.
- **Mic gotcha:** the laptop's default PulseAudio source is the empty headset jack, and both inputs were muted. `pick_mic()` chooses the built-in DMIC (`..._6__source`) and unmutes it.
- **RAM plan** (the laptop froze once from running out of memory while the server, two agents, a pip install and a download ran together):
  - **Always loaded:** vision about 0.2 GB, plus only the active language's STT+TTS, 0.4–1.0 GB. Baseline RSS is about 0.6–0.8 GB.
  - **Llama** (about 2.2 GB) and **NLLB** (about 1.0 GB) load lazily on the first free-form question, then unload after 180 s idle (`IDLE_UNLOAD_S`).
  - **Before each load,** the server checks MemAvailable (need + 600 MB margin). If that's short, it unloads the other heavy model; if still short, it speaks a "low memory" reply instead of freezing.
  - **Measured peak:** 3.9 GB RSS in Tamil with everything loaded. It fits on the 8 GB Pi.
  - **Shared state:** `/api/state` reports `ram_mb` and `ram_avail_mb`, and the UI shows them.
- **Kill gotcha:** `pkill -f server.py` (or `pgrep -f ...` + kill) from a shell whose own command line contains that text kills the shell (exit 144). Use a PID file instead.

## lap/videos: 50 educational videos (DONE, 2026-11-16 night)
- **Library:** 49 code-drawn explainers plus 1 real Pixabay clip (`e_waste/140076`), all listed in `videos/index.json`.
  - Each explainer is about 40 s, with a stick-man narrator and 5 beats: comic intro → harm (real stats as counters) → who it affects → disposal (prep steps, then the right bin) → prevention (swap).
  - There are no AI images and no stock footage. Text appears only as numbers in frames; the words are in the voice-over and the app's subtitles.
  - Total size is about 306 MB.
- **Per type:** plastic 8, organic 8, e-waste 8, paper 6, metal 5, battery 4, clothes 4, glass 4, light bulbs 3.
- **Rendering:**
  - `videos/render.py <spec>|all|reindex` renders `specs/*.json` (Claude's 28) and `specs/codex/*.json` (Codex's 20) into `<cls>/<slug>.mp4` (silent) plus `<slug>_{en,hi,ta}.wav`.
  - `explainer.py` holds the original plastic-bottle reference, the drawing kit and the scene functions.
  - Scene length = the longest language's voice-over + 0.6 s.
  - `SORTI_NO_INDEX=1` skips index writes for a parallel renderer; run `render.py reindex` afterwards.
- **Rules:**
  - Specs follow `videos/specs/README.md`: allowed ITEMS/VICTIMS keys, casual ta/hi in native script, numbers as words, real stats in `sources`.
  - `check_specs.py` validates all specs (48 OK).
- **General videos (2026-11-17):** one per type, `<cls>/general.mp4` (plastic's is `explainer`), from Codex via `videos/CODEX_GENERAL.md`. The camera knows only the type, so `pick_video(cls)` always plays the general one. Item videos stay in the library (one per item).
- **Stick man v2 (2026-11-17):** Codex reviewer/fixer loop (`videos/stickman_loop.sh`, `STICKMAN_TASK.md`, `STICKMAN_REVIEW.md`) rewrote `stickman()`: elbows, round hands, knees, feet, shoulders, rounded joints. Originals in `*.bak_stickman`. `big_number(maxw=)` shrinks long stat labels to fit. All 57 re-rendered.
- **App behaviour:** `announce()` → short spoken intro → `pick_video(cls)` (general video; falls back to rotating item videos) → video plus voice-over → "any doubts?".
- **Codex:** produced 20 of the specs and videos, from `videos/CODEX_PROMPT.md`, run in a separate terminal with `codex exec -s workspace-write`.
- **Not finished:** the Pixabay real-footage path (`build.py`, CURATE.md) is mostly abandoned because its results were poor. Only 140076 is used.

## 2026-11-17: STT, latency, memory, UI overhaul
- **English STT = Moonshine base int8** (`voice/stt_moonshine_base_en`), plus `lap/stt_fix.py`: `preprocess()` (OFF: lowers WER but hurts intent+item routing in loud noise, see `lap/stt_eval/REPORT.md`) and `correct(text, lang)` (context-gated: west→waste, bean→bin, wait→wet; leaves "west Bengal" alone).
  - On the `lap/stt_eval` set (Codex-built Piper TTS + noise), Whisper base.en → Moonshine: WER 5.7→2.8% clean, 10.8→4.5% at 15 dB SNR; keyword accuracy 86→99%; 0.64→0.28 s per question.
  - Whisper base is still used for welcome language-ID.
- **Hindi/Tamil STT = AI4Bharat IndicConformer 120M CTC int8** (`voice/stt_indicconformer_{hi,ta}`, sherpa `from_nemo_ctc`, MIT/Apache-2.0), replacing Shruti.
  - Clean WER hi 35→14%, ta 60→26%; CER hi 30→4%, ta 38→6%.
  - 0.1–0.16 s per question.
  - Details: `lap/stt_eval/INDIC_REPORT.md`. The Tamil whisper-small CT2 challenger in `voice/_dl` was not evaluated (Codex stopped).
- **Language-ID (`lap/lid.py`):** Whisper base language-token logits, pooled to en/hi/ta (ml/te/kn→ta, ur/mr→hi). English must win by 0.2 over the best Indic pool. 159/160 correct on the eval set; about 0.5 s.
  - Used on the welcome reply.
  - Also runs on every question, in parallel with STT. If the visitor speaks another language (p≥0.8, or ≥0.9 to switch to English), the server switches language, reloads STT/TTS (~1.5 s) and re-transcribes.
- **Mic gain:** was 100% (+20 dB over the DMIC's 46% = 0 dB), with a noise floor of rms 0.18 (as loud as speech). `pick_mic()` now sets `MIC_VOL = "60%"` (noise ~0.03).
- **Video A/V sync:** the browser buffers and pauses at 0, then POSTs `/api/video/ready`. The server then starts the voice-over and sends `video.t` (epoch seconds). `app.js` `syncVideoFrame()` keeps `currentTime = now - t` (rate nudges, seeks when >0.4 s off); measured drift is 0.03 s. No loop/autoplay. If the browser never reports ready, the voice-over starts after 4 s.
- **Video subtitles hidden** (`#edu-caption { display:none }`), at the owner's request.
- **Latency:**
  - `Speech.say()` streams sentence by sentence; first sound on a 460-character reply went from 5.4 s to 0.4 s.
  - Llama (+ NLLB for hi/ta) prewarms in the background once a language is chosen, and stays loaded up to 15 min unless RAM is under 1.5 GB.
- **No "memory full" reply any more:**
  - `mem_avail_mb` counts MemAvailable + half of free swap; `MARGIN_MB` is 150; Llama `need_mb` is 1900 (measured RssAnon 1.8 GB).
  - On `LowMemory`, the app gives the rule answer for the current item, or `PHRASES["bins_tip"]`.
- **domain_snap fixes:** plain "waste" no longer fuzzy-matches `e-waste` (short-prefix hyphen keywords must appear literally); wet/kitchen waste → organic.
- **Llama `FRIEND` prompt:** says the question is speech-recognised and that west/waist = waste, bean = bin.
- **Web UI v2:** Codex redesigned it (`lap/web/DESIGN*.md`, `REVIEW*.md`), and Claude reviewed it in headless Chrome mock screenshots (`?mock=1&scene=welcome-listening|detected|video|listening|answer&lang=..`). Old UI in `lap/web_backup_v1/`.
  - Codex's sandbox can't take screenshots, so render them yourself (static server: a dir with `static -> lap/web` symlink + index.html).
  - Codex CLI: images via `-i`, but then pipe the prompt through stdin (`cat p.md | codex exec ... -i a.png`); web search via `codex --search exec`; network via `-c sandbox_workspace_write.network_access=true`.

## Intended pipeline

mic → language-specific STT → `domain_snap.snap()` → (item from speech, or the camera classifier if no item was named) → bin answer from `labels.json` `stream_map`, or send the question to Llama if intent is `other` → TTS in the same language → speaker.

## Not done yet

- **Voice testing:** done with synthetic voices only (sherpa-onnx 2.0.1, piper-tts 1.8.0, onnxruntime 1.23.2, transformers 5.20.2, torch still 2.12.1+cpu). Next, test with real microphone recordings.
- **Main app:** done (lap/). Tested end to end: speaker → laptop mic → STT 0.58 s → correct rule answer, spoken. Still to do: test with a real human voice in a noisy room.
- **Llama:** done (see llama/). Still to check: answers in Tamil and Hindi, and speed on the Pi.
- **Pi 5:** deploy and benchmark there with `vision/pi_benchmark.py` and `voice/speech_bench.py`.
- **Memory budget:** all three STT models plus Tamil TTS won't fit comfortably in RAM alongside Llama. Plan to load only the active language.

The original zips are kept in `~/Downloads`: `ps2_waste_deploy.zip` and `ps2_voice_models.zip`.

## 2026-11-17 (late): real-photo documentary videos (`general_photo`) for all 9 types
- The owner found the stick-man videos "too childish". Each type now has `<cls>/general_photo.mp4` (+ `_en/_hi/_ta.wav`, `.jpg`), which plays first: `pick_video` prefers `general_photo` → `general` → `explainer`.
- **Renderer:** `videos/photo_explainer.py specs/photo/<cls>.json [--preview] [--register]` does Ken Burns pans over real photos, cross-fades, a grade + vignette, stat counters, a steps→bin badge, and a photo credit on every frame. 41–62 s each.
- **Photos:** Wikimedia Commons only (CC0 / PD / CC BY / BY-SA), in `videos/photos/<cls>/` with `credits.json`.
  - `tools/commons_fetch.py` downloads them. Run it **serially**: parallel calls get HTTP 429, and only standard thumbnail widths (1280) work.
  - `tools/shot_sheet.py` builds contact sheets; `tools/apply_picks.py` fills the shots.
- **Scripts:** plastic is by Claude, fact-checked by Codex (`specs/photo/REVIEW_plastic.md`). The other 8 are by Codex from `specs/photo/CODEX_PHOTO_TASK.md`; Claude reviewed them and fixed the battery/bulb disposal lines.
- **Review copies:** `videos/review/<cls>.mp4` has en/hi/ta as three audio tracks (switch in VLC: Audio → Audio Track).
