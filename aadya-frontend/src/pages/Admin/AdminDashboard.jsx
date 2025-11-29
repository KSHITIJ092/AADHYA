// AdminDashboard.jsx (FINAL OPTIMIZED VERSION)

import React, { useEffect, useMemo, useRef, useState } from "react";
import "./AdminDashboard.css";
import AdminTopTiles from "./AdminTopTiles";
import AdminActionsPanel from "./AdminActionsPanel";
import AdminForecastPanel from "./AdminForecastPanel";
import logo from "../../assets/icons/logo.png";

// Leaflet imports
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Circle, Popup, Tooltip, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

// ---------------- MOCK DATA ----------------

const MOCK_STAFF = [
  { id: 1, name: "Dr. A. Mehta", role: "Doctor", department: "Emergency", shift: "Night", is_on_duty: true, patients_assigned: 6, skill_level: 9, fatigue_score: 2.1, avg_response_time: 12.5, last_checkin: new Date().toISOString() },
  { id: 2, name: "Nurse S. Joshi", role: "Nurse", department: "ICU", shift: "Night", is_on_duty: true, patients_assigned: 4, skill_level: 8, fatigue_score: 3.6, avg_response_time: 18.4, last_checkin: new Date().toISOString() },
//   { id: 3, name: "Tech R. Gupta", role: "Technician", department: "Lab", shift: "Morning", is_on_duty: false, patients_assigned: 0, skill_level: 6, fatigue_score: 1.2, avg_response_time: 30.0, last_checkin: new Date().toISOString() }
];

const MOCK_BEDS = [
  { ward_name: "ICU", total_beds: 24, occupied_beds: 20, icu_beds: 10, occupied_icu_beds: 9, covid_isolation_beds: 2, last_updated: new Date().toISOString() },
  { ward_name: "General", total_beds: 120, occupied_beds: 86, icu_beds: 0, occupied_icu_beds: 0, covid_isolation_beds: 0, last_updated: new Date().toISOString() },
  { ward_name: "Emergency", total_beds: 28, occupied_beds: 22, icu_beds: 2, occupied_icu_beds: 2, covid_isolation_beds: 1, last_updated: new Date().toISOString() }
];

const MOCK_AREAS = [
  { id: "mumbai", label: "Mumbai City", pm25: 329.3, estPerHr: 58, score: 94, trend: "rising", lat: 19.075984, lng: 72.877656 },
  { id: "thane", label: "Thane", pm25: 299.2, estPerHr: 57, score: 89, trend: "rising", lat: 19.218330, lng: 72.978088 },
  { id: "bandra", label: "Bandra", pm25: 119.3, estPerHr: 38, score: 26, trend: "stable", lat: 19.054400, lng: 72.836700 },
  { id: "vashi", label: "Vashi", pm25: 97.2, estPerHr: 37, score: 23, trend: "stable", lat: 19.0330, lng: 73.0297 },
  { id: "kalyan", label: "Kalyan", pm25: 42.2, estPerHr: 36, score: 19, trend: "improving", lat: 19.2403, lng: 73.1302 }
];

const MOCK_INVENTORY = [
  { id: 1, item_name: "Oxygen cylinders", category: "Oxygen", current_stock: 18, reorder_level: 10, unit: "units", criticality: "High", avg_daily_usage: 5, supplier_name: "OxSupply" },
  { id: 2, item_name: "Nebulizer kits", category: "Equipment", current_stock: 52, reorder_level: 40, unit: "kits", criticality: "Medium", avg_daily_usage: 4, supplier_name: "MediEquip" },
  { id: 3, item_name: "IV fluids (bags)", category: "Consumable", current_stock: 240, reorder_level: 120, unit: "bags", criticality: "High", avg_daily_usage: 30, supplier_name: "FluidCorp" }
];

const _clone = (o) => JSON.parse(JSON.stringify(o));

// --------------- MAP PANEL -----------------

