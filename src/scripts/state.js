// Shared mutable UI state — single exported object so all modules
// can mutate properties across ES module boundaries.

export const state = {
  SIMS: [],
  STATS: null,
  LAST: null,
  filtered: [],
  page: 0,
  PAGE_SIZE: 20,
  _muf: null,
  stageSortK: 'champ',
  stageSortD: -1,
  pwSortK: 'ovr',
  pwSortD: -1,
};

export function advPct(name) {
  const rc = state.STATS.reachedCounts[name];
  return ["R32","R16","QF","SF","Final","Champion","3.Yer"]
    .reduce((s, k) => s + (rc[k] || 0), 0) / state.STATS.n * 100;
}

export function scoreStr(m) {
  let s = m.sa + "–" + m.sb;
  if (m.pen) s += " (" + m.penA + "-" + m.penB + " pen.)";
  else if (m.et) s += " (AET)";
  return s;
}

export function pBar(v, mx, col) {
  const w = Math.round(v / Math.max(mx, 0.01) * 100);
  return `<div class="pb"><div class="pbg" style="width:48px"><div style="width:${w}%;height:5px;border-radius:3px;background:${col}"></div></div><span style="font-size:12px;font-weight:700;min-width:36px">${v.toFixed(1)}%</span></div>`;
}
