#!/bin/bash
# Installs the Claude usage tracker:
#   1. Copies scripts to ~/.claude-usage/
#   2. Symlinks the widget into Übersicht's widgets folder
#   3. Adds the Stop hook to ~/.claude/settings.json
#   4. Optionally installs browser-cookie3 for live usage %

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$HOME/.claude-usage"
WIDGETS_DIR="$HOME/Library/Application Support/Übersicht/widgets"

# ── 1. Log dir + scripts ──────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
cp "$SCRIPT_DIR/ClaudeUsage.widget/aggregate.py" "$LOG_DIR/aggregate.py"
cp "$SCRIPT_DIR/ClaudeUsage.widget/run.sh"       "$LOG_DIR/run.sh"
cp "$SCRIPT_DIR/log-usage.py"                    "$LOG_DIR/log-usage.py"
chmod +x "$LOG_DIR/run.sh"
echo "✓ Installed scripts to $LOG_DIR"

# ── 2. Übersicht widget ───────────────────────────────────────────────────────
WIDGET_DEST="$WIDGETS_DIR/ClaudeUsage.widget"
if [ -L "$WIDGET_DEST" ] || [ -d "$WIDGET_DEST" ]; then
  rm -rf "$WIDGET_DEST"
fi
ln -s "$SCRIPT_DIR/ClaudeUsage.widget" "$WIDGET_DEST"
echo "✓ Symlinked widget into Übersicht"

# ── 3. Claude Code Stop hook ──────────────────────────────────────────────────
SETTINGS="$HOME/.claude/settings.json"
HOOK_CMD="python3 $LOG_DIR/log-usage.py"

if [ ! -f "$SETTINGS" ]; then
  echo '{}' > "$SETTINGS"
fi

python3 - "$SETTINGS" "$HOOK_CMD" <<'PYEOF'
import json, sys

settings_path = sys.argv[1]
hook_cmd      = sys.argv[2]

with open(settings_path) as f:
    settings = json.load(f)

hook_entry = {"type": "command", "command": hook_cmd}
stop_block = {"matcher": "", "hooks": [hook_entry]}

hooks = settings.setdefault("hooks", {})
stop  = hooks.setdefault("Stop", [])

if not any(
    any(h.get("command") == hook_cmd for h in b.get("hooks", []))
    for b in stop
):
    stop.append(stop_block)

with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)
PYEOF

echo "✓ Added Stop hook to $SETTINGS"

# ── 4. Optional: browser-cookie3 for live usage % ─────────────────────────────
echo ""
echo "── Live usage % (optional) ──────────────────────────────────────────────"
echo "  browser-cookie3 lets the widget show live session/weekly usage % from"
echo "  your Claude.ai account, matching what you see in Settings → Usage."
echo "  It requires Chrome to be signed in to claude.ai."
echo ""

if python3 -c "import browser_cookie3" 2>/dev/null; then
  echo "✓ browser-cookie3 already installed"
elif /opt/homebrew/bin/python3 -c "import browser_cookie3" 2>/dev/null; then
  echo "✓ browser-cookie3 already installed (Homebrew Python)"
else
  read -r -p "  Install browser-cookie3 now? [y/N] " reply
  if [[ "$reply" =~ ^[Yy] ]]; then
    # Prefer Homebrew Python so the installed package is on PATH
    if [ -x /opt/homebrew/bin/pip3 ]; then
      /opt/homebrew/bin/pip3 install browser-cookie3
    elif [ -x /usr/local/bin/pip3 ]; then
      /usr/local/bin/pip3 install browser-cookie3
    else
      pip3 install browser-cookie3
    fi
    echo "✓ browser-cookie3 installed"
  else
    echo "  Skipped — widget will show local token/cost data without live %."
    echo "  To add it later: pip3 install browser-cookie3"
  fi
fi

echo ""
echo "Done! Refresh Übersicht (status bar → Refresh All Widgets) to see the widget."
echo ""
echo "Optional: create $LOG_DIR/config.json to set budget limits:"
echo '  { "monthly_budget_usd": 100, "weekly_token_limit": 233000000 }'
