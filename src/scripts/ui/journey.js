// ── Team Journey Panel ────────────────────────────────────────────────────────
// Builds the team selector and renders the full journey view for a selected team.

import { flag, allTeams, rerunDetailed } from '../../lib/engine.js';
import { DATA, FIXTURES } from '../../lib/data.js';
import { state, advPct } from '../state.js';
import { getObTeam } from '../onboarding.js';
import { openMatchModal } from './modals.js';
import { ui, defaultLang } from '../../i18n/ui';
import { tTeam } from '../../lib/i18n.js';

function _cd() {
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('wc26_lang')) || defaultLang;
  return (ui[lang] || ui[defaultLang]);
}

// Stores the last openOppModal args so the back button can re-invoke it.
let _oppModalArgs = null;


export function buildJourneySel() {
  const sel = document.getElementById('journeyTeam');
  sel.innerHTML = '';
  allTeams().sort((a, b) => a.name.localeCompare(b.name, 'tr')).forEach(t => {
    const o = document.createElement('option');
    o.value = t.name;
    o.textContent = `${tTeam(t.name)} (Group ${t.group})`;
    sel.appendChild(o);
  });

  // FIX 1 — State Persistence: default to the onboarding-confirmed team if set.
  const preferred = getObTeam();
  if (preferred && DATA[preferred]) sel.value = preferred;
}

export function goJourney(name) {
  if (!state.STATS) return;
  document.getElementById('journeyTeam').value = name;
  showJourney();
  window.nav('journey');
}

