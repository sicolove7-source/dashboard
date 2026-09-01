import { STAGES } from './constants';

export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export let ACTIVE_CURRENCY = 'د.إ';

export function setGlobalCurrency(curr) {
  if (curr) {
    ACTIVE_CURRENCY = curr;
    try {
      localStorage.setItem('active_currency', curr);
    } catch (e) {}
  }
}

export function getGlobalCurrency() {
  try {
    const stored = localStorage.getItem('active_currency');
    if (stored) return stored;
  } catch (e) {}
  return ACTIVE_CURRENCY || 'د.إ';
}

export const money = (n, customCurr) => {
  const curr = customCurr || getGlobalCurrency();
  return Number(n || 0).toLocaleString("en-US") + " " + curr;
};

export const fmtDate = (d) => {
  if (!d) return "—";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "—";
  return dateObj.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
};
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function currentStageKey(progress) {
  let cum = 0;
  for (const s of STAGES) { 
    cum += s.weight; 
    if (progress <= cum) return s.key; 
  }
  return STAGES[STAGES.length - 1].key;
}
