// AdminTopTiles.jsx
import React from "react";
import "./AdminTopTiles.css";

/*
 Props:
  - expectedPatients (number)
  - avgSurgeScore (number)
  - oxygenExtra (number)
  - topAreas (array of {id,label,pm25,estPerHr,score,trend?})
  - onSimulate(areaId)
  - onDeploy(areaId)
*/

function IconDeploy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 12h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 3v18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconSimulate() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 16V8a2 2 0 00-2-2h-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 8v8a2 2 0 002 2h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrendArrow({ trend }) {
  if (!trend) return null;
  if (trend === "rising") return <span className="admtop-trend rising">▲</span>;
  if (trend === "falling") return <span className="admtop-trend falling">▼</span>;
  return <span className="admtop-trend stable">—</span>;
}

/* small pill showing score with text explanation in hover */
function ScorePill({ score }) {
  const cls = score > 75 ? "admtop-score-high" : score > 45 ? "admtop-score-med" : "admtop-score-low";
  const label = score > 75 ? "High risk" : score > 45 ? "Moderate" : "Low";
  return (
    <div className={`admtop-score-pill ${cls}`} title={`Surge score: ${score} — ${label}`}>
      <div className="admtop-score-val">{score}</div>
      <div className="admtop-score-text">{label}</div>
    </div>
  );
}

export default function AdminTopTiles({
  expectedPatients = 0,
  avgSurgeScore = 0,
  oxygenExtra = 0,
  topAreas = [],
  onSimulate = () => {},
  onDeploy = () => {}
}) {
  const confidence = Math.max(0, Math.min(100, avgSurgeScore));
  const meterWidth = `${confidence}%`;

  return (
    <div className="admtop-root">

      {/* TOP KPI TILES */}
      <div className="admtop-tiles-row" role="list" aria-label="Top summary metrics">
        <div className="admtop-tile admtop-tile-big" role="region" aria-label="Expected patients per hour">
          <div className="admtop-tile-ghost">Expected patients / hr (sum)</div>
          <div className="admtop-tile-row">
            <div className="admtop-tile-number" aria-live="polite">{expectedPatients}</div>
            <div className="admtop-help" title="This is the sum of estimated arrivals per hour across all monitored regions.">i</div>
          </div>
          <div className="admtop-tile-desc">Real-time estimate to help staffing and resource planning</div>

          <div className="admtop-confidence">
            <div className="admtop-confidence-label">Model confidence / surge</div>
            <div className="admtop-confidence-bar" aria-hidden>
              <div className="admtop-confidence-fill" style={{ width: meterWidth }} />
            </div>
            <div className="admtop-confidence-meta">{confidence} / 100</div>
          </div>
        </div>

        <div className="admtop-tile" role="region" aria-label="Average surge score">
          <div className="admtop-tile-ghost">Average surge score</div>
          <div className="admtop-tile-number">{avgSurgeScore}</div>
          <div className="admtop-tile-desc">Higher → more likelihood of urgent capacity needs</div>
        </div>

        <div className="admtop-tile" role="region" aria-label="Oxygen extra estimation">
          <div className="admtop-tile-ghost">Oxygen extra (est/day)</div>
          <div className="admtop-tile-number">{oxygenExtra}</div>
          <div className="admtop-tile-desc">Suggested daily additional cylinders</div>
        </div>
      </div>

      {/* HOTSPOTS LIST */}
      <div className="admtop-hotspots" role="list" aria-label="Top hotspots">
        <div className="admtop-hotspots-header">
          <div className="admtop-hotspots-title">Top Areas — at-a-glance hotspot intelligence</div>
          <div className="admtop-hotspots-sub">Use Deploy to allocate staff, Simulate to test scenarios</div>
        </div>

        <div className="admtop-hotspots-list">
          {topAreas.length === 0 && <div className="admtop-empty">No hotspots available</div>}

          {topAreas.map((area) => (
            <div className="admtop-hotspot-row" role="listitem" key={area.id} tabIndex={0} title={`${area.label} — PM2.5 ${area.pm25} • Est/hr ${area.estPerHr}`}>
              <div className="admtop-hotspot-left">
                <div className="admtop-hotspot-name">{area.label} <TrendArrow trend={area.trend} /></div>
                <div className="admtop-hotspot-meta">PM2.5: <strong>{area.pm25}</strong> • Est/hr: <strong>{area.estPerHr}</strong></div>
              </div>

              <div className="admtop-hotspot-right">
                <ScorePill score={area.score} />
                <button className="admtop-btn admtop-btn-deploy" onClick={() => onDeploy(area.id)} aria-label={`Deploy to ${area.label}`}>
                  <IconDeploy /> Deploy
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="admtop-hotspots-footer">
          <div className="admtop-footer-note">Tip: click <b>Simulate</b> to test surge scenarios. Scores are model-backed and updated every few minutes.</div>
        </div>
      </div>
    </div>
  );
}
    