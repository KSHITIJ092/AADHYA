// frontend/src/api.js
// 100 lines - lightweight API helpers for demo
const BASE = (window.location.hostname === "localhost") ? "http://localhost:8000" : "";

async function fetchJson(path, opts={}){
  const res = await fetch(BASE + path, opts);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

export async function fetchInsights(){
  try {
    const data = await fetchJson("/api/insights");
    // server returns array of objects
    return data;
  } catch (e){
    console.warn("fetchInsights failed", e);
    return [];
  }
}

export async function fetchFeatures(){
  try {
    const data = await fetchJson("/api/features");
    return data;
  } catch (e){
    return {features:[]};
  }
}

export async function postAction(body){
  try {
    const res = await fetch(BASE + "/api/action", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("action failed");
    return await res.json();
  } catch(e){
    console.error("postAction", e); return null;
  }
}

export async function simulateArea(area_id){
  try {
    const res = await fetch(BASE + `/api/simulate/${area_id}`, {method:"POST"});
    if (!res.ok) throw new Error("simulate failed");
    return await res.json();
  } catch(e){ console.error(e); return null; }
}
