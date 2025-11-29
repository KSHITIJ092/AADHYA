// src/index.js
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "leaflet/dist/leaflet.css"; // only external lib css

const rootElement = document.getElementById("root");
if (!rootElement) document.body.innerHTML = '<div id="root"></div>';
const root = createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
