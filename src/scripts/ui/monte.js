// ── Monte Carlo Overview Panel ───────────────────────────────────────────────
// Draws the championship probability cards, banner, and all-stages table.

import { flag, allTeams } from '../../lib/engine.js';
import { state, advPct, pBar } from '../state.js';
import { obHighlight } from '../onboarding.js';
import { tTeam } from '../../lib/i18n.js';

export function drawMonte() {
  const { STATS } = state;
  const n = STATS.n;
  const sorted = Object.entries(STATS.champCount).sort((a, b) => b[1] - a[1]).filter(x => x[1] > 0);
  const maxV = sorted[0] ? sorted[0][1] : 1;
  const top = sorted[0];

  document.getElementById('cbanner').innerHTML =
    `<div class="cbn"><div style="font-size:30px">${flag(top[0])}</div><div>` +
    `<div class="cbn-lbl">Highest Championship</div>` +
    `<div style="font-size:18px;font-weight:700;margin-top:2px">${tTeam(top[0])}</div>` +
    `<div style="font-size:12px;color:#888;margin-top:2px">${(top[1] / n * 100).toFixed(1)}% — ${top[1]}/${n}</div>` +
    `</div></div></div>`;

  const grid = document.getElementById('mcGrid');
  grid.innerHTML = '';
  for (const [name, cnt] of sorted) {
    const pct = (cnt / n * 100).toFixed(1);
    const bar = Math.round(cnt / maxV * 100);
    const d = document.createElement('div');
    d.className = 'mci';
    d.onclick = () => {
      document.getElementById('fTeam').value = name;
      document.getElementById('fStage').value = 'Champion';
      window.applyFilter();
      window.nav('browser');
    };
    d.innerHTML =
      `<div class="mcf">${flag(name)}</div>` +
      `<div class="mcn" data-team="${name}">${tTeam(name)}</div>` +
      `<div class="mcp">${pct}%</div>` +
      `<div class="mcs">${cnt}/${n}</div>` +
      `<div class="mcb"><div class="mcbf" style="width:${bar}%"></div></div>`;
    grid.appendChild(d);
  }
  drawStageTable();
}

export function drawStageTable() {
  const { STATS } = state;
  const n = STATS.n;
  const rows = allTeams().map(t => {
    const rc = STATS.reachedCounts[t.name];
    const adv = advPct(t.name);
    const r16 = ['R16', 'QF', 'SF', 'Final', 'Champion', '3.Yer'].reduce((s, k) => s + (rc[k] || 0), 0) / n * 100;
    const qf  = ['QF', 'SF', 'Final', 'Champion', '3.Yer'].reduce((s, k) => s + (rc[k] || 0), 0) / n * 100;
    const sf  = ['SF', 'Final', 'Champion', '3.Yer'].reduce((s, k) => s + (rc[k] || 0), 0) / n * 100;
    const fin = ['Final', 'Champion'].reduce((s, k) => s + (rc[k] || 0), 0) / n * 100;
    const champ = (STATS.champCount[t.name] || 0) / n * 100;
    return { ...t, adv, r16, qf, sf, fin, champ };
  });

  const sortK = state.stageSortK;
  const sortD = state.stageSortD;
  rows.sort((a, b) => {
    const va = a[sortK] ?? a.name, vb = b[sortK] ?? b.name;
    return typeof va === 'string' ? va.localeCompare(vb, 'tr') * sortD : (vb - va) * sortD;
  });

  const mAdv = Math.max(...rows.map(r => r.adv), .01);
  const mR16 = Math.max(...rows.map(r => r.r16), .01);
  const mQF  = Math.max(...rows.map(r => r.qf),  .01);
  const mSF  = Math.max(...rows.map(r => r.sf),  .01);
  const mFin = Math.max(...rows.map(r => r.fin), .01);
  const mCh  = Math.max(...rows.map(r => r.champ), .01);

  const tbody = document.getElementById('stageBody');
  tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.onclick = () => window.goJourney(r.name);
    tr.innerHTML =
      `<td><div class="tcl" data-team="${r.name}">${flag(r.name)}${tTeam(r.name)}</div></td>` +
      `<td class="num"><span class="gb">${r.group}</span></td>` +
      `<td class="num">${pBar(r.adv, mAdv, '#f59e0b')}</td>` +
      `<td class="num">${pBar(r.r16, mR16, '#9b74ff')}</td>` +
      `<td class="num">${pBar(r.qf,  mQF,  '#8b5cf6')}</td>` +
      `<td class="num">${pBar(r.sf,  mSF,  '#ec4899')}</td>` +
      `<td class="num">${pBar(r.fin, mFin, '#f97316')}</td>` +
      `<td class="num">${pBar(r.champ, mCh, '#00c4ff')}</td>`;
    tbody.appendChild(tr);
  });
}

export function srtS(k) {
  if (state.stageSortK === k) state.stageSortD *= -1;
  else { state.stageSortK = k; state.stageSortD = k === 'group' ? 1 : -1; }
  drawStageTable();
  obHighlight(); // re-apply selected team highlight after sort rebuild
}
