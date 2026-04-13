// ═══════════════════════════════════════════════════════════════════════════
// WC 2026 Simulation Engine
// Pure functions — zero DOM access, zero side effects outside module state.
// ═══════════════════════════════════════════════════════════════════════════

import { DATA }                         from './data.js';
import { ANNEX_C }                      from './annex.js';
import { GKEYS, R16_PAIRS, QF_PAIRS, SF_PAIRS } from './constants.js';

// ── Module-level mutable state ───────────────────────────────────────────────
// These are the only two values that legitimately change between runs.
// External callers must use the setters below — ES modules do not allow
// external assignment to exported let bindings.

let UPEX     = 4.5;           // Upset exponent. Display value = 6 - UPEX.
                               // High UPEX → favourites win more often.
let _runSeed = Date.now() & 0xFFFFFF; // Mixed before every runAll() call.
let _rng     = Math.random;   // Active RNG function. Swapped per simulation.

/** Set the upset exponent from the slider value (slider emits 10-50, step 5). */
export function setUpex(sliderValue) {
  UPEX = 6 - parseInt(sliderValue) / 10;
}

/** Randomise (or restore) the run seed before a simulation batch. */
export function setRunSeed(seed) {
  _runSeed = seed;
}

// ── Seeded PRNG — mulberry32 ─────────────────────────────────────────────────
// CRITICAL: ALL R() calls inside simMatch must execute unconditionally,
// regardless of the storeDetail flag. Only event-array pushes are conditional.
// This guarantees that the same seed always produces an identical RNG path
// (and therefore an identical result), whether or not detail is stored.

export function mkRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Current RNG call — always use this inside engine functions. */
export const R = () => _rng();

// ── Math / distribution utilities ───────────────────────────────────────────

/** Poisson-distributed random integer with mean λ. */
export function pois(lam) {
  if (lam <= 0) return 0;
  let L = Math.exp(-Math.min(lam, 20)), k = 0, p = 1;
  do { k++; p *= R(); } while (p > L && k < 20);
  return k - 1;
}

/** Weighted random pick from arr using parallel weights array ws. */
export function wPick(arr, ws) {
  let t = 0;
  for (const w of ws) t += w;
  let r = R() * t;
  for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
}

/** Returns the emoji flag for a team name. */
export function flag(n) { return DATA[n]?.f || '🏴'; }

/** Returns all teams sorted by OVR descending, shaped for UI consumption. */
export function allTeams() {
  return Object.entries(DATA)
    .map(([name, d]) => ({
      name, flag: d.f, group: d.g,
      df: d.df, mf: d.mf, fw: d.fw, ovr: d.ovr,
      players: d.p,
    }))
    .sort((a, b) => b.ovr - a.ovr);
}

// ── Player helpers ───────────────────────────────────────────────────────────

/**
 * Returns a scoring / assist weight for a player position code.
 * posCode format: "4-FW", "3-MF", "2-DF", "1-GK".
 * forGoal = true  → goal-scoring weight
 * forGoal = false → assist weight
 */
export function posWeight(posCode, forGoal) {
  const c = posCode ? posCode[0] : '3';
  if (forGoal) return c === '4' ? 0.65 : c === '3' ? 0.25 : c === '2' ? 0.08 : 0.02;
  return         c === '4' ? 0.40 : c === '3' ? 0.45 : c === '2' ? 0.12 : 0.03;
}

/**
 * Multiplier based on a player's squad role.
 * r === 0 → star player (×1.5)
 * r === 1 → regular starter (×1.0)
 * r === 2 → squad / bench (×0.65)
 */
export function roleBonus(r) { return r === 0 ? 1.5 : r === 1 ? 1.0 : 0.65; }

/**
 * Select the best available XI for a team, respecting injury/suspension state.
 * Returns an array of up to 11 player objects, each annotated with _cat.
 */
