#!/usr/bin/env python3
"""
Claude Code Stop hook — reads the session transcript and appends a usage
summary line to ~/.claude-usage/log.jsonl.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Prices in USD per million tokens (update as Anthropic changes pricing)
PRICING = {
    "claude-opus-4-7":        {"input": 15.00, "output": 75.00, "cache_write": 18.75, "cache_read": 1.50},
    "claude-sonnet-4-6":      {"input":  3.00, "output": 15.00, "cache_write":  3.75, "cache_read": 0.30},
    "claude-haiku-4-5":       {"input":  0.80, "output":  4.00, "cache_write":  1.00, "cache_read": 0.08},
    # fallback key used when model isn't recognised
    "_default":               {"input":  3.00, "output": 15.00, "cache_write":  3.75, "cache_read": 0.30},
}

LOG_PATH = Path.home() / ".claude-usage" / "log.jsonl"


def cost_usd(usage_by_model: dict) -> float:
    total = 0.0
    for model, u in usage_by_model.items():
        p = PRICING.get(model, PRICING["_default"])
        m = 1_000_000
        total += (
            u["input_tokens"]                  * p["input"]        / m
            + u["output_tokens"]               * p["output"]       / m
            + u["cache_creation_input_tokens"] * p["cache_write"]  / m
            + u["cache_read_input_tokens"]     * p["cache_read"]   / m
        )
    return round(total, 6)


def empty_usage():
    return {"input_tokens": 0, "output_tokens": 0,
            "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0}


def main():
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    transcript_path = payload.get("transcript_path")
    if not transcript_path or not os.path.exists(transcript_path):
        sys.exit(0)

    usage_by_model: dict[str, dict] = {}

    with open(transcript_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            if entry.get("type") != "assistant":
                continue

            msg = entry.get("message", {})
            model = msg.get("model", "_default")
            u = msg.get("usage", {})

            if model not in usage_by_model:
                usage_by_model[model] = empty_usage()

            acc = usage_by_model[model]
            acc["input_tokens"]                  += u.get("input_tokens", 0)
            acc["output_tokens"]                 += u.get("output_tokens", 0)
            acc["cache_creation_input_tokens"]   += u.get("cache_creation_input_tokens", 0)
            acc["cache_read_input_tokens"]       += u.get("cache_read_input_tokens", 0)

    if not usage_by_model:
        sys.exit(0)

    totals = empty_usage()
    for u in usage_by_model.values():
        for k in totals:
            totals[k] += u[k]

    record = {
        "timestamp":    datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "session_id":   payload.get("session_id"),
        "cwd":          payload.get("cwd"),
        "models":       list(usage_by_model.keys()),
        "cost_usd":     cost_usd(usage_by_model),
        **totals,
    }

    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_PATH, "a") as f:
        f.write(json.dumps(record) + "\n")


if __name__ == "__main__":
    main()
