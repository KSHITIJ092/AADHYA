// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomeDashboard from "./pages/Home/HomeDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import InventoryDashboard from "./pages/Inventory/InventoryDashboard";
import MedicalOpsDashboard from "./pages/MedicalOps/MedicalOpsDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Landing page with 3 big buttons */}
        <Route path="/" element={<HomeDashboard />} />

        {/* Direct routes (if user manually opens /admin etc) */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/inventory" element={<InventoryDashboard />} />
        <Route path="/medicalops" element={<MedicalOpsDashboard />} />

        {/* fallback */}
        <Route path="*" element={<HomeDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
