// ── Groups Panel ─────────────────────────────────────────────────────────────
// Draws the 12-group standings grid from the last simulation.
// Group headers toggle a dynamic probability table calculated from the
// current engine state (active STATS if available, else a fast 500-sim run).

import { flag, simTournament } from '../../lib/engine.js';
import { DATA } from '../../lib/data.js';
import { GKEYS } from '../../lib/constants.js';
import { state } from '../state.js';
import { tTeam } from '../../lib/i18n.js';

// ── Dynamic probability calculation ──────────────────────────────────────────
// Returns { teamName: { p1, p2, p3, p4, r32 } } for teams in the given group.
// Uses STATS if available (from the main sim run), otherwise runs 500 fast sims.
function calcGroupProbs(groupKey, teamNames) {
  // ── Path 1: reuse STATS from main simulation ──────────────────────────────
  if (state.STATS && state.STATS.n > 0) {
    const { n, reachedCounts } = state.STATS;
    const result = {};
    for (const name of teamNames) {
      const rc = reachedCounts[name] || {};
      const grpTotal = n;
      // Positions are tracked via reachedCounts stages:
      // 'Group' → eliminated in group (4th)
      // any KO stage → qualified from group (1st or 2nd or 3rd best)
      // We need sub-group position data. Use grpSt from LAST as positional proxy,
      // then derive finish probabilities from multiple sims stored in SIMS.
      // If SIMS available, count positions directly.
      if (state.SIMS && state.SIMS.length > 0) {
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0, r32 = 0;
        for (const s of state.SIMS) {
          const grpSt = s.grpSt && s.grpSt[groupKey];
          if (!grpSt) continue;
          const pos = grpSt.findIndex(t => t.name === name);
          if (pos === 0) { p1++; r32++; }
          else if (pos === 1) { p2++; r32++; }
          else if (pos === 2) {
            p3++;
            // Check if this team was in top8 (qualified as best 3rd)
            if (s.top8 && s.top8.some(t => t.name === name)) r32++;
          }
          else { p4++; }
        }
        const cnt = state.SIMS.length;
        result[name] = {
          p1: p1 / cnt * 100,
          p2: p2 / cnt * 100,
          p3: p3 / cnt * 100,
          p4: p4 / cnt * 100,
          r32: r32 / cnt * 100,
        };
      } else {
        // Fallback: approximate from reachedCounts only (no position data)
        const qualified = n - (rc['Group'] || 0);
        result[name] = {
          p1: 0, p2: 0, p3: 0, p4: ((rc['Group'] || 0) / n * 100),
          r32: qualified / n * 100,
        };
      }
    }
    return result;
  }

  // ── Path 2: fast 500-sim background run ───────────────────────────────────
  const FAST_N = 500;
  const counts = {};
  for (const name of teamNames) counts[name] = { p1: 0, p2: 0, p3: 0, p4: 0, r32: 0 };

  for (let i = 0; i < FAST_N; i++) {
    try {
      const s = simTournament(i + 1, false);
      const grpSt = s.grpSt && s.grpSt[groupKey];
      if (!grpSt) continue;
      for (let pos = 0; pos < grpSt.length; pos++) {
        const nm = grpSt[pos].name;
        if (!counts[nm]) continue;
        if (pos === 0) { counts[nm].p1++; counts[nm].r32++; }
        else if (pos === 1) { counts[nm].p2++; counts[nm].r32++; }
        else if (pos === 2) {
          counts[nm].p3++;
          if (s.top8 && s.top8.some(t => t.name === nm)) counts[nm].r32++;
        }
        else { counts[nm].p4++; }
      }
    } catch (_) { /* ignore individual sim errors */ }
  }

  const result = {};
  for (const name of teamNames) {
    const c = counts[name];
    result[name] = {
      p1:  c.p1  / FAST_N * 100,
      p2:  c.p2  / FAST_N * 100,
      p3:  c.p3  / FAST_N * 100,
      p4:  c.p4  / FAST_N * 100,
      r32: c.r32 / FAST_N * 100,
    };
  }
  return result;
}

