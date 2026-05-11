# Claude Usage Tracker

An [Übersicht](https://tracesof.net/uebersicht/) widget that tracks your [Claude Code](https://claude.ai/code) usage and displays token usage and cost across today, this week, and this month — with color-coded alerts as you approach your limits.

![Widget showing Claude usage stats]

## Requirements

- macOS
- [Übersicht](https://tracesof.net/uebersicht/)
- Claude Code CLI
- Python 3

## Install

```sh
git clone https://github.com/jake-fowler-lego-nerd/claude-usage-tracker
cd claude-usage-tracker
chmod +x install.sh
./install.sh
```

Then refresh Übersicht (status bar menu → Refresh All Widgets).

## How it works

**Logging** — A Claude Code `Stop` hook fires at the end of every session. It reads the session transcript, sums token usage across all API calls, computes cost, and appends one line to `~/.claude-usage/log.jsonl`:

```json
{"timestamp":"2026-05-11T22:00:00Z","session_id":"...","models":["claude-sonnet-4-6"],"cost_usd":0.42,"input_tokens":1200,"output_tokens":8400,"cache_creation_input_tokens":11000,"cache_read_input_tokens":320000}
```

**Widget** — Reads the log every 60 seconds, aggregates by day/week/month, and renders three usage bars with a 14-day spending sparkline.

## Configuration

Create `~/.claude-usage/config.json` to set limits and enable color-coded percentage bars:

```json
{
  "daily_token_limit":   50000000,
  "weekly_token_limit":  233000000,
  "monthly_budget_usd":  100,
  "daily_budget_usd":    10
}
```

All fields are optional. Without a config file the widget still works — it shows raw values with no thresholds.

### Finding your limits

Anthropic doesn't publish exact token limits, but you can back-calculate from the Claude.ai usage page:

1. Go to **claude.ai → Settings → Usage** and note your current weekly % used
2. Run this to get your current week's token count:
   ```sh
   python3 ~/.claude-usage/aggregate.py | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['week']['total_tokens'])"
   ```
3. Divide: `week_tokens / pct_used` = your approximate limit

### Alert colors

Bars turn color as you approach each limit:

| Color | Threshold |
|-------|-----------|
| Green | < 75% |
| Yellow | 75–90% |
| Orange | 90–100% |
| Red | > 100% |

## Pricing

Token prices are defined at the top of `log-usage.py` and can be updated as Anthropic changes pricing:

```python
PRICING = {
    "claude-opus-4-7":   {"input": 15.00, "output": 75.00, "cache_write": 18.75, "cache_read": 1.50},
    "claude-sonnet-4-6": {"input":  3.00, "output": 15.00, "cache_write":  3.75, "cache_read": 0.30},
    "claude-haiku-4-5":  {"input":  0.80, "output":  4.00, "cache_write":  1.00, "cache_read": 0.08},
}
```

## Files

```
claude-usage-tracker/
  ClaudeUsage.widget/
    index.jsx        # Übersicht widget
    aggregate.py     # reads log, outputs JSON for the widget
  log-usage.py       # Claude Code Stop hook
  install.sh         # one-command setup
```
