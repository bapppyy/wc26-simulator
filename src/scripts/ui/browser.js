// ── Sim Browser Panel ─────────────────────────────────────────────────────────
// Filter/list, detail view, and full-report modal logic for the sim browser.

import { flag, allTeams, rerunDetailed } from '../../lib/engine.js';
import { STAGE_LABELS, STAGE_TAG } from '../../lib/constants.js';
import { state, scoreStr } from '../state.js';
import { openMatchModal, buildFullReportModal, openFullReport, openReportMatch } from './modals.js';
import { tTeam } from '../../lib/i18n.js';
import { renderBracketTree } from './bracket.js';

// ── Module-level state for the detail view ────────────────────────────────────
let _currentDetailSim  = null;
let _currentDetailTeam = null;

export function buildFilterSels() {
  const sel = document.getElementById('fTeam');
  sel.innerHTML = '<option value="">All Teams</option>';
  allTeams().sort((a, b) => a.name.localeCompare(b.name, 'tr')).forEach(t => {
    const o = document.createElement('option');
    o.value = t.name;
    o.textContent = tTeam(t.name);
    sel.appendChild(o);
  });
}

export function applyFilter() {
  const { SIMS } = state;
  if (!SIMS.length) return;
  state._muf = null;
  const team  = document.getElementById('fTeam').value;
  const stage = document.getElementById('fStage').value;

  if (team && stage) state.filtered = SIMS.filter(s => s.reached[team] === stage);
  else if (team)     state.filtered = [...SIMS];
  else if (stage)    state.filtered = SIMS.filter(s => Object.values(s.reached).includes(stage));
  else               state.filtered = [...SIMS];

  state.page = 0;
  document.getElementById('fCount').innerHTML = `<b>${state.filtered.length}</b> sim.`;
  renderList();
}

export function filterByMatchup(tA, tB, rnd) {
  const prop = { R32: 'r32', R16: 'r16', QF: 'qf', SF: 'sf', Final: 'fin' }[rnd];
  if (!prop) return;
  state._muf = { a: tA, b: tB, rnd };
  state.filtered = state.SIMS.filter(s =>
    (s[prop] || []).some(m => m && ((m.a === tA && m.b === tB) || (m.a === tB && m.b === tA)))
  );
  state.page = 0;
  document.getElementById('fTeam').value = tA;
  document.getElementById('fStage').value = '';
  document.getElementById('fCount').innerHTML =
    `<b>${state.filtered.length}</b> sims — <span style="color:#9b74ff;font-weight:600">${flag(tA)}${tA} vs ${flag(tB)}${tB} · ${rnd}</span>`;
  renderList();
  window.nav('browser', true);
}

export function renderList() {
  const { filtered, page, PAGE_SIZE, _muf } = state;
  const list = document.getElementById('simList');
  list.innerHTML = '';
  const team = document.getElementById('fTeam').value;
  const slice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!slice.length) {
    list.innerHTML = `<div class="nor">No simulations found.</div>`;
    renderPg();
    return;
  }

  for (const s of slice) {
    const stg = team ? s.reached[team] : '';
    const tagCls = STAGE_TAG[stg] || 'te';
    const tagLbl = stg ? STAGE_LABELS[stg] : '—';

    let mu = '';
    if (_muf) {
      const prop = { R32: 'r32', R16: 'r16', QF: 'qf', SF: 'sf', Final: 'fin' }[_muf.rnd];
      const mm = prop && s[prop] ? s[prop].find(m => m && ((m.a === _muf.a && m.b === _muf.b) || (m.a === _muf.b && m.b === _muf.a))) : null;
      if (mm) mu = ` <span style="color:#9b74ff;font-size:11px">${mm.a} ${scoreStr(mm)} ${mm.b}</span>`;
    }

    const row = document.createElement('div');
    row.className = 'sr';
    row.innerHTML =
      `<div class="sn">#${s.idx}</div>` +
      `<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:5px">${flag(s.champion)}${s.champion} 🏆${mu}</div>` +
      `<div style="font-size:11px;color:#aaa;margin-top:2px">Final: ${s.fin[0] ? s.fin[0].a + ' ' + scoreStr(s.fin[0]) + ' ' + s.fin[0].b : ''}</div></div>` +
      `<div style="margin-left:auto;display:flex;align-items:center;flex-shrink:0">` +
      `<span class="stg ${tagCls}">${tagLbl}</span>` +
      `</div>`;

    const _s = s;
    row.onclick = () => showDetail(_s, team);
    list.appendChild(row);
  }
  renderPg();
}

