// ── Power Table Panel ─────────────────────────────────────────────────────────
// Renders the editable team ratings table and handles rating resets.

import { allTeams } from '../../lib/engine.js';
import { DATA, DATA_ORIG } from '../../lib/data.js';
import { state, advPct, pBar } from '../state.js';

export function srtP(k) {
  if (state.pwSortK === k) state.pwSortD *= -1;
  else { state.pwSortK = k; state.pwSortD = k === 'group' ? 1 : -1; }
  buildPowerTable();
}

export function buildPowerTable() {
  const { STATS } = state;
  const hasStats = !!STATS;
  const n = STATS ? STATS.n : 1;
  const rows = allTeams().map(t => ({
    ...t,
    adv:   hasStats ? advPct(t.name) : 0,
    champ: hasStats ? (STATS.champCount[t.name] || 0) / n * 100 : 0,
  }));

  const sortK = state.pwSortK;
  const sortD = state.pwSortD;
  rows.sort((a, b) => {
    const va = a[sortK] ?? a.name, vb = b[sortK] ?? b.name;
    if (typeof va === 'string') return va.localeCompare(vb, 'tr') * sortD;
    return (vb - va) * sortD;
  });

  const maxAdv = hasStats ? Math.max(...rows.map(r => r.adv), .01) : 1;
  const maxCh  = hasStats ? Math.max(...rows.map(r => r.champ), .01) : 1;

  const tbody = document.getElementById('pwBody');
  tbody.innerHTML = '';
  rows.forEach((t, i) => {
    const ovrBar = Math.round((t.ovr - 60) / (95 - 60) * 100);
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td class="num" style="color:#aaa;font-size:11px">${i + 1}</td>` +
      `<td><div class="tcl pw-name-cell" onclick="goJourney('${t.name}')" title="Go to team journey">` +
      `<span>${t.flag}</span><span class="pw-team-name">${t.name}</span><span class="gb">${t.group}</span></div></td>` +
      `<td class="num"><span class="gb">${t.group}</span></td>` +
      `<td class="num"><div class="pb"><div class="pbg" style="width:50px"><div style="width:${ovrBar}%;height:5px;border-radius:3px;background:#3b82f6"></div></div><b>${t.ovr}</b></div></td>` +
      `<td class="num"><input class="pw-inp" type="number" step="0.1" min="55" max="99" value="${t.df}" onchange="updateRating('${t.name}','df',this.value)" onclick="event.stopPropagation()"></td>` +
      `<td class="num"><input class="pw-inp" type="number" step="0.1" min="55" max="99" value="${t.mf}" onchange="updateRating('${t.name}','mf',this.value)" onclick="event.stopPropagation()"></td>` +
      `<td class="num"><input class="pw-inp" type="number" step="0.1" min="55" max="99" value="${t.fw}" onchange="updateRating('${t.name}','fw',this.value)" onclick="event.stopPropagation()"></td>` +
      (hasStats
        ? `<td class="num">${pBar(t.adv, maxAdv, '#f59e0b')}</td><td class="num">${pBar(t.champ, maxCh, '#22c55e')}</td>`
        : `<td class="num" style="color:#aaa">—</td><td class="num" style="color:#aaa">—</td>`);
    tbody.appendChild(tr);
  });
}

export function updateRating(name, field, val) {
  const v = parseFloat(val);
  if (isNaN(v)) return;
  DATA[name][field] = v;
  const d = DATA[name];
  d.ovr = Math.round((d.df * 0.33 + d.mf * 0.34 + d.fw * 0.33) * 10) / 10;
  document.getElementById('pwChangeBadge').textContent = 'Rating changed — re-simulate';
}

export function resetRatings() {
  for (const [k, v] of Object.entries(DATA_ORIG)) {
    DATA[k].df = v.df; DATA[k].mf = v.mf; DATA[k].fw = v.fw; DATA[k].ovr = v.ovr;
  }
  buildPowerTable();
  document.getElementById('pwChangeBadge').textContent = '';
}
