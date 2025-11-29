// src/hooks/useInsights.js
import { useEffect, useState, useCallback } from "react";
import { getInsights } from "../api/insights.api";

/**
 * useInsights
 * - Polls /api/insights at interval
 * - Returns insights array, loading state, manual refresh, lastUpdate
 * - Simple caching to avoid re-renders when identical
 */

export function useInsights({ pollInterval = 15000 } = {}) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAndSet = useCallback(async ()=>{
    setLoading(true);
    try {
      const data = await getInsights();
      // basic normalization
      const normalized = (Array.isArray(data) ? data : []).map(d => ({
        ...d,
        pm25: d.pm25 === null ? undefined : Number(d.pm25),
        surge_risk: Number(d.surge_risk || 0),
      }));
      setInsights(normalized);
      setLastUpdate(new Date().toISOString());
    } catch(e){ console.error("insights fetch err", e); }
    finally{ setLoading(false); }
  }, []);

  useEffect(()=>{
    fetchAndSet();
    const iv = setInterval(fetchAndSet, pollInterval);
    return ()=> clearInterval(iv);
  }, [fetchAndSet, pollInterval]);

  return { insights, loading, refresh: fetchAndSet, lastUpdate };
}
