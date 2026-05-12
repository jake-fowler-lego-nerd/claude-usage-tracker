#!/bin/sh
# Finds a python3 with browser_cookie3 available, falls back to system python3.
SCRIPT="$HOME/.claude-usage/aggregate.py"

for py in /opt/homebrew/bin/python3 /usr/local/bin/python3 /usr/bin/python3; do
  if [ -x "$py" ] && "$py" -c "import browser_cookie3" 2>/dev/null; then
    exec "$py" "$SCRIPT"
  fi
done

exec python3 "$SCRIPT"
