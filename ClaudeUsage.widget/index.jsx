export const command = "sh ~/.claude-usage/run.sh";
export const refreshFrequency = 60000;

export const className = `
  font-family: "SF Mono", "Menlo", monospace;
  font-size: 11px;
  color: #e8e8e8;
  background: rgba(10, 10, 14, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px 18px 14px;
  width: 260px;
  position: fixed;
  top: 20px;
  right: 20px;
  user-select: none;
  box-sizing: border-box;
`;

function barColor(pct) {
  if (pct >= 100) return "#f87171";
  if (pct >= 90)  return "#fb923c";
  if (pct >= 75)  return "#fbbf24";
  return "#4ade80";
}

function fmtTokens(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return Math.round(n / 1000) + "k";
  return String(n);
}

function UsageBar({ label, sublabel, pct, mainLabel, subLabel2 }) {
  const hasPct  = pct != null;
  const color   = hasPct ? barColor(pct) : "#fbbf24";
  const barFill = hasPct ? Math.min(pct, 100) : 0;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <div>
          <span style={{ color: "#e8e8e8", fontWeight: 600 }}>{label}</span>
          {sublabel && (
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{sublabel}</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ color: hasPct ? color : "#e8e8e8", fontWeight: 700 }}>
            {mainLabel}
          </span>
          {subLabel2 && (
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{subLabel2}</div>
          )}
        </div>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: barFill + "%",
          background: hasPct ? color : "rgba(255,255,255,0.2)",
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

export const render = ({ output, error }) => {
  if (error) return <div style={{ color: "#f87171" }}>error: {String(error)}</div>;
  if (!output) return <div style={{ color: "rgba(255,255,255,0.4)" }}>loading…</div>;

  let data;
  try { data = JSON.parse(output); }
  catch (e) { return <div style={{ color: "#f87171" }}>parse error: {e.message}</div>; }
  if (data.error) return <div style={{ color: "#f87171" }}>{data.error}</div>;

  const { today, week, month, sparkline, config, anthropic } = data;
  const fmtCost = n => "$" + n.toFixed(2);

  const fmtResets = iso => {
    if (!iso) return null;
    const diff = new Date(iso) - new Date();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h < 24) return "Resets in " + h + "h " + m + "m";
    const d = new Date(iso);
    return "Resets " + d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  // ── session bar ──────────────────────────────────────────────────────────
  const session = anthropic && anthropic.five_hour;
  const sessionPct = session ? session.utilization : null;

  // ── weekly bar ───────────────────────────────────────────────────────────
  const weekly    = anthropic && anthropic.seven_day;
  const weeklyPct = weekly ? weekly.utilization : null;

  // ── monthly bar ──────────────────────────────────────────────────────────
  const monthBudget = config.monthly_budget_usd;
  const monthPct    = monthBudget ? Math.min((month.cost_usd / monthBudget) * 100, 100) : null;

  // ── sparkline ────────────────────────────────────────────────────────────
  const max   = sparkline.reduce((m, d) => Math.max(m, d.cost_usd), 0.001);
  const BAR_W = 10, GAP = 2, H = 22;
  const W     = sparkline.length * (BAR_W + GAP) - GAP;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#fbbf24" }}>◆ CLAUDE USAGE</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{today.sessions} sessions today</span>
      </div>

      <UsageBar
        label="Current session"
        sublabel={session ? fmtResets(session.resets_at) : "install browser-cookie3 for live %"}
        pct={sessionPct}
        mainLabel={sessionPct != null ? Math.round(sessionPct) + "% used" : fmtTokens(today.total_tokens)}
        subLabel2={sessionPct != null ? null : "today's tokens"}
      />

      <UsageBar
        label="This week"
        sublabel={weekly ? fmtResets(weekly.resets_at) : fmtTokens(week.total_tokens) + " tokens"}
        pct={weeklyPct}
        mainLabel={weeklyPct != null ? Math.round(weeklyPct) + "% used" : fmtCost(week.cost_usd)}
        subLabel2={weeklyPct != null ? null : "this week"}
      />

      <UsageBar
        label="This month"
        sublabel={month.sessions + " sessions"}
        pct={monthPct}
        mainLabel={fmtCost(month.cost_usd)}
        subLabel2={monthBudget ? Math.round(monthPct) + "% of " + fmtCost(monthBudget) : null}
      />

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10, marginTop: 2 }}>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, marginBottom: 6, letterSpacing: "0.06em" }}>14-DAY HISTORY</div>
        <svg width={W} height={H} style={{ display: "block" }}>
          {sparkline.map((d, i) => {
            const barH    = d.cost_usd > 0 ? Math.max((d.cost_usd / max) * H, 2) : 0;
            const isToday = i === sparkline.length - 1;
            return (
              <rect
                key={d.date}
                x={i * (BAR_W + GAP)}
                y={H - barH}
                width={BAR_W}
                height={barH || 2}
                rx={1.5}
                fill={isToday ? "#fbbf24" : "rgba(255,255,255,0.2)"}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};
