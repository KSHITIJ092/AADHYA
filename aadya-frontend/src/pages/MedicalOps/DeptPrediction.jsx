// src/pages/MedicalOps/DeptPrediction.jsx
import React, { useMemo, useState } from "react";
import "./DeptPrediction.css";

/*
 DeptPrediction.jsx
 - Clean, humanized UI
 - Subtle buttons, friendly badges, polished mini-area chart
 - Props:
    patientFlow: [{ dept, recent, predicted_next4h }]
    onApplyAutomation(action)
    onManual(dept)
    onDetails(dept)
*/

function makeSmoothPath(values, w, h, pad = 6) {
  if (!values || values.length === 0) return "";
  const max = Math.max(...values, 1);
  const step = (w - pad * 2) / (values.length - 1 || 1);
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - v / max) * (h - pad * 2);
    return { x, y };
  });

  if (pts.length === 1) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 1} ${pts[0].y + 1}`;
  }
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  // Catmull-Rom to cubic bezier
  const path = [];
  path.push(`M ${pts[0].x} ${pts[0].y}`);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const t = 0.3;
    const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const d3 = Math.hypot(p3.x - p2.x, p3.y - p2.y);

    const fa = t * (d1 / (d1 + d2 || 1));
    const fb = t * (d2 / (d2 + d3 || 1));

    const c1x = p1.x + fa * (p2.x - p0.x);
    const c1y = p1.y + fa * (p2.y - p0.y);
    const c2x = p2.x - fb * (p3.x - p1.x);
    const c2y = p2.y - fb * (p3.y - p1.y);

    path.push(`C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`);
  }

  return path.join(" ");
}

function MiniArea({ recent = 10, next = 14, width = 240, height = 64, accent = "#3b82f6" }) {
  const series = useMemo(() => {
    const len = 8;
    return Array.from({ length: len }).map((_, i) => Math.round(recent + (next - recent) * (i / (len - 1))));
  }, [recent, next]);

  const path = useMemo(() => makeSmoothPath(series, width, height, 6), [series, width, height]);

  // area polygon (simple closed polyline under the values)
  const max = Math.max(...series, 1);
  const step = (width - 12) / (series.length - 1 || 1);
  const areaPts = series
    .map((v, i) => {
      const x = 6 + i * step;
      const y = 6 + (1 - v / max) * (height - 12);
      return `${x},${y}`;
    })
    .join(" ");
  const areaPath = `M 6 ${height - 6} L ${areaPts} L ${width - 6} ${height - 6} Z`;

  return (
    <svg className="dp-mini" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden>
      <defs>
        <linearGradient id="dpArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.14" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="dpLine" x1="0" x2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="dpDrop" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#072234" floodOpacity="0.06" />
        </filter>
      </defs>

      <path d={areaPath} fill="url(#dpArea)" stroke="none" />

      <path d={path} fill="none" stroke="url(#dpLine)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" filter="url(#dpDrop)" />

      {/* last three markers */}
      {series.slice(-3).map((v, idx) => {
        const i = series.length - 3 + idx;
        const x = 6 + i * step;
        const y = 6 + (1 - series[i] / max) * (height - 12);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3.6} fill="#fff" stroke={idx === 2 ? "#06b6d4" : accent} strokeWidth="1.6" />
          </g>
        );
      })}
    </svg>
  );
}

export default function DeptPrediction({
  patientFlow = [
    { dept: "Emergency", recent: 72, predicted_next4h: 95 },
    { dept: "Pulmonology", recent: 28, predicted_next4h: 45 },
    { dept: "Pediatrics", recent: 40, predicted_next4h: 60 },
    { dept: "Cardiology", recent: 18, predicted_next4h: 24 }
  ],
  onApplyAutomation = () => alert("Automation applied (simulated)"),
  onManual = (dept) => alert(`Manual planner for ${dept} (simulated)`),
  onDetails = (dept) => alert(`Details for ${dept} (simulated)`)
}) {
  const [expanded, setExpanded] = useState(false);

  const enriched = useMemo(() => {
    return patientFlow.map((p) => {
      const delta = p.predicted_next4h - p.recent;
      const pct = Math.round((delta / Math.max(1, p.recent)) * 100);
      let level = "stable";
      if (delta > 25) level = "critical";
      else if (delta > 12) level = "high";
      else if (delta > 5) level = "watch";
      return { ...p, delta, deltaPct: pct, level };
    });
  }, [patientFlow]);

  return (
    <section className={`dp-card ${expanded ? "dp-expanded" : ""}`} aria-label="Department predictions">
      <header className="dp-head">
        <div>
          <h3 className="dp-title">Department-wise Prediction</h3>
          <div className="dp-sub">Next 4 hours — predicted surge & suggested actions</div>
        </div>

        <div className="dp-head-actions">
          <button className="dp-btn dp-btn-minimal" onClick={() => setExpanded(e => !e)}>{expanded ? "Collapse" : "Expand"}</button>
          <button
            className="dp-btn dp-btn-muted"
            onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(patientFlow));
              alert("Predictions copied (simulated)");
            }}
          >
            Export
          </button>
        </div>
      </header>

      <div className="dp-list">
        {enriched.map((row) => {
          const accent =
            row.level === "critical" ? "#ff5c7c" : row.level === "high" ? "#7c5cff" : row.level === "watch" ? "#00bfa6" : "#3b82f6";

          return (
            <article key={row.dept} className="dp-row" aria-label={`${row.dept} row`}>
              <div className="dp-left">
                <div className="dp-dept">{row.dept}</div>
                <div className="dp-meta">Recent: <strong>{row.recent}</strong> • Predicted: <strong>{row.predicted_next4h}</strong></div>
              </div>

              <div className="dp-center">
                <MiniArea recent={row.recent} next={row.predicted_next4h} width={260} height={68} accent={accent} />
                <div className="dp-delta">{row.delta >= 0 ? `↑ ${row.delta} (${row.deltaPct}%)` : `${row.delta} (${row.deltaPct}%)`}</div>
              </div>

              <div className="dp-right">
                <div className={`dp-pill dp-pill-${row.level}`}>
                  {row.level === "critical" ? "Critical" : row.level === "high" ? "High" : row.level === "watch" ? "Watch" : "Stable"}
                </div>

                <div className="dp-suggestion">
                  {row.level === "critical" && <div>Add 2 nurses (4pm–10pm)</div>}
                  {row.level === "high" && <div>Increase 1 doctor coverage</div>}
                  {row.level === "watch" && <div>Monitor trend closely</div>}
                  {row.level === "stable" && <div>No immediate action</div>}
                </div>

                <div className="dp-actions">
                  {(row.level === "critical" || row.level === "high") && (
                    <button
                      className="dp-btn dp-btn-primary-soft"
                      onClick={() => onApplyAutomation({ dept: row.dept, suggestion: row.level })}
                      title="Apply recommended automation"
                    >
                      Apply Automation
                    </button>
                  )}

                  <button className="dp-btn dp-btn-muted" onClick={() => onManual(row.dept)}>Manual</button>
                  <button className="dp-btn dp-btn-outline" onClick={() => onDetails(row.dept)}>Details</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="dp-foot">
        <div className="dp-legend">
          <div><span className="dp-dot crit" /> Critical</div>
          <div><span className="dp-dot high" /> High</div>
          <div><span className="dp-dot watch" /> Watch</div>
          <div><span className="dp-dot stable" /> Stable</div>
        </div>

        <div className="dp-tip">Tip: <strong>Apply Automation</strong> creates editable staff suggestions in the planner.</div>
      </footer>
    </section>
  );
}
