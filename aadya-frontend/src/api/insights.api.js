// src/api/insights.api.js
import axios from "axios";
const BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
// use proxy in package.json during dev, else set full URL (e.g. http://localhost:8000)
const client = axios.create({ baseURL: BASE, timeout: 10000 });

async function safeGet(path){
  const r = await client.get(path); return r.data;
}

async function safePost(path, body){
  const r = await client.post(path, body); return r.data;
}

export async function getInsights(){
  try { return await safeGet("/api/insights"); }
  catch(e){ console.warn("getInsights failed", e); return []; }
}

export async function getFeatures(){
  try { return await safeGet("/api/features"); }
  catch(e){ return {features: []}; }
}

export async function postAction(payload){
  try { return await safePost("/api/action", payload); }
  catch(e){ console.error("postAction failed", e); return null; }
}

export async function listActions(){
  try { return await safeGet("/api/actions"); }
  catch(e){ return {actions: []}; }
}

export async function simulateArea(area_id){
  try { return await safePost(`/api/simulate/${area_id}`, {}); }
  catch(e){ console.error(e); return null; }
}