export function selectXI(teamName, matchState) {
  const td = DATA[teamName];
  const ms = matchState[teamName];
  const available = td.p.filter((_, i) => !ms.inj[i] && !ms.sus[i]);

  const byPos = { GK: [], DF: [], MF: [], FW: [] };
  const catMap = { '1': 'GK', '2': 'DF', '3': 'MF', '4': 'FW' };
  for (const p of available) {
    const cat = catMap[p.p ? p.p[0] : '3'] || 'MF';
    byPos[cat].push(p);
  }
  for (const cat of ['GK', 'DF', 'MF', 'FW']) {
    byPos[cat].sort((a, b) => (b.o * roleBonus(b.r)) - (a.o * roleBonus(a.r)));
  }

  const xi = [];
  if (byPos.GK[0]) xi.push({ ...byPos.GK[0], _cat: 'GK' });
  byPos.DF.slice(0, 4).forEach(p => xi.push({ ...p, _cat: 'DF' }));
  byPos.MF.slice(0, 3).forEach(p => xi.push({ ...p, _cat: 'MF' }));
  byPos.FW.slice(0, 3).forEach(p => xi.push({ ...p, _cat: 'FW' }));

  const used = new Set(xi.map(p => p.n));
  const fill = [...byPos.DF, ...byPos.MF, ...byPos.FW].filter(p => !used.has(p.n));
  while (xi.length < 11 && fill.length > 0) xi.push({ ...fill.shift() });
  return xi.slice(0, 11);
}

// ── Match engine ─────────────────────────────────────────────────────────────

/**
 * Simulate a single match between nameA and nameB.
 *
 * matchState  – shared object tracking goals/assists/yellows/injuries/suspensions
 *               across an entire tournament run.
 * ko          – true for knockout rounds (enables ET + penalties; clears yellows).
 * storeDetail – true to populate the events array (used for match reports).
 *               When false, ALL R() calls still happen to preserve RNG path.
 *
 * Returns a result object or null if either team is not found in DATA.
 */
