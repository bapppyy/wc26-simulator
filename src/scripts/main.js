// ═══════════════════════════════════════════════════════════════════════════
// main.js — Application Entry Point (Phase 5)
//
// Imports all UI modules, wires up the simulation runner, and exposes every
// function referenced by inline onclick/onchange attributes in Astro
// components to the global window object.
// ═══════════════════════════════════════════════════════════════════════════

// ── Engine / data ────────────────────────────────────────────────────────────
import { simTournament, setUpex, setRunSeed, flag } from '../lib/engine.js';
import { DATA } from '../lib/data.js';

// ── State ────────────────────────────────────────────────────────────────────
import { state } from './state.js';

// ── Navigation ───────────────────────────────────────────────────────────────
import { nav, navBack } from './nav.js';

// ── UI panels ────────────────────────────────────────────────────────────────
import { drawMonte, drawStageTable, srtS } from './ui/monte.js';
import { drawGroups }                       from './ui/groups.js';
import { drawFixture }                      from './ui/fixture.js';
import { drawBracket, drawAnnexPanel }      from './ui/bracket.js';
import {
  buildFilterSels, applyFilter, filterByMatchup,
  renderList, showDetail, closeDetail,
  openSimById, filterAndGo, openRecordMatch,
} from './ui/browser.js';
import { buildJourneySel, goJourney, showJourney } from './ui/journey.js';
import { buildPowerTable, srtP, updateRating, resetRatings } from './ui/power.js';
import { drawSquads }  from './ui/squads.js';
import { drawVote }    from './ui/vote.js';
import { drawStats }   from './ui/stats.js';

// ── Modals ───────────────────────────────────────────────────────────────────
import {
  openMatchModal, closeModal,
  openFullReport, buildFullReportModal, openReportMatch,
  openHow,
} from './ui/modals.js';

// ── Onboarding ───────────────────────────────────────────────────────────────
import { initOnboarding, obHighlight, obBuild, obOpen, obClose } from './onboarding.js';

