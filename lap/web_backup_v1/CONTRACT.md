# UI contract (shared by index.html / style.css / app.js)

Served by `lap/server.py` at http://127.0.0.1:8000. `/` serves `web/index.html`; everything else in `web/`
is at `/static/<file>`. Fully offline: NO CDNs, NO Google Fonts, NO external requests (it runs on a Pi with no
internet). Fonts: system stacks only. Use "Noto Sans Tamil"/"Noto Sans Devanagari" names in the stack (present
on Raspberry Pi OS / Ubuntu) because the UI shows Tamil and Hindi text.

Target screen: a 1280x720-ish kiosk display (Pi 5 + monitor), also must work at 1920x1080 and on a laptop.
Viewed from ~1 m away by members of the public, so text must be large and readable; no tiny grey 11px text.

## Files
- `index.html`  structure + all element IDs below (agent A)
- `style.css`   all visual design (agent A)
- `app.js`      all behaviour: polling, rendering, button, animation hooks (agent B)
- app.js only toggles classes / data-attributes / textContent; style.css owns how they look.

## Required DOM (IDs are fixed)
- `#video`            <img src="/video"> live MJPEG camera feed (already mirrored by the server)
- `#scan-guide`       overlay square over the centre of the video = the region the classifier sees
                      (80% of the shorter side, centred). app.js sets `data-state` = idle | seeing | locked
- `#live-label`       live top-1 label on the video (text), `#live-conf` confidence bar (app.js sets style --p: 0..1)
- `#live-top3`        list of 3 rows: name + probability
- `#item-card`        the announced item. `data-bin` = green|blue|red|grey|none
    - `#item-title`, `#item-bin`, `#item-fact`
- `#bins`             4 bin chips (green, blue, red, grey). The active one gets class `active`.
- `#chat`             conversation list. app.js appends `<li class="msg" data-role="user|assistant"
                      data-kind="explain|prompt|question|answer|error" data-source="rules|llama">` containing
                      `.msg-text`, optional `.msg-translation` (English translation), optional `.msg-meta`.
                      The message currently being spoken gets class `speaking`.
- `#ask-btn`          the big press-to-ask button. Press-and-hold OR click-to-toggle (both).
                      app.js sets `data-state` = ready | recording | thinking | speaking | disabled.
                      Keyboard: Space bar also toggles.
    - `#ask-label`    text inside the button, `#mic-meter` (app.js sets style --level: 0..1 while recording),
    - `#rec-time`     seconds recorded
- `#status`           status pill: app.js sets `data-status` = loading|watching|speaking|listening|thinking + text
- `#lang`             3 language buttons `button[data-lang="en|hi|ta"]`, active gets `aria-pressed="true"`
- `#auto-toggle`      checkbox: auto-announce on/off
- `#explain-btn`      "Explain this item" (force announce current prediction)
- `#stop-btn`         stop speaking
- `#models`           small model-status row: `[data-model="vision|stt|tts|llama"]` with `data-state`
                      = off|loading|ready|error
- `#stats`            fps + model latency (ms) text
- `#toast`            transient error text (app.js sets class `show`)
- `body[data-status]` mirrors status, so CSS can theme whole-page states.

## API
GET  /api/state?since=<last_id>  poll every ~250 ms. Returns:
  { lang, langs:{en:"English",hi:"हिन्दी",ta:"தமிழ்"}, status, auto,
    pred: {cls, stream, color, title, bin, conf, stable, top3:[{cls,title,p}], ms, fps} | null,
    item: {cls, stream, color, title, bin, fact, t} | null,      // last announced item
    models: {vision, stt, tts, llama},  mic_level: 0..1, rec_s: seconds recording,
    speaking_id: message id being spoken | null, error,
    messages: [ {id, role, kind, text, lang, t, source?, translation?, intent?, item?, stt_s?, llm_s?,
                 english_reply?} ]  // only ids > since; but a message can be PATCHED later (translation,
                                     // intent added to a question) -> re-send of full list: use since=0
                                     // every ~2 s or diff by id and update in place.
    last_id }
POST /api/lang {lang}        switch language (status goes 'loading' for a few seconds)
POST /api/ask/start          start recording from the laptop mic (stops any speech)
POST /api/ask/stop           stop recording -> STT -> answer -> spoken reply
POST /api/explain            explain the current item now
POST /api/auto {on:bool}
POST /api/stop               stop speaking
POST /api/clear              clear conversation