export function simMatch(nameA, nameB, matchState, ko, storeDetail) {
  const da = DATA[nameA], db = DATA[nameB];
  if (!da || !db) return null;

  // Expected-goals model: xG = 0.013 × (att / def) ^ UPEX × 90
  const attA = da.fw * 0.65 + da.mf * 0.35;
  const defA = da.df * 0.65 + da.mf * 0.35;
  const attB = db.fw * 0.65 + db.mf * 0.35;
  const defB = db.df * 0.65 + db.mf * 0.35;
  const BASE = 0.013;
  const xgA = Math.max(0.3, Math.min(4.5, BASE * Math.pow(attA / defB, UPEX) * 90));
  const xgB = Math.max(0.3, Math.min(4.5, BASE * Math.pow(attB / defA, UPEX) * 90));

  let sa = pois(xgA), sb = pois(xgB);
  const events = [];
  const xiA = selectXI(nameA, matchState);
  const xiB = selectXI(nameB, matchState);
  const outA = xiA.filter(p => p._cat !== 'GK');
  const outB = xiB.filter(p => p._cat !== 'GK');

  // GOALS — stats always tracked; event push is conditional on storeDetail
  function trackGoal(cnt, scorers, tname, tflag, isEt) {
    for (let i = 0; i < cnt; i++) {
      if (!scorers.length) break;
      const gw = scorers.map(p => Math.max(0.01, p.o * roleBonus(p.r) * posWeight(p.p, true)));
      const scorer = wPick(scorers, gw);
      const si = DATA[tname].p.findIndex(x => x.n === scorer.n);
      if (si >= 0) matchState[tname].goals[si] = (matchState[tname].goals[si] || 0) + 1;

      const hasAssist = R() < 0.72 && scorers.length > 1;
      let assister = null;
      if (hasAssist) {
        const cands = scorers.filter(p => p.n !== scorer.n);
        const aw = cands.map(p => Math.max(0.01, p.o * roleBonus(p.r) * posWeight(p.p, false)));
        assister = wPick(cands, aw);
        const ai = DATA[tname].p.findIndex(x => x.n === assister.n);
        if (ai >= 0) matchState[tname].assists[ai] = (matchState[tname].assists[ai] || 0) + 1;
      }
      const min = isEt ? 90 + Math.floor(R() * 30) + 1 : Math.floor(R() * 90) + 1;
      if (storeDetail) events.push({
        type: 'goal', min, team: tname, flag: tflag,
        scorer: scorer.n, assister: assister?.n || null, et: isEt,
      });
    }
  }
  trackGoal(sa, outA, nameA, da.f, false);
  trackGoal(sb, outB, nameB, db.f, false);

  // YELLOWS — RNG always runs; event push conditional
  let matchYellows = 0;
  function genYellows(players, tname, tflag, isGroup) {
    const cnt = pois(1.2);
    const sampled = [...players].sort(() => R() - 0.5).slice(0, Math.min(cnt, players.length));
    matchYellows += sampled.length;
    for (const p of sampled) {
      const idx = DATA[tname].p.findIndex(x => x.n === p.n);
      if (idx < 0) continue;
      matchState[tname].yels[idx] = (matchState[tname].yels[idx] || 0) + 1;
      const y = matchState[tname].yels[idx];
      const min = Math.floor(R() * 90) + 1;
      if (storeDetail) events.push({ type: 'yellow', min, team: tname, flag: tflag, player: p.n });
      if (isGroup && y >= 2 && !matchState[tname].sus[idx]) {
        matchState[tname].sus[idx] = true;
        matchState[tname].susUntil[idx] = matchState._mi + 1;
        if (storeDetail) events.push({
          type: 'susp', min: 99, team: tname, flag: tflag,
          player: p.n, reason: '2 yellows → 1 match ban',
        });
      }
    }
  }
  genYellows(outA, nameA, da.f, !ko);
  genYellows(outB, nameB, db.f, !ko);

  // REDS — RNG always runs; event push conditional
  let matchReds = 0;
  function genRed(players, tname, tflag) {
    if (R() < 0.03 && players.length) {
      matchReds++;
      const p = players[Math.floor(R() * players.length)];
      const idx = DATA[tname].p.findIndex(x => x.n === p.n);
      if (idx >= 0) {
        matchState[tname].sus[idx] = true;
        matchState[tname].susUntil[idx] = matchState._mi + 1;
      }
      const min = Math.floor(R() * 85) + 5;
      if (storeDetail) events.push({ type: 'red', min, team: tname, flag: tflag, player: p.n });
    }
  }
  genRed(outA, nameA, da.f);
  genRed(outB, nameB, db.f);

  // INJURIES — RNG always runs; event push conditional
  function genInjury(players, tname, tflag) {
    if (R() < 0.04 && players.length) {
      const p = players[Math.floor(R() * players.length)];
      const idx = DATA[tname].p.findIndex(x => x.n === p.n);
      if (idx >= 0) {
        matchState[tname].inj[idx] = true;
        const sev = R();
        matchState[tname].injUntil[idx] = matchState._mi + (sev < 0.5 ? 1 : sev < 0.85 ? 2 : 99);
      }
      const min = Math.floor(R() * 85) + 5;
      if (storeDetail) events.push({ type: 'injury', min, team: tname, flag: tflag, player: p.n });
    }
  }
  genInjury(outA, nameA, da.f);
  genInjury(outB, nameB, db.f);

  // SUBSTITUTIONS — RNG always runs (for seed reproducibility); event push conditional
  function genSubs(xi, tname, tflag) {
    const cnt = 2 + Math.floor(R() * 2);                         // always consumes R()
    const xiSet = new Set(xi.map(p => p.n));
    const ms = matchState[tname];
    const bench = DATA[tname].p
      .filter((p, i) => !xiSet.has(p.n) && !ms.inj[i] && !ms.sus[i])
      .sort((a, b) => (b.o * roleBonus(b.r)) - (a.o * roleBonus(a.r)));
    const outCandidates = [...xi.filter(p => p._cat !== 'GK')].sort(() => R() - 0.5); // always R()
    const outPlayers = outCandidates.slice(0, cnt);
    for (let i = 0; i < Math.min(cnt, bench.length, outPlayers.length); i++) {
      const min = 60 + Math.floor(R() * 30);                     // always R()
      if (storeDetail) events.push({
        type: 'sub', min, team: tname, flag: DATA[tname].f,
        out: outPlayers[i].n, in: bench[i].n, inOvr: bench[i].o, reason: 'Tactical',
      });
    }
  }
  genSubs(xiA, nameA, da.f);
  genSubs(xiB, nameB, db.f);

  // EXTRA TIME + PENALTIES
  let et = false, pen = false, penA = 0, penB = 0;
  if (ko && sa === sb) {
    et = true;
    const eta = pois(xgA * 0.28), etb = pois(xgB * 0.28);
    if (eta > 0) { trackGoal(eta, outA, nameA, da.f, true); sa += eta; }
    if (etb > 0) { trackGoal(etb, outB, nameB, db.f, true); sb += etb; }
    if (sa === sb) {
      pen = true;
      for (let i = 0; i < 5; i++) {
        if (R() < 0.60 + (da.ovr - 65) / 200) penA++;
        if (R() < 0.60 + (db.ovr - 65) / 200) penB++;
      }
      while (penA === penB) { if (R() < 0.75) penA++; if (R() < 0.75) penB++; }
      if (storeDetail) events.push({
        type: 'pen', min: 121,
        team: penA > penB ? nameA : nameB,
        flag: penA > penB ? da.f : db.f,
        penA, penB,
      });
    }
  }

  const win  = pen ? (penA > penB ? nameA : nameB) : (sa > sb ? nameA : nameB);
  const lose = win === nameA ? nameB : nameA;
  if (storeDetail) events.sort((a, b) => a.min - b.min);

  // Advance match counter; expire suspensions/injuries; clear KO yellows
  matchState._mi++;
  for (const tn of [nameA, nameB]) {
    const ms = matchState[tn];
    for (let i = 0; i < ms.sus.length; i++)
      if (ms.sus[i] && matchState._mi >= (ms.susUntil[i] || 0)) ms.sus[i] = false;
    for (let i = 0; i < ms.inj.length; i++)
      if (ms.inj[i] && matchState._mi >= (ms.injUntil[i] || 0)) ms.inj[i] = false;
    if (ko) ms.yels.fill(0);
  }

  return {
    a: nameA, b: nameB, sa, sb, et, pen, penA, penB,
    w: win, l: lose, events, xiA, xiB,
    yellows: matchYellows, reds: matchReds,
  };
}