export function showJourney() {
  const { STATS } = state;
  if (!STATS) return;

  const sel = document.getElementById('journeyTeam');

  // FIX 1 — State Persistence: if the select still holds no value (e.g. first
  // open after simulation), fall back to the onboarding team, then the first
  // team in the list.
  if (!sel.value) {
    const preferred = getObTeam();
    if (preferred && DATA[preferred]) {
      sel.value = preferred;
    } else if (sel.options.length > 0) {
      sel.value = sel.options[0].value;
    }
  }

  const name = sel.value;
  const td = DATA[name];
  if (!td) return;

  const n = STATS.n;
  const rc = STATS.reachedCounts[name];
  const op = STATS.oppCounts[name];
  const champCnt = STATS.champCount[name] || 0;

  const el = document.getElementById('journeyEl');
  el.innerHTML = '';

  // Header
  el.innerHTML =
    `<div class="jh"><div class="jf">${flag(name)}</div><div>` +
    `<div class="jn">${tTeam(name)}</div>` +
    `<div class="jsb">Group ${td.g} · OVR ${td.ovr} · DF ${td.df} · MF ${td.mf} · FW ${td.fw}</div>` +
    `<div class="jpls"><span class="jp">Group qualification <b>${advPct(name).toFixed(1)}%</b></span>` +
    `<span class="jp">Championship <b>${(champCnt / n * 100).toFixed(1)}%</b></span></div>` +
    `</div></div>`;

  // Squad section
  const players = td.p || [];
  if (players.length) {
    const posLabel = p => p ? ({ 1: 'GK', 2: 'DF', 3: 'MF', 4: 'FW' })[p[0]] || '?' : '?';
    const posOrder = { '1': 0, '2': 1, '3': 2, '4': 3 };
    const sorted = [...players].sort((a, b) => {
      const pa = posOrder[a.p ? a.p[0] : '9'] ?? 9;
      const pb = posOrder[b.p ? b.p[0] : '9'] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.o - a.o;
    });
    el.innerHTML +=
      `<div class="sec">Squad (${players.length} players)</div><div class="squad-grid">` +
      sorted.map(p =>
        `<div class="squad-card ${p.r === 0 ? 'squad-star' : p.r === 1 ? 'squad-as' : 'squad-sub'}">` +
        `<div class="squad-pos">${posLabel(p.p)}</div>` +
        `<div class="squad-name">${p.n || ''}</div>` +
        `<div class="squad-ovr">${p.o}${p.r === 0 ? ' ★' : ''}</div>` +
        `</div>`
      ).join('') +
      `</div>`;
  }

  // Group matches
  el.innerHTML += `<div class="sec">Group ${td.g} Matches — ${n} sim. averages</div>`;
  for (const fx of (FIXTURES[td.g] || []).filter(f => f[0] === name || f[1] === name)) {
    const opp = fx[0] === name ? fx[1] : fx[0];
    const key = [fx[0], fx[1]].sort().join('|');
    const ms = STATS.matchStatsCum[key] || { goalsA: 0, goalsB: 0, winsA: 0, winsB: 0, draws: 0, cnt: n };
    const cnt = ms.cnt || n;
    const iA = name < opp;
    const myG = (iA ? ms.goalsA : ms.goalsB) / cnt;
    const opG = (iA ? ms.goalsB : ms.goalsA) / cnt;
    const myW = (iA ? ms.winsA : ms.winsB) / cnt;
    const opW = (iA ? ms.winsB : ms.winsA) / cnt;
    const dr  = ms.draws / cnt;

    const card = document.createElement('div');
    card.className = 'jfxc';
    card.innerHTML =
      `<div class="jfxm"><b>${fx[2]}</b><span>·</span><span>${fx[3]}</span><span>·</span><span>Group ${td.g}</span></div>` +
      `<div class="jfxb"><div style="font-size:13px;font-weight:600">${flag(name)} ${tTeam(name)}</div>` +
      `<div class="jfxs"><div class="jfxsb">${myG.toFixed(1)}–${opG.toFixed(1)}</div><div style="font-size:10px;color:#aaa">avg. score</div></div>` +
      `<div style="text-align:right;font-size:13px;color:#aaa">${opp} ${flag(opp)}</div></div>` +
      `<div class="jfxw">` +
      `<div style="flex:${myW};background:#9b74ff;border-radius:2px 0 0 2px"></div>` +
      `<div style="flex:${dr};background:#e5e5e0"></div>` +
      `<div style="flex:${opW};background:#f59e0b;border-radius:0 2px 2px 0"></div></div>` +
      `<div class="jfxo"><span style="color:#9b74ff">${name} ${(myW * 100).toFixed(0)}%</span>` +
      `<span>Draw ${(dr * 100).toFixed(0)}%</span><span style="color:#f59e0b">${opp} ${(opW * 100).toFixed(0)}%</span></div>` +
      `<div class="jfxst">` +
      `<div class="jfxs2"><div class="jfxsl">Exp. Points</div><div class="jfxsv">${(myW * 3 + dr).toFixed(2)}</div></div>` +
      `<div class="jfxs2"><div class="jfxsl">Goals (avg.)</div><div class="jfxsv">${myG.toFixed(2)}</div></div>` +
      `<div class="jfxs2"><div class="jfxsl">Total (avg.)</div><div class="jfxsv">${(myG + opG).toFixed(2)}</div></div>` +
      `</div>`;
    el.appendChild(card);
  }

  // KO stages
  el.innerHTML += `<div class="sec">Knockout Rounds — click a stage to expand · click an opponent to view match stats</div>`;
  const RL = { R32: 'R32', R16: 'R16', QF: 'Quarter-Final', SF: 'Semi-Final', Final: 'Final' };
  const reachFrom = {
    R32: ['R32','R16','QF','SF','Final','Champion','3.Yer'],
    R16: ['R16','QF','SF','Final','Champion','3.Yer'],
    QF:  ['QF','SF','Final','Champion','3.Yer'],
    SF:  ['SF','Final','Champion','3.Yer'],
    Final: ['Final','Champion'],
  };
  const passFrom = {
    R32: ['R16','QF','SF','Final','Champion','3.Yer'],
    R16: ['QF','SF','Final','Champion','3.Yer'],
    QF:  ['SF','Final','Champion','3.Yer'],
    SF:  ['Final','Champion'],
    Final: ['Champion'],
  };

  for (const [key, label] of Object.entries(RL)) {
    const reachCnt = reachFrom[key].reduce((s, k) => s + (rc[k] || 0), 0);
    const passCnt  = passFrom[key].reduce((s, k) => s + (rc[k] || 0), 0);
    const reachP   = (reachCnt / n * 100).toFixed(1);
    const passP    = reachCnt > 0 ? (passCnt / reachCnt * 100).toFixed(1) : '-';
    const oppMap  = op[key] || {};
    const allOpps = Object.entries(oppMap).sort((a, b) => b[1].enc - a[1].enc);
    const totalEnc = allOpps.reduce((s, [, v]) => s + v.enc, 0);
    const maxEnc   = allOpps[0] ? allOpps[0][1].enc : 1;

    const wrap = document.createElement('div'); wrap.className = 'stgw';
    const hdr  = document.createElement('div'); hdr.className = 'stgh';
    hdr.innerHTML =
      `<div><div class="slbl">${label}</div><div class="spct">${reachP}%</div>` +
      `<div class="scnd">Reaching: ${reachP}% · Advancing: ${passP}%</div>` +
      `</div><div><div class="sbg"><div class="sbf" style="width:${reachP}%"></div></div></div>` +
      // FIX 2 — Localization: 'rakip' → 'opponents'
      `<div class="scnt">${allOpps.length > 0 ? allOpps.length + ' opponents' : ''}</div>` +
      `<div class="ea">${allOpps.length > 0 ? '▸' : ''}</div>`;

    const body = document.createElement('div'); body.className = 'stgb';
    body.style.display = 'none'; // collapsed by default

    if (!allOpps.length) {
      body.innerHTML = reachCnt === 0
        ? `<div style="font-size:12px;color:#aaa;font-style:italic">Never reached this round.</div>`
        : `<div style="font-size:12px;color:#aaa">No opponent data.</div>`;
    } else {
      const tbl = document.createElement('table');
      tbl.className = 'j-table';
      tbl.innerHTML =
        `<thead><tr>` +
        `<th>Opponent</th><th>Match-ups</th><th>Win Rate</th><th>W/L</th>` +
        `</tr></thead>`;
      const tbody = document.createElement('tbody');

      for (const [opp, data] of allOpps) {
        const encPct = totalEnc > 0 ? (data.enc / totalEnc * 100) : 0;
        const winPct = data.enc > 0 ? (data.wins / data.enc * 100) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML =
          // Col 1 — flag + name
          `<td><span style="margin-right:3px">${flag(opp)}</span><span style="font-weight:500">${opp}</span></td>` +
          // Col 2 — match-ups: fixed-width bar (.j-bar) + encounter %
          `<td><div style="display:flex;align-items:center;gap:3px">` +
            `<div class="j-bar"><div style="height:100%;border-radius:2px;background:#9b74ff;width:${Math.round(data.enc / maxEnc * 100)}%"></div></div>` +
            `<span style="color:#9b74ff;font-weight:700">${encPct.toFixed(1)}%</span>` +
          `</div></td>` +
          // Col 3 — win-rate: fixed-width bar (.j-bar) + win %
          `<td><div style="display:flex;align-items:center;gap:3px">` +
            `<div class="j-bar"><div style="height:100%;border-radius:2px;background:#00c4ff;width:${winPct.toFixed(1)}%"></div></div>` +
            `<span style="color:#00c4ff;font-weight:700">${winPct.toFixed(1)}%</span>` +
          `</div></td>` +
          // Col 4 — W/L (wins − losses)
          `<td>${data.wins}–${data.enc - data.wins}</td>`;

        const _opp = opp; const _data = data;
        tr.onclick = () => openOppModal(name, _opp, key, _data, n);
        tbody.appendChild(tr);
      }

      tbl.appendChild(tbody);
      body.appendChild(tbl);
    }

    let open = false;
    if (allOpps.length > 0) {
      hdr.style.cursor = 'pointer';
      hdr.onclick = () => {
        open = !open;
        body.style.display = open ? 'block' : 'none';
        hdr.querySelector('.ea').style.transform = open ? 'rotate(90deg)' : '';
      };
    }
    wrap.appendChild(hdr);
    wrap.appendChild(body);
    el.appendChild(wrap);
  }

  // ── Championship Summary ───────────────────────────────────────────────────
  // Only shown when the team has won the tournament at least once.
  if (champCnt > 0) {
    const sumSec = document.createElement('div');
    sumSec.className = 'sec';
    sumSec.textContent = '🏆 Championship Summary';
    el.appendChild(sumSec);

    // Whole box: click → list all championship sims
    const box = document.createElement('div');
    box.className = 'champ-sum-box';
    box.onclick = () => openChampModal(name);

    // Header row: total count + "View all" hint
    const _champD = _cd();
    const totalLine = document.createElement('div');
    totalLine.className = 'champ-sum-title';
    totalLine.innerHTML =
      `<span>${_champD['champ.total'] || 'Total championships:'} ${champCnt}</span>` +
      `<span style="font-size:11px;color:#9b74ff;font-weight:600">${_champD['champ.viewall'] || 'View all →'}</span>`;
    box.appendChild(totalLine);

    // Per-opponent chips — each opens a filtered list for that specific opponent
    const finalOpps = Object.entries(op['Final'] || {})
      .filter(([, d]) => d.wins > 0)
      .sort((a, b) => b[1].wins - a[1].wins);

    if (finalOpps.length) {
      const oppLine = document.createElement('div');
      oppLine.className = 'champ-sum-opps';

      const lbl = document.createElement('span');
      lbl.className = 'champ-sum-lbl';
      lbl.textContent = _champD['champ.finalsvs'] || 'Finals won vs.';
      oppLine.appendChild(lbl);

      for (const [opp, d] of finalOpps) {
        const chip = document.createElement('span');
        chip.className = 'champ-chip';
        chip.innerHTML =
          `${flag(opp)}<span style="font-weight:600">${opp}</span>` +
          `<span style="color:#9b74ff;font-weight:700;margin-left:2px">(${d.wins})</span>`;
        const _opp = opp; const _d = d;
        chip.onclick = e => { e.stopPropagation(); openOppModal(name, _opp, 'Final', _d, n); };
        oppLine.appendChild(chip);
      }
      box.appendChild(oppLine);
    }

    el.appendChild(box);
  }

  // ── Patreon support link at bottom of Journey view ──────────────────────────
  const patronDiv = document.createElement('div');
  patronDiv.style.cssText =
    'margin-top:24px;padding:12px 16px;border:1px dashed #e0e0e0;border-radius:10px;' +
    'text-align:center;font-size:11px;color:#aaa';
  patronDiv.innerHTML =
    `Enjoying the simulator? ` +
    `<a href="https://www.patreon.com/c/BapLab" target="_blank" rel="noopener noreferrer" ` +
    `style="color:#00c4ff;font-weight:600;text-decoration:none">Support BapLab on Patreon</a> ` +
    `to fuel the next generation of simulations.`;
  el.appendChild(patronDiv);
}

