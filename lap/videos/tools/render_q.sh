#!/bin/bash
# render each class named in tools/queue.txt (one per line, appended over time) exactly once; 'END' stops
cd ~/arm2026/lap/videos; done_=""
while true; do
  for c in $(cat ${1:-tools/queue.txt}); do
    [ "$c" = END ] && exit 0
    case " $done_ " in *" $c "*) continue;; esac
    done_="$done_ $c"
    env -u PYTHONPATH ~/ps2_et/bin/python photo_explainer.py specs/photo/$c.json --register > render_$c.log 2>&1 && echo "RENDERED $c" || echo "FAILED $c"
  done
  sleep 5
done