// ── Per-team match state initialiser ────────────────────────────────────────

/**
 * Creates a fresh per-team state object for one tournament run.
 * All counters start at zero; all flags start false.
 */
export function initMS(teamName) {
  const n = DATA[teamName].p.length;
  return {
    goals:    new Array(n).fill(0),
    assists:  new Array(n).fill(0),
    yels:     new Array(n).fill(0),
    inj:      new Array(n).fill(false),
    injUntil: new Array(n).fill(0),
    sus:      new Array(n).fill(false),
    susUntil: new Array(n).fill(0),
  };
}

// ── Tournament engine ────────────────────────────────────────────────────────

/**
 * Simulate a complete WC 2026 tournament.
 *
 * simIdx      – 1-based simulation index, mixed into the seed so each run
 *               within a batch produces a different but reproducible result.
 * storeDetail – when true, every match carries a full events array (goals,
 *               cards, injuries, subs).  Use false for the Monte Carlo batch
 *               (except the very last simulation) to keep memory low.
 *
 * Returns a rich result object consumed by the UI and the stat accumulator.
 */
export function simTournament(simIdx, storeDetail) {
  _rng = mkRng((_runSeed ^ (simIdx * 1664525 + 1013904223)) >>> 0);

  const matchState = { _mi: 0 };
  for (const name of Object.keys(DATA)) matchState[name] = initMS(name);

  const grpSt = {}, grpMatches = {};

  // ── Group stage ────────────────────────────────────────────────────────────
  for (const gk of GKEYS) {
    const teams = Object.entries(DATA).filter(([, d]) => d.g === gk).map(([n]) => n);
    const st = {};
    teams.forEach(t => st[t] = { pts: 0, gf: 0, ga: 0 });
    const ms = [];

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const r = simMatch(teams[i], teams[j], matchState, false, storeDetail);
        if (!r) continue;
        st[teams[i]].gf += r.sa; st[teams[i]].ga += r.sb;
        st[teams[j]].gf += r.sb; st[teams[j]].ga += r.sa;
        if      (r.sa > r.sb) st[teams[i]].pts += 3;
        else if (r.sb > r.sa) st[teams[j]].pts += 3;
        else                  { st[teams[i]].pts++; st[teams[j]].pts++; }
        ms.push({ ...r, gk });
      }
    }

    const sorted = teams.slice().sort((a, b) =>
      (st[b].pts * 1e6 + (st[b].gf - st[b].ga) * 1e3 + st[b].gf) -
      (st[a].pts * 1e6 + (st[a].gf - st[a].ga) * 1e3 + st[a].gf));
    grpSt[gk] = sorted.map(n => ({ name: n, ...st[n] }));
    grpMatches[gk] = ms;
  }

  // ── Best 8 third-placed teams (Annex C) ───────────────────────────────────
  const allThirds = GKEYS.map(gk => {
    const t = grpSt[gk][2];
    if (!t) return null;
    return { name: t.name, pts: t.pts, gd: t.gf - t.ga, gf: t.gf, grp: gk };
  }).filter(Boolean).sort((a, b) =>
    (b.pts * 1e6 + b.gd * 1e3 + b.gf) - (a.pts * 1e6 + a.gd * 1e3 + a.gf));

  const top8    = allThirds.slice(0, 8);
  const top8Key = top8.map(t => t.grp).sort().join('');
  const annexC  = ANNEX_C[top8Key];
  const qualGrps = new Set(top8.map(t => t.grp));

  // ── Advancement tracking ───────────────────────────────────────────────────
  const reached = {};
  for (const n of Object.keys(DATA)) reached[n] = 'Group';
  for (const gk of GKEYS) {
    if (grpSt[gk][0]) reached[grpSt[gk][0].name] = 'R32';
    if (grpSt[gk][1]) reached[grpSt[gk][1].name] = 'R32';
    if (grpSt[gk][2] && qualGrps.has(gk)) reached[grpSt[gk][2].name] = 'R32';
  }

  const g  = (grp, rank) => grpSt[grp]?.[rank]?.name;
  const t3 = (grp)       => grpSt[grp]?.[2]?.name;

  // ── R32 — official FIFA 2026 bracket order ─────────────────────────────────
  const r32Pairs = !annexC ? [] : [
    [g('E', 0), t3(annexC['E'])],   // M0:  1E vs 3(Annex)
    [g('I', 0), t3(annexC['I'])],   // M1:  1I vs 3(Annex)
    [g('A', 1), g('B', 1)      ],   // M2:  2A vs 2B
    [g('F', 0), g('C', 1)      ],   // M3:  1F vs 2C
    [g('K', 1), g('L', 1)      ],   // M4:  2K vs 2L
    [g('H', 0), g('J', 1)      ],   // M5:  1H vs 2J
    [g('D', 0), t3(annexC['D'])],   // M6:  1D vs 3(Annex)
    [g('G', 0), t3(annexC['G'])],   // M7:  1G vs 3(Annex)
    [g('C', 0), g('F', 1)      ],   // M8:  1C vs 2F
    [g('E', 1), g('I', 1)      ],   // M9:  2E vs 2I
    [g('D', 1), g('G', 1)      ],   // M10: 2D vs 2G
    [g('J', 0), g('H', 1)      ],   // M11: 1J vs 2H
    [g('L', 0), t3(annexC['L'])],   // M12: 1L vs 3(Annex)
    [g('B', 0), t3(annexC['B'])],   // M13: 1B vs 3(Annex)
    [g('K', 0), t3(annexC['K'])],   // M14: 1K vs 3(Annex)
    [g('A', 0), t3(annexC['A'])],   // M15: 1A vs 3(Annex)
  ];

  function clearYellows() {
    for (const ms of Object.values(matchState))
      if (Array.isArray(ms.yels)) ms.yels.fill(0);
  }

  // ── Round of 32 ───────────────────────────────────────────────────────────
  clearYellows();
  const r32Ms = [], r32W = [];
  for (const [nameA, nameB] of r32Pairs) {
    if (!nameA || !nameB) { r32Ms.push(null); r32W.push(null); continue; }
    const r = simMatch(nameA, nameB, matchState, true, storeDetail);
    if (!r) { r32Ms.push(null); r32W.push(null); continue; }
    reached[r.l] = 'R32'; r32W.push(r.w); r32Ms.push(r);
  }

  // ── Round of 16 ───────────────────────────────────────────────────────────
  clearYellows();
  const r16Ms = [], r16W = [];
  for (const [ia, ib] of R16_PAIRS) {
    const a = r32W[ia], b = r32W[ib];
    if (!a || !b) { r16Ms.push(null); r16W.push(null); continue; }
    const r = simMatch(a, b, matchState, true, storeDetail);
    if (!r) { r16Ms.push(null); r16W.push(null); continue; }
    reached[r.l] = 'R16'; r16W.push(r.w); r16Ms.push(r);
  }

  // ── Quarter-finals ────────────────────────────────────────────────────────
  clearYellows();
  const qfMs = [], qfW = [];
  for (const [ia, ib] of QF_PAIRS) {
    const a = r16W[ia], b = r16W[ib];
    if (!a || !b) { qfMs.push(null); qfW.push(null); continue; }
    const r = simMatch(a, b, matchState, true, storeDetail);
    if (!r) { qfMs.push(null); qfW.push(null); continue; }
    reached[r.l] = 'QF'; qfW.push(r.w); qfMs.push(r);
  }

  // ── Semi-finals ───────────────────────────────────────────────────────────
  clearYellows();
  const sfMs = [], sfW = [], sfL = [];
  for (const [ia, ib] of SF_PAIRS) {
    const a = qfW[ia], b = qfW[ib];
    if (!a || !b) { sfMs.push(null); sfW.push(null); sfL.push(null); continue; }
    const r = simMatch(a, b, matchState, true, storeDetail);
    if (!r) { sfMs.push(null); sfW.push(null); sfL.push(null); continue; }
    // SF loser stays "SF" — will be promoted to "Final" if they reach the final
    reached[r.l] = 'SF'; sfW.push(r.w); sfL.push(r.l); sfMs.push(r);
  }

  // ── Third-place play-off ──────────────────────────────────────────────────
  clearYellows();
  let thirdM = null;
  if (sfL[0] && sfL[1]) {
    const r = simMatch(sfL[0], sfL[1], matchState, true, storeDetail);
    if (r) { thirdM = r; reached[r.w] = '3.Yer'; }
  }

  // ── Final ─────────────────────────────────────────────────────────────────
  clearYellows();
  let finalM = null;
  if (sfW[0] && sfW[1]) {
    const r = simMatch(sfW[0], sfW[1], matchState, true, storeDetail);
    if (r) {
      finalM = r;
      // BUG FIX: Final loser must be "Final", not left at "SF"
      reached[r.l] = 'Final';
      reached[r.w] = 'Champion';
    }
  }

  // ── Player stats harvest ───────────────────────────────────────────────────
  const playerStats = {};
  for (const [tname, ms] of Object.entries(matchState)) {
    if (tname === '_mi' || !ms.goals) continue;
    const ps = DATA[tname]?.p || [];
    for (let i = 0; i < ps.length; i++) {
      if ((ms.goals[i] || 0) > 0 || (ms.assists[i] || 0) > 0) {
        playerStats[ps[i].n] = {
          goals:   ms.goals[i]   || 0,
          assists: ms.assists[i] || 0,
          team:    tname,
          flag:    DATA[tname]?.f,
        };
      }
    }
  }

  // ── Tournament-level records ───────────────────────────────────────────────
  const allMs = [
    ...Object.values(grpMatches).flat(),
    ...r32Ms, ...r16Ms, ...qfMs, ...sfMs,
    ...(thirdM ? [thirdM] : []),
    ...(finalM ? [finalM] : []),
  ].filter(Boolean);

  let totalGoals  = 0;
  let maxGoals    = { val: 0, m: null };
  let maxYellows  = { val: 0, m: null };
  let maxReds     = { val: 0, m: null };
  let maxMargin   = { val: 0, m: null };

  for (const m of allMs) {
    totalGoals += m.sa + m.sb;
    const tot = m.sa + m.sb;
    if (tot                   > maxGoals.val)   maxGoals   = { val: tot,              m };
    if ((m.yellows || 0)      > maxYellows.val) maxYellows = { val: m.yellows,        m };
    if ((m.reds    || 0)      > maxReds.val)    maxReds    = { val: m.reds,           m };
    if (Math.abs(m.sa - m.sb) > maxMargin.val)  maxMargin  = { val: Math.abs(m.sa - m.sb), m };
  }

  // Restore Math.random as the global RNG after the seeded run
  _rng = Math.random;

  return {
    idx:       simIdx,
    champion:  finalM?.w || '?',
    grpSt, grpMatches,
    top8, top8Key, annexC,
    r32:   r32Ms.filter(Boolean),
    r16:   r16Ms.filter(Boolean),
    qf:    qfMs.filter(Boolean),
    sf:    sfMs.filter(Boolean),
    third: thirdM,
    fin:   finalM ? [finalM] : [],
    reached, playerStats, totalGoals,
    rec:   { maxGoals, maxYellows, maxReds, maxMargin },
  };
}

/**
 * Re-run a simulation at full detail using the same seed → identical result.
 * Used by the Sim Browser's "📋 Report" button to replay any stored run.
 */
export function rerunDetailed(simIdx) {
  return simTournament(simIdx, true);
}