// ── Championship sim-list modal ────────────────────────────────────────────────
// Opens the shared modal with a scrollable list of sim IDs where `team` won the
// championship. When `vsOpp` is given, filters to finals against that opponent.
function openChampModal(team, vsOpp = null) {
  const d = _cd();
  const champSims = state.SIMS.filter(s => {
    if (s.champion !== team) return false;
    if (!vsOpp) return true;
    const fin = s.fin && s.fin[0];
    return fin && (fin.a === vsOpp || fin.b === vsOpp);
  });

  document.getElementById('modalTitle').innerHTML = vsOpp
    ? `🏆 ${tTeam(team)} · ${d['champ.finalsvs'] || 'Finals won vs.'} ${flag(vsOpp)} ${tTeam(vsOpp)}`
    : `🏆 ${tTeam(team)} · All Championships`;

  const body = document.getElementById('modalBody');
  body.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;gap:14px;padding:4px 0';

  // Summary count line
  const summary = document.createElement('div');
  summary.style.cssText = 'font-size:13px;color:#555';
  summary.innerHTML =
    `<b>${champSims.length}</b> ${d['champ.sims'] || 'championship simulation(s)'}` +
    (vsOpp ? ` ${d['champ.against'] || 'against'} ${flag(vsOpp)} <b>${vsOpp}</b>` : '');
  wrapper.appendChild(summary);

  if (!champSims.length) {
    const note = document.createElement('div');
    note.style.cssText = 'font-size:12px;color:#aaa;font-style:italic';
    note.textContent = d['champ.none'] || 'No simulations found.';
    wrapper.appendChild(note);
  } else {
    const scroll = document.createElement('div');
    scroll.style.cssText =
      'max-height:320px;overflow-y:auto;border:1px solid #e5e5e0;border-radius:10px;background:#fff';

    champSims.forEach((s, i) => {
      const fin = s.fin && s.fin[0];
      const oppName = fin ? (fin.a === team ? fin.b : fin.a) : '?';
      const tScore  = fin ? (fin.a === team ? fin.sa : fin.sb) : '';
      const oScore  = fin ? (fin.a === team ? fin.sb : fin.sa) : '';

      const row = document.createElement('div');
      row.style.cssText =
        'display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;transition:background .15s;' +
        (i < champSims.length - 1 ? 'border-bottom:1px solid #f5f5f3' : '');
      row.onmouseenter = () => { row.style.background = '#f8f8f6'; };
      row.onmouseleave = () => { row.style.background = ''; };

      const simNum = document.createElement('span');
      simNum.style.cssText = 'font-size:11px;color:#aaa;min-width:52px;flex-shrink:0';
      simNum.textContent = `Sim #${s.idx}`;

      const info = document.createElement('span');
      info.style.cssText = 'font-size:12px;font-weight:600;flex:1;min-width:0';
      info.innerHTML =
        `🏆 vs. ${flag(oppName)}${oppName}` +
        (fin ? ` <span style="color:#00c4ff;font-size:11px">${tScore}–${oScore}</span>` : '');

      const hint = document.createElement('span');
      hint.style.cssText = 'font-size:11px;color:#bbb;flex-shrink:0';
      hint.textContent = d['champ.open'] || 'Open →';

      row.appendChild(simNum);
      row.appendChild(info);
      row.appendChild(hint);

      const _idx = s.idx;
      const _fin = s.fin && s.fin[0];
      row.onclick = () => {
        if (_fin) openMatchFromOppModal(_idx, _fin.a, _fin.b, 'Final');
      };
      scroll.appendChild(row);
    });

    wrapper.appendChild(scroll);
  }

  body.appendChild(wrapper);
  document.getElementById('modal').style.display = 'flex';
}

