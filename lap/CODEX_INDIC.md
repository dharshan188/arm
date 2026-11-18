Project /home/dharshan/arm2026 (offline waste kiosk for Raspberry Pi 5: 8 GB RAM, 4x Cortex-A76, CPU only).
Hindi and Tamil STT are bad: on lap/stt_eval (your own harness; see lap/stt_eval/eval.py, results/hi.log, ta.log)
the current sherpa-onnx moonshine "Shruti" models give WER 35% (hi) and 60% (ta) on CLEAN audio, keyword accuracy
~60%. English is solved (moonshine base + stt_fix). Your job: find, download and evaluate a clearly better OFFLINE
Hindi and Tamil STT that runs on the Pi CPU (int8 OK; <= ~1 GB RAM per language; < ~1.5 s for a 3 s question on
this laptop = roughly 2-3 s on the Pi).

1. Research (web search): candidates such as AI4Bharat IndicConformer (per-language 120M NeMo models, ONNX exports,
   hybrid CTC/RNNT), the multilingual IndicConformer 600M, sherpa-onnx pretrained Indic models (k2-fsa releases /
   huggingface csukuangfj/*), Vistaar / IndicWhisper, whisper small/medium fine-tuned for Hindi/Tamil converted to
   ONNX/CTranslate2 (faster-whisper int8), Vosk Hindi, etc. Check licences (commercial use OK preferred; note NC).
   Write lap/stt_eval/INDIC_CANDIDATES.md with links, size, licence, expected WER, runtime.
2. Download the 2-3 most promising into voice/_dl/<name>/ (skip anything > 2 GB download). pip installs into
   ~/ps2_et are allowed ONLY if needed and must not change torch (pinned 2.12.1+cpu) - use --no-deps where possible.
3. Extend lap/stt_eval/eval.py so each candidate can be evaluated on the same hi/ta set (WER, CER, keyword, snap,
   latency, RSS). Note the references are casual spoken Tamil/Hinglish with loanwords in native script, so also report
   a normalised WER (strip punctuation, unify common spellings) - formal vs casual spellings must not dominate.
   Run ONE evaluation process at a time, and before starting check that no other eval.py is running
   (pgrep -f stt_eval/eval.py) - another job may still be using RAM; wait for it.
4. Write lap/stt_eval/INDIC_REPORT.md: table vs Shruti baseline, the winner per language, exact load code
   (sherpa-onnx or ctranslate2/faster-whisper style) that Claude can paste into lap/server.py Speech.load/transcribe,
   and RAM/latency. Do NOT edit lap/server.py, lap/web, lap/videos yourself.
