// src/pages/MedicalOps/MedicalOpsDashboard.jsx
import React, { useMemo, useState } from "react";
import BedManagement from "./BedManagement";
import DeptPrediction from "./DeptPrediction";
import "./MedicalOps.css";

/*
  MedicalOpsDashboard
  - vertical layout: DeptPrediction -> BedManagement -> Clinical Advisory Inbox
  - prefix: medops-
*/

const MOCK_STAFF = [
  { id: 1, name: "Dr. A. Mehta", role: "Doctor", department: "Emergency", shift: "Night", on_duty: true, patients_assigned: 6, skill: 9 },
  { id: 2, name: "Nurse S. Joshi", role: "Nurse", department: "ICU", shift: "Night", on_duty: true, patients_assigned: 4, skill: 8 },
  { id: 3, name: "Dr. R. Khan", role: "Doctor", department: "Pulmonology", shift: "Evening", on_duty: true, patients_assigned: 2, skill: 8 },
  { id: 4, name: "Nurse L. Rao", role: "Nurse", department: "Emergency", shift: "Evening", on_duty: false, patients_assigned: 0, skill: 7 },
  { id: 5, name: "Tech P. Iyer", role: "Technician", department: "ICU", shift: "Morning", on_duty: false, patients_assigned: 0, skill: 6 }
];

const MOCK_BEDS = [
  { ward_name: "Emergency", total_beds: 28, occupied_beds: 22, icu_beds: 2, occupied_icu_beds: 2, last_updated: new Date().toISOString() },
  { ward_name: "Pulmonology", total_beds: 32, occupied_beds: 26, icu_beds: 6, occupied_icu_beds: 5, last_updated: new Date().toISOString() },
  { ward_name: "Pediatrics", total_beds: 38, occupied_beds: 20, icu_beds: 4, occupied_icu_beds: 1, last_updated: new Date().toISOString() },
  { ward_name: "Cardiology", total_beds: 20, occupied_beds: 14, icu_beds: 6, occupied_icu_beds: 3, last_updated: new Date().toISOString() }
];

const MOCK_PATIENT_FLOW = [
  { dept: "Emergency", recent: 72, predicted_next4h: 95 },
  { dept: "Pulmonology", recent: 28, predicted_next4h: 45 },
  { dept: "Pediatrics", recent: 40, predicted_next4h: 60 },
  { dept: "Cardiology", recent: 18, predicted_next4h: 24 }
];

const MOCK_INBOX = [
  { id: 1, type: "Advisory", title: "PM2.5 spike — Pulmonology", body: "AQI > 300 expected next 6 hrs. Expect rise in respiratory admissions.", created_at: "2025-11-28T06:20:00Z", severity: "high" },
  { id: 2, type: "Alert", title: "Cluster cases — Pediatrics", body: "Several seasonal-flu like cases reported from OPD. Monitor bed turn.", created_at: "2025-11-28T04:10:00Z", severity: "medium" }
];

