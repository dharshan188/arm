Project: /home/dharshan/arm2026 - offline waste-sorting kiosk (lap/server.py). Users ask questions by voice in English,
Hindi or Tamil. STT: English = sherpa-onnx Whisper base.en int8 (voice/stt_whisper_base_en), Hindi/Tamil = sherpa-onnx
moonshine "Shruti" (voice/stt_shruti_hi, voice/stt_shruti_ta). See voice/README.txt for load snippets and
lap/server.py class Speech (load / transcribe) for exactly how the app uses them. The transcript then goes to
voice/domain_snap.py snap(text, lang) (fuzzy keyword intent/item matcher) and, for intent 'other', to Llama.
PROBLEM (owner): "I say waste, it hears west", and many other words come out wrong.
Python: env -u PYTHONPATH ~/ps2_et/bin/python   (always unset PYTHONPATH). RAM is limited: load ONE STT model at a time,
never run two heavy python processes at once. Do NOT edit lap/server.py, content.py, or anything in lap/web or
lap/videos - Claude is editing server.py in parallel. Do not start/kill servers.

TASK 1 - Evaluation set, lap/stt_eval/:
- make_set.py: ~40 realistic kiosk questions per language (en, hi Hinglish in Devanagari, ta casual Chennai Tamil in
  Tamil script), about waste: "where do I put this waste", "which bin for a battery", "is plastic recyclable",
  "what is e-waste", "how to reduce kitchen waste", "can I put a pizza box in blue bin", etc. Include the
  confusable words: waste, bin, wet, dry, recycle, plastic, battery, bulb, e-waste, compost, glass, metal, paper.
  Synthesize each with the Piper voices in voice/tts_piper_{en,hi,ta_female,ta_male} at 2 speeds, resample to 16 kHz,
  then make a clean copy and noisy copies (SNR 15 dB and 5 dB; use pink noise plus a babble mix of other utterances,
  plus a mild low-pass/room colouration so it sounds like a laptop mic). Save wav + refs.jsonl.
- eval.py: runs a given STT (en/hi/ta, model dir as argument, loaded exactly as server.py does) over the set; reports
  WER/CER per condition, the "domain keyword accuracy" (did waste/bin/battery... survive), and how often
  domain_snap gets the right intent+item, before and after the corrector. Print a compact table, write results json.

TASK 2 - lap/stt_fix.py:  correct(text, lang) -> text
- Domain-aware post-correction of STT output, applied before domain_snap and Llama. English: phonetic/fuzzy
  correction toward a domain vocabulary only when the context makes it likely (west->waste, waist->waste,
  "bean"/"been"->bin near put/throw/which, "wait"->"wet", "dry"/"try", "recycle" variants, "e waste"/"ewaste"->"e-waste",
  "battery" variants, plastic/plastics, "compost" variants...). Must NOT break normal sentences
  ("west Bengal", "I want to wait" with no waste context) - write unit tests (lap/stt_eval/test_fix.py) for both.
  Hindi/Tamil: common moonshine mis-spellings of the loanwords (वेस्ट, बिन, रीसायकल, प्लास्टिक, बैटरी; வேஸ்ட், பின்,
  ரீசைக்கிள், பிளாஸ்டிக், பேட்டரி) found in your eval output - map them back. Keep it fast (<5 ms) and pure python
  (rapidfuzz is available).
- Also provide preprocess(audio_float32_16k) -> audio: remove DC, trim leading/trailing silence (energy based, keep
  150 ms pad), normalise peak to 0.9, pad 0.25 s silence each side. Measure in eval.py whether it helps; if it hurts
  a model, say so.

TASK 3 - compare English models with eval.py (one at a time): voice/stt_whisper_base_en (current) and, if present,
voice/_dl/sherpa-onnx-moonshine-base-en-int8 and voice/_dl/sherpa-onnx-whisper-small.en (use the int8 files;
Claude is downloading/extracting them - if missing, skip and say so). Report WER + latency per utterance + RSS.

FINAL: write lap/stt_eval/REPORT.md: tables before/after, recommendation (which English model, whether preprocess
helps, corrector gains), and exactly how server.py should call stt_fix (one or two lines). Keep it short.