function MapPanel({ areas = [], mapHeight = 330 }) {
  const mapRef = useRef();

  const heatPoints = areas
    .filter((a) => !!a.lat && !!a.lng)
    .map((a) => [a.lat, a.lng, Math.max(0.05, Math.min(1, a.score / 100))]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const coords = areas.filter((a) => a.lat && a.lng).map((a) => [a.lat, a.lng]);
    if (coords.length === 0) return;

    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds.pad(0.35), { animate: true, duration: 0.6 });
  }, [areas]);

  function HeatLayer() {
    const map = useMap();
    useEffect(() => {
      if (!map || !L.heatLayer) return;

      if (map._heatLayer) {
        map.removeLayer(map._heatLayer);
        map._heatLayer = null;
      }

      if (heatPoints.length > 0) {
        const heat = L.heatLayer(heatPoints, {
          radius: 30,
          blur: 40,
          maxZoom: 10,
          gradient: { 0.2: "green", 0.4: "yellow", 0.6: "orange", 0.9: "red" }
        }).addTo(map);
        map._heatLayer = heat;
      }
    }, [map, JSON.stringify(heatPoints)]);

    return null;
  }

  const center = areas[0] && areas[0].lat ? [areas[0].lat, areas[0].lng] : [19.07, 72.87];

  return (
    <div className="admdash-map-panel" style={{ minHeight: mapHeight }}>
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: mapHeight, width: "100%", borderRadius: 10 }}
        whenCreated={(map) => (mapRef.current = map)}
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <HeatLayer />

        {areas.map((a) => {
          if (!a.lat || !a.lng) return null;

          const radius = 800 + (a.score / 100) * (7000 - 800);
          const color =
            a.score > 70 ? "#d9534f" : a.score > 40 ? "#f0ad4e" : "#5cb85c";

          return (
            <Circle
              key={a.id}
              center={[a.lat, a.lng]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.45 }}
            >
              <Tooltip><b>{a.label}</b></Tooltip>
              <Popup>
                <b>{a.label}</b>
                <br />PM2.5: {a.pm25}
                <br />Est/hr: {a.estPerHr}
                <br />Score: {a.score}
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>

      <div className="admdash-map-legend">
        <div style={{ fontWeight: 900 }}>Map Legend</div>
        <div className="admdash-map-legend-row"><span className="admdash-dot high" /> High</div>
        <div className="admdash-map-legend-row"><span className="admdash-dot med" /> Moderate</div>
        <div className="admdash-map-legend-row"><span className="admdash-dot low" /> Low</div>
      </div>
    </div>
  );
}

// ---------------- MAIN DASHBOARD ----------------

export default function AdminDashboard() {
  const [areas, setAreas] = useState(_clone(MOCK_AREAS));
  const [beds, setBeds] = useState(_clone(MOCK_BEDS));
  const [staff, setStaff] = useState(_clone(MOCK_STAFF));
  const [inventory, setInventory] = useState(_clone(MOCK_INVENTORY));
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [filterText, setFilterText] = useState("");

  const expectedPatients = useMemo(() => areas.reduce((s, a) => s + a.estPerHr, 0), [areas]);
  const avgSurgeScore = useMemo(() => Math.round(areas.reduce((s, a) => s + a.score, 0) / areas.length), [areas]);
  const oxygenExtraEst = useMemo(() => {
    const occupiedIcu = beds.reduce((s, b) => s + (b.occupied_icu_beds || 0), 0);
    return Math.max(0, Math.ceil(occupiedIcu / 6));
  }, [beds]);

  function refreshAll() {
    setAreas((prev) =>
      prev.map((a) => ({
        ...a,
        score: Math.min(100, Math.max(0, a.score + Math.round((Math.random() - 0.4) * 14))),
        pm25: Math.max(8, +(a.pm25 + (Math.random() - 0.4) * 6).toFixed(1))
      }))
    );
    setLastUpdated(new Date());
  }

  return (
    <div className="admdash-root">

      {/* HEADER (IMPROVED) */}
      <header className="admdash-header">
        <div className="admdash-header-left">
          <img src={logo} alt="logo" className="admdash-logo-img" />

          <div className="admdash-header-titles">
            <div className="admdash-title">Predictive Hospital Admin</div>
            <div className="admdash-sub">Health - Surge Management</div>
          </div>
        </div>

        <div className="admdash-header-right">
          <div className="admdash-lastupdate">
            Updated <b>{lastUpdated.toLocaleString()}</b>
          </div>

          <button className="admdash-btn admdash-btn-primary" onClick={refreshAll}>
            Refresh
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="admdash-main">

        {/* LEFT COLUMN */}
        <section className="admdash-main-left">

          <AdminTopTiles
            expectedPatients={expectedPatients}
            avgSurgeScore={avgSurgeScore}
            oxygenExtra={oxygenExtraEst}
            topAreas={areas}
          />

          <div className="admdash-section-large">
            <h3 className="admdash-section-title">Real-Time Surge Monitor</h3>
            <MapPanel areas={areas} mapHeight={380} />
          </div>

          {/* ----------------------- BED FLOW (IMPROVED) ---------------------- */}
          <div className="admdash-card admdash-bedcard">
            <div className="admdash-bedcard-header">
              <h4 className="admdash-card-title">Bed Flow & Manpower</h4>

              <div className="admdash-bed-kpis">
                <div className="admdash-kpi">
                  <div className="admdash-kpi-label">Total</div>
                  <div className="admdash-kpi-value">{beds.reduce((s, b) => s + b.total_beds, 0)}</div>
                </div>
                <div className="admdash-kpi">
                  <div className="admdash-kpi-label">Occupied</div>
                  <div className="admdash-kpi-value">{beds.reduce((s, b) => s + b.occupied_beds, 0)}</div>
                </div>
                <div className="admdash-kpi">
                  <div className="admdash-kpi-label">ICU</div>
                  <div className="admdash-kpi-value">{beds.reduce((s, b) => s + (b.occupied_icu_beds || 0), 0)}</div>
                </div>
              </div>
            </div>

            <div className="admdash-bed-list">
              {beds.map((b) => {
                const occPct = Math.round((b.occupied_beds / b.total_beds) * 100);
                const icuPct = b.icu_beds ? Math.round((b.occupied_icu_beds / b.icu_beds) * 100) : 0;
                const pressure = occPct > 90 ? "critical" : occPct > 75 ? "high" : occPct > 55 ? "moderate" : "normal";
                const suggestion =
                  pressure === "critical"
                    ? "Activate surge & transfer"
                    : pressure === "high"
                    ? "Call +1 nurse"
                    : pressure === "moderate"
                    ? "Track trend"
                    : "Stable";

                return (
                  <div className="admdash-bed-item" key={b.ward_name}>
                    <div className="admdash-bed-main">
                      <div className="admdash-bed-info">
                        <div className="admdash-bed-name">{b.ward_name}</div>
                        <div className="admdash-bed-meta">Updated: {new Date(b.last_updated).toLocaleTimeString()}</div>
                      </div>

                      <div className="admdash-bed-stats">
                        <div className="admdash-progress-row">
                          <div className="admdash-progress-label">Occupancy</div>

                          <div className="admdash-progress-wrap">
                            <div className="admdash-progress-bg">
                              <div className={`admdash-progress-fill ${pressure}`} style={{ width: `${occPct}%` }} />
                            </div>
                            <div className="admdash-progress-number">{occPct}%</div>
                          </div>
                        </div>

                        <div className="admdash-mini-row">
                          <div className="admdash-mini">
                            <div className="admdash-mini-label">ICU</div>
                            <div className="admdash-mini-val">{b.occupied_icu_beds}/{b.icu_beds}</div>
                          </div>

                          <div className="admdash-mini">
                            <div className="admdash-mini-label">Isolation</div>
                            <div className="admdash-mini-val">{b.covid_isolation_beds}</div>
                          </div>

                          <div className="admdash-mini">
                            <div className="admdash-mini-label">Free</div>
                            <div className="admdash-mini-val">{b.total_beds - b.occupied_beds}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="admdash-bed-actions">
                      <div className={`admdash-suggestion ${pressure}`}>{suggestion}</div>

                      <div className="admdash-action-buttons">
                        <button className="admdash-btn admdash-btn-outline">Reallocate</button>
                        <button className="admdash-btn">Log</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="admdash-bedcard-footer">
              <div className="admdash-bed-footer-left">
                <div className="admdash-bed-footer-title">Auto-Reallocation Suggestions</div>
                <div className="admdash-bed-footer-sub">Based on live ICU/bed pressure</div>
              </div>

              <button className="admdash-btn admdash-btn-primary">Apply</button>
            </div>
          </div>

          {/* STAFF */}
          <div className="admdash-card">
            <h4 className="admdash-card-title">Staff Snapshot</h4>

            <div className="admdash-staff-controls">
              <input
                className="admdash-input"
                placeholder="Search staff"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>

            <div className="admdash-staff-list">
              {staff
                .filter(
                  (s) =>
                    s.name.toLowerCase().includes(filterText.toLowerCase()) ||
                    s.department.toLowerCase().includes(filterText.toLowerCase())
                )
                .map((s) => (
                  <div key={s.id} className="admdash-staff-item">
                    <div>
                      <div className="admdash-staff-name">{s.name}</div>
                      <div className="admdash-meta">
                        {s.role} • {s.department} • {s.shift}
                      </div>
                    </div>

                    <div className="admdash-staff-actions">
                      <div className="admdash-small">{s.patients_assigned} Patients</div>
                      <button className="admdash-btn admdash-btn-oncall">On-call</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="admdash-main-right">
          <AdminForecastPanel
            areas={areas}
            avgSurgeScore={avgSurgeScore}
            expectedPatients={expectedPatients}
            peakHour={{ time: "7:00", pts: 74 }}
          />
          <AdminActionsPanel
            oxygenExtra={oxygenExtraEst}
            inventoryForecast={[
              { item: "Oxygen cylinders", extra: 3 },
              { item: "Nebulizer kits", extra: 4 },
              { item: "IV fluids (bags)", extra: 5 },
              { item: "Extra staff", extra: 3 },
              { item :"Masks", extra:8}
            ]}
          />
        </aside>
      </main>
    </div>
  );
}