// ── Opponent head-to-head modal ───────────────────────────────────────────────
// Shows aggregate stats AND a scrollable list of every individual sim in which
// these two teams met at this round. Each row is clickable → match report modal.
function openOppModal(team, opp, round, data, n) {
  // Save args so the back-button can restore this view
  _oppModalArgs = { team, opp, round, data, n };

  const winPct  = data.enc > 0 ? (data.wins  / data.enc * 100).toFixed(1) : '0.0';
  const lossPct = data.enc > 0 ? ((data.enc - data.wins) / data.enc * 100).toFixed(1) : '0.0';
  const roundLabels = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-Final', SF: 'Semi-Final', Final: 'Final', '3.Yer': 'Third Place' };
  const rndLabel = roundLabels[round] || round;
  const roundProp = { R32: 'r32', R16: 'r16', QF: 'qf', SF: 'sf', Final: 'fin', '3.Yer': 'third' }[round];

  // ── Title with contextual label (back button injected per-match later) ────
  document.getElementById('modalTitle').innerHTML =
    `${flag(team)} ${tTeam(team)} vs ${flag(opp)} ${tTeam(opp)} — ${rndLabel}`;

  // ── Static HTML (stats section) ──────────────────────────────────────────
  document.getElementById('modalBody').innerHTML =
    `<div style="display:flex;flex-direction:column;gap:18px;padding:4px 0">` +

    // Hero strip
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">` +
    `<div style="text-align:center"><div style="font-size:32px">${flag(team)}</div><div style="font-size:13px;font-weight:700;margin-top:4px">${team}</div></div>` +
    `<div style="text-align:center;flex:1">` +
    `<div style="font-size:11px;color:#aaa;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">${rndLabel}</div>` +
    `<div style="font-size:22px;font-weight:800;letter-spacing:.04em">${data.wins} – ${data.enc - data.wins}</div>` +
    `<div style="font-size:11px;color:#aaa;margin-top:2px">W – L across ${data.enc} encounters</div>` +
    `</div>` +
    `<div style="text-align:center"><div style="font-size:32px">${flag(opp)}</div><div style="font-size:13px;font-weight:700;margin-top:4px">${opp}</div></div>` +
    `</div>` +

    // Win-rate bar
    `<div>` +
    `<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:6px">` +
    `<span style="color:#9b74ff">${team} ${winPct}%</span>` +
    `<span style="color:#f59e0b">${opp} ${lossPct}%</span>` +
    `</div>` +
    `<div style="display:flex;gap:3px;height:8px;border-radius:4px;overflow:hidden;background:#f0f0ee">` +
    `<div style="flex:${data.wins};background:#9b74ff"></div>` +
    `<div style="flex:${data.enc - data.wins};background:#f59e0b"></div>` +
    `</div>` +
    `</div>` +

    // Stats grid
    `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">` +
    statBox('Encounters', data.enc, '#6366f1') +
    statBox('Wins', data.wins, '#00c4ff') +
    statBox('Win %', winPct + '%', '#9b74ff') +
    `</div>` +

    // Match list placeholder
    `<div id="_oppMatchSection"></div>` +

    `</div>`;

  // ── DOM-built match list ──────────────────────────────────────────────────
  const section = document.getElementById('_oppMatchSection');

  const heading = document.createElement('div');
  heading.style.cssText = 'font-size:12px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:.06em;border-top:1px solid #f0f0ee;padding-top:14px;margin-bottom:8px';
  heading.textContent = 'Individual Results';
  section.appendChild(heading);

  if (!roundProp) {
    const note = document.createElement('div');
    note.style.cssText = 'font-size:12px;color:#aaa;font-style:italic';
    note.textContent = 'No individual match data for this round.';
    section.appendChild(note);
  } else if (!state.SIMS.length) {
    const note = document.createElement('div');
    note.style.cssText = 'font-size:12px;color:#aaa;font-style:italic';
    note.textContent = 'Re-simulate to view individual match history.';
    section.appendChild(note);
  } else {
    const matches = [];
    for (const s of state.SIMS) {
      // 'third' is a single match object on the sim; all other round props are arrays.
      const raw = s[roundProp];
      const roundMatches = roundProp === 'third' ? (raw ? [raw] : []) : (raw || []);
      for (const m of roundMatches) {
        if (!m) continue;
        const involved =
          (m.a === team && m.b === opp) ||
          (m.a === opp  && m.b === team);
        if (involved) { matches.push({ s, m }); break; }
      }
    }

    if (!matches.length) {
      const note = document.createElement('div');
      note.style.cssText = 'font-size:12px;color:#aaa;font-style:italic';
      note.textContent = 'No individual matches found.';
      section.appendChild(note);
    } else {
      const scroll = document.createElement('div');
      scroll.style.cssText =
        'max-height:220px;overflow-y:auto;border:1px solid #e5e5e0;border-radius:10px;background:#fff';

      matches.forEach(({ s, m }, idx) => {
        // Engine-native order: m.a m.sa – m.sb m.b  (always matches the match report)
        const homeScore = m.sa;
        const awayScore = m.sb;
        const suffix = m.pen
          ? ` · pen. ${m.penA}–${m.penB}`   // penA/penB also in m.a–m.b order
          : m.et ? ' · ET' : '';

        // W/L badge is still from the selected team's perspective
        const teamWon  = m.w === team;
        const teamLost = m.w !== team && m.w !== null && m.w !== undefined;
        const badgeCfg = teamWon
          ? { text: 'W', bg: '#dcfce7', color: '#0090d4' }
          : teamLost
            ? { text: 'L', bg: '#fef3c7', color: '#d97706' }
            : { text: 'D', bg: '#f0f0ee', color: '#666' };

        const row = document.createElement('div');
        row.style.cssText =
          'display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;transition:background .15s;' +
          (idx < matches.length - 1 ? 'border-bottom:1px solid #f5f5f3' : '');
        row.onmouseenter = () => { row.style.background = '#f8f8f6'; };
        row.onmouseleave = () => { row.style.background = ''; };

        const simNum = document.createElement('span');
        simNum.style.cssText = 'font-size:11px;color:#aaa;min-width:46px;flex-shrink:0';
        simNum.textContent = `Sim #${s.idx}`;

        // Score label: "[HomeFlag] HomeTeam sa–sb AwayTeam [AwayFlag]"
        // Exactly mirrors the openMatchModal title and mhero display.
        const scoreEl = document.createElement('span');
        scoreEl.style.cssText = 'font-size:12px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
        scoreEl.innerHTML = `${flag(m.a)}${tTeam(m.a)} ${homeScore}–${awayScore} ${tTeam(m.b)}${flag(m.b)}${suffix}`;

        const badgeEl = document.createElement('span');
        badgeEl.style.cssText =
          `font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;` +
          `background:${badgeCfg.bg};color:${badgeCfg.color};flex-shrink:0`;
        badgeEl.textContent = badgeCfg.text;

        const hint = document.createElement('span');
        hint.style.cssText = 'font-size:11px;color:#bbb;flex-shrink:0';
        hint.textContent = 'Full report ›';

        row.appendChild(simNum);
        row.appendChild(scoreEl);
        row.appendChild(badgeEl);
        row.appendChild(hint);

        // Click: show full match report modal (no tab switch)
        const _simIdx = s.idx;
        const _mA = m.a; const _mB = m.b;
        row.onclick = () => openMatchFromOppModal(_simIdx, _mA, _mB, rndLabel);

        scroll.appendChild(row);
      });

      section.appendChild(scroll);

      const footer = document.createElement('div');
      footer.style.cssText = 'font-size:11px;color:#aaa;text-align:right;margin-top:4px';
      footer.textContent = `${matches.length} of ${n} simulations`;
      section.appendChild(footer);
    }
  }

  document.getElementById('modal').style.display = 'flex';
}


