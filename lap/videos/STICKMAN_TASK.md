CONTEXT: /home/dharshan/arm2026/lap/videos makes ~40 s code-drawn explainer videos (PIL frames -> ffmpeg) for a
waste-sorting kiosk. The stick-man narrator appears in every video and the owner says he looks bad: "no hands, the
limbs don't connect properly, the stick man itself is not good". He is drawn by `stickman()` in explainer.py
(also used by render.py: narrator in sc_intro/sc_harm/sc_who/sc_dispose/sc_prevent, and victims v_worker/v_child/v_person).
Poses used: talk, wave, sad, thumbs; optional vest colour; `talking` animates the mouth; it returns the head position
(callers use that return value - keep the same signature and return value).
Goal: a clean, charming, consistent cartoon stick man - round joints (no gaps or overshoot where lines meet: use
rounded line caps / joint circles), the head sits exactly on the neck, two arms from the shoulders with elbows and
small round HANDS, legs with small feet, natural proportions, smooth idle motion, expressive face (eyes + mouth +
maybe brows), readable at small scale (victim cards use s=0.45-0.62). Flat style matching the rest of the frames.
No external images, PIL only.
Render test frames with:  env -u PYTHONPATH ~/ps2_et/bin/python stick_preview.py   (writes /tmp/stick_preview.jpg:
every pose at scale 1.25, 0.8 and 0.5 plus animation phases) - create stick_preview.py if it does not exist.
To view the real video context: ffmpeg -loglevel error -y -i plastic_waste/explainer.mp4 -vf "fps=1/4,scale=640:-2,tile=4x3" -frames:v 1 /tmp/stick_ctx.jpg
