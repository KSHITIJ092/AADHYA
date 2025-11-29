// src/pages/Inventory/InventoryDashboard.jsx
import React, { useMemo, useState } from "react";
import "./InventoryDashboard.css";

/*
  Inventory Dashboard
  - Uses unique class prefix: invdash-
  - Replace mockedData with real API fetches in your app
*/

/* -------------------- Mock data (replace with API) -------------------- */
const MOCK_INVENTORY = [
  { id: 1, item_name: "Oxygen cylinders", category: "Oxygen", current_stock: 18, reorder_level: 10, unit: "units", criticality: "High", avg_daily_usage: 5.5, shelf_life_days: 365, supplier_name: "OxSupply", last_restocked: "2025-11-10" },
  { id: 2, item_name: "Nebulizer kits", category: "Equipment", current_stock: 52, reorder_level: 40, unit: "kits", criticality: "Medium", avg_daily_usage: 4.2, shelf_life_days: 730, supplier_name: "MediEquip", last_restocked: "2025-11-01" },
  { id: 3, item_name: "Ventilator circuits", category: "Equipment", current_stock: 14, reorder_level: 20, unit: "sets", criticality: "High", avg_daily_usage: 2.1, shelf_life_days: 1095, supplier_name: "VentCorp", last_restocked: "2025-10-25" },
  { id: 4, item_name: "IV fluids (bags)", category: "Consumable", current_stock: 240, reorder_level: 120, unit: "bags", criticality: "High", avg_daily_usage: 30, shelf_life_days: 720, supplier_name: "FluidCorp", last_restocked: "2025-11-04" },
  { id: 5, item_name: "Antipyretic & antiviral meds", category: "Drug", current_stock: 680, reorder_level: 300, unit: "tabs", criticality: "High", avg_daily_usage: 120, shelf_life_days: 365, supplier_name: "PharmaCo", last_restocked: "2025-09-15" },
  { id: 6, item_name: "PPE kits", category: "Consumable", current_stock: 420, reorder_level: 200, unit: "kits", criticality: "Medium", avg_daily_usage: 60, shelf_life_days: 900, supplier_name: "SafeGear", last_restocked: "2025-11-07" }
];

const MOCK_TRANSACTIONS = [
  { id: 1, item_id: 1, timestamp: "2025-11-28T08:12:00Z", transaction_type: "Usage", quantity: -3, department: "Emergency", initiated_by: "nurse_joshi", remarks: "ER use" },
  { id: 2, item_id: 4, timestamp: "2025-11-28T07:10:00Z", transaction_type: "Usage", quantity: -24, department: "ICU", initiated_by: "ward_admin", remarks: "Shift consumption" },
  { id: 3, item_id: 2, timestamp: "2025-11-27T16:00:00Z", transaction_type: "Restock", quantity: +20, department: "Central", initiated_by: "store_mgr", remarks: "Arrived" }
];

const MOCK_PATIENT_FLOW = [
  // simplified: recent_day factor (higher -> more consumption)
  { date: "2025-11-27", admissions: 58, predicted_demand: 62 },
  { date: "2025-11-28", admissions: 72, predicted_demand: 75 }
];

/* -------------------- Utility helpers -------------------- */
function formatNumber(n) {
  if (n === null || n === undefined) return "-";
  if (Number.isInteger(n)) return n.toString();
  return Number(n).toLocaleString();
}
function daysBetween(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.round((then - now) / (1000 * 60 * 60 * 24));
}

/* small color mapping for criticality */
const CRIT_COLORS = {
  High: { bg: "#fff1f0", border: "#ffb8b8", text: "#b02a2a" },
  Medium: { bg: "#fff8e6", border: "#ffdfb5", text: "#8a5e00" },
  Low: { bg: "#e8fbef", border: "#cfead1", text: "#147a38" }
};

/* -------------------- Small subcomponents -------------------- */

