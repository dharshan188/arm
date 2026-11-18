#!/usr/bin/env bash
# Start Sorti on this laptop (laptop = Raspberry Pi stand-in), then open the browser.
#   ./run.sh            English     ./run.sh --lang ta     ./run.sh --camera 1
cd "$(dirname "$0")"
( for i in $(seq 40); do sleep 1; curl -s localhost:8000/api/state >/dev/null && { xdg-open http://127.0.0.1:8000 >/dev/null 2>&1; break; }; done ) &
exec env -u PYTHONPATH PATH="$HOME/ps2_et/bin:$PATH" "$HOME/ps2_et/bin/python" server.py "$@"
