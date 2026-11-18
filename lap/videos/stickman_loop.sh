#!/bin/bash
cd ~/arm2026/lap/videos
CX="codex exec --skip-git-repo-check -C $HOME/arm2026/lap/videos"
for r in 1 2 3; do
  echo "===== ROUND $r: REVIEWER ====="
  $CX -s workspace-write "$(cat STICKMAN_TASK.md)
YOUR ROLE: REVIEWER ONLY (round $r). Do NOT edit explainer.py or render.py. Render the preview (create stick_preview.py
if missing) and the video context frames, LOOK at the images, and write STICKMAN_REVIEW.md: a numbered list of every
concrete visual defect (gaps between head/neck/limbs, missing hands/feet, wrong proportions, ugly poses, face, small-scale
readability, motion), each with the exact fix you want. If round > 1, check the previous fixes. If the stick man is now
genuinely good (clean joints, hands, nice poses at all scales), the FIRST line of STICKMAN_REVIEW.md must be exactly: VERDICT: PASS
otherwise exactly: VERDICT: FIX" 2>&1 | tail -40
  head -1 STICKMAN_REVIEW.md | grep -q "VERDICT: PASS" && { echo PASSED; break; }
  echo "===== ROUND $r: FIXER ====="
  $CX -s workspace-write "$(cat STICKMAN_TASK.md)
YOUR ROLE: FIXER (round $r). Read STICKMAN_REVIEW.md and fix every point by editing ONLY the stickman() function in
explainer.py (and, only if needed, the stickman call sites in render.py - keep sizes/positions so it still fits the
scenes). Keep the signature and return value. Re-render the preview and LOOK at it until it is clean. Then render ONE
real test video to confirm it works: SORTI_NO_INDEX=1 env -u PYTHONPATH ~/ps2_et/bin/python render.py specs/glass_waste__bottles.json
Do not re-render other videos, do not touch index.json, specs, or servers. Summarise what you changed." 2>&1 | tail -40
done
echo STICKMAN_LOOP_DONE
