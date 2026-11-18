# Sorti implementation review

17 November 2026. **Implementation and static checks completed. Required two rounds of rendered screenshot inspection remain incomplete.** No screenshot below is represented as captured or visually inspected.

## What changed

Rebuilt the application shell, camera stage, result, bin strip, conversation, microphone key, typed-question form and welcome screen. Warm paper and ink surfaces, local script fonts, large wayfinding typography, semantic bin colours and restrained motion replace the previous dark-card layout. The vanilla polling/API layer and existing interactions are preserved and extended with localised headings, a submit button and fixed review scenes.

All work is in `lap/web/`, apart from temporary test/preview scripts under `/tmp`. `server.py`, `content.py`, `videos/` and `web_backup_v1/` were not modified. The actual FastAPI server was never started or stopped.

## Review round 1 — source and behaviour

The requested static-only HTTP preview was attempted with `/tmp/sorti_preview.py`. Its socket creation failed:

```
PermissionError: [Errno 1] Operation not permitted
```

The direct Chrome CLI was also attempted using `--headless=new`, `--screenshot`, the target window size, a temporary user-data directory and a local file URL. Chrome failed before rendering:

```
crashpad/util/linux/socket.cc:45] setsockopt: Operation not permitted (1)
```

The connected browser inventory contained no available browsers. Therefore there were no round-1 screenshots to inspect.

Source review found and fixed:

- Long Tamil stream labels could consume too much vertical space. Shortened them to clear colour/stream terms without changing the category mapping.
- Duplicating the full fact in a compact result card could crowd the transcript. Compact screens now show the explanation in chat and omit that duplicate fact.
- Input had only an Enter gesture. Added a visible submit arrow with a localised accessible name.
- Welcome covered the app visually but did not make it inert. Added inert handling and focus entry/return.
- Reduced-motion users still received smooth chat scrolling. It now respects their preference.
- Mock mode previously risked requesting `/video` before replacing its source. Live mode now assigns that source at boot; mock remains self-contained.

## Review round 2 — source, contrast and state-machine checks

Ran the new self-contained `review_ui.py --pass-number 2`. The sandbox again rejected its temporary HTTP listening socket. A file-only Chrome fallback with its documented crashpad-testing flag also failed before rendering:

```
sandbox_host_linux.cc:41] Check failed: . shutdown: Operation not permitted (1)
```

No round-2 screenshots exist either. These are two review/attempt rounds, **not** the requested two successful visual QA passes.

Further fixes from source checks:

- Green text on the initial light-green result tint measured 4.26:1. Darkened semantic green to `#176b3b`; that pairing now measures 5.32:1.
- Kept all inactive bin labels at full text contrast rather than fading them.
- Reduced compact panel gaps/card padding and reserved a transcript region.
- Shortened recording instructions in Tamil/Hindi to reduce action-button wrapping while retaining release/tap-to-send meaning.
- Hid redundant language-choice sublabels only on compact welcome layouts; all three required full questions and language names remain.
- Avoided repeated custom-property writes when microphone levels are unchanged.

## Checks actually completed

- `node --check lap/web/app.js` passes.
- The `/tmp/sorti_behavior_check.cjs` Node VM harness passes **144 fixed scene/language/bin combinations**: 12 scenes × 3 languages × 4 bin types. It verifies snapshots, status attributes, stable scenes and expected stream mapping with no network requests.
- That harness also exercises recording start/stop → reply, welcome/restart/language selection, educational skip, typed question, auto toggle, history clear and the cycling voice-language welcome. It uses a minimal DOM stub: it does **not** validate real pointer events, layout, media playback or browser accessibility.
- HTML audit: all **41 original IDs** from the backup remain; **42 current IDs** are unique. Language, step, bin and model hooks remain.
- `tinycss2` parses the stylesheet without syntax errors.
- FontTools verifies the bundled Tamil/Devanagari fonts contain every non-space character in their respective required welcome questions. Native shaping/clipping still needs browser inspection.
- Python review tool compiles successfully.
- Audited text pairs meet 4.5:1: ink/paper 13.79; muted/paper 5.78; ink/lime 12.46; ink/recording 7.64; white/green 6.56; white/blue 6.16; white/red 6.05; white/grey 6.33; green/tint 5.32; blue/tint 5.04; red/tint 4.74; grey/tint 4.94; welcome secondary/dark 9.61; muted/user-message 5.22.