export default function MedicalOpsDashboard() {
  const [staff, setStaff] = useState(MOCK_STAFF);
  const [beds, setBeds] = useState(MOCK_BEDS);
  const [patientFlow] = useState(MOCK_PATIENT_FLOW);
  const [inbox, setInbox] = useState(MOCK_INBOX);

  // derived metrics
  const totals = useMemo(() => {
    const totalBeds = beds.reduce((s,b)=> s + b.total_beds, 0);
    const occupied = beds.reduce((s,b)=> s + b.occupied_beds, 0);
    const icuOcc = beds.reduce((s,b)=> s + (b.occupied_icu_beds||0), 0);
    const staffOn = staff.filter(s=>s.on_duty).length;
    return { totalBeds, occupied, icuOcc, staffOn };
  }, [beds, staff]);

  // handlers used by child components:
  function moveStaff(staffId, toDept, toShift) {
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, department: toDept, shift: toShift, on_duty: true } : s));
  }

  function applyAutomation(action) {
    // e.g. action = {type: 'add', role: 'Nurse', dept: 'Emergency', count:2, shift: 'Evening'}
    if (action.type === "add") {
      // create placeholder staff entries (simulate)
      const newOnes = Array.from({ length: action.count }).map((_,i) => ({
        id: Date.now() + i,
        name: `Auto ${action.role} ${i+1}`,
        role: action.role,
        department: action.dept,
        shift: action.shift,
        on_duty: true,
        patients_assigned: 0,
        skill: 6
      }));
      setStaff(prev => [...newOnes, ...prev]);
    } else if (action.type === "move") {
      // move first matching staff not on duty (or lowest skill) from fromDept -> toDept
      setStaff(prev => {
        const copy = [...prev];
        let moved = 0;
        for (let i=copy.length-1;i>=0 && moved < action.count;i--) {
          if (copy[i].department === action.from && copy[i].role === action.role) {
            copy[i] = { ...copy[i], department: action.to, shift: action.shift, on_duty: true };
            moved++;
          }
        }
        return copy;
      });
    }
  }

  function dismissInbox(id) {
    setInbox(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="medops-root">
      <div className="medops-header">
        <div>
          <div className="medops-title">Medical Operations — Dashboard</div>
          <div className="medops-sub">Department predictions • Bed & resource management • Smart staff allocation</div>
        </div>

        <div className="medops-top-stats">
          <div className="medops-top-kpi">
            <div className="medops-top-kpi-label">Beds (Total)</div>
            <div className="medops-top-kpi-value">{totals.totalBeds}</div>
          </div>
          <div className="medops-top-kpi">
            <div className="medops-top-kpi-label">Occupied</div>
            <div className="medops-top-kpi-value">{totals.occupied}</div>
          </div>
          <div className="medops-top-kpi">
            <div className="medops-top-kpi-label">ICU Occupied</div>
            <div className="medops-top-kpi-value">{totals.icuOcc}</div>
          </div>
          <div className="medops-top-kpi">
            <div className="medops-top-kpi-label">Staff on duty</div>
            <div className="medops-top-kpi-value">{totals.staffOn}</div>
          </div>
        </div>
      </div>

      {/* vertical stack: DeptPrediction -> BedManagement -> Inbox */}
      <div className="medops-stack">
        <DeptPrediction
          patientFlow={patientFlow}
          staff={staff}
          onRequestMove={(staffId, toDept, toShift) => moveStaff(staffId, toDept, toShift)}
          onApplyAutomation={(a)=>applyAutomation(a)}
        />

        <BedManagement
          beds={beds}
          staff={staff}
          onUpdateBeds={(next)=>setBeds(next)}
          onEstimate={(payload)=>console.log("estimate requested",payload)}
        />

        <div className="medops-card medops-inbox">
          <div className="medops-card-header">
            <div className="medops-card-title">Clinical Advisory Inbox</div>
            <div className="medops-card-sub">Actionable advisories, alerts & patterns</div>
          </div>

          <div className="medops-inbox-list">
            {inbox.map((it) => (
              <div key={it.id} className={`medops-inbox-row medops-inbox-${it.severity}`}>
                <div className="medops-inbox-left">
                  <div className="medops-inbox-type">{it.type}</div>
                  <div className="medops-inbox-title">{it.title}</div>
                  <div className="medops-inbox-body">{it.body}</div>
                </div>

                <div className="medops-inbox-actions">
                  <button className="medops-btn medops-btn-ghost" onClick={() => { alert("Acknowledged (simulated)"); dismissInbox(it.id); }}>Acknowledge</button>
                  <button className="medops-btn medops-btn-primary" onClick={() => { alert("Create work order / advisory (simulated)"); }}>Create Action</button>
                </div>
              </div>
            ))}

            {inbox.length === 0 && <div className="medops-empty">No advisories. Operations green.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
