#!/bin/bash
# Render specs as the writer agents produce them; stop once 49 videos exist and nothing new arrives.
cd "$(dirname "$0")"
idle=0
while [ $idle -lt 20 ]; do
  before=$(ls */*.mp4 2>/dev/null | wc -l)
  env -u PYTHONPATH $HOME/ps2_et/bin/python -u render.py all 2>&1 | grep -E "^(done|FAILED)"
  after=$(ls */*.mp4 2>/dev/null | wc -l)
  specs=$(ls specs/*.json 2>/dev/null | wc -l)
  if [ "$after" = "$before" ]; then idle=$((idle+1)); else idle=0; fi
  [ "$specs" -ge 28 ] && [ "$after" = "$before" ] && break
  sleep 30
done
echo "RENDER LOOP END: $(ls specs/*.json | wc -l) specs"
