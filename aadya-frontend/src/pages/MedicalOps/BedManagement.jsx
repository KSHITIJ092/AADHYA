// src/pages/MedicalOps/BedManagement/BedManagement.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import "./BedManagement.css";

/*
  Updated BedManagement.jsx
  - Replaces window.alert() with an in-app toast (bm2-notice)
  - Toast auto-dismisses after 5s, but user can close immediately
*/

export default function BedManagement({
  beds = [
    { ward_name: "Emergency", total_beds: 28, occupied_beds: 22, icu_beds: 2, occupied_icu_beds: 2, last_updated: new Date().toISOString() },
    { ward_name: "Pulmonology", total_beds: 32, occupied_beds: 26, icu_beds: 6, occupied_icu_beds: 5, last_updated: new Date().toISOString() },
    { ward_name: "Pediatrics", total_beds: 38, occupied_beds: 20, icu_beds: 4, occupied_icu_beds: 1, last_updated: new Date().toISOString() },
    { ward_name: "Cardiology", total_beds: 20, occupied_beds: 14, icu_beds: 6, occupied_icu_beds: 3, last_updated: new Date().toISOString() }
  ],
  onUpdateBeds = () => {},
  onEstimate = () => {}
}) {
  const [drawer, setDrawer] = useState(null);
  const [notice, setNotice] = useState(null); // { type, title, message }
  const noticeTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const totals = useMemo(() => {
    const total = beds.reduce((s, b) => s + (b.total_beds || 0), 0);
    const occ = beds.reduce((s, b) => s + (b.occupied_beds || 0), 0);
    const icu = beds.reduce((s, b) => s + (b.icu_beds || 0), 0);
    const icuOcc = beds.reduce((s, b) => s + (b.occupied_icu_beds || 0), 0);
    return { total, occ, icu, icuOcc };
  }, [beds]);

  const forecast = useMemo(() => {
    const base = Math.max(1, totals.icuOcc || 2);
    return Array.from({ length: 14 }).map((_, i) =>
      Math.min(Math.max(1, totals.icu), Math.round(base + Math.sin(i / 2) * 1.2 + i * 0.4))
    );
  }, [totals]);

  function change(ward, delta) {
    const next = beds.map(b =>
      b.ward_name === ward
        ? { ...b, occupied_beds: Math.max(0, Math.min(b.total_beds, b.occupied_beds + delta)), last_updated: new Date().toISOString() }
        : b
    );
    onUpdateBeds(next);
    showNotice("success", "Update", `${delta > 0 ? "Admitted 1 patient to" : "Discharged 1 patient from"} ${ward}`);
  }

  function showNotice(type, title, message, timeout = 5000) {
    // clear existing timer
    if (noticeTimer.current) {
      clearTimeout(noticeTimer.current);
      noticeTimer.current = null;
    }
    setNotice({ type, title, message });
    noticeTimer.current = setTimeout(() => {
      setNotice(null);
      noticeTimer.current = null;
    }, timeout);
  }

  function hideNotice() {
    if (noticeTimer.current) {
      clearTimeout(noticeTimer.current);
      noticeTimer.current = null;
    }
    setNotice(null);
  }

  function estimateVent() {
    const need = Math.ceil(totals.icuOcc * 0.35 + Math.random() * 2);
    onEstimate({ ventilator_need: need });
    showNotice("info", "Ventilator Estimate", `Estimated ventilator need: ${need} units`);
  }

  function estimateOxygen() {
    const oxygen = Math.ceil(totals.occ * 4.7);
    onEstimate({ oxygen_estimated: oxygen });
    showNotice("info", "Oxygen Estimate", `Estimated O₂ need: ${oxygen} L/day`);
  }

  // SVG geometry
  const SVG_W = 720, SVG_H = 160, padTop = 12, padBottom = 18;
  const maxVal = Math.max(...forecast, 1);
  const pts = forecast.map((v, i) => {
    const x = (i / (forecast.length - 1)) * SVG_W;
    const y = padTop + (1 - v / maxVal) * (SVG_H - padTop - padBottom);
    return `${x},${y}`;
  }).join(" ");
  const areaPts = `${pts} ${SVG_W},${SVG_H - padBottom} 0,${SVG_H - padBottom}`;

  return (
    <div className="bm2-root">
      <div className="bm2-header">
        <div>
          <h3 className="bm2-title">Bed & Critical Resources</h3>
          <div className="bm2-sub">ICU forecast · occupancy · quick actions</div>
        </div>
        <div className="bm2-actions">
          <button className="bm2-btn bm2-ghost" onClick={estimateVent}>Ventilator Estimate</button>
          <button className="bm2-btn bm2-outline" onClick={estimateOxygen}>Oxygen Estimate</button>
        </div>
      </div>

      <div className="bm2-two-col bm2-equal-height">
        <section className="bm2-left">
          <div className="bm2-icu-card bm2-icu-stretch">
            <div className="bm2-icu-head">
              <div>
                <div className="bm2-icu-title">ICU Load Forecast</div>
                <div className="bm2-icu-meta">Current: <b>{totals.icuOcc}</b> / {totals.icu}</div>
              </div>
              <div className="bm2-icu-small">Next windows</div>
            </div>

            <svg className="bm2-icu-chart" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="bm2Area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#a6e3ff" stopOpacity="0.34"/>
                  <stop offset="100%" stopColor="#c7b3ff" stopOpacity="0.06"/>
                </linearGradient>
                <linearGradient id="bm2Line" x1="0" x2="1">
                  <stop offset="0%" stopColor="#2aa9f7"/>
                  <stop offset="100%" stopColor="#6b46ff"/>
                </linearGradient>
                <filter id="bm2Shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#0b2b3b" floodOpacity="0.06"/>
                </filter>
              </defs>

              <polygon points={areaPts} fill="url(#bm2Area)" filter="url(#bm2Shadow)"/>
              <polyline points={pts} fill="none" stroke="url(#bm2Line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              {forecast.map((_, i) => {
                const x = (i / (forecast.length - 1)) * SVG_W;
                return <line key={i} x1={x} x2={x} y1={SVG_H - padBottom} y2={SVG_H - padBottom + 2} stroke="#eef6fb" strokeWidth="1" opacity="0.9"/>;
              })}
            </svg>

            <div className="bm2-kpis">
              <div className="bm2-kpi">
                <div className="bm2-kpi-label">Total Beds</div>
                <div className="bm2-kpi-val">{totals.total}</div>
              </div>
              <div className="bm2-kpi">
                <div className="bm2-kpi-label">Occupied</div>
                <div className="bm2-kpi-val">{totals.occ}</div>
              </div>
              <div className="bm2-kpi">
                <div className="bm2-kpi-label">ICU Occupied</div>
                <div className="bm2-kpi-val">{totals.icuOcc}</div>
              </div>
            </div>
          </div>
        </section>

        <aside className="bm2-right bm2-right-scroll">
          {beds.map(w => {
            const pct = Math.round((w.occupied_beds / Math.max(1, w.total_beds)) * 100);
            const level = pct > 90 ? "critical" : pct > 75 ? "high" : pct > 55 ? "mid" : "ok";
            return (
              <div className="bm2-ward" key={w.ward_name}>
                <div className="bm2-ward-left">
                  <div className="bm2-ward-name">{w.ward_name}</div>
                  <div className="bm2-ward-meta">{new Date(w.last_updated).toLocaleTimeString()} • ICU {w.occupied_icu_beds}/{w.icu_beds} • Free {w.total_beds - w.occupied_beds}</div>
                </div>

                <div className="bm2-ward-mid">
                  <div className="bm2-bar">
                    <div className={`bm2-fill bm2-${level}`} style={{ width: pct + "%" }} />
                  </div>
                  <div className="bm2-pct">{pct}%</div>
                </div>

                <div className="bm2-ward-actions">
                  <button className="bm2-btn bm2-small bm2-ghost" onClick={() => change(w.ward_name, -1)} aria-label={`Discharge one from ${w.ward_name}`}>-1</button>
                  <button className="bm2-btn bm2-small bm2-primary" onClick={() => change(w.ward_name, 1)} aria-label={`Admit one to ${w.ward_name}`}>+1</button>
                  <button className="bm2-btn bm2-small bm2-outline" onClick={() => setDrawer(w)}>View</button>
                </div>
              </div>
            );
          })}
        </aside>
      </div>

      {/* Notice / toast (top-right anchored within component) */}
      {notice && (
        <div className={`bm2-notice bm2-notice-${notice.type}`} role="status" aria-live="polite">
          <div className="bm2-notice-left">
            <div className="bm2-notice-title">{notice.title}</div>
            <div className="bm2-notice-msg">{notice.message}</div>
          </div>
          <div className="bm2-notice-actions">
            <button className="bm2-btn bm2-small bm2-ghost" onClick={hideNotice} aria-label="Close notice">Close</button>
          </div>
        </div>
      )}

      {drawer && (
        <div className="bm2-drawer" role="dialog" aria-modal="true">
          <div className="bm2-drawer-inner">
            <div className="bm2-drawer-head">
              <div>
                <div className="bm2-drawer-title">{drawer.ward_name}</div>
                <div className="bm2-drawer-sub">Updated: {new Date(drawer.last_updated).toLocaleString()}</div>
              </div>
              <button className="bm2-btn bm2-ghost" onClick={() => setDrawer(null)}>Close</button>
            </div>

            <div className="bm2-drawer-grid">
              <div><div className="bm2-k">Total Beds</div><div className="bm2-v">{drawer.total_beds}</div></div>
              <div><div className="bm2-k">Occupied</div><div className="bm2-v">{drawer.occupied_beds}</div></div>
              <div><div className="bm2-k">ICU Beds</div><div className="bm2-v">{drawer.occupied_icu_beds}/{drawer.icu_beds}</div></div>
              <div><div className="bm2-k">Free</div><div className="bm2-v">{drawer.total_beds - drawer.occupied_beds}</div></div>
            </div>

            <div className="bm2-drawer-actions">
              <button className="bm2-btn bm2-primary" onClick={() => { change(drawer.ward_name, 1); setDrawer(null); }}>Admit +1</button>
              <button className="bm2-btn bm2-outline" onClick={() => { change(drawer.ward_name, -1); setDrawer(null); }}>Discharge -1</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
