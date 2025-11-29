// src/components/common/KpiCard.jsx
import React from "react";

/**
 * KpiCard
 * - Reusable small card to show key metric with label and subtext
 * - Styled to be used in top tiles or mini dashboards
 */

export default function KpiCard({ label, value, hint, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value" style={{color: color || "#0b66ff"}}>{value}</div>
      </div>
      <div className="kpi-hint small-muted">{hint}</div>
    </div>
  );
}
