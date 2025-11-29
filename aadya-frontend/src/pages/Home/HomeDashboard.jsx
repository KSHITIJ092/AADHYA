// src/pages/Home/HomeDashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomeDashboard.css";
import bgImage from "../../assets/icons/logo.png"; // ensure this path exists

export default function HomeDashboard() {
  const navigate = useNavigate();
  function open(route) {
    if (route === "admin") return navigate("/admin", { replace: false });
    if (route === "ops") return navigate("/medicalops", { replace: false });
    if (route === "inventory") return navigate("/inventory", { replace: false });
  }

  return (
    <div className="hdhome-root" role="main">
      <div className="hdhome-hero" aria-hidden="false">
        {/* background image (visual only) */}
        <img src={bgImage} alt="" className="hdhome-bg-img" />

        {/* translucent overlay (visual only) */}
        <div className="hdhome-overlay" />

        {/* top brand area */}
        <div className="hdhome-topbar" role="banner" aria-hidden="false">
          <div className="hdhome-brand">
            <div className="hdhome-mark" aria-hidden="true" />
            <div className="hdhome-brand-text">
              <div className="hdhome-title">AADHYA</div>
              <div className="hdhome-sub">Agentic AI for Predictive Hospital Management</div>
            </div>
          </div>
        </div>

        {/* central card with CTA */}
        <section className="hdhome-center" aria-label="Choose dashboard">
          <div className="hdhome-card" role="region" aria-labelledby="hdhome-heading">
            <h2 id="hdhome-heading" className="hdhome-heading">Choose a dashboard to begin — Admin, Operations or Inventory.</h2>
            <p className="hdhome-subhead">This is the landing page only. Clicking a button opens a dedicated dashboard page.</p>

            <div className="hdhome-choices" role="group" aria-label="Open dashboards">
              <button type="button" className="hdhome-btn hdhome-btn-primary" onClick={() => open("admin")}>OPEN ADMIN</button>
              <button type="button" className="hdhome-btn hdhome-btn-ghost" onClick={() => open("ops")}>OPEN OPERATIONS</button>
              <button type="button" className="hdhome-btn hdhome-btn-outline" onClick={() => open("inventory")}>OPEN INVENTORY</button>
            </div>
          </div>
        </section>

        <footer className="hdhome-footer" aria-hidden="false">
          <small>Tip: use keyboard (Tab → Enter) to open dashboards. Each dashboard is a full page.</small>
        </footer>
      </div>
    </div>
  );
}
