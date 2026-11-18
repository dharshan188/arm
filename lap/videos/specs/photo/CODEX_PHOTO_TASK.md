# Task: write documentary-video specs (real-photo explainers) for Sorti, an offline waste-sorting kiosk (Tamil Nadu, India)

Reference = `plastic_waste.json` in this directory (APPROVED by the owner; copy its style, structure and tone exactly).
Also read `REVIEW_plastic.md` (the fact-check that shaped it) and the old childish specs in `../codex/<cls>__general.json`
(reuse facts only, NOT tone).

Write ONE file per class you are assigned: `<cls>.json` here, same schema as plastic_waste.json:
- "cls", "slug": "general_photo", "title" {en,hi,ta}
- "beats": intro, harm, who, dispose, prevent — each {en,hi,ta}
- "shots": per beat a list of 1–3 shots. You can't see photos, so each shot is
  {"need": "<what the photo must show>", "query": "<Wikimedia Commons search query, 2–5 words, likely to return real landscape photos; prefer India>"}
  plus optional "w" (relative duration weight). Give 2 alternative queries where possible as "query2".
  (Claude will download/choose photos and add img/z/c.)
- "overlays": only these types:
  {"type":"stat","value":<number or "string">,"fmt":"{:.0f}" or "{:.0f}%","unit":"<short English label incl. place/year>","at":0..1,"count":true|false}
  {"type":"steps","n":2..4,"steps_at":[...local fractions...],"bin":"blue|green|red|ewaste","bin_at":0.5,"until":0.5}
  Max 2 overlays per beat; the dispose beat MUST have a steps overlay matching the spoken steps.
- "sources": list of real, checkable sources for every number spoken.

Rules:
- Tone: calm, mature documentary narrator, warm. NO jokes, NO "hey you", NO ninja/high-five/cartoon stuff.
- Hindi = everyday Hinglish (तुम/करो friend tone ok), Tamil = SPOKEN Chennai Tamil (not formal/literary, no நிதியாண்டு-style words).
  English loan words in native script (ப்ளூ பின், रीसायकल, பேட்டரி). NO Latin letters inside hi/ta. Numbers as WORDS in all three languages.
- Length: English total 90–115 words (video ~50–60 s). hi/ta say the same thing.
- Bins (MUST match the app): plastic/paper/metal/glass/clothes = BLUE bin (recyclable; for clothes say donate/reuse first, then blue bin / textile collection);
  organic = GREEN bin (compost); battery and light_bulbs = RED bin (hazardous, never in normal trash, don't break bulbs); e_waste = give to an
  authorised e-waste collector/collection point (overlay bin "ewaste"), never the normal bins.
- Facts: use web search to verify every statistic; prefer Indian sources (CPCB, MoEFCC, PIB) and well-known global ones. State conditions/years honestly
  (the reviewer caught "9% of all plastic" vs "of plastic waste up to 2015"). If unsure, drop the number.
- Validate: `python3 -c "import json;json.load(open('<cls>.json'))"` for each file. Do not touch any other file.
