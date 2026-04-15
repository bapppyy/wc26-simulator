// ── Analytics Aggregator ──────────────────────────────────────────────────────
// Tracks lightweight aggregate statistics across large simulation batches
// without storing full simulation arrays in memory.

import { GKEYS } from './constants.js';

// ── Internal counters ─────────────────────────────────────────────────────────

/** 3rd-place R32 qualification rate per group */
let _thirdPlace = {};

/** All KO-round matchup frequencies (Most Frequent Matchups) */
let _matchupFreq = {};

/** Final-only matchup frequencies (Dream Finals) */
let _dreamFinals = {};

/** Teams that most often won via penalty shootout (Penalty Kings) */
let _penKings = {};

/** Accumulated count of QF+ teams per group (Group of Death depth) */
let _groupDepth = {};

let _simCount = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const analytics = {

  reset() {
    _thirdPlace    = {};
    _matchupFreq   = {};
    _dreamFinals   = {};
    _penKings      = {};
    _groupDepth    = {};
    for (const gk of GKEYS) {
      _thirdPlace[gk] = { total: 0, qualified: 0 };
      _groupDepth[gk] = 0;
    }
    _simCount = 0;
  },

  trackSim(simData) {
    _simCount++;

    // ── 3rd-place R32 advancement ────────────────────────────────────────────
    if (simData.grpSt && simData.top8) {
      const top8Names = new Set((simData.top8 || []).map(t => t.name));
      for (const gk of GKEYS) {
        const st = simData.grpSt[gk];
        if (!st || st.length < 3) continue;
        _thirdPlace[gk].total++;
        if (top8Names.has(st[2].name)) _thirdPlace[gk].qualified++;
      }
    }

    // ── All KO matchup frequencies ───────────────────────────────────────────
    const allKO = [
      ...(simData.r32 || []),
      ...(simData.r16 || []),
      ...(simData.qf  || []),
      ...(simData.sf  || []),
      ...(simData.fin || []),
    ];
    for (const m of allKO) {
      if (!m || !m.a || !m.b) continue;
      const k = matchKey(m.a, m.b);
      if (!_matchupFreq[k]) _matchupFreq[k] = { count: 0, wins: {} };
      _matchupFreq[k].count++;
      if (m.w) _matchupFreq[k].wins[m.w] = (_matchupFreq[k].wins[m.w] || 0) + 1;
    }

    // ── Dream Finals — Final-only matchups ───────────────────────────────────
    const fm = simData.fin && simData.fin[0];
    if (fm && fm.a && fm.b) {
      const k = matchKey(fm.a, fm.b);
      if (!_dreamFinals[k]) _dreamFinals[k] = { count: 0, wins: {} };
      _dreamFinals[k].count++;
      if (fm.w) _dreamFinals[k].wins[fm.w] = (_dreamFinals[k].wins[fm.w] || 0) + 1;
    }

    // ── Penalty Kings — teams advancing via shootout ─────────────────────────
    const koRounds = [
      ...(simData.r32 || []),
      ...(simData.r16 || []),
      ...(simData.qf  || []),
      ...(simData.sf  || []),
      ...(simData.fin || []),
    ];
    if (simData.third) koRounds.push(simData.third);
    for (const m of koRounds) {
      if (!m || !m.pen || !m.w) continue;
      if (!_penKings[m.w]) _penKings[m.w] = { wins: 0, appearances: 0 };
      _penKings[m.w].wins++;
      _penKings[m.w].appearances++;
      const loser = m.w === m.a ? m.b : m.a;
      if (loser) {
        if (!_penKings[loser]) _penKings[loser] = { wins: 0, appearances: 0 };
        _penKings[loser].appearances++;
      }
    }

    // ── Group Depth — how many teams from each group reach QF or beyond ──────
    if (simData.grpSt) {
      const teamToGroup = {};
      for (const [gk, st] of Object.entries(simData.grpSt)) {
        for (const t of (st || [])) {
          if (t && t.name) teamToGroup[t.name] = gk;
        }
      }
      const deepTeams = new Set();
      for (const m of [...(simData.qf || []), ...(simData.sf || []), ...(simData.fin || [])]) {
        if (!m) continue;
        if (m.a) deepTeams.add(m.a);
        if (m.b) deepTeams.add(m.b);
      }
      for (const team of deepTeams) {
        const gk = teamToGroup[team];
        if (gk !== undefined) _groupDepth[gk] = (_groupDepth[gk] || 0) + 1;
      }
    }
  },

  // ── Getters ────────────────────────────────────────────────────────────────

  get3rdPlaceStats() {
    if (_simCount === 0) return [];
    return GKEYS.map(gk => {
      const d = _thirdPlace[gk] || { total: 0, qualified: 0 };
      return {
        group:     gk,
        total:     d.total,
        qualified: d.qualified,
        pct:       d.total > 0 ? d.qualified / d.total * 100 : 0,
      };
    }).sort((a, b) => b.pct - a.pct);
  },

  /** Most frequent team pairings across all knockout rounds. */
  getTopMatchups(limit = 12) {
    if (_simCount === 0) return [];
    return Object.entries(_matchupFreq)
      .map(([k, v]) => ({
        teams: k.split('|'),
        count: v.count,
        pct:   v.count / _simCount * 100,
        wins:  v.wins,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  /** Top most-anticipated Finals (teams that met in the Final most often). */
  getDreamFinals(limit = 10) {
    if (_simCount === 0) return [];
    return Object.entries(_dreamFinals)
      .map(([k, v]) => ({
        teams: k.split('|'),
        count: v.count,
        pct:   v.count / _simCount * 100,
        wins:  v.wins,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  /** Teams that advanced via penalty shootout most times. */
  getPenKings(limit = 10) {
    if (_simCount === 0) return [];
    return Object.entries(_penKings)
      .filter(([, v]) => v.wins > 0)
      .map(([team, v]) => ({
        team,
        wins:        v.wins,
        appearances: v.appearances,
        pct:         v.appearances > 0 ? v.wins / v.appearances * 100 : 0,
      }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, limit);
  },

  /**
   * Average QF+ teams produced per group across all sims.
   * High avg = "Group of Death" — consistently sends teams deep.
   */
  getGroupDepth() {
    if (_simCount === 0) return [];
    return GKEYS.map(gk => ({
      group: gk,
      total: _groupDepth[gk] || 0,
      avg:   (_groupDepth[gk] || 0) / _simCount,
    })).sort((a, b) => b.avg - a.avg);
  },

  get simCount() { return _simCount; },
};