function MiniKPI({ title, value, hint }) {
  return (
    <div className="invdash-kpi">
      <div className="invdash-kpi-title">{title}</div>
      <div className="invdash-kpi-value">{value}</div>
      {hint && <div className="invdash-kpi-hint">{hint}</div>}
    </div>
  );
}

/* Vertical bar chart component (SVG) — single series vertical bars */
function VerticalBarChart({ data = [], width = 220, height = 220, labelFormatter = (v)=>v }) {
  // data: [{label, value, color?}]
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const barW = Math.max(12, Math.floor((width - 12) / Math.max(1, data.length)));
  return (
    <svg className="invdash-vchart" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Forecast chart">
      {/* baseline */}
      <line x1="0" x2={width} y1={height-24} y2={height-24} stroke="#e6eef7" strokeWidth="1" />
      {data.map((d, i) => {
        const x = 8 + i * (barW + 6);
        const barH = Math.max(2, (Math.abs(d.value) / max) * (height - 48));
        const y = height - 24 - barH;
        const color = d.color || "#2d83ff";
        return (
          <g key={i} transform={`translate(${x},0)` }>
            <rect x="0" y={y} width={barW} height={barH} rx="6" fill={color} opacity="0.95" />
            <text x={barW/2} y={height-8} fontSize="10" textAnchor="middle" fill="#2f4f63">{d.label}</text>
            <title>{`${d.label}: ${labelFormatter(d.value)}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

/* -------------------- Main Inventory Dashboard -------------------- */

export default function InventoryDashboard() {
  // Replace with API state hooks
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [transactions] = useState(MOCK_TRANSACTIONS);
  const [patientFlow] = useState(MOCK_PATIENT_FLOW);
  const [selectedItem, setSelectedItem] = useState(null);
  const [poList, setPoList] = useState([]);
  const [filterText, setFilterText] = useState("");

  /* Forecast logic (simple heuristic)
     - nextDay = avg_daily_usage * (1 + recent_admission_factor)
     - threeDay = nextDay * 3 * trendFactor (small randomness)
  */
  const forecast = useMemo(() => {
    const recentFactor = (patientFlow[patientFlow.length - 1]?.predicted_demand || 60) / 60; // baseline 60
    return inventory.map((it) => {
      const nextDay = Math.max(0, Math.round(it.avg_daily_usage * recentFactor));
      const threeDay = Math.max(0, Math.round(nextDay * (1 + Math.random() * 0.18) * 3));
      const stockDays = it.avg_daily_usage > 0 ? Math.round(it.current_stock / it.avg_daily_usage) : Infinity;
      const riskHours = Math.round((it.current_stock / Math.max(0.00001, it.avg_daily_usage)) * 24);
      return { id: it.id, item_name: it.item_name, nextDay, threeDay, stockDays, riskHours };
    });
  }, [inventory, patientFlow]);

  /* derive alerts */
  const alerts = useMemo(() => {
    const out = [];
    forecast.forEach((f) => {
      const it = inventory.find((x) => x.id === f.id);
      if (!it) return;
      // stockout risk: stockDays less than 2 days or riskHours < 24
      if (f.stockDays < 1 || f.riskHours < 24) {
        out.push({ type: "Stockout Risk", level: "critical", message: `${it.item_name} risk of stockout in ${Math.max(1, f.riskHours)} hours` });
      } else if (f.stockDays < 3) {
        out.push({ type: "Low Stock", level: "warning", message: `${it.item_name} low stock — ${f.stockDays} days left` });
      }

      // reorder suggestion
      if (it.current_stock <= it.reorder_level) {
        out.push({ type: "Reorder", level: "action", message: `Reorder ${it.item_name} (current ${it.current_stock} ≤ reorder ${it.reorder_level})` });
      }

      // AQI-driven mock example: nebulizer demand up
      if (it.item_name.toLowerCase().includes("nebul") && patientFlow.some(p => p.predicted_demand > 70)) {
        out.push({ type: "Demand Spike", level: "info", message: `Nebulizer demand expected to increase due to poor AQI / rising admissions` });
      }

      // expiry / shelf-life check (simple): last_restocked older than (shelf_life_days - 30)
      if (it.shelf_life_days && it.last_restocked) {
        const daysSince = Math.round((Date.now() - new Date(it.last_restocked)) / (1000*60*60*24));
        if (daysSince > (it.shelf_life_days - 30)) {
          out.push({ type: "Expiry", level: "warning", message: `${it.item_name} approaching expiry (restocked ${daysSince} days ago)` });
        }
      }
    });
    return out;
  }, [forecast, inventory, patientFlow]);

  /* quick summary KPIs */
  const summary = useMemo(() => {
    const totalItems = inventory.length;
    const criticalLow = inventory.filter((i) => i.current_stock <= i.reorder_level).length;
    const highCriticalItems = inventory.filter((i) => i.criticality === "High").length;
    return { totalItems, criticalLow, highCriticalItems };
  }, [inventory]);

  /* chart data for forecast (take top 6 items by nextDay) */
  const chartData = useMemo(() => {
    const top = forecast.slice().sort((a,b)=>b.nextDay - a.nextDay).slice(0,6);
    return top.map((t,i) => ({ label: t.item_name.split(" ")[0], value: t.nextDay, color: i===0? "#ff8b72" : "#2d83ff" }));
  }, [forecast]);

  /* handlers */
  function handleCreatePO(item) {
    // create a simple PO suggestion (auto qty = reorder_level * 2 - current_stock)
    const qty = Math.max(1, item.reorder_level * 2 - item.current_stock);
    const po = {
      id: Date.now(),
      item_id: item.id,
      item_name: item.item_name,
      supplier: item.supplier_name,
      qty,
      created_at: new Date().toISOString()
    };
    setPoList((p) => [po, ...p]);
    // mark as action alert removed (optional)
  }

  function handleRestock(itemId, qty) {
    setInventory((prev) => prev.map((it) => it.id === itemId ? { ...it, current_stock: it.current_stock + qty, last_restocked: new Date().toISOString() } : it));
  }

  function handleExportCSV() {
    // small CSV export stub for inventory table
    const csv = ["item_name,category,current_stock,reorder_level,unit,criticality"].concat(inventory.map(i => `${i.item_name},${i.category},${i.current_stock},${i.reorder_level},${i.unit},${i.criticality}`)).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* filtered list */
  const visibleInventory = inventory.filter(i => i.item_name.toLowerCase().includes(filterText.toLowerCase()));

  return (
    <div className="invdash-root">
      <div className="invdash-header">
        <div>
          <h2 className="invdash-title">Inventory Dashboard</h2>
          <div className="invdash-sub">Real-time stock, forecast & procurement recommendations</div>
        </div>

        <div className="invdash-header-actions">
          <button className="invdash-btn" onClick={handleExportCSV}>Export CSV</button>
          <button className="invdash-btn invdash-btn-primary" onClick={() => {
            // quick auto-PO for all low stock items
            visibleInventory.filter(i=>i.current_stock <= i.reorder_level).forEach(i=>handleCreatePO(i));
            alert("Auto-PO suggestions created for low-stock items (local)");
          }}>Auto POs</button>
        </div>
      </div>

      {/* top KPIs */}
      <div className="invdash-kpis">
        <MiniKPI title="Total tracked items" value={summary.totalItems} hint={`${summary.highCriticalItems} high-critical`} />
        <MiniKPI title="Items needing reorder" value={summary.criticalLow} hint="Stock ≤ reorder level" />
        <MiniKPI title="Forecast next-day total" value={forecast.reduce((s,f)=>s+f.nextDay,0)} hint="Predicted consumption" />
      </div>

      <div className="invdash-grid">
        {/* Left column: Inventory list + transactions */}
        <div className="invdash-left">
          <div className="invdash-panel invdash-panel-inventory">
            <div className="invdash-panel-header">
              <h3 className="invdash-panel-title">Real-Time Inventory Levels</h3>
              <div className="invdash-panel-controls">
                <input className="invdash-input" placeholder="Search item..." value={filterText} onChange={e=>setFilterText(e.target.value)} />
              </div>
            </div>

            <div className="invdash-inventory-grid">
              {visibleInventory.map((it) => {
                const crit = CRIT_COLORS[it.criticality] || CRIT_COLORS.Medium;
                const f = forecast.find(x=>x.id===it.id);
                const daysLeft = f ? f.stockDays : Math.round(it.current_stock / (it.avg_daily_usage || 1));
                return (
                  <div className="invdash-item-card" key={it.id}>
                    <div className="invdash-item-top">
                      <div className="invdash-item-left">
                        <div className="invdash-item-name">{it.item_name}</div>
                        <div className="invdash-item-meta">{it.category} • {it.unit} • Supplier: {it.supplier_name}</div>
                        <div className="invdash-item-sub">Avg/day: {formatNumber(it.avg_daily_usage)} • Last restock: {new Date(it.last_restocked).toLocaleDateString()}</div>
                      </div>

                      <div className="invdash-item-right">
                        <div className="invdash-item-stock">{formatNumber(it.current_stock)} <span className="invdash-item-unit">{it.unit}</span></div>
                        <div className="invdash-item-reorder" style={{ background: crit.bg, borderColor: crit.border, color: crit.text }}>{it.criticality}</div>
                      </div>
                    </div>

                    <div className="invdash-item-bottom">
                      <div className="invdash-item-forecast">
                        <div className="invdash-item-forecast-row">
                          <div className="invdash-item-forecast-label">Next day</div>
                          <div className="invdash-item-forecast-value">{f ? f.nextDay : "-"}</div>
                        </div>
                        <div className="invdash-item-forecast-row">
                          <div className="invdash-item-forecast-label">3-day need</div>
                          <div className="invdash-item-forecast-value">{f ? f.threeDay : "-"}</div>
                        </div>
                        <div className="invdash-item-forecast-row">
                          <div className="invdash-item-forecast-label">Stock days</div>
                          <div className="invdash-item-forecast-value">{f ? `${f.stockDays}d` : "-"}</div>
                        </div>
                      </div>

                      <div className="invdash-item-actions">
                        <button className="invdash-btn" onClick={()=>setSelectedItem(it)}>Details</button>
                        <button className="invdash-btn invdash-btn-ghost" onClick={()=>handleCreatePO(it)}>Create PO</button>
                        <button className="invdash-btn invdash-btn-outline" onClick={()=>handleRestock(it.id, Math.max(1, it.reorder_level))}>Quick Restock</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="invdash-panel-footer">
              <div className="invdash-panel-footer-left">Showing {visibleInventory.length} items</div>
            </div>
          </div>

          <div className="invdash-panel invdash-panel-transactions">
            <div className="invdash-panel-header">
              <h3 className="invdash-panel-title">Recent Inventory Transactions</h3>
            </div>

            <div className="invdash-transactions">
              {transactions.map(t => {
                const item = inventory.find(i=>i.id===t.item_id);
                return (
                  <div key={t.id} className="invdash-transaction-row">
                    <div className="invdash-transaction-left">
                      <div className="invdash-transaction-item">{item?.item_name || "Unknown"}</div>
                      <div className="invdash-transaction-meta">{t.transaction_type} • {t.initiated_by}</div>
                    </div>
                    <div className="invdash-transaction-right">
                      <div className={`invdash-transaction-qty ${t.quantity < 0 ? "neg" : "pos"}`}>{t.quantity}</div>
                      <div className="invdash-transaction-time">{new Date(t.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Forecast, alerts, warehouse */}
        <div className="invdash-right">
          <div className="invdash-panel invdash-panel-forecast">
            <div className="invdash-panel-header">
              <h3 className="invdash-panel-title">Demand Forecast & Procurement</h3>
            </div>

            <div className="invdash-forecast-body">
              <div className="invdash-forecast-chart">
                <VerticalBarChart data={chartData} width={260} height={220} labelFormatter={(v)=>v} />
              </div>

              <div className="invdash-forecast-summary">
                <div className="invdash-forecast-stat">
                  <div className="invdash-forecast-label">Next day predicted total</div>
                  <div className="invdash-forecast-value">{forecast.reduce((s,f)=>s+f.nextDay,0)}</div>
                </div>

                <div className="invdash-forecast-actions">
                  <button className="invdash-btn invdash-btn-primary" onClick={()=>{
                    // create POs for top 3 low-stock-high-demand
                    const lowCandidates = inventory.filter(i => i.current_stock <= i.reorder_level).slice(0,3);
                    lowCandidates.forEach(handleCreatePO);
                    alert("POs created for low stock items (local).");
                  }}>Create Recommended POs</button>

                  <button className="invdash-btn" onClick={()=>alert("Open procurement (simulated)")}>Open Procurement</button>
                </div>
              </div>
            </div>
          </div>

          <div className="invdash-panel invdash-panel-alerts">
            <div className="invdash-panel-header">
              <h3 className="invdash-panel-title">Supply Chain Alerts</h3>
            </div>

            <div className="invdash-alerts-list">
              {alerts.length === 0 && <div className="invdash-alert-empty">No active alerts — all good</div>}
              {alerts.map((a, idx) => (
                <div key={idx} className={`invdash-alert-row invdash-alert-${a.level}`}>
                  <div className="invdash-alert-type">{a.type}</div>
                  <div className="invdash-alert-msg">{a.message}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="invdash-panel invdash-panel-pos">
            <div className="invdash-panel-header">
              <h3 className="invdash-panel-title">Pending Purchase Orders</h3>
            </div>

            <div className="invdash-pos-list">
              {poList.length === 0 && <div className="invdash-pos-empty">No pending POs</div>}
              {poList.map(po => (
                <div key={po.id} className="invdash-po-row">
                  <div className="invdash-po-left">
                    <div className="invdash-po-item">{po.item_name}</div>
                    <div className="invdash-po-meta">{po.qty} • {po.supplier}</div>
                  </div>
                  <div className="invdash-po-right">
                    <button className="invdash-btn invdash-btn-ghost" onClick={()=>{ navigator.clipboard?.writeText(JSON.stringify(po)); alert("PO copied (simulated)"); }}>Copy</button>
                    <button className="invdash-btn invdash-btn-outline" onClick={()=>setPoList(prev=>prev.filter(p=>p.id!==po.id))}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Selected item modal / drawer simplified */}
      {selectedItem && (
        <div className="invdash-drawer">
          <div className="invdash-drawer-inner" role="dialog" aria-modal="true">
            <div className="invdash-drawer-header">
              <h3>{selectedItem.item_name}</h3>
              <button className="invdash-btn invdash-btn-close" onClick={()=>setSelectedItem(null)}>Close</button>
            </div>
            <div className="invdash-drawer-body">
              <p><strong>Stock:</strong> {selectedItem.current_stock} {selectedItem.unit}</p>
              <p><strong>Avg daily usage:</strong> {selectedItem.avg_daily_usage}</p>
              <p><strong>Supplier:</strong> {selectedItem.supplier_name}</p>
              <p><strong>Shelf life:</strong> {selectedItem.shelf_life_days} days</p>
              <p><strong>Reorder level:</strong> {selectedItem.reorder_level}</p>

              <div style={{ marginTop: 12 }}>
                <button className="invdash-btn invdash-btn-primary" onClick={()=>{ handleCreatePO(selectedItem); alert("PO created (local)"); }}>Create PO</button>
                <button className="invdash-btn invdash-btn-outline" onClick={()=>{ handleRestock(selectedItem.id, selectedItem.reorder_level); alert("Restocked (local)"); }}>Restock</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
