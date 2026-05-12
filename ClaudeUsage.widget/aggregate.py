#!/usr/bin/env python3
"""
Reads ~/.claude-usage/log.jsonl and outputs aggregated usage JSON
for the Übersicht widget. Also fetches live usage % from claude.ai
via the browser session using osascript.
"""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

LOG_PATH  = Path.home() / ".claude-usage" / "log.jsonl"
CONF_PATH = Path.home() / ".claude-usage" / "config.json"

DEFAULT_CONFIG = {
    "monthly_budget_usd":  None,
    "daily_budget_usd":    None,
    "daily_token_limit":   None,
    "weekly_token_limit":  None,
    "monthly_token_limit": None,
}


def load_config():
    if CONF_PATH.exists():
        try:
            return {**DEFAULT_CONFIG, **json.loads(CONF_PATH.read_text())}
        except Exception:
            pass
    return DEFAULT_CONFIG


def fetch_anthropic_usage():
    """Fetches live usage % from claude.ai using Chrome's stored session cookie."""
    try:
        import browser_cookie3
        import urllib.request

        UA = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )

        cj = browser_cookie3.chrome(domain_name="claude.ai")

        def get(url):
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
            with opener.open(req, timeout=8) as resp:
                return json.loads(resp.read().decode())

        orgs = get("https://claude.ai/api/organizations")
        org = next(
            (o for o in orgs if "claude_pro" in o.get("capabilities", [])),
            orgs[0]
        )
        return get(f"https://claude.ai/api/organizations/{org['uuid']}/usage")
    except Exception:
        return None


def empty_bucket():
    return {"cost_usd": 0.0, "input_tokens": 0, "output_tokens": 0,
            "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "sessions": 0}


def add_record(bucket, rec):
    bucket["cost_usd"]                      += rec.get("cost_usd", 0)
    bucket["input_tokens"]                  += rec.get("input_tokens", 0)
    bucket["output_tokens"]                 += rec.get("output_tokens", 0)
    bucket["cache_creation_input_tokens"]   += rec.get("cache_creation_input_tokens", 0)
    bucket["cache_read_input_tokens"]       += rec.get("cache_read_input_tokens", 0)
    bucket["sessions"]                      += 1


def main():
    config = load_config()

    now_utc   = datetime.now(timezone.utc)
    today_str = now_utc.strftime("%Y-%m-%d")
    month_str = now_utc.strftime("%Y-%m")

    # Last 14 days for the sparkline
    days = [(now_utc - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(13, -1, -1)]
    daily_buckets = {d: empty_bucket() for d in days}

    # Week: Thu–Wed containing today (matches Anthropic's reset cycle)
    days_since_thu = (now_utc.weekday() - 3) % 7
    week_start = now_utc - timedelta(days=days_since_thu)
    week_dates  = set(
        (week_start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)
    )

    today_bucket = empty_bucket()
    month_bucket = empty_bucket()
    week_bucket  = empty_bucket()

    if LOG_PATH.exists():
        with open(LOG_PATH) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue

                ts = rec.get("timestamp", "")
                rec_date  = ts[:10]
                rec_month = ts[:7]

                if rec_date == today_str:
                    add_record(today_bucket, rec)
                if rec_month == month_str:
                    add_record(month_bucket, rec)
                if rec_date in week_dates:
                    add_record(week_bucket, rec)
                if rec_date in daily_buckets:
                    add_record(daily_buckets[rec_date], rec)

    sparkline = [
        {"date": d, "cost_usd": round(daily_buckets[d]["cost_usd"], 4)}
        for d in days
    ]

    def total_tokens(b):
        return b["input_tokens"] + b["output_tokens"] \
             + b["cache_creation_input_tokens"] + b["cache_read_input_tokens"]

    anthropic = fetch_anthropic_usage()

    print(json.dumps({
        "today":    {**today_bucket, "cost_usd": round(today_bucket["cost_usd"], 4),
                     "total_tokens": total_tokens(today_bucket)},
        "week":     {**week_bucket,  "cost_usd": round(week_bucket["cost_usd"], 4),
                     "total_tokens": total_tokens(week_bucket)},
        "month":    {**month_bucket, "cost_usd": round(month_bucket["cost_usd"], 4),
                     "total_tokens": total_tokens(month_bucket)},
        "sparkline":  sparkline,
        "config":     config,
        "anthropic":  anthropic,
        "generated":  now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "week_resets": (week_start + timedelta(days=7)).strftime("%Y-%m-%d"),
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
