// src/utils/metrics.js

/**
 * metrics.js
 * - Small deterministic functions to estimate resources from patient counts
 * - Used by Forecast and Actions panels
 */

export function surgeScoreFromPm(pm25, festival=false, tempDelta=0){
  // small interpretable heuristic
  let score = 0;
  if (pm25 == null) pm25 = 50;
  if (pm25 >= 300) score += 50;
  else if (pm25 >= 200) score += 35;
  else if (pm25 >= 150) score += 20;
  else if (pm25 >= 100) score += 10;
  if (festival) score += 10;
  if (tempDelta >= 5) score += 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function estimateResources(expectedPatientsHr){
  // base assumption: per 10 extra patients -> 1 oxygen cylinder (daily)
  const base = 30;
  const extra = Math.max(0, expectedPatientsHr - base);
  const oxygen_extra = Math.ceil(extra / 10);
  const nebulizer_kits = Math.ceil(extra / 8);
  const iv_fluids = Math.ceil(extra / 6);
  const staff_extra = Math.ceil(extra / 12);
  return { oxygen_extra, nebulizer_kits, iv_fluids, staff_extra };
}

export function formatBigNumber(n){
  if (n >= 1000) return (n/1000).toFixed(1) + "k";
  return String(n);
}
