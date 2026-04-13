import { PMAP, NKEYS } from '../lib/constants.js';

let _navHistory = [];

export function nav(name, pushHistory) {
  const cur = NKEYS[Array.from(document.querySelectorAll(".nb"))
    .findIndex(b => b.classList.contains("on"))];
  if (pushHistory !== false && cur && cur !== name) _navHistory.push(cur);
  Object.values(PMAP).forEach(id => {
    const e = document.getElementById(id);
    if (e) e.classList.remove("on");
  });
  const p = document.getElementById(PMAP[name]);
  if (p) p.classList.add("on");
  document.querySelectorAll(".nb").forEach((b, i) =>
    b.classList.toggle("on", NKEYS[i] === name)
  );
  const bb = document.getElementById("backBtn");
  if (bb) bb.style.display = _navHistory.length > 0 ? "inline-flex" : "none";

  // Auto-refresh the journey panel whenever it becomes active.
  if (name === 'journey' && typeof window.showJourney === 'function') {
    window.showJourney();
  }
}

export function navBack() {
  if (!_navHistory.length) return;
  const prev = _navHistory.pop();
  nav(prev, false);
}
