// src/components/common/StatusPill.jsx
import React from "react";

/**
 * StatusPill
 * - Displays a colored pill based on risk score (0-100)
 * - Accessible text and title set for screen-readers
 */

export default function StatusPill({ score = 0 }) {
  let color = "#10b981"; // green
  if (score >= 75) color = "#ef4444";
  else if (score >= 50) color = "#f59e0b";
  else if (score >= 30) color = "#fb923c";

  return (
    <div className="status-pill" title={`Surge risk ${score}`}>
      <div style={{width:10,height:10,background:color,borderRadius:6,marginRight:8}} />
      <div style={{fontWeight:700}}>{score}</div>
    </div>
  );
}
