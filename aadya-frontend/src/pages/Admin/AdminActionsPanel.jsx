// AdminActionsPanel.jsx
// Vertical single-graph forecast (SVG) + analytics + controls
// Save as src/Admin/AdminActionsPanel.jsx

import React, { useMemo, useState, useRef } from "react";
import "./AdminActionsPanel.css";

/*
 Props:
  - oxygenExtra (number)
  - peakHour {time, pts}
  - inventoryForecast: [{item, extra}]
  - onNotify: function
  - onGeneratePO: function
*/

function fmt(n) {
  return typeof n === "number" ? n.toLocaleString() : n;
}

/*
  SVGGraph:
   - Single responsive SVG in a vertical area
   - Renders p90 area (top band), p10 area (inner band), and p50 line
   - On hover shows small tooltip with P10/P50/P90 for nearest bucket
   - IMPORTANT: hooks (useState/useRef) are declared first (not conditional)
*/
function SVGGraph({ p10 = [], p50 = [], p90 = [], height = 260, padding = 10 }) {
  // hooks must always be called in the same order
  const [hover, setHover] = useState(null);
  const wrapperRef = useRef();

  const length = Math.max(p10.length, p50.length, p90.length);
  if (length === 0) {
    return <div className="admact-vert-placeholder">No forecast data</div>;
  }

  const maxVal = Math.max(...p90, ...p50, 1);
  const width = Math.min(260, 40 * length + padding * 2); // limit width so it fits panel
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  // map value -> y coordinate (0 at top)
  const valueToY = (v) => {
    const ratio = v / maxVal;
    return padding + innerH - ratio * innerH;
  };

  // x for each bucket (even spacing)
  const xFor = (i) => padding + (i + 0.5) * (innerW / length);

  // build smooth-ish area/line paths
  const p90Path = (() => {
    let path = "";
    for (let i = 0; i < length; i++) {
      const x = xFor(i);
      const y = valueToY(p90[i] ?? 0);
      path += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    }
    path += ` L ${xFor(length - 1)} ${valueToY(0)} L ${xFor(0)} ${valueToY(0)} Z`;
    return path;
  })();

  const p10Path = (() => {
    let path = "";
    for (let i = 0; i < length; i++) {
      const x = xFor(i);
      const y = valueToY(p10[i] ?? 0);
      path += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    }
    path += ` L ${xFor(length - 1)} ${valueToY(0)} L ${xFor(0)} ${valueToY(0)} Z`;
    return path;
  })();

  const p50Line = (() => {
    let d = "";
    for (let i = 0; i < length; i++) {
      const x = xFor(i);
      const y = valueToY(p50[i] ?? 0);
      d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    }
    return d;
  })();

  function handleMove(e) {
    const rect = wrapperRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const relX = Math.max(0, Math.min(innerW, mx - padding));
    const idx = Math.min(length - 1, Math.max(0, Math.floor((relX / innerW) * length)));
    setHover({
      idx,
      x: xFor(idx),
      yP50: valueToY(p50[idx] ?? 0),
      p10: p10[idx],
      p50: p50[idx],
      p90: p90[idx],
    });
  }

  function handleLeave() {
    setHover(null);
  }

  return (
    <div
      className="admact-svg-wrapper"
      style={{ width }}
      ref={wrapperRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      role="img"
      aria-label="Patient inflow forecast graph"
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* light horizontal grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padding + innerH - t * innerH;
          return <line key={i} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#eef6fb" strokeWidth={1} />;
        })}

        {/* P90 fill */}
        <path d={p90Path} fill="#fff2ee" stroke="none" opacity={0.95} />

        {/* P10 fill */}
        <path d={p10Path} fill="#e8fbee" stroke="none" opacity={0.95} />

        {/* P50 line */}
        <path d={p50Line} fill="none" stroke="#1156d0" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

        {/* P50 points */}
        {p50.map((v, i) => {
          const x = xFor(i);
          const y = valueToY(v ?? 0);
          return <circle key={i} cx={x} cy={y} r={4} fill="#ffffff" stroke="#1156d0" strokeWidth={2} />;
        })}

        {/* hover indicator */}
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={padding} y2={height - padding} stroke="#cfe3ff" strokeWidth={1} strokeDasharray="4 4" />
            <circle cx={hover.x} cy={hover.yP50} r={6} fill="#1156d0" opacity={0.95} />
          </>
        )}
      </svg>

      {hover && (
        <div className="admact-tooltip" style={{ left: Math.max(8, Math.min(width - 140, hover.x + 8)) }}>
          <div className="admact-tooltip-row"><span className="admact-tooltip-k">Bucket</span><span className="admact-tooltip-v">+{hover.idx + 1}h</span></div>
          <div className="admact-tooltip-row"><span className="admact-tooltip-k">P10</span><span className="admact-tooltip-v">{fmt(hover.p10)}</span></div>
          <div className="admact-tooltip-row"><span className="admact-tooltip-k">P50</span><span className="admact-tooltip-v">{fmt(hover.p50)}</span></div>
          <div className="admact-tooltip-row"><span className="admact-tooltip-k">P90</span><span className="admact-tooltip-v">{fmt(hover.p90)}</span></div>
        </div>
      )}
    </div>
  );
}

