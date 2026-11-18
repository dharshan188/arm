# Sorti: design research

Research date: 17 November 2026. This document separates published evidence from design interpretations. Research used web search and primary pages; it does **not** claim that inaccessible sites, videos, or screenshots were visually inspected.

## Arm: what actually won

The competition called **Arm AI Developer Challenge 2025** accepted entries in October–December 2025; its results belong to early 2026. [Official Devpost rules](https://arm-ai-developer-challenge.devpost.com/rules), [project gallery](https://arm-ai-developer-challenge.devpost.com/project-gallery), [updates/showcase](https://arm-ai-developer-challenge.devpost.com/updates).

[Arm's winner announcement, 11 February 2026](https://newsroom.arm.com/blog/arm-ai-dev-challenge) names Chuck’it first; DreamMeridian: GeoAI on Pi and InstaMeme second; Jackqr, Epictetus and Pocket Garden third. The judging rubric covered implementation, experience, impact and wow factor. Its published commentary favours useful local experiences, efficient execution and resilience without connectivity. It does not attribute prizes to a particular visual style.

[Chuck’it submission](https://devpost.com/software/chuck-it): native share-sheet capture, automatic baskets and semantic retrieval. The submission describes immediate capture feedback and background classification. **Sorti inference:** design around an everyday action and its outcome; keep model orchestration out of the visitor's way.

[DreamMeridian: GeoAI on Pi submission](https://devpost.com/software/dreammeridian-geoai-on-pi): natural-language spatial questions on Raspberry Pi, connecting a human request to a map-based result. **Sorti inference:** camera → named object → destination should be equally legible. This page was readable as text, but its demo video could not be visually verified here.

InstaMeme's photo-to-result experience, Jackqr's document-to-learning workflow, Epictetus's local conversational experience and Pocket Garden's sensor-to-advice concept offer useful demo structures. Their demos are linked in Arm's announcement; exact colours, typefaces and screen compositions remain unverified.

[Arm Community: Create AI Optimization Challenge winners](https://developer.arm.com/community/arm-community-blogs/b/announcements/posts/arm-create-ai-optimization-challenge-meet-the-winners) is **September 2026**, a separate competition, not a 2025 result. [Hackster Embodied AI Hackathon](https://www.hackster.io/contests/embodiedAI) is another event: SO-ARM100 is a robot name, not evidence of an Arm-sponsored UI award. Searches across Hackster, arm.com, community.arm.com and Devpost did not establish a separate 2025 Arm edge-AI winner list matching this brief. Avoid combining these events.

## Award sites: evidence and useful techniques

| Source | Evidence / lesson for this kiosk |
| --- | --- |
| [Awwwards annual collection](https://www.awwwards.com/websites/sites_of_the_year/), [Lando Norris listing](https://www.awwwards.com/sites/lando-norris) | Search surfaced the 2025 annual recognition and listing. Direct pages timed out here. Lando's graphic/racing identity is a reference lead, not a basis for claiming inspected animation or exact scores. Borrow a single coherent identity; verify the original visually in the next review. |
| [CSSDA 2025 nominees](https://www.cssdesignawards.com/woty2025/) | Accessible primary list includes Dropbox Brand, Exat Typeface, KOKUYO Curiosity is Life and Bruno’s Portfolio. Strong typographic and product identities are useful study directions; nomination is not the same as winning. |
| [CSSDA announcement: Dropbox Brand](https://www.linkedin.com/posts/cssda_dropbox-brand-has-won-website-of-the-year-activity-7427684611159306243-gwvt) | The award organiser announces Dropbox Brand as WOTY 2025. Take a distinctive brand system through small controls as well as the hero. Exact site rendering was not verified here. |
| [FWA](https://thefwa.com/) | Primary archive is dynamically loaded; the readable page establishes the daily award programme but did not expose a reliable 2025 annual winner. No annual winner invented. The useful criterion is a memorable digital experience; expensive immersive rendering is unsuitable for Pi. |
| [Apple Design Awards 2025](https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/) | CapWords turns photographed everyday objects into learning aids. Relevant pattern: show the physical subject, then make its meaning tangible. Camera interaction can teach without a dashboard of raw AI output. |

## Product and interaction references

These are design interpretations of the products and available primary documentation, not assertions that all current homepages retain a 2025 design.

- [Linear's UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui): explicit attention to alignment, hierarchy and reduction of visual noise. Apply shared edges and a quiet operator footer. Do not copy its desktop information density onto a public kiosk.
- [Vercel Geist](https://vercel.com/geist/introduction): a defined grid, typography, accessible colour and component materials. Use one spacing system, explicit token roles and actual contrast checks.
- [Stripe](https://stripe.com/): product examples connect the headline to a concrete outcome. For Sorti, the recognised object and destination must be adjacent. Its colourful marketing surface is not a reason to import an animated gradient.
- [Apple's camera/visual intelligence platform reference](https://www.apple.com/os/ios/): camera-led interaction makes the physical subject central. Use framing, readable labels and restrained controls. The live page is current, not an archived 2025 screen.
- [Arc](https://arc.net/): research link now leads to a farewell page. Its historic spatial grouping is a reference concept only; do not call the current page a live Arc product UI study.
- [Raycast](https://www.raycast.com/): action-first interaction and keyboard discoverability. Add an actual send control for typed questions; keep Space functional without stealing spaces from input fields.
- [Teenage Engineering OP–1 field](https://teenage.engineering/products/op-1): carefully authored instrument graphics and colour-coded physical controls. Treat camera status, meter and bin destination as parts of one instrument.
- [Nothing](https://nothing.tech/): recognisable industrial identity and deliberate type contrast. Keep the wordmark and arrow distinctive; use ordinary readable numerals for timing rather than decorative dot text.
- [Google: voice UI principles](https://design.google/library/speaking-the-same-language-vui), [conversation design](https://developers.google.com/assistant/conversation-design/what-is-conversation-design): voice is a turn-taking system. The visible UI should say when to speak, what was heard, when processing is underway and how to interrupt.
- [Mozilla: designing for voice](https://blog.mozilla.org/ux/2020/06/designing-for-voice/): spoken requests vary and need context. Offer a concrete question example and show the transcript rather than leaving visitors to guess.

## 23 decisions for Sorti

1. Make the public experience a **sorting instrument**, with warm paper, dark camera and a lime action key. Avoid an interchangeable AI dashboard.
2. Establish two primary columns at roughly 58:42. Camera is the physical interaction; destination is the answer.
3. Align the camera heading, stage edges and numbered instructions. Use 22–40px outer gutters and a 4px spacing rhythm.
4. Use a large, short imperative: “Show it. Sort it.” Localise it; an English slogan must not substitute for instructions.
5. Make the object name and bin destination the biggest text on the result side. A bin arrow is wayfinding, not decoration.
6. Reserve green/blue/red/grey for their existing streams. Never reassign a hazardous stream to a fashionable palette.
7. Give the active bin colour **and** a checkmark and destination text. Keep all other stream names readable at full contrast.
8. Use the lime button for asking; salmon for active recording; neutral for processing. State should not depend on colour alone.
9. Keep the actual camera aspect ratio and show an accurate square covering 80% of the shorter displayed side.
10. Place confidence at the camera edge. Put top-three scores below, not over the subject.
11. Show a microphone level only while listening. Show time alongside it. Do not fabricate a voice waveform from random values in live mode.
12. Give speaking a small five-bar movement; thinking gets a quiet opacity rhythm. No endlessly orbiting AI sphere.
13. Keep spoken answers in a scrollable transcript. Preserve language and English translations, including later message patches.
14. Keep one prominent ask control available during speech/video so interruption is obvious.
15. Give typed questions a visible submit arrow as well as Enter support. Use a real label, not placeholder-only semantics.
16. Design the welcome page as a split poster and dialogue. Present all three script questions simultaneously, then three equal tap alternatives.
17. Bundle font files and licences. Tamil and Devanagari need real script fonts, generous line height and natural wrapping.
18. Aim for 48–77px primary labels, 26–46px destination/action text, 21–26px prose and at least 16px secondary detail. Validate actual two-metre readability on the intended monitor.
19. Use 180–280ms state transitions with cubic-bezier(.22,.8,.25,1). Animate transform and opacity, never a full-screen blur.
20. Keep educational video muted/looped and server-controlled. Overlay readable subtitles, credit, skip and estimated voice-over progress.
21. Keep model and RAM diagnostics in one footer; avoid turning internal model details into visitor instructions.
22. Use stable mock scenes for every state, language, size and bin colour. A beautiful screenshot of one English state is insufficient.
23. Treat visual QA as evidence: inspect real screenshots and fix clipping. If rendering is blocked, explicitly label validation pending instead of claiming a review happened.

## Access limitations

Shell DNS blocked Google Fonts download; local Noto Tamil/Devanagari were also absent. The build therefore bundles installed Lato and Lohit Tamil/Devanagari converted to WOFF2, with Noto system fallbacks. Static preview and Chrome rendering were attempted but blocked by socket restrictions. No competition video or award-site screenshot is claimed as visually inspected. See REVIEW.md for the separate implementation review and remaining visual QA.