export function drawGroups() {
  const { LAST } = state;
  const el = document.getElementById('groupsEl');
  el.innerHTML = '<div class="note">ℹ Last simulation · Click team → journey · Yellow = 3rd qualifying for R32</div>';

  const wrap = document.createElement('div');
  wrap.className = 'gg';

  const top8grps = new Set(LAST.top8.map(t => t.grp));

  for (const gk of GKEYS) {
    const st = LAST.grpSt[gk];
    if (!st) continue;

    const c = document.createElement('div');
    c.className = 'gc';

    // ── Header ──────────────────────────────────────────────────────────────
    c.innerHTML =
      `<div class="gch"><span>Group ${gk}</span><span>${st.map(x => flag(x.name)).join('')}</span></div>` +
      `<div class="gch2"><span></span><span>Team</span><span>GF</span><span>GA</span><span>GD</span><span>P</span></div>`;

    // ── Standings rows ───────────────────────────────────────────────────────
    st.forEach((t, i) => {
      const cls = i === 0 ? 'q1' : i === 1 ? 'q2' : (i === 2 && top8grps.has(gk)) ? 'q3' : '';
      const gd = t.gf - t.ga;
      c.innerHTML +=
        `<div class="gr ${cls}" onclick="goJourney('${t.name}')"><span class="gn">${i + 1}</span>` +
        `<div class="gtm"><span>${flag(t.name)}</span><span data-team="${t.name}">${tTeam(t.name)}</span></div>` +
        `<span class="num">${t.gf}</span><span class="num">${t.ga}</span>` +
        `<span class="num">${gd > 0 ? '+' : ''}${gd}</span><span class="num b">${t.pts}</span></div>`;
    });

    // ── Power averages footer ─────────────────────────────────────────────
    const td = st.map(x => DATA[x.name]).filter(Boolean);
    c.innerHTML +=
      `<div class="gpwr">` +
      `<span>DF:${(td.reduce((s, t) => s + t.df, 0) / td.length).toFixed(1)}</span>` +
      `<span>MF:${(td.reduce((s, t) => s + t.mf, 0) / td.length).toFixed(1)}</span>` +
      `<span>FW:${(td.reduce((s, t) => s + t.fw, 0) / td.length).toFixed(1)}</span></div>`;

    // ── Probability toggle ────────────────────────────────────────────────
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'grp-prob-toggle';
    toggleBtn.innerHTML = '<span>📊</span><span>Group Probabilities</span><span style="margin-left:auto">▸</span>';

    const probPanel = document.createElement('div');
    probPanel.className = 'grp-prob-panel';

    // Lazy: probabilities calculated only when first expanded
    let probLoaded = false;
    const teamNames = st.map(t => t.name);

    function loadProbs() {
      if (probLoaded) return;
      probLoaded = true;

      // Show a loading indicator briefly
      probPanel.innerHTML = '<div style="font-size:11px;color:#aaa;padding:6px 8px">Calculating…</div>';

      // Use setTimeout so the loading message renders before the sync calc
      setTimeout(() => {
        const probs = calcGroupProbs(gk, teamNames);

        // Table: flag only (no name) + 1st % + 2nd % + 3rd % + R32 %
        let tblHtml =
          `<table class="grp-prob-tbl">` +
          `<thead><tr>` +
          `<th style="text-align:left">🏳</th><th>1st</th><th>2nd</th><th>3rd</th><th class="grp-prob-r32">R32</th>` +
          `</tr></thead><tbody>`;

        // Sort by R32 probability descending for readability
        const sorted = teamNames
          .map(nm => ({ nm, d: probs[nm] }))
          .sort((a, b) => (b.d?.r32 ?? 0) - (a.d?.r32 ?? 0));

        for (const { nm, d } of sorted) {
          if (!d) continue;
          tblHtml +=
            `<tr>` +
            `<td style="text-align:left;font-size:16px;padding:3px 5px">${flag(nm)}</td>` +
            `<td>${d.p1.toFixed(1)}%</td>` +
            `<td>${d.p2.toFixed(1)}%</td>` +
            `<td>${d.p3.toFixed(1)}%</td>` +
            `<td class="grp-prob-r32">${d.r32.toFixed(1)}%</td>` +
            `</tr>`;
        }
        tblHtml += `</tbody></table>`;

        const srcLabel = (state.SIMS && state.SIMS.length > 0)
          ? `Based on ${state.SIMS.length.toLocaleString()} simulations`
          : 'Based on 500 background simulations';
        tblHtml += `<div style="font-size:10px;color:#aaa;margin-top:4px;text-align:right">${srcLabel}</div>`;

        probPanel.innerHTML = tblHtml;
      }, 10);
    }

    let open = false;
    toggleBtn.onclick = () => {
      open = !open;
      if (open) loadProbs();
      probPanel.style.display = open ? 'block' : 'none';
      const arrow = toggleBtn.querySelector('span:last-child');
      if (arrow) arrow.style.transform = open ? 'rotate(90deg)' : '';
    };

    c.appendChild(toggleBtn);
    c.appendChild(probPanel);
    wrap.appendChild(c);
  }
  el.appendChild(wrap);
}