// ═══════════════════════════════════════════════════════════════════════════
// RUN ALL — Full simulation batch
// ═══════════════════════════════════════════════════════════════════════════
function runAll() {
  const btn = document.getElementById('runBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="sp"></span>Simulating...';
  const t0 = Date.now();

  // Read upset factor slider before seeding (safe — no R() calls yet)
  const upexEl = document.getElementById('upexSlider');
  if (upexEl) setUpex(upexEl.value);

  setTimeout(() => {
    // ── Full state reset ────────────────────────────────────────────────────
    const newSeed = (Date.now() & 0xFFFFFF) ^ (Math.random() * 0xFFFFFF | 0);
    setRunSeed(newSeed);

    state.SIMS = []; state.STATS = null; state.LAST = null;
    state.filtered = []; state.page = 0; state._muf = null;
    state.stageSortK = 'champ'; state.stageSortD = -1;
    state.pwSortK = 'ovr';     state.pwSortD = -1;

    // Clear all UI panels
    ['cbanner','mcGrid','stageBody','groupsEl','fixtureEl','bracketEl','annexPanel',
     'simList','pagination','journeyEl','statsEl','pwBody'].forEach(id => {
      const el = document.getElementById(id); if (el) el.innerHTML = '';
    });
    const bDet = document.getElementById('browserDetail');
    if (bDet) bDet.style.display = 'none';
    const bMain = document.getElementById('browserMain');
    if (bMain) bMain.style.display = 'block';
    window._reportSim = null;
    // ────────────────────────────────────────────────────────────────────────

    const n = parseInt(document.getElementById('nSel').value);
    const stages = ['Group','R32','R16','QF','SF','Final','Champion','3.Yer'];
    const rounds = ['R32','R16','QF','SF','Final'];

    const champCount = {}, reachedCounts = {}, oppCounts = {}, matchStatsCum = {};
    const topScorer  = {}, topAssist = {};
    let recMaxGoalsSim   = { val: 0,    idx: 0 };
    let recMinGoalsSim   = { val: 9999, idx: 0 };
    let recMaxGoalsMatch = { val: 0, idx: 0, m: null };
    let recMaxMargin     = { val: 0, idx: 0, m: null };
    let recMaxYellows    = { val: 0, idx: 0, m: null };
    let recMaxReds       = { val: 0, idx: 0, m: null };
    let recMaxPen        = { val: 0, idx: 0 };

    for (const t of Object.keys(DATA)) {
      champCount[t] = 0; reachedCounts[t] = {};
      stages.forEach(s => reachedCounts[t][s] = 0);
      oppCounts[t] = {}; rounds.forEach(r => oppCounts[t][r] = {});
    }

    for (let i = 0; i < n; i++) {
      const isLast = (i === n - 1);
      const s = simTournament(i + 1, isLast);
      state.SIMS.push(s);
      if (isLast) state.LAST = s;
      champCount[s.champion] = (champCount[s.champion] || 0) + 1;

      for (const [nm, stg] of Object.entries(s.reached))
        if (reachedCounts[nm]) reachedCounts[nm][stg]++;

      function trackOpps(ms, rk) {
        for (const m of ms) {
          if (!m || !m.a || !m.b) continue;
          for (const [ta, tb] of [[m.a, m.b], [m.b, m.a]]) {
            if (!oppCounts[ta]?.[rk]) continue;
            if (!oppCounts[ta][rk][tb]) oppCounts[ta][rk][tb] = { enc: 0, wins: 0 };
            oppCounts[ta][rk][tb].enc++;
            if (m.w === ta) oppCounts[ta][rk][tb].wins++;
          }
        }
      }
      trackOpps(s.r32, 'R32'); trackOpps(s.r16, 'R16'); trackOpps(s.qf, 'QF');
      trackOpps(s.sf,  'SF');  trackOpps(s.fin, 'Final');

      // Group match stats
      for (const [, ms] of Object.entries(s.grpMatches)) {
        for (const m of ms) {
          const key = [m.a, m.b].sort().join('|');
          if (!matchStatsCum[key])
            matchStatsCum[key] = { goalsA: 0, goalsB: 0, winsA: 0, winsB: 0, draws: 0, cnt: 0 };
          const c = matchStatsCum[key]; c.cnt++;
          const iA = m.a < m.b;
          c.goalsA += iA ? m.sa : m.sb; c.goalsB += iA ? m.sb : m.sa;
          if (m.sa > m.sb)      { if (iA) c.winsA++; else c.winsB++; }
          else if (m.sb > m.sa) { if (iA) c.winsB++; else c.winsA++; }
          else c.draws++;
        }
      }

      // Player stats
      for (const [nm, ps] of Object.entries(s.playerStats)) {
        if (ps.goals > 0) {
          if (!topScorer[nm]) topScorer[nm] = { g: 0, t: ps.team, f: ps.flag };
          topScorer[nm].g += ps.goals;
        }
        if (ps.assists > 0) {
          if (!topAssist[nm]) topAssist[nm] = { a: 0, t: ps.team, f: ps.flag };
          topAssist[nm].a += ps.assists;
        }
      }

      // Tournament records
      if (s.totalGoals > recMaxGoalsSim.val) recMaxGoalsSim = { val: s.totalGoals, idx: s.idx };
      if (s.totalGoals < recMinGoalsSim.val) recMinGoalsSim = { val: s.totalGoals, idx: s.idx };
      if (s.rec.maxGoals.val  > recMaxGoalsMatch.val) recMaxGoalsMatch = { val: s.rec.maxGoals.val,  idx: s.idx, m: s.rec.maxGoals.m  };
      if (s.rec.maxMargin.val > recMaxMargin.val)     recMaxMargin     = { val: s.rec.maxMargin.val, idx: s.idx, m: s.rec.maxMargin.m };
      if (s.rec.maxYellows.val > recMaxYellows.val)   recMaxYellows    = { val: s.rec.maxYellows.val, idx: s.idx, m: s.rec.maxYellows.m };
      if (s.rec.maxReds.val > recMaxReds.val)         recMaxReds       = { val: s.rec.maxReds.val,   idx: s.idx, m: s.rec.maxReds.m   };

      const allMs = [
        ...Object.values(s.grpMatches).flat(),
        ...s.r32, ...s.r16, ...s.qf, ...s.sf,
        ...(s.third ? [s.third] : []),
        ...s.fin,
      ].filter(Boolean);
      const penCnt = allMs.filter(m => m.pen).length;
      if (penCnt > recMaxPen.val) recMaxPen = { val: penCnt, idx: s.idx };
    }

    state.STATS = {
      n, champCount, reachedCounts, oppCounts, matchStatsCum, topScorer, topAssist,
      records: { recMaxGoalsSim, recMinGoalsSim, recMaxGoalsMatch, recMaxMargin, recMaxYellows, recMaxReds, recMaxPen },
    };

    const info = document.getElementById('info');
    if (info) info.textContent = n + ' sim · ' + ((Date.now() - t0) / 1000).toFixed(1) + 's';
    btn.disabled = false;
    btn.textContent = '▶ Simulate';

    const se = document.getElementById('statsEl');
    if (se) se.innerHTML = '';

    buildUI();
    saveStateToLS();
  }, 60);
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE PERSISTENCE — save/restore simulation state via localStorage
// ═══════════════════════════════════════════════════════════════════════════
const _LS_KEY = 'wc26_sim_state';

function saveStateToLS() {
  if (!state.STATS) return;
  try {
    localStorage.setItem(_LS_KEY, JSON.stringify({ STATS: state.STATS, LAST: state.LAST }));
  } catch (e) {
    console.warn('wc26: state too large for localStorage, skipping persist');
  }
}

function loadStateFromLS() {
  try {
    const raw = localStorage.getItem(_LS_KEY);
    if (!raw) return false;
    const snap = JSON.parse(raw);
    if (!snap?.STATS) return false;
    state.STATS = snap.STATS;
    if (snap.LAST) state.LAST = snap.LAST;
    return true;
  } catch (e) {
    return false;
  }
}

function clearSavedSim() {
  localStorage.removeItem(_LS_KEY);
  state.SIMS = []; state.STATS = null; state.LAST = null;
  state.filtered = []; state.page = 0; state._muf = null;
  state.stageSortK = 'champ'; state.stageSortD = -1;
  ['cbanner','mcGrid','stageBody','groupsEl','fixtureEl','bracketEl','annexPanel',
   'simList','pagination','journeyEl','statsEl','pwBody'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  const bDet = document.getElementById('browserDetail');
  if (bDet) bDet.style.display = 'none';
  const bMain = document.getElementById('browserMain');
  if (bMain) bMain.style.display = 'block';
  const info = document.getElementById('info');
  if (info) info.textContent = '';
  buildPowerTable();
}

// ═══════════════════════════════════════════════════════════════════════════
// REFRESH PANELS — re-render all JS-built panels after language change
// Only re-renders if a simulation has been run (STATS exists).
// ═══════════════════════════════════════════════════════════════════════════
function refreshPanels() {
  // Always re-render panels that use tTeam() regardless of simulation state
  buildJourneySel();
  buildFilterSels();
  drawSquads();
  drawVote();
  // Re-render the onboarding picker list if it's currently open
  const obBg = document.getElementById('obBg');
  if (obBg && obBg.style.display === 'flex') {
    const si = document.getElementById('obSearch');
    obBuild(si ? si.value : '');
  }
  if (!state.STATS) return;
  drawMonte();
  drawGroups();
  drawFixture();
  drawBracket();
  drawStats();
  buildPowerTable();
  showJourney();
  setTimeout(obHighlight, 60);
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD ALL UI — called after every successful simulation run
// ═══════════════════════════════════════════════════════════════════════════
function buildUI() {
  buildFilterSels();
  buildJourneySel();
  buildPowerTable();
  drawMonte();
  drawGroups();
  drawFixture();
  drawBracket();
  drawSquads();
  drawVote();
  drawStats();
  applyFilter();
  showJourney();
  // Re-apply team highlight if one is selected
  setTimeout(obHighlight, 60);
}

// ═══════════════════════════════════════════════════════════════════════════
// Global window exposure — required for inline onclick/onchange in Astro
// component HTML that cannot import ES modules directly.
// ═══════════════════════════════════════════════════════════════════════════
Object.assign(window, {
  // Core simulation
  runAll,
  buildUI,

  // Navigation
  nav,
  navBack,

  // Panel-specific helpers called from inline handlers
  srtS,          // Monte stage table sort
  srtP,          // Power table sort
  updateRating,  // Power table rating input
  resetRatings,  // Power table reset button
  showJourney,   // Journey panel team <select> onchange
  goJourney,     // Navigate to a team's journey (called from groups/fixture/etc.)
  applyFilter,   // Browser panel filter dropdowns
  filterByMatchup, // Journey → browser matchup filter
  filterAndGo,   // Stats → browser champion filter
  closeDetail,   // Browser detail back button
  openSimById,   // Open a single sim by index
  openRecordMatch, // Stats records → match detail

  // Modals
  openMatchModal,
  closeModal,
  openFullReport,
  buildFullReportModal,
  openReportMatch,
  openHow,

  // Onboarding
  obOpen,
  obClose,
  obBuild,

  // State persistence
  clearSavedSim,

  // Language change re-render
  refreshPanels,

  // Upset factor slider (inline oninput handler)
  updateUpex: (v) => setUpex(v),

  // Stats page (triggered by tab click via nav)
  drawStats,
});

// ═══════════════════════════════════════════════════════════════════════════
// Initialise on DOMContentLoaded
// ═══════════════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  // Show power table immediately (before any sim)
  buildPowerTable();
  // Draw the vote panel immediately
  drawVote();
  // Draw squads immediately
  drawSquads();
  // Wire up onboarding
  initOnboarding();
  // Restore previous simulation state if available
  if (loadStateFromLS()) {
    buildUI();
    const info = document.getElementById('info');
    if (info) info.textContent = (state.STATS?.n || 0) + ' sim · restored';
  }
});
