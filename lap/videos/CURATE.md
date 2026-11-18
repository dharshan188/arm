# Curating Sorti's video library (instructions for reviewer agents)

For each waste class you own, open `videos/<class>/candidates.json`. Every candidate has a 3-frame review sheet,
`videos/<class>/sheets/<id>.jpg` (frames at about 15% / 50% / 85% of the clip). LOOK at each sheet with the Read tool.

## Priority: everyday household waste (the user's main ask)
Visitors mostly bring the stuff they throw every day, so favour clips showing these common items over
industrial or exotic scenes, and reject anything AI-generated (that is the user's other hard rule):
- plastic: water/soft-drink bottles, carry bags/covers, food wrappers, milk packets, takeaway containers
- organic: vegetable and fruit peels, leftover food, tea leaves, flowers, kitchen compost
- paper: newspapers, cardboard/delivery boxes, notebooks, paper cups/bags
- metal: soft-drink/beer cans, tins, foil
- glass: bottles and jars (sauce, pickle, beverage), broken glass
- e-waste: phones, chargers, cables, earphones, remotes, old laptops/keyboards
- battery: AA/AAA cells, button cells, phone/power-bank batteries
- light_bulbs: CFL, LED and incandescent bulbs, tube lights
- clothes: old shirts, sarees, jeans, donation bags, textile sorting
At least half of each class's picks should show such everyday items, ideally in a home, kitchen, street or
recycling-centre setting. Big factory or landfill shots are fine as one "where it ends up" clip.

## How many clips per class
More clips for the waste people throw most often:
plastic 8, organic 8, paper 7, metal 6, glass 6, e_waste 6, battery 5, clothes 5, light_bulbs 4 (55 total).
If a class doesn't have enough good, non-AI candidates, pick fewer and list what's missing in your report
(e.g. "no good milk-packet clip"). The main session can then search for more.

## Pick the clips
- **Clearly about this waste type,** recognisable at a glance by a visitor. For example, battery = actual batteries
  (AA cells, a pile of old batteries, batteries being sorted), not a phone showing a battery icon.
- **Real footage only.** Reject anything AI-generated or AI-looking: plastic-smooth surfaces, warped hands or text,
  dreamy glow, impossible physics. Also reject 3D renders, animations, slideshows, and clips with burned-in
  text, logos or watermarks.
- **Attractive and watchable:** steady, well lit, sharp, real people or real places, ideally an action (sorting,
  recycling, composting, collecting) rather than a static object. Mix close-ups with wider context.
- **Varied:** no near-duplicates. Two clips from the same shoot are fine only if they show clearly different things.
- **Positive or educational:** a little pollution footage is fine for plastic, but don't make all 6 doom scenes.
- If fewer than 6 are good, pick fewer and say so. Never pad with bad clips.

## Voice-over for each picked clip, in en / hi / ta
- **It must match what is on screen** (look at the frames), and teach one or two true, useful facts about
  handling this waste in India. The bin rules are fixed:
  - GREEN = wet/food waste
  - BLUE = dry, recyclable (plastic, paper, glass, metal, clothes)
  - RED = domestic hazardous (batteries, CFL/tube lights)
  - e-waste goes to an e-waste collection centre, not a bin
- **Length:** 2–3 short sentences, about 12–18 seconds when spoken (roughly 30–45 English words). Don't repeat the
  intro ("this is a battery, red bin" was already said just before the clip). Add something new: why it
  matters, what happens next, a quick do/don't.
- **Tone:** a friend talking, warm and casual, not a textbook or an ad.
- **Tamil:** modern spoken Chennai Tamil (இருக்கு, பண்ணுங்க, -ங்க, இப்போ, உங்க), with common English words
  WRITTEN IN TAMIL SCRIPT (ரீசைக்கிள், பின், பிளாஸ்டிக், பாட்டில், சூப்பர்). Never use Latin letters, because the
  voice can't read them. No literary Tamil (செய்யுங்கள், உள்ளது, மறுசுழற்சி are banned).
- **Hindi:** everyday Hinglish in Devanagari (डालो, करो, रीसायकल, बिन, डाउट). No shuddh Hindi.
- **English:** plain and friendly.
- **Numbers as words** in hi/ta (ninety five → தொண்ணூத்தஞ்சு / पंचानवे). No symbols or abbreviations the TTS
  might misread (write "per cent" not "%", "e-waste" fine).
- **Facts must be true and not exaggerated.** If unsure, keep it general.

## Write `videos/<class>/manifest.json`
```json
{"class": "<class>", "clips": [
  {"id": 123, "page": "...", "user": "...", "duration": 14, "hd_url": "...",
   "why": "one line: what's on screen and why it's good",
   "title": {"en": "...", "hi": "...", "ta": "..."},
   "vo": {"en": "...", "hi": "...", "ta": "..."}}
]}
```
Copy id/page/user/duration/hd_url exactly from candidates.json. `title` is a 2–5 word on-screen title.
Validate the JSON with `python3 -m json.tool`. Don't download HD files or run build.py; the main session does that.

## NEW FORMAT (user, 2026-11-16) — supersedes the clip counts and voice-over length above
One 30–40 s video per waste type (9 total, × en/hi/ta voice-over), made by stitching 3–5 good real clips.
The voice-over covers four beats, in this order:
1. **Harm:** why this waste is bad (e.g. plastic takes hundreds of years, chokes drains, microplastics).
2. **Who it affects:** people, animals, sanitation workers, rivers and sea.
3. **Disposal:** how to dispose of it correctly (which bin or collection centre, rinse, keep dry, tape the ends, etc.).
4. **Prevention:** how to produce less of it (reuse, refuse, repair, donate).
That's about 75–100 English words. Same casual tone and script rules as above.
Manifest per class: {"class", "clips": [ids in play order...], "vo": {en, hi, ta}, "title": {en, hi, ta}}.
build.py must still gain a `montage` step: cut each clip to its share of the voice-over length, crossfade,
then 1280x720 silent mp4 + per-language wav.
Search status: Pixabay keyword matching is loose. The first pass gave mostly off-topic or 3D results for
battery, clothes and e-waste (only 2 usable clips out of 72). Use the item-specific `everyday` queries,
and consider adding Pexels as a second source for this.