function renderPg() {
  const { filtered, page, PAGE_SIZE } = state;
  const el = document.getElementById('pagination');
  el.innerHTML = '';
  const total = Math.ceil(filtered.length / PAGE_SIZE);
  if (total <= 1) return;

  if (page > 0) {
    const b = document.createElement('button');
    b.className = 'pgb'; b.textContent = '← Prev';
    b.onclick = () => { state.page--; renderList(); };
    el.appendChild(b);
  }
  const info = document.createElement('span');
  info.style.cssText = 'font-size:12px;color:#888';
  info.textContent = `${page + 1}/${total}`;
  el.appendChild(info);

  if (page < total - 1) {
    const b = document.createElement('button');
    b.className = 'pgb'; b.textContent = 'Next →';
    b.onclick = () => { state.page++; renderList(); };
    el.appendChild(b);
  }
}

// ── Detail view ───────────────────────────────────────────────────────────────

export function showDetail(s, focusTeam) {
  _currentDetailSim  = s;
  _currentDetailTeam = focusTeam || null;

  document.getElementById('browserMain').style.display = 'none';
  const det = document.getElementById('browserDetail');
  det.style.display = 'block';

  // Build chrome: back + copy link + title + tabs + content container
  det.innerHTML =
    `<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">` +
    `<div class="dback" onclick="closeDetail()">← Back</div>` +
    `<button class="btn" id="copyLinkBtn" style="font-size:11px;padding:3px 9px;margin-left:auto" onclick="copySimLink(${s.idx})">🔗 Copy Link</button>` +
    `</div>` +
    `<div style="font-size:17px;font-weight:700;margin-bottom:2px">Sim #${s.idx} — ${flag(s.champion)} ${s.champion} 🏆</div>` +
    (focusTeam
      ? `<div style="font-size:12px;color:#888;margin-bottom:10px">${flag(focusTeam)}${focusTeam}: ${STAGE_LABELS[s.reached[focusTeam]] || ''}</div>`
      : `<div style="margin-bottom:10px"></div>`) +
    `<div style="display:flex;gap:4px;margin-bottom:14px">` +
    `<button class="det-tab det-tab-active" id="tabList"    onclick="switchDetailTab('list')">📋 List View</button>` +
    `<button class="det-tab"                id="tabBracket" onclick="switchDetailTab('bracket')">🏆 Bracket View</button>` +
    `</div>` +
    `<div id="detailContent"></div>`;

  _renderListContent(s, focusTeam);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ── Tab switcher ──────────────────────────────────────────────────────────────
// Exported so main.js can wire it onto window.

export function switchDetailTab(tab) {
  const s = _currentDetailSim;
  if (!s) return;

  const tabList    = document.getElementById('tabList');
  const tabBracket = document.getElementById('tabBracket');
  if (tabList)    tabList.classList.toggle('det-tab-active',    tab === 'list');
  if (tabBracket) tabBracket.classList.toggle('det-tab-active', tab === 'bracket');

  const content = document.getElementById('detailContent');
  if (!content) return;

  if (tab === 'bracket') {
    content.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'overflow-x:auto;margin-top:4px';
    wrapper.appendChild(renderBracketTree(s));
    content.appendChild(wrapper);
  } else {
    _renderListContent(s, _currentDetailTeam);
  }
}

// ── List content renderer ─────────────────────────────────────────────────────

function _renderListContent(s, focusTeam) {
  const content = document.getElementById('detailContent');
  if (!content) return;

  function rdRows(ms, lbl) {
    if (!ms || !ms.length) return '';
    const bodyId = `bdet-rd-${s.idx}-${lbl.replace(/\s+/g, '-')}`;
    let h = `<div class="sec acc-toggle" style="cursor:pointer" onclick="(function(h,id){const b=document.getElementById(id);b.classList.toggle('acc-closed');h.querySelector('.acc-arrow').classList.toggle('closed',b.classList.contains('acc-closed'))})(this,'${bodyId}')">` +
      `${lbl}<span class="acc-arrow" style="float:right">▾</span></div>` +
      `<div id="${bodyId}" class="fs-body" style="background:#fff;border:1px solid #e5e5e0;border-radius:10px;overflow:hidden;margin-bottom:8px">`;
    for (const m of ms) {
      if (!m) continue;
      const wA = m.w === m.a;
      const sub = m.pen ? ' pen.' + m.penA + '-' + m.penB : m.et ? ' ET' : '';
      h += `<div class="dmatch" onclick="openReportMatch(${s.idx},'${m.a}','${m.b}')" style="cursor:pointer">` +
        `<div style="font-weight:${wA ? 700 : 400};color:${wA ? '#1a1a1a' : '#bbb'}"${focusTeam === m.a ? " style='color:#9b74ff;font-weight:700'" : ''}>${flag(m.a)}&nbsp;${m.a}</div>` +
        `<div style="text-align:center;font-weight:700;font-size:13px">${m.sa}–${m.sb}<span style="font-size:10px;color:#aaa;font-weight:400">${sub}</span></div>` +
        `<div style="text-align:right;font-weight:${!wA ? 700 : 400};color:${!wA ? '#1a1a1a' : '#bbb'}"${focusTeam === m.b ? " style='color:#9b74ff;font-weight:700'" : ''}>${m.b}&nbsp;${flag(m.b)}</div></div>`;
    }
    return h + `</div>`;
  }

  let html = '';

  // Group standings
  html += `<div class="sec">Group Results</div><div class="gg" style="margin-bottom:14px">`;
  for (const gk of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    const gr = s.grpSt[gk]; if (!gr) continue;
    html += `<div class="gc"><div class="gch">Group ${gk}</div>`;
    gr.forEach((t, i) => html +=
      `<div class="gr" style="${i < 2 ? 'font-weight:500' : 'color:#888'}">` +
      `<span class="gn">${i + 1}</span><div class="gtm"><span>${flag(t.name)}</span><span${focusTeam === t.name ? " style='color:#9b74ff'" : ' '}>${t.name}</span></div>` +
      `<span class="num">${t.gf}</span><span class="num">${t.ga}</span>` +
      `<span class="num">${t.gf - t.ga > 0 ? '+' : ''}${t.gf - t.ga}</span><span class="num b">${t.pts}</span></div>`
    );
    html += `</div>`;
  }
  html += `</div>`;

  // Group matches — collapsible per group, compact single-line cards
  // Main header is itself clickable to batch-toggle all groups
  html += `<div class="sec acc-toggle" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between" onclick="(function(h,idx){` +
    `var allBodies=document.querySelectorAll('[id^=\\'bdet-gm-'+idx+'-\\']');` +
    `var allClosed=Array.from(allBodies).every(function(b){return b.classList.contains('acc-closed');});` +
    `allBodies.forEach(function(b){if(allClosed)b.classList.remove('acc-closed');else b.classList.add('acc-closed');});` +
    `var arrows=document.querySelectorAll('[data-gm-arrow=\\''+idx+'\\']');` +
    `arrows.forEach(function(a){a.classList.toggle('closed',!allClosed);});` +
    `h.querySelector('.acc-arrow').classList.toggle('closed',!allClosed);` +
  `})(this,${s.idx})">` +
  `<span>Group Matches</span><span class="acc-arrow">▾</span></div>`;
  for (const gk of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    const ms = s.grpMatches[gk];
    if (!ms || !ms.length) continue;
    const bodyId = `bdet-gm-${s.idx}-${gk}`;
    html += `<div style="margin-bottom:3px">` +
      `<div class="rl acc-toggle" style="font-size:11px;padding:4px 10px" onclick="(function(h,id){const b=document.getElementById(id);b.classList.toggle('acc-closed');h.querySelector('.acc-arrow').classList.toggle('closed',b.classList.contains('acc-closed'))})(this,'${bodyId}')">` +
      `<span>Group ${gk}</span><span class="acc-arrow" data-gm-arrow="${s.idx}">▾</span></div>` +
      `<div id="${bodyId}" class="fs-body" style="background:#fff;border:1px solid #e5e5e0;border-radius:0 0 8px 8px;overflow:hidden">`;
    for (const m of ms) {
      const wA = m.sa > m.sb;
      const hiA = focusTeam === m.a ? 'color:#9b74ff;font-weight:700' : `font-weight:${wA ? 700 : 400};color:${wA ? '#1a1a1a' : '#bbb'}`;
      const hiB = focusTeam === m.b ? 'color:#9b74ff;font-weight:700' : `font-weight:${!wA && m.sa !== m.sb ? 700 : 400};color:${!wA && m.sa !== m.sb ? '#1a1a1a' : '#bbb'}`;
      html += `<div class="dmatch" onclick="openReportMatch(${s.idx},'${m.a}','${m.b}')" style="cursor:pointer">` +
        `<div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${hiA}">${flag(m.a)}&nbsp;${m.a}</div>` +
        `<div style="text-align:center;font-weight:700;white-space:nowrap">${m.sa}–${m.sb}</div>` +
        `<div style="text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${hiB}">${m.b}&nbsp;${flag(m.b)}</div></div>`;
    }
    html += `</div></div>`;
  }

  html += rdRows(s.r32, 'R32') + rdRows(s.r16, 'R16') + rdRows(s.qf, 'QF') + rdRows(s.sf, 'Semi-Final');
  if (s.third) html += rdRows([s.third], '3rd Place');
  html += rdRows(s.fin, 'Final');

  // Top scorers
  const scorers = Object.entries(s.playerStats).filter(([, p]) => p.goals > 0).sort((a, b) => b[1].goals - a[1].goals).slice(0, 10);
  if (scorers.length) {
    html += `<div class="sec">Top Scorers</div><div style="background:#fff;border:1px solid #e5e5e0;border-radius:10px;overflow:hidden">`;
    scorers.forEach(([nm, ps], i) => html +=
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 12px;border-bottom:1px solid #f5f5f3;font-size:12px">` +
      `<div style="display:flex;align-items:center;gap:6px"><span style="color:#aaa;font-size:11px;min-width:18px">${i + 1}</span>${ps.flag || ''}${nm}</div>` +
      `<span style="font-weight:700">${ps.goals} goals${ps.assists > 0 ? ' ' + ps.assists + ' assists' : ''}</span></div>`
    );
    html += `</div>`;
  }

  content.innerHTML = html;
}

// ── Navigation helpers ────────────────────────────────────────────────────────

export function closeDetail() {
  document.getElementById('browserDetail').style.display = 'none';
  document.getElementById('browserMain').style.display = 'block';
}

export function openSimById(idx) {
  const s = state.SIMS.find(x => x.idx === idx);
  if (!s) return;
  state.filtered = [s]; state.page = 0; state._muf = null;
  document.getElementById('fTeam').value = '';
  document.getElementById('fStage').value = '';
  document.getElementById('fCount').innerHTML = `<b>1</b> sims — #${idx}`;
  renderList();
  window.nav('browser');
  closeDetail();
  showDetail(s, '');
}

export function filterAndGo(name) {
  document.getElementById('fTeam').value = name;
  document.getElementById('fStage').value = 'Champion';
  applyFilter();
  window.nav('browser');
}

export function openRecordMatch(simIdx, nameA, nameB) {
  if (!nameA || !nameB) { openSimById(simIdx); return; }
  document.getElementById('modalTitle').textContent = `Sim #${simIdx} — computing...`;
  document.getElementById('modalBody').innerHTML = `<div style="padding:20px;text-align:center;color:#888"><span class="sp"></span></div>`;
  document.getElementById('modal').style.display = 'flex';
  setTimeout(() => {
    const detailed = rerunDetailed(simIdx);
    window._reportSim = { idx: simIdx, s: detailed };
    const allMs = [
      ...Object.values(detailed.grpMatches).flat(),
      ...detailed.r32, ...detailed.r16, ...detailed.qf, ...detailed.sf,
      ...(detailed.third ? [detailed.third] : []),
      ...detailed.fin,
    ].filter(Boolean);
    const m = allMs.find(m => m.a === nameA && m.b === nameB);
    if (m) openMatchModal(m, '', simIdx);
    else buildFullReportModal(detailed, simIdx);
  }, 30);
}
