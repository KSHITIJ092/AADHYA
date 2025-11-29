// AdminForecastPanel.jsx
// Patient inflow forecast — SVG area + median line visualization (P10/P50/P90).
// Save as src/Admin/AdminForecastPanel.jsx

import React, { useMemo, useState } from "react";
import "./AdminForecastPanel.css";

/*
 Props:
  - areas: array of area objects
  - avgSurgeScore (number)
  - expectedPatients (number)
  - peakHour {time, pts}
*/

function formatNumber(n) {
  return typeof n === "number" ? n.toLocaleString() : n;
}

/*
  SVGAreaChart
   - Renders smooth area bands for P90 (outer) and P10 (inner) and a median line for P50
   - Responsive width (fits container). Shows hover tooltip for nearest point.
   - No external libs used.
*/
function SVGAreaChart({ p10 = [], p50 = [], p90 = [], height = 120 }) {
  // Always keep hooks at top
  const [hover, setHover] = useState(null);

  const length = Math.max(p10.length, p50.length, p90.length);
  if (length === 0) {
    return <div className="admfor-chart-placeholder">No forecast available</div>;
  }

  // compute padded arrays
  const pad = (arr) => {
    if (!arr || arr.length === 0) return Array.from({ length }).map(() => 0);
    if (arr.length === length) return arr;
    return [...arr, ...Array.from({ length: length - arr.length }).map(() => 0)];
  };
  const p10A = pad(p10);
  const p50A = pad(p50);
  const p90A = pad(p90);

  // layout
  const w = Math.max(180, Math.min(360, 42 * length)); // responsive width
  const h = height;
  const padX = 18;
  const padY = 14;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  // scale
  const maxVal = Math.max(...p90A, 1);
  const scaleY = (v) => padY + (1 - v / maxVal) * innerH;
  const xFor = (i) => padX + (i + 0.5) * (innerW / length);

  // build smooth-ish path (polyline). We keep a simple polyline for reliability.
  const buildAreaPath = (arr) => {
    // top edge
    let d = "";
    for (let i = 0; i < length; i++) {
      const x = xFor(i);
      const y = scaleY(arr[i] ?? 0);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    // bottom edge back to baseline
    d += ` L ${xFor(length - 1)} ${padY + innerH} L ${xFor(0)} ${padY + innerH} Z`;
    return d;
  };

  const p90Path = buildAreaPath(p90A);
  const p10Path = buildAreaPath(p10A);

  const p50Path = (() => {
    let d = "";
    for (let i = 0; i < length; i++) {
      const x = xFor(i);
      const y = scaleY(p50A[i] ?? 0);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  })();

  // hover handler (mouse x)
  function onMove(e) {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const mx = e.clientX - rect.left - padX;
    const idx = Math.min(length - 1, Math.max(0, Math.floor((mx / innerW) * length)));
    if (!Number.isNaN(idx)) {
      setHover({
        idx,
        x: xFor(idx),
        y: scaleY(p50A[idx]),
        p10: p10A[idx],
        p50: p50A[idx],
        p90: p90A[idx],
      });
    }
  }
  function onLeave() {
    setHover(null);
  }

  return (
    <div
      className="admfor-svg-holder"
      style={{ width: w, height: h }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      role="img"
      aria-label="Forecast confidence bands chart"
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="admfor-grad-p90" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff6f0" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff1e6" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="admfor-grad-p10" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e9fff6" stopOpacity="1" />
            <stop offset="100%" stopColor="#d6f7e8" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="admfor-line" x1="0" x2="1">
            <stop offset="0%" stopColor="#2d83ff" />
            <stop offset="100%" stopColor="#1156d0" />
          </linearGradient>

          <filter id="admfor-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#1156d0" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* subtle grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padY + t * innerH;
          return <line key={i} x1={padX} x2={w - padX} y1={y} y2={y} stroke="#f1f6fb" strokeWidth={1} />;
        })}

        {/* P90 area */}
        <path d={p90Path} fill="url(#admfor-grad-p90)" stroke="none" opacity="0.98" />

        {/* P10 area */}
        <path d={p10Path} fill="url(#admfor-grad-p10)" stroke="none" opacity="0.98" />

        {/* P50 median line */}
        <path d={p50Path} fill="none" stroke="url(#admfor-line)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" filter="url(#admfor-shadow)" />

        {/* points and hover marker */}
        {p50A.map((v, i) => {
          const x = xFor(i);
          const y = scaleY(v);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3.5} fill="#fff" stroke="#1156d0" strokeWidth={1.6} />
            </g>
          );
        })}

        {/* hovered vertical line & marker */}
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={padY} y2={padY + innerH} stroke="#cfe3ff" strokeDasharray="4 4" />
            <circle cx={hover.x} cy={hover.y} r={5} fill="#1156d0" opacity={0.98} />
          </>
        )}
      </svg>

      {/* Tooltip floating (positioned relative to svg holder) */}
      {hover && (
        <div
          className="admfor-tooltip-forecast"
          style={{
            left: Math.min(w - 160, Math.max(8, hover.x + 8)),
            top: Math.max(6, hover.y - 8),
          }}
        >
          <div className="admfor-tooltip-row"><div className="admfor-tooltip-k">Bucket</div><div className="admfor-tooltip-v">+{hover.idx + 1}h</div></div>
          <div className="admfor-tooltip-row"><div className="admfor-tooltip-k">P10</div><div className="admfor-tooltip-v">{formatNumber(hover.p10)}</div></div>
          <div className="admfor-tooltip-row"><div className="admfor-tooltip-k">P50</div><div className="admfor-tooltip-v">{formatNumber(hover.p50)}</div></div>
          <div className="admfor-tooltip-row"><div className="admfor-tooltip-k">P90</div><div className="admfor-tooltip-v">{formatNumber(hover.p90)}</div></div>
        </div>
      )}
    </div>
  );
}

