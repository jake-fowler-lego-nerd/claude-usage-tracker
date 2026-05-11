export const command = "python3 ~/.claude-usage/aggregate.py";
export const refreshFrequency = 60000;

export const className = `
  font-family: "SF Mono", "Menlo", monospace;
  font-size: 11px;
  color: #e8e8e8;
  background: rgba(10, 10, 14, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px 12px;
  width: 220px;
  position: fixed;
  top: 20px;
  right: 20px;
  user-select: none;
  box-sizing: border-box;
`;

function alertColor(ratio) {
  if (ratio === null) return "#e8e8e8";
  if (ratio >= 1.0)   return "#f87171";
  if (ratio >= 0.9)   return "#fb923c";
  if (ratio >= 0.75)  return "#fbbf24";
  return "#4ade80";
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

  const { today, month, sparkline, config } = data;
  const monthBudget = config.monthly_budget_usd;
  const dayBudget   = config.daily_budget_usd;
  const monthRatio  = monthBudget ? month.cost_usd / monthBudget : null;
  const dayRatio    = dayBudget   ? today.cost_usd / dayBudget   : null;
  const totalTokens = today.input_tokens + today.output_tokens
    + today.cache_creation_input_tokens + today.cache_read_input_tokens;

  const fmt  = n => "$" + n.toFixed(2);
  const fmtK = n => n >= 1000 ? Math.round(n / 1000) + "k" : String(n);
  const bcolor = r => r === null ? "#e8e8e8" : alertColor(r);

  const divider = (
    <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 0" }} />
  );

  const budgetBar = (used, budget) => {
    if (!budget) return null;
    const ratio = Math.min(used / budget, 1);
    const pct   = (ratio * 100).toFixed(1);
    const color = alertColor(ratio);
    return (
      <div style={{ marginTop: 6 }}>
        <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
          <div style={{ height: "100%", width: (ratio * 100) + "%", background: color, borderRadius: 2 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.35)" }}>
          <span style={{ color }}>{pct}% used</span>
          <span>of {fmt(budget)}</span>
        </div>
      </div>
    );
  };

  const max = sparkline.reduce((m, d) => Math.max(m, d.cost_usd), 0.001);
  const BAR_W = 10, GAP = 2, H = 28;
  const W = sparkline.length * (BAR_W + GAP) - GAP;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#fbbf24" }}>◆ CLAUDE USAGE</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
          {today.sessions} session{today.sessions !== 1 ? "s" : ""} today
        </span>
      </div>

      <div style={{ fontSize: 9, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>TODAY</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>cost</span>
        <span style={{ color: bcolor(dayRatio), fontWeight: 600 }}>{fmt(today.cost_usd)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>tokens</span>
        <span style={{ fontWeight: 600 }}>{fmtK(totalTokens)}</span>
      </div>
      {budgetBar(today.cost_usd, dayBudget)}

      {divider}

      <div style={{ fontSize: 9, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>THIS MONTH</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>cost</span>
        <span style={{ color: bcolor(monthRatio), fontWeight: 600 }}>{fmt(month.cost_usd)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>sessions</span>
        <span style={{ fontWeight: 600 }}>{String(month.sessions)}</span>
      </div>
      {budgetBar(month.cost_usd, monthBudget)}

      {divider}

      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, marginBottom: 5, letterSpacing: "0.06em" }}>14-DAY HISTORY</div>
      <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
        {sparkline.map((d, i) => {
          const barH  = d.cost_usd > 0 ? Math.max((d.cost_usd / max) * H, 2) : 0;
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
  );
};
