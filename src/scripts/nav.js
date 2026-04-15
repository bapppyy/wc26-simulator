import { PMAP, NKEYS } from '../lib/constants.js';

export function nav(name, pushHistory) {
  const cur = NKEYS[Array.from(document.querySelectorAll(".nb"))
    .findIndex(b => b.classList.contains("on"))];

  Object.values(PMAP).forEach(id => {
    const e = document.getElementById(id);
    if (e) e.classList.remove("on");
  });
  const p = document.getElementById(PMAP[name]);
  if (p) p.classList.add("on");
  document.querySelectorAll(".nb").forEach((b, i) =>
    b.classList.toggle("on", NKEYS[i] === name)
  );

  // Only scroll when actually switching to a different pane
  if (cur !== name) window.scrollTo({ top: 0, behavior: 'smooth' });

  // When navigating to Sim Browser, always close detail and show main list.
  // Only clear filters when arriving from a different pane (not from within browser itself).
  if (name === 'browser') {
    const bDet = document.getElementById('browserDetail');
    if (bDet) bDet.style.display = 'none';
    const bMain = document.getElementById('browserMain');
    if (bMain) bMain.style.display = 'block';
    if (cur !== 'browser') {
      const fTeam  = document.getElementById('fTeam');
      const fStage = document.getElementById('fStage');
      if (fTeam)  fTeam.value  = '';
      if (fStage) fStage.value = '';
      if (typeof window.applyFilter === 'function') window.applyFilter();
    }
  }

  // Auto-refresh panels when they become active.
  if (name === 'journey' && typeof window.showJourney === 'function') {
    window.showJourney();
  }
  if (name === 'analytics' && typeof window.drawAnalytics === 'function') {
    window.drawAnalytics();
  }
}
