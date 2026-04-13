// ── Stats Panel ───────────────────────────────────────────────────────────────
// Draws the aggregated statistics (records, top scorers, assists, champions).

import { flag, allTeams } from '../../lib/engine.js';
import { state, advPct } from '../state.js';

export function drawStats() {
  const { STATS, SIMS } = state;
  if (!STATS) return;

  const n = STATS.n;
  const rec = STATS.records;
  const topS = Object.entries(STATS.topScorer).sort((a, b) => b[1].g - a[1].g).slice(0, 10);
  const topA = Object.entries(STATS.topAssist).sort((a, b) => b[1].a - a[1].a).slice(0, 10);
  const champS = Object.entries(STATS.champCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const avgGoals = (SIMS.reduce((s, sim) => s + sim.totalGoals, 0) / n).toFixed(1);

  function recRow(lbl, val, sub, idx, m) {
    const matchInfo = m ? `${m.a} ${m.sa}-${m.sb} ${m.b}` : '';
    return `<div class="strw" onclick="openRecordMatch(${idx},'${m ? m.a : ''}','${m ? m.b : ''}')"><div>` +
      `<div class="stv">${val}</div><div class="std">${lbl}${sub ? ' · ' + sub : ''}</div>` +
      (matchInfo ? `<div style="font-size:11px;color:#3b82f6;margin-top:2px">${matchInfo}</div>` : '') +
      `</div><span style="color:#aaa;font-size:16px">→</span></div>`;
  }

  const el = document.getElementById('statsEl');
  if (!el) return;

  el.innerHTML =
    `<div class="note">ℹ ${n} simulation records · Click row → match detail</div>` +
    `<div class="stgrd">` +

    // Tournament records — 4 items: 2 tournament-level, 2 match-level
    `<div class="stgc"><div class="stgch">Tournament Records</div><div class="stgcb">` +
    recRow('Highest scoring tournament', rec.recMaxGoalsSim.val + ' goals',     'Sim #' + rec.recMaxGoalsSim.idx,      rec.recMaxGoalsSim.idx,      null) +
    recRow('Lowest scoring tournament',  rec.recMinGoalsSim.val + ' goals',     'Sim #' + rec.recMinGoalsSim.idx,      rec.recMinGoalsSim.idx,      null) +
    recRow('Most goals in a match',      rec.recMaxGoalsMatch.val + ' goals',   'Sim #' + rec.recMaxGoalsMatch.idx,    rec.recMaxGoalsMatch.idx,    rec.recMaxGoalsMatch.m) +
    recRow('Biggest margin in a match',  rec.recMaxMargin.val + ' goal diff.',  'Sim #' + rec.recMaxMargin.idx,        rec.recMaxMargin.idx,        rec.recMaxMargin.m) +
    `</div></div>` +

    // Top Scorers — hidden until re-enabled
    // `<div class="stgc"><div class="stgch">Top Scorers (${n} Sim. Total)</div><div class="stgcb">` +
    // topS.map(([nm, ps], i) =>
    //   `<div class="strw" onclick="goJourney('${ps.t || ''}')" style="cursor:pointer">` +
    //   `<div style="display:flex;align-items:center;gap:6px"><span style="color:#aaa;font-size:11px;min-width:16px">${i + 1}</span><span>${ps.f || ''}</span><span>${nm || ''}</span></div>` +
    //   `<span style="font-weight:700">${ps.g || 0} goals</span></div>`
    // ).join('') +
    // `</div></div>` +

    // Assist Leaders — hidden until re-enabled
    // `<div class="stgc"><div class="stgch">Assist Leaders (${n} Sim. Total)</div><div class="stgcb">` +
    // topA.map(([nm, ps], i) =>
    //   `<div class="strw" onclick="goJourney('${ps.t || ''}')" style="cursor:pointer">` +
    //   `<div style="display:flex;align-items:center;gap:6px"><span style="color:#aaa;font-size:11px;min-width:16px">${i + 1}</span><span>${ps.f || ''}</span><span>${nm || ''}</span></div>` +
    //   `<span style="font-weight:700">${ps.a || 0} assists</span></div>`
    // ).join('') +
    // `</div></div>` +

    // Championship distribution
    `<div class="stgc"><div class="stgch">Championship Distribution</div><div class="stgcb">` +
    champS.map(([cname, cnt]) =>
      `<div class="strw" onclick="filterAndGo('${cname}')">` +
      `<div style="display:flex;align-items:center;gap:6px"><span>${flag(cname)}</span>${cname}</div>` +
      `<span style="font-weight:700">${(cnt / n * 100).toFixed(1)}%</span></div>`
    ).join('') +
    `</div></div>` +

    // Group qualifying
    `<div class="stgc"><div class="stgch">Group Qualifying</div><div class="stgcb">` +
    allTeams().sort((a, b) => advPct(b.name) - advPct(a.name)).slice(0, 8).map(t =>
      `<div class="strw" onclick="goJourney('${t.name}')">` +
      `<div style="display:flex;align-items:center;gap:6px"><span>${t.flag}</span>${t.name}</div>` +
      `<span style="font-weight:700">${advPct(t.name).toFixed(1)}%</span></div>`
    ).join('') +
    `</div></div>` +

    `</div>`;
}