export default function AdminForecastPanel({ areas = [], avgSurgeScore = 0, expectedPatients = 0, peakHour = { time: "07:00", pts: 0 } }) {
  const [selectedArea, setSelectedArea] = useState(areas[0]?.id || "all");
  const buckets = 6;

  const forecastSeries = useMemo(() => {
    const base = expectedPatients || 40;
    const p50 = Array.from({ length: buckets }).map((_, i) => Math.max(2, Math.round(base * (0.55 + 0.18 * Math.cos(i * 0.9)))));
    const p10 = p50.map((v) => Math.max(0, Math.round(v * 0.58)));
    const p90 = p50.map((v) => Math.round(v * 1.45));
    return { p10, p50, p90 };
  }, [expectedPatients, buckets]);

  const outbreakSummary = useMemo(() => {
    const highRiskAreas = areas.filter((a) => a.score > 70);
    const trending = areas.filter((a) => a.trend === "rising").map((a) => a.label);
    return { highRiskAreas, trending };
  }, [areas]);

  return (
    <div className="admfor-root">
      <div className="admfor-header">
        <div className="admfor-title">Patient Inflow Forecast</div>
        <div className="admfor-meta">Confidence bands (P10 / P50 / P90) • Next 24–72 hrs</div>
      </div>

      <div className="admfor-body">
        <div className="admfor-top">
          <div className="admfor-left">
            <div className="admfor-kv">
              <div className="admfor-k">Expected (hr)</div>
              <div className="admfor-v">{formatNumber(expectedPatients)}</div>
            </div>

            <div className="admfor-kv">
              <div className="admfor-k">Avg surge</div>
              <div className="admfor-v">{avgSurgeScore}</div>
            </div>
          </div>

          <div className="admfor-right">
            <div className="admfor-peak">
              <div className="admfor-peak-time">{peakHour.time}</div>
              <div className="admfor-peak-pts">{peakHour.pts} pts/hr</div>
            </div>
          </div>
        </div>

        <div className="admfor-chart-wrap">
          <div className="admfor-chart-legend">
            <div className="admfor-legend-item"><span className="admfor-legend-dot p90" /> P90</div>
            <div className="admfor-legend-item"><span className="admfor-legend-dot p50" /> P50</div>
            <div className="admfor-legend-item"><span className="admfor-legend-dot p10" /> P10</div>
          </div>

          <div className="admfor-chart-area">
            <SVGAreaChart p10={forecastSeries.p10} p50={forecastSeries.p50} p90={forecastSeries.p90} height={140} />
          </div>
        </div>

        <div className="admfor-area-select">
          <label className="admfor-label">Department / Area</label>
          <select className="admfor-select" value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
            <option value="all">All Regions</option>
            {areas.map((a) => <option value={a.id} key={a.id}>{a.label}</option>)}
          </select>
        </div>

        <div className="admfor-outbreaks">
          <div className="admfor-out-title">Epidemic & Outbreak Intelligence</div>

          <div className="admfor-out-list">
            <div className="admfor-out-item">
              <div className="admfor-out-h">High risk areas</div>
              <div className="admfor-out-v">{outbreakSummary.highRiskAreas.map(a => a.label).join(", ") || "None"}</div>
            </div>

            <div className="admfor-out-item">
              <div className="admfor-out-h">Trending (rising)</div>
              <div className="admfor-out-v">{outbreakSummary.trending.join(", ") || "None"}</div>
            </div>

            <div className="admfor-out-item">
              <div className="admfor-out-h">Sources</div>
              <div className="admfor-out-v">IDSP • WHO • MoHFW</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
