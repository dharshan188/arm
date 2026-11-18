ROUND 2 of the Sorti UI (lap/web/). Claude rendered your design in headless Chrome (attached screenshots:
welcome en, detected en, video en, answer ta, detected ta at 1280x800). The base is good: calm paper/ink editorial
style, strong type, clear bin chips. Now fix these, in this order. Same rules as before (keep every CONTRACT.md id and
behaviour, offline, Pi-friendly, edit only lap/web/). You cannot take screenshots; Claude will re-render and review.

BUGS
1. Video state: the "Skip video" button (top-left) is invisible (white text on white). The video frame has dark
   letterbox bars left and right - the 16:9 video must fill the panel. The caption covers ~35% of the video: make it
   max 2 lines, smaller, on a bottom gradient, and show the video title. Mock placeholder text is clipped behind it.
2. Top-3 list shows untranslated "Glass"/"Metal" in ta/hi, and "SEE · SORT · LEARN" is never translated.

LANGUAGE (owner's hard rule: Tamil = casual spoken Chennai Tamil, Hindi = Hinglish, English loanwords in native
script; formal/literary words are banned - he said formal Tamil feels like "watching Ramayana"):
3. Replace formal Tamil: காட்டுங்கள். பிரியுங்கள். -> காட்டுங்க. பிரிச்சு போடுங்க. ; பொருள் கண்டறியப்பட்டது ->
   கண்டுபிடிச்சாச்சு! ; இன்னும் தெரிந்துகொள்ளுங்கள் -> (drop the heading) ; நேரலை கேமரா -> லைவ் கேமரா ;
   ஆஃப்லைன் · தனியுரிமை -> ஆஃப்லைன் · பிரைவேட் ; உங்கள் -> உங்க ; bin chips: பச்சை/நீலம்/சிவப்பு/மின்னணு ->
   கிரீன்/ப்ளூ/ரெட்/ஈ-வேஸ்ட், subtitles ஈரக் குப்பை -> வெட் வேஸ்ட், மறுசுழற்சி (BANNED word) -> டிரை, ரீசைக்கிள்,
   அபாயம் -> டேஞ்சர், சேகரிப்பு -> கலெக்ஷன் சென்டர். Go through EVERY ta and hi string in app.js/index.html with
   that rule (Hindi: हरा/नीला/लाल -> ग्रीन/ब्लू/रेड, पुनर्चक्रण -> रीसायकल, etc.).

KILL THE SLOP (generic lines that say nothing; judges notice):
4. Remove: "Small acts. Lasting impact.", "A better tomorrow, starting here.", "Built for everyone. Ready when you
   are.", "A small sort. A better tomorrow.", "A little more clarity", "01 / 03", "THE RIGHT PLACE", "YOUR EVERYDAY
   SORTING COMPANION", "MEET YOUR SORTING COMPANION", the decorative ↗ arrows on non-links, the decorative rings/arrow
   art on the welcome poster. Every word on screen must either instruct or show real information.

WOW FACTOR (Arm AI Developer Challenge judging = technical implementation, UX, impact, wow):
5. Make the on-device story visible and real: a slim, elegant live strip (replace the footer) like
   "100% offline · Raspberry Pi 5 · Arm Cortex-A76 | Vision 11 ms · Speech 0.6 s · Llama 3.2 1B · 2.3 s | RAM 1.3 GB"
   using real numbers from /api/state (vision ms/fps, the last question's stt_s and llm_s from the messages,
   ram_mb/ram_avail_mb, model states). Monospace numerals that tick smoothly. No cloud icon nonsense.
6. Conversation: in the right panel show the user's spoken question (transcript, + English translation for hi/ta in
   small muted text) above Sorti's answer, as a compact 2-3 turn history - it proves the voice pipeline works.
   Show a live mic level waveform while listening (state has mic_level), and a "thinking" shimmer.
7. Welcome screen: the left dark poster is wasted space. Make the language choice the hero: three big tappable
   language cards (English / हिन्दी / தமிழ்), each with its greeting line; the mic with a live level ring in the middle
   reacting to mic_level while listening; status text and the heard transcript under it. Fill the 1920x1080 frame
   with intent, no big empty areas.
8. Bin icon: replace the generic trash can with a small custom bin glyph tinted per bin, plus a subtle animated
   "drop into bin" moment when an item is first recognised (transform/opacity only, respects reduced motion).

When done, write lap/web/REVIEW2.md listing each point and what you did.