These source checks do not establish that the UI runs at 60fps on Raspberry Pi 5. No target-device performance measurement was possible.

## Screenshot handoff

Run from the project root in an environment where Chrome and loopback sockets are permitted:

```sh
python lap/web/review_ui.py --pass-number 1
# LOOK at all first-pass images, fix issues, then:
python lap/web/review_ui.py --pass-number 2
```

The script starts an isolated temporary static server, never the real app server. It uses the installed Chrome via Playwright and waits for local fonts before capture. It writes 48 screenshots per pass and `/tmp/sorti_r1_audit.json` or `/tmp/sorti_r2_audit.json`. Python Playwright is a development prerequisite only; kiosk runtime has no added dependency.

Expected screenshot paths below are **pending, not generated**. Expand each size/language suffix to `1920_en`, `1920_ta`, `1280_en`, `1280_ta`, and `rN` to `r1` and `r2`:

| State | Pending screenshot paths |
| --- | --- |
| Welcome asking | `/tmp/ui_rN_welcome-asking_<size>_<lang>.png` |
| Welcome listening | `/tmp/ui_rN_welcome-listening_<size>_<lang>.png` |
| Welcome detecting | `/tmp/ui_rN_welcome-detecting_<size>_<lang>.png` |
| Welcome waiting | `/tmp/ui_rN_welcome-waiting_<size>_<lang>.png` |
| Loading | `/tmp/ui_rN_loading_<size>_<lang>.png` |
| Watching | `/tmp/ui_rN_watching_<size>_<lang>.png` |
| Item entering | `/tmp/ui_rN_seeing_<size>_<lang>.png` |
| Detected / speaking | `/tmp/ui_rN_detected_<size>_<lang>.png` |
| Educational video | `/tmp/ui_rN_video_<size>_<lang>.png` |
| Listening | `/tmp/ui_rN_listening_<size>_<lang>.png` |
| Thinking | `/tmp/ui_rN_thinking_<size>_<lang>.png` |
| Spoken answer | `/tmp/ui_rN_answer_<size>_<lang>.png` |

A direct CLI alternative after starting the isolated preview is:

```sh
google-chrome --headless=new --user-data-dir=/tmp/sorti-review-chrome \
  --screenshot=/tmp/ui_detected_1920_en.png --window-size=1920,1080 \
  --virtual-time-budget=1200 'http://127.0.0.1:8765/?mock=1&scene=detected&lang=en'
```

## Remaining visual questions for Claude / next reviewer

1. Inspect all 48 images per round at native size: camera/result balance, actual empty space and whether controls fit at 1280×800.
2. Inspect Tamil and Devanagari shaping, line boxes and longest labels. The bundled fallback is Lohit rather than the initially intended Noto; judge its actual quality before showcase use.
3. Check welcome waiting/detecting, long transcripts, translations and the English-only Tamil answer metadata. Ensure the current spoken message remains reachable.
4. Confirm video captions stay within three lines, credit and skip do not overlap, and the real media retains the expected ratio.
5. Check the classifier overlay against the real camera image, focus navigation, hold/tap/Space, and touchscreen target sizes.
6. Judge whether the poster/arrow treatment feels specific enough. Decorative rings and a generic headline remain subjective risks until rendered review.
7. Measure animation/frame timing on Pi 5, including camera polling and video playback. Source avoids costly backgrounds, large blurs and animated shadows, but that is not a performance guarantee.
