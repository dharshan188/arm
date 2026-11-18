You are working in /home/dharshan/arm2026/lap/videos, a waste-sorting kiosk's library of code-drawn ~40 s explainer
videos (stick-man narrator, NO stock footage, NO AI images). You already made 20 of them (specs/codex/). Now make
8 GENERAL videos, one per waste type. The camera only knows the type, not the exact item, so these play when the item
is unknown. They must cover the WHOLE category, not one item.

STEP 1 - Re-read (do not modify): specs/README.md (format, allowed ITEMS/VICTIMS keys, language + stats rules),
plastic_waste/explainer.mp4 + SCRIPTS in explainer.py (the reference GENERAL plastic video; match its tone and depth),
and one of your earlier specs in specs/codex/ for the format.

STEP 2 - Write 8 specs to specs/codex/<cls>__general.json (slug MUST be "general"):
- organic_waste: food, peels, flowers, leaves -> green bin; India's wet-waste share, methane in dumps; compost at home.
- paper_waste: newspaper, cardboard, notebooks -> dry, blue bin; keep it dry, no oily/food-stained paper; trees/water.
- glass_waste: bottles, jars, broken glass -> blue bin; wrap broken glass; glass recycles endlessly.
- metal_waste: cans, tins, foil, old utensils -> blue bin or the kabadiwala; aluminium recycling saves ~95% energy.
- e_waste: phones, chargers, cables, laptops, earphones -> authorised e-waste collector (bin "ewaste"); India's
  e-waste volume (Global E-waste Monitor 2024 / CPCB), informal burning, lead/mercury.
- battery_waste: AA, button cells, phone/power-bank batteries -> red bin; fire risk, child safety; rechargeables.
- light_bulbs: CFL, tube lights, LED, old bulbs -> red bin, do not break, mercury in CFL/tubes; switch to LED.
- clothes: shirts, sarees, jeans -> donate first, then blue bin dry; textile waste, water footprint; repair, reuse.
For each: "item" = the most typical key of that type; victims fit the type; show 2 DIFFERENT example items across
dispose/prevent (swap_from/swap_to/swap_to2) so it feels general. Mention 2-3 everyday items of the type by name in
the voice-over. A new, different intro joke each (not copied from your item videos). Same rules as before: 5 beats,
each 15-25 English words; REAL conservative stats named in "sources"; casual Chennai Tamil and Hinglish, English
loanwords in native script, NO Latin letters in ta/hi, numbers as words in all 3 languages.

STEP 3 - Validate: python3 check_specs.py   (must print OK; fix your files until it does)

STEP 4 - Render one at a time (RAM is limited, never two at once):
  for c in organic_waste paper_waste glass_waste metal_waste e_waste battery_waste light_bulbs clothes; do
    SORTI_NO_INDEX=1 env -u PYTHONPATH ~/ps2_et/bin/python render.py specs/codex/${c}__general.json; done
Do NOT edit render.py / explainer.py / server.py / index.json / any other spec, do not run `render.py all`, do not
start or kill servers. If a render prints FAILED, fix only that spec and re-render it.

STEP 5 - Check 2 videos with ffmpeg -i <cls>/general.mp4 -vf "fps=1/8,scale=640:-2,tile=3x2" -frames:v 1
/tmp/check_general_<cls>.jpg, then report the 8 files and any stat you were unsure about.
