export const command = "python3 ~/.claude-usage/aggregate.py";
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

function UsageBar({ label, sublabel, value, limit, formatValue }) {
  const hasLimit = limit != null && limit > 0;
  const pct      = hasLimit ? Math.min((value / limit) * 100, 100) : 0;
  const color    = hasLimit ? barColor(pct) : "#fbbf24";

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
          <span style={{ color: hasLimit ? color : "#e8e8e8", fontWeight: 700 }}>
            {hasLimit ? Math.round(pct) + "%" : formatValue(value)}
          </span>
          {hasLimit && (
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
              {formatValue(value)} / {formatValue(limit)}
            </div>
          )}
        </div>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: hasLimit ? pct + "%" : "100%",
          background: color,
          borderRadius: 2,
          opacity: hasLimit ? 1 : 0.3,
        }} />
      </div>
    </div>
  );
}

export const render = ({ output, error }) => {
  if (error) return <div style={{ color: "#f87171" }}>error: {String(error)}</div>;
  if (!output) return <div style={{ color: "rgba(255,255,255,0.4)" }}>loading…</div>;

  let data;
  try {
    data = JSON.parse(output);
  } catch (e) {
    return <div style={{ color: "#f87171" }}>parse error: {e.message}</div>;
  }

  if (data.error) return <div style={{ color: "#f87171" }}>{data.error}</div>;

  const { today, week, month, sparkline, config, week_resets } = data;
  const fmtCost = n => "$" + n.toFixed(2);

  const weekResetsDate = new Date(week_resets);
  const weekResetsLabel = "Resets " + weekResetsDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const max = sparkline.reduce((m, d) => Math.max(m, d.cost_usd), 0.001);
  const BAR_W = 10, GAP = 2, H = 22;
  const W = sparkline.length * (BAR_W + GAP) - GAP;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#fbbf24" }}>◆ CLAUDE USAGE</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{today.sessions} sessions today</span>
      </div>

      {/* Usage bars */}
      <UsageBar
        label="Today"
        sublabel={today.sessions + " sessions · " + fmtTokens(today.total_tokens) + " tokens"}
        value={today.total_tokens}
        limit={config.daily_token_limit}
        formatValue={fmtTokens}
      />
      <UsageBar
        label="This week"
        sublabel={weekResetsLabel}
        value={week.total_tokens}
        limit={config.weekly_token_limit}
        formatValue={fmtTokens}
      />
      <UsageBar
        label="This month"
        sublabel={month.sessions + " sessions · " + fmtCost(month.cost_usd)}
        value={month.cost_usd}
        limit={config.monthly_budget_usd}
        formatValue={fmtCost}
      />

      {/* Sparkline */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10, marginTop: 2 }}>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, marginBottom: 6, letterSpacing: "0.06em" }}>14-DAY HISTORY</div>
        <svg width={W} height={H} style={{ display: "block" }}>
          {sparkline.map((d, i) => {
            const barH   = d.cost_usd > 0 ? Math.max((d.cost_usd / max) * H, 2) : 0;
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