// ── Open a single match from within the opp modal ─────────────────────────────
// Re-runs the sim to get full event/squad data, renders the match via
// openMatchModal, then injects:
//   • A '← Results' back button → returns to the opp aggregate view
//   • The existing 'This Sim #X →' button already rendered by openMatchModal
//     triggers openSimById, switching to the Browser tab.
function openMatchFromOppModal(simIdx, nameA, nameB, rndLabel) {
  // Show a loading state immediately so the UI feels responsive
  document.getElementById('modalTitle').textContent = `Loading Sim #${simIdx}…`;
  document.getElementById('modalBody').innerHTML =
    `<div style="padding:28px;text-align:center;color:#aaa;font-size:13px">` +
    `<span class="sp"></span> Re-simulating…</div>`;

  // Defer heavy work so the loading state renders first
  setTimeout(() => {
    const detailed = rerunDetailed(simIdx);
    // Collect all matches from every round
    const allMs = [
      ...Object.values(detailed.grpMatches).flat(),
      ...detailed.r32, ...detailed.r16, ...detailed.qf, ...detailed.sf,
      ...(detailed.third ? [detailed.third] : []),
      ...detailed.fin,
    ].filter(Boolean);

    const m = allMs.find(x => x.a === nameA && x.b === nameB);
    if (!m) {
      document.getElementById('modalTitle').textContent = 'Match not found';
      document.getElementById('modalBody').innerHTML =
        `<div style="padding:20px;color:#aaa">Could not locate this match in Sim #${simIdx}.</div>`;
      return;
    }

    // openMatchModal writes into #modalTitle + #modalBody and already
    // appends a "This Sim #X →" button that calls openSimById + closeModal.
    openMatchModal(m, rndLabel, simIdx);

    // ── Inject the '← Results' back button into the title bar ────────────
    // openMatchModal sets modalTitle to plain text; we replace it with a
    // flex container holding [← Results] [original title text].
    const titleEl = document.getElementById('modalTitle');
    const originalTitle = titleEl.textContent;

    // Build the back button
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Results';
    backBtn.style.cssText =
      'font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid #ddd;' +
      'background:#fff;cursor:pointer;color:#555;font-family:inherit;flex-shrink:0;' +
      'transition:background .15s';
    backBtn.onmouseenter = () => { backBtn.style.background = '#f0f0ee'; };
    backBtn.onmouseleave = () => { backBtn.style.background = '#fff'; };
    backBtn.onclick = () => {
      // Re-open the opp aggregate modal using the saved args
      if (_oppModalArgs) {
        const { team, opp, round, data, n } = _oppModalArgs;
        openOppModal(team, opp, round, data, n);
      }
    };

    // Replace title element content with [backBtn + title text]
    titleEl.textContent = '';
    titleEl.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;min-width:0';
    const titleText = document.createElement('span');
    titleText.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    titleText.textContent = originalTitle;
    titleEl.appendChild(backBtn);
    titleEl.appendChild(titleText);

    // ── Patch the existing "This Sim #X →" button to also close properly ─
    // openMatchModal renders: onclick="openSimById(X);closeModal()"
    // We need it to nav to the browser tab too, which openSimById already does
    // via window.openSimById → nav('browser'). No extra change needed.
  }, 30);
}

function statBox(label, value, color) {
  return `<div style="background:#f8f8f6;border-radius:10px;padding:12px;text-align:center">` +
    `<div style="font-size:18px;font-weight:800;color:${color}">${value}</div>` +
    `<div style="font-size:11px;color:#aaa;margin-top:3px">${label}</div>` +
    `</div>`;
}
