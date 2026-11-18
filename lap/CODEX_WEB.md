Project: /home/dharshan/arm2026/lap - "Sorti", an offline waste-sorting kiosk (Raspberry Pi 5 + camera + mic + speaker,
Chromium full screen, 1920x1080 or 1280x800 touch screen). The FastAPI server (server.py) owns camera/mic/speaker;
the browser UI in lap/web/ (index.html, style.css, app.js - vanilla, NO CDNs, must work fully offline) only displays
state from /api/state polled every 250 ms. The API and every DOM id/data-attribute the UI must keep are in
lap/web/CONTRACT.md - read it fully first, plus the current index.html/style.css/app.js. A backup is in lap/web_backup_v1/.
Owner verdict on the current UI: "it is so lame". Goal: a TOP-TIER, top-1%-of-the-web look that would win a hackathon
showcase - this is an entry like last year's Arm developer challenge / Arm hackathon winners.

PHASE 1 - research (use web search; be thorough):
- Look up last year's (2025) Arm hackathon / Arm AI developer challenge / Arm edge-AI competition winners (Devpost,
  arm.com, community.arm.com, hackster.io) - what their demos/UIs looked like and what judges praised.
- Study award-level sites (Awwwards Site of the Day/Year 2025, CSS Design Awards, FWA) and best-in-class product UIs
  (Linear, Vercel, Stripe, Apple, Arc, Raycast, Teenage Engineering, Nothing) and great kiosk / voice-assistant /
  camera-AI interfaces. Extract concrete techniques: type scale, grid, colour systems, motion curves, depth, how they
  show live camera + AI state, micro-interactions, what makes it feel premium vs "AI slop" (generic purple gradients,
  glassmorphism everywhere, emoji icons, centred-everything card soup, Inter-on-white sameness).
- Write lap/web/DESIGN_RESEARCH.md: sources (URLs) + 15-25 concrete, actionable takeaways for THIS kiosk.

PHASE 2 - design: lap/web/DESIGN.md - a distinctive art direction for an eco/waste-sorting kiosk used by the public
in India (Tamil/Hindi/English scripts must look great - pick fonts with Tamil + Devanagari coverage; fonts must be
bundled locally in lap/web/fonts/ as woff2 - download them (Google Fonts/fontsource on GitHub/npm are fine) or fall
back to system Noto fonts if you can't download), colour tokens (bins: green/blue/red/grey must stay recognisable),
type scale, layout for each state (welcome language pick, camera watching, item detected + bin, educational video
playing, listening with live mic level, thinking, answer), motion language, and readable-from-2-metres sizes.

PHASE 3 - build: rewrite lap/web/index.html, style.css, app.js to that design. Keep every id, data-attribute, endpoint
and behaviour in CONTRACT.md working (welcome flow, press/hold-to-talk + Space, typed question, video panel with
skip/progress, chat history, restart, RAM/model status, ?mock=1 mode). Pi 5 GPU is weak: keep it 60 fps - prefer
transform/opacity animations, avoid big backdrop-filter blurs and heavy box-shadow animation, no video/canvas
backgrounds. Accessibility: contrast >= 4.5:1, focus states, prefers-reduced-motion. Update CONTRACT.md only if you
add things (never remove).

PHASE 4 - self-review: serve the folder without the real server (e.g. a tiny python http.server or a mock that
answers /api/state; do NOT start or kill lap/server.py, do NOT touch server.py/content.py/videos/) and take headless
screenshots: google-chrome --headless=new --screenshot=/tmp/ui_<state>.png --window-size=1920,1080 <url>?mock=1...
for every state and both 1920x1080 and 1280x800, in en and ta. LOOK at them, list what still looks generic or broken
(overlaps, overflow, Tamil clipping, tiny text) and fix. Repeat at least twice. Then write lap/web/REVIEW.md with
the screenshot paths and what you changed. Another agent (Claude) will review your screenshots and may send fixes.
Do not edit anything outside lap/web/ except creating files in /tmp.
