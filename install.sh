#!/bin/bash
# Installs the Claude usage tracker:
#   1. Copies aggregate.py to ~/.claude-usage/
#   2. Symlinks the widget into Übersicht's widgets folder
#   3. Adds the Stop hook to ~/.claude/settings.json

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$HOME/.claude-usage"
WIDGETS_DIR="$HOME/Library/Application Support/Übersicht/widgets"

# ── 1. Log dir + aggregate script ────────────────────────────────────────────
mkdir -p "$LOG_DIR"
cp "$SCRIPT_DIR/ClaudeUsage.widget/aggregate.py" "$LOG_DIR/aggregate.py"
cp "$SCRIPT_DIR/log-usage.py" "$LOG_DIR/log-usage.py"
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

# Use python3 to merge the hook into existing settings
python3 - "$SETTINGS" "$HOOK_CMD" <<'EOF'
import json, sys

settings_path = sys.argv[1]
hook_cmd      = sys.argv[2]

with open(settings_path) as f:
    settings = json.load(f)

hook_entry = {"type": "command", "command": hook_cmd}
stop_block = {"matcher": "", "hooks": [hook_entry]}

hooks = settings.setdefault("hooks", {})
stop  = hooks.setdefault("Stop", [])

# Avoid duplicates
if not any(
    any(h.get("command") == hook_cmd for h in b.get("hooks", []))
    for b in stop
):
    stop.append(stop_block)

with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)
EOF

echo "✓ Added Stop hook to $SETTINGS"
echo ""
echo "Done! Refresh Übersicht to see the widget."
echo "Optional: create $LOG_DIR/config.json to set budget alerts:"
echo '  { "monthly_budget_usd": 100, "daily_budget_usd": 10 }'