Flow the UI must make obvious: 1) hold an item in the square → 2) it is recognised and explained aloud
(item card fills, bin chip lights up, message appears) → 3) "Any questions? Press the button" →
4) press, speak, release → 5) your words appear (+ English translation for Hindi/Tamil) → 6) spoken reply.

Mock mode: `index.html?mock=1` must render with fake, cycling state and no server (app.js), so the design
can be reviewed in a browser without camera/mic. In mock mode `#video` shows a neutral placeholder.

## Welcome screen (added): visitor picks their language BY VOICE
/api/state now also has: `chosen` (bool), `welcome_phase` (asking|listening|detecting|waiting|null), `heard` (string|null).
When `chosen === false` a full-screen `#welcome` overlay covers the app. The server speaks the question in
English, then Hindi, then Tamil, then listens on the mic (VAD, up to 6 s), detects the language from what the
visitor says, and switches (chosen → true; it then greets in that language and the normal app shows).
- `#welcome` (hidden unless chosen === false), `data-phase` = welcome_phase
  - the question shown in all 3 scripts at once, each `.welcome-q[lang=en|hi|ta]`:
    en "Which language are you comfortable with?" / hi "आपको कौन सी लैंग्वेज कम्फ़र्टेबल है?" / ta "உங்களுக்கு எந்த லாங்குவேஜ் கம்ஃபர்டபிள்?"
  - `#welcome-mic` big mic indicator; style `--level` 0..1 from mic_level while listening
  - `#welcome-status` short trilingual line per phase, e.g. listening: "Speak now · अब बोलो · இப்போ பேசுங்க";
    asking: "Listen… · सुनो… · கேளுங்க…"; detecting: "Understanding… · समझ रहा हूँ… · புரிஞ்சுக்கறேன்…";
    waiting: "Say something in your language · अपनी लैंग्वेज में कुछ बोलो · உங்க லாங்குவேஜ்ல ஏதாவது பேசுங்க"
  - `#welcome-heard` shows `heard` when not null (what the mic understood), else empty/hidden
  - `.welcome-choices button[data-lang=en|hi|ta]` tap fallback → POST /api/lang {lang}
  - `#welcome-talk` optional press-and-hold button → same /api/ask/start + /api/ask/stop (server treats it as the language reply)
- Header gets `#restart-btn` ("Start over" / "फिर से स्टार्ट करो" / "மறுபடியும் ஸ்டார்ட் பண்ணுங்க") → POST /api/welcome.
  Server also returns to the welcome screen by itself after 150 s idle.
- Mock: `?mock=1&welcome=1` starts with chosen=false and cycles asking → listening → detecting → chosen (ta).

## Educational video (added)
After an item is recognised the server says a short intro (item + bin), then plays a short real-footage clip
about that waste type with a voice-over in the visitor's language, then asks "any questions?".
The browser shows the clip MUTED and LOOPED; the server plays the voice-over on the speaker (no browser autoplay
problems, same as on the Pi). The clip is over when `state.video` becomes null.
- /api/state: `video` = {id, cls, url, poster, credit, title, text, t} | null; `status` = "video" while it plays.
  Messages may have kind "video" (text = the voice-over script, shown as the subtitle/transcript).
- POST /api/video/skip → stops the voice-over (flow continues to "any questions?").
- Pressing the ask button (or Space) during a video interrupts it, as with speech.
- DOM:
  - `#edu-video` panel (hidden unless state.video): `<video id="edu-player" muted playsinline loop autoplay>`
    with poster; `#edu-caption` (the voice-over text, readable subtitle size, ≤ 3 lines, Tamil/Hindi wrap);
    `#edu-credit` (e.g. "Video: Pixabay / author", small but ≥ 16px); `#edu-skip` button
    (en "Skip video" / hi "वीडियो स्किप करो" / ta "வீடியோ ஸ்கிப் பண்ணுங்க"); optional `#edu-progress` bar.
  - Placement: the clip takes over the big camera stage area (the camera keeps running underneath / shrinks to
    a small corner preview `#video` is fine), so the visitor watches the clip full-size; the item card + bin
    strip stay visible on the right.
  - `body[data-video="1"]` while a clip plays.
- Mock: `?mock=1` should include a video phase after the explain message (use a poster-less placeholder or
  any `/media/...` file if present; with no network in mock, show the panel with a neutral placeholder).
