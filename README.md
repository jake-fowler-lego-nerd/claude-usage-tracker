# Claude Usage Tracker

An [Übersicht](https://tracesof.net/uebersicht/) widget that tracks your [Claude Code](https://claude.ai/code) usage and displays today's cost, monthly total, and a 14-day spending history on your desktop.

![Widget showing Claude usage stats]

## Requirements

- macOS
- [Übersicht](https://tracesof.net/uebersicht/)
- Claude Code CLI
- Python 3

## Install

```sh
git clone https://github.com/YOUR_USERNAME/claude-usage-tracker
cd claude-usage-tracker
chmod +x install.sh
./install.sh
```

Then refresh Übersicht (status bar menu → Refresh All Widgets).

## How it works

**Logging** — A Claude Code `Stop` hook fires at the end of every session. It reads the session transcript, sums token usage across all API calls, computes cost, and appends one line to `~/.claude-usage/log.jsonl`:

```json
{"timestamp":"2026-05-11T22:00:00Z","session_id":"...","models":["claude-sonnet-4-6"],"cost_usd":0.42,"input_tokens":1200,"output_tokens":8400,"cache_creation_input_tokens":11000,"cache_read_input_tokens":320000,"sessions":1}
```

**Widget** — Reads the log every 60 seconds, aggregates by day and month, and renders the UI.

## Budget alerts

Create `~/.claude-usage/config.json` to enable color-coded alerts:

```json
{
  "monthly_budget_usd": 100,
  "daily_budget_usd": 10
}
```

Costs display as green → yellow (75%) → orange (90%) → red (100%+) as you approach each cap. Without a config file the widget still works — it just shows costs in white with no thresholds.

## Pricing

Token prices are defined at the top of `log-usage.py` and can be updated as Anthropic changes pricing:

```python
PRICING = {
    "claude-opus-4-7":   {"input": 15.00, "output": 75.00, ...},
    "claude-sonnet-4-6": {"input":  3.00, "output": 15.00, ...},
    "claude-haiku-4-5":  {"input":  0.80, "output":  4.00, ...},
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
