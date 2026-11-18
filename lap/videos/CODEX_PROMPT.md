You are joining a project in /home/dharshan/arm2026/lap/videos that generates ~40-second educational
explainer videos (stick-man narrator, flat drawings made in code — NO stock footage, NO AI images) for
a waste-sorting kiosk. Another agent (Claude) is producing 29 videos right now in parallel. You produce
exactly the 20 listed below. The viewer must see NO difference between your videos and Claude's.

STEP 1 — Study the reference (do not modify these files):
- Reference video: /home/dharshan/arm2026/lap/videos/plastic_waste/explainer.mp4
- Its script/style: SCRIPTS in /home/dharshan/arm2026/lap/videos/explainer.py
- Spec format, allowed drawing keys, language + stats rules: /home/dharshan/arm2026/lap/videos/specs/README.md
- Renderer (shared, do NOT edit): /home/dharshan/arm2026/lap/videos/render.py

STEP 2 — Write 20 spec JSON files (format exactly as specs/README.md) into
/home/dharshan/arm2026/lap/videos/specs/codex/<cls>__<slug>.json  (the codex/ subfolder — not specs/ itself):
- e_waste: phones, chargers_cables, earphones, laptops, remotes_toys (take batteries out first),
  burning_ewaste (informal burning for copper harms workers/kids), data_wipe (wipe phone before giving away)
- battery_waste: aa_cells, button_cells (dangerous if a child swallows one), powerbank_lithium (fire risk,
  never in a bin), rechargeable (switch to rechargeables)
- light_bulbs: cfl (mercury), tube_lights, led_switch (LEDs use less power, last longer)
- clothes: old_clothes (donate), fast_fashion, jeans (water footprint), repair_reuse
- metal_waste: scrap (old utensils -> kabadiwala), aerosol (empty spray cans: never puncture or burn)
Rules (same as Claude's): 5 beats intro/harm/who/dispose/prevent, each 15–25 English words (~40 s total);
funny friendly stick-man narrator talking to the viewer; every video a different intro joke; REAL,
conservative stats with sources (Global E-waste Monitor 2024, CPCB, UNEP, WHO, etc.) listed in "sources";
Tamil = casual spoken Chennai Tamil, Hindi = Hinglish, English loanwords written in Tamil/Devanagari script,
NO Latin letters in ta/hi text, numbers written as words in all 3 languages; bins: e-waste -> "ewaste",
batteries/CFL/tubes -> "red", clothes/metal -> "blue". Use ONLY the ITEMS/VICTIMS keys listed in README.md.
Validate each file with: python3 -m json.tool <file>

STEP 3 — Render your 20, one at a time (RAM is limited — never run two renders yourself):
  cd /home/dharshan/arm2026/lap/videos
  for f in specs/codex/*.json; do SORTI_NO_INDEX=1 env -u PYTHONPATH ~/ps2_et/bin/python render.py "$f"; done
SORTI_NO_INDEX=1 is mandatory (Claude rebuilds the index at the end). Do NOT run `render.py all`, do not
touch specs/*.json outside codex/, do not edit render.py/explainer.py/build.py/index.json, do not start or
kill any server. If a render prints FAILED, fix only your spec and re-run that one file.

STEP 4 — Check 3 of your videos by extracting frames
(ffmpeg -i <cls>/<slug>.mp4 -vf "fps=1/8,scale=640:-2,tile=3x2" -frames:v 1 /tmp/check_<slug>.jpg) and confirm
they look like the reference. Then report the 20 output files and any stat you were unsure about.