export default function AdminActionsPanel({
  oxygenExtra = 0,
  peakHour = { time: "07:00", pts: 50 },
  inventoryForecast = [],
  onNotify = () => {},
  onGeneratePO = () => {}
}) {
  const [pmMultiplier, setPmMultiplier] = useState(1.0);
  const [simulateFestival, setSimulateFestival] = useState(false);
  const [dept, setDept] = useState("All Dept");

  const BUCKETS = 6;
  const forecastSeries = useMemo(() => {
    const base = Math.max(6, Math.round((oxygenExtra || 6) * 6 * pmMultiplier));
    const p50 = Array.from({ length: BUCKETS }).map((_, i) =>
      Math.max(1, Math.round(base * (0.55 + 0.12 * Math.cos(i * 0.9))))
    );
    const p10 = p50.map((v) => Math.max(0, Math.round(v * 0.6)));
    const p90 = p50.map((v) => Math.round(v * 1.45));
    return { p10, p50, p90 };
  }, [oxygenExtra, pmMultiplier]);

  const analytics = useMemo(() => {
    const totalP50 = forecastSeries.p50.reduce((s, x) => s + x, 0);
    const totalP90 = forecastSeries.p90.reduce((s, x) => s + x, 0);
    const variability = totalP50 > 0 ? Math.round(((totalP90 - totalP50) / totalP50) * 100) : 0;
    const peakIndex = forecastSeries.p50.indexOf(Math.max(...forecastSeries.p50));
    const peakBucket = peakIndex >= 0 ? `${peakIndex + 1}h` : "-";
    return { totalP50, totalP90, variability, peakBucket };
  }, [forecastSeries]);

  function handleApply() {
    const festival = simulateFestival ? " + Festival" : "";
    alert(`Applied simulation: PM multiplier ${pmMultiplier.toFixed(2)}${festival} for ${dept}`);
  }

  return (
    <div className="admact-root" aria-live="polite">
      <div className="admact-header">
        <div>
          <div className="admact-title">Patient Inflow Forecast</div>
          <div className="admact-sub">Vertical single graph • P10 / P50 / P90</div>
        </div>
      </div>

      <div className="admact-analytics">
        <div className="admact-analytic">
          <div className="admact-analytic-k">Expected (sum P50)</div>
          <div className="admact-analytic-v">{fmt(analytics.totalP50)}</div>
        </div>

        <div className="admact-analytic">
          <div className="admact-analytic-k">Peak bucket</div>
          <div className="admact-analytic-v">{analytics.peakBucket}</div>
        </div>

        <div className="admact-analytic">
          <div className="admact-analytic-k">Variability</div>
          <div className="admact-analytic-v">{analytics.variability}%</div>
        </div>
      </div>

      <div className="admact-forecast">
        <div className="admact-forecast-left">
          <label className="admact-label">Department</label>
          <select className="admact-select" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option>All Dept</option>
            <option>Emergency</option>
            <option>ICU</option>
            <option>OPD</option>
            <option>Lab</option>
          </select>

          <div className="admact-peak">
            <div className="admact-peak-label">Peak hour (est)</div>
            <div className="admact-peak-value">{peakHour.time} • {peakHour.pts} pts/hr</div>
          </div>
        </div>

        <div className="admact-forecast-right">
          <div className="admact-quick-metric">
            <div className="admact-quick-label">Oxygen extra</div>
            <div className="admact-quick-value">{oxygenExtra}</div>
          </div>

          <div className="admact-quick-metric">
            <div className="admact-quick-label">Avg surge</div>
            <div className="admact-quick-value">{Math.round(pmMultiplier * 100)}%</div>
          </div>
        </div>
      </div>

      {/* SVG Graph area (single vertical graph) */}
      <div className="admact-chart-area">
        <SVGGraph p10={forecastSeries.p10} p50={forecastSeries.p50} p90={forecastSeries.p90} height={260} />
      </div>

      <div className="admact-sim-controls">
        <div className="admact-sim-row">
          <label className="admact-label">PM2.5 multiplier</label>
          <input
            className="admact-range"
            type="range"
            min="0.5"
            max="2.5"
            step="0.01"
            value={pmMultiplier}
            onChange={(e) => setPmMultiplier(parseFloat(e.target.value))}
          />
          <div className="admact-range-value">{pmMultiplier.toFixed(2)}</div>
        </div>

        <div className="admact-sim-row admact-checkbox-row">
          <label className="admact-checkbox">
            <input type="checkbox" checked={simulateFestival} onChange={(e) => setSimulateFestival(e.target.checked)} />
            <span>Simulate festival</span>
          </label>
        </div>

        <div className="admact-sim-actions">
          <button className="admact-btn admact-btn-primary" onClick={handleApply}>Apply (Simulate)</button>
        </div>
      </div>

      <div className="admact-inv">
        <div className="admact-inv-title">Inventory & Staff Forecast</div>
        <div className="admact-inv-list">
          {inventoryForecast.map((it, idx) => (
            <div className="admact-inv-row" key={idx}>
              <div className="admact-inv-info">
                <div className="admact-inv-name">{it.item}</div>
                <div className="admact-inv-sub">Estimated extra</div>
              </div>
              <div className="admact-inv-qty">{it.extra}</div>
            </div>
          ))}
        </div>

      </div>

      <div className="admact-audit">
        <div className="admact-audit-title">Audit & Transparency</div>
        <div className="admact-audit-content">
          <div className="admact-audit-row"><div className="admact-audit-k">Recent Actions</div><div className="admact-audit-v">No recent actions</div></div>
          <div className="admact-audit-row"><div className="admact-audit-k">Reason</div><div className="admact-audit-v">Pollution spike, outbreak, festival</div></div>
        </div>
      </div>
    </div>
  );
}
