// ── Bracket Panel ─────────────────────────────────────────────────────────────
// Draws the symmetrical FIFA-style knockout bracket and Annex C panel.
// Left wing: R32→R16→QF→SF converging right; right wing mirrors left.
// Bracket order respects official skip-one pairing (R16_PAIRS / QF_PAIRS).

import { flag } from '../../lib/engine.js';
import { state } from '../state.js';
import { tTeam } from '../../lib/i18n.js';

export function drawBracket() {
  drawAnnexPanel();
  const { LAST } = state;
  const el = document.getElementById('bracketEl');
  el.innerHTML = '';
  if (!LAST) return;

  const r32 = LAST.r32 || [];
  const r16 = LAST.r16 || [];
  const qf  = LAST.qf  || [];
  const sf  = LAST.sf  || [];
  const fin = LAST.fin || [];

  // ── R32 origin/seed lookup ────────────────────────────────────────────────
  // Build a map from team name → seed label ("1E", "2A", "3B", …)
  // using grpSt from the last simulation.
  const seedMap = {};
  if (LAST.grpSt) {
    for (const [gk, st] of Object.entries(LAST.grpSt)) {
      if (st[0]) seedMap[st[0].name] = `1${gk}`;
      if (st[1]) seedMap[st[1].name] = `2${gk}`;
      if (st[2]) seedMap[st[2].name] = `3${gk}`;
    }
  }

  // ── Match card builder ──────────────────────────────────────────────────────
  function matchCard(m, extraCls, showSeeds) {
    if (!m) {
      const ph = document.createElement('div');
      ph.className = 'bkt-match bkt-placeholder';
      return ph;
    }
    const wA = m.w === m.a;
    const div = document.createElement('div');
    div.className = 'bkt-match' + (extraCls ? ' ' + extraCls : '');

    const seedA = showSeeds && seedMap[m.a] ? `<span class="bkt-seed">${seedMap[m.a]}</span>` : '';
    const seedB = showSeeds && seedMap[m.b] ? `<span class="bkt-seed">${seedMap[m.b]}</span>` : '';

    div.innerHTML =
      `<div class="bkt-team ${wA ? 'W' : 'L'}" data-team="${m.a}">${flag(m.a)}<span>${tTeam(m.a)}</span>${seedA}<span class="bkt-sc">${m.sa}</span></div>` +
      `<div class="bkt-team ${!wA ? 'W' : 'L'}" data-team="${m.b}">${flag(m.b)}<span>${tTeam(m.b)}</span>${seedB}<span class="bkt-sc">${m.sb}</span></div>` +
      (m.pen ? `<div class="bkt-sub">pen.${m.penA}–${m.penB}</div>` : m.et ? `<div class="bkt-sub">AET</div>` : '');
    const _m = m;
    div.onclick = () => window.openMatchModal(_m);
    return div;
  }

  // ── Round column builder ────────────────────────────────────────────────────
  function makeCol(matches, label, showSeeds) {
    const wrap = document.createElement('div');
    wrap.className = 'bkt-col-wrap';

    const lbl = document.createElement('div');
    lbl.className = 'bkt-rnd-lbl';
    lbl.textContent = label;
    wrap.appendChild(lbl);

    const inner = document.createElement('div');
    inner.className = 'bkt-col-inner';
    for (const m of matches) inner.appendChild(matchCard(m, null, showSeeds));
    wrap.appendChild(inner);
    return wrap;
  }

  // ── Bracket ordering ────────────────────────────────────────────────────────
  // Official skip-one pairing (R16_PAIRS = [[0,2],[1,3],[4,6],[5,7],[8,10],[9,11],[12,14],[13,15]])
  // QF_PAIRS = [[0,2],[1,3],[4,6],[5,7]]
  //
  // For space-around alignment to center each parent between its two children,
  // the column order must be: pairs that feed a single next-round match must be
  // adjacent. This requires the following non-obvious ordering:
  //
  // Left R16:  [r16[0], r16[1], r16[2], r16[3]]  → QF[0]=r16[0]+r16[1], QF[1]=r16[2]+r16[3]
  // Left R32:  [0,2, 1,3, 4,6, 5,7]              → feeds r16[0], r16[1], r16[2], r16[3]
  //
  // Right wing uses flex-direction:row-reverse so visual order is already flipped.
  // Right R32 uses CONSECUTIVE pairing: 8,9 → r16[4]; 10,11 → r16[5]; 12,13 → r16[6]; 14,15 → r16[7]
  // Right R16:  [r16[4], r16[5], r16[6], r16[7]]  → QF[2]=r16[4]+r16[5], QF[3]=r16[6]+r16[7]
  // Right QF:   [qf[2], qf[3]]                    → SF[1] = winner QF[2] vs QF[3]

  const leftR32  = [r32[0], r32[1], r32[2], r32[3], r32[4], r32[5], r32[6], r32[7]];
  const leftR16  = [r16[0], r16[1], r16[2], r16[3]];
  const leftQF   = [qf[0], qf[1]];
  const leftSF   = [sf[0]];

  // Right wing — sequential top-to-bottom ordering; row-reverse handles the visual flip
  // rightR32:  81,82, 83,84, 85,86, 87,88  → feeds r16[4], r16[5], r16[6], r16[7]
  // rightR16:  [r16[4], r16[5], r16[6], r16[7]]  → QF[2]=r16[4]+r16[5], QF[3]=r16[6]+r16[7]
  // rightQF:   [qf[2], qf[3]]
  const rightSF  = [sf[1]];
  const rightQF  = [qf[2], qf[3]];
  const rightR16 = [r16[4], r16[5], r16[6], r16[7]];
  const rightR32 = [r32[8], r32[9], r32[15], r32[12], r32[11], r32[10], r32[13], r32[14]];

  // ── Build tree ──────────────────────────────────────────────────────────────
  const tree = document.createElement('div');
  tree.className = 'bkt-tree';

  // Left wing
  const leftWing = document.createElement('div');
  leftWing.className = 'bkt-wing bkt-wing-l';
  leftWing.appendChild(makeCol(leftR32, 'R32', true));
  leftWing.appendChild(makeCol(leftR16, 'R16'));
  leftWing.appendChild(makeCol(leftQF,  'QF'));
  leftWing.appendChild(makeCol(leftSF,  'Semi-Final'));

  // Spine (Final + Champion + 3rd Place)
  const spine = document.createElement('div');
  spine.className = 'bkt-spine';

  const finalWrap = document.createElement('div');
  finalWrap.className = 'bkt-final-wrap';

  const finLbl = document.createElement('div');
  finLbl.className = 'bkt-rnd-lbl';
  finLbl.style.cssText = 'margin-bottom:5px;border-radius:5px;width:100%;border:1px solid #e5e5e0';
  finLbl.textContent = 'Final';
  finalWrap.appendChild(finLbl);

  if (fin[0]) finalWrap.appendChild(matchCard(fin[0], 'bkt-final-match'));

  if (LAST.champion) {
    const champ = document.createElement('div');
    champ.className = 'bkt-champ';
    champ.innerHTML =
      `<div style="font-size:26px">${flag(LAST.champion)}</div>` +
      `<div class="bkt-champ-name">${tTeam(LAST.champion)}</div>` +
      `<div class="bkt-champ-lbl">🏆 World Champion</div>`;
    finalWrap.appendChild(champ);
  }

  if (LAST.third) {
    const thirdWrap = document.createElement('div');
    thirdWrap.className = 'bkt-3rd-wrap';
    const thirdLbl = document.createElement('div');
    thirdLbl.className = 'bkt-3rd-lbl';
    thirdLbl.textContent = '3rd Place';
    thirdWrap.appendChild(thirdLbl);
    thirdWrap.appendChild(matchCard(LAST.third));
    finalWrap.appendChild(thirdWrap);
  }

  spine.appendChild(finalWrap);

  // Right wing — appended R32→SF so row-reverse places R32 on far right, SF adjacent to spine
  const rightWing = document.createElement('div');
  rightWing.className = 'bkt-wing bkt-wing-r';
  rightWing.appendChild(makeCol(rightR32, 'R32', true));
  rightWing.appendChild(makeCol(rightR16, 'R16'));
  rightWing.appendChild(makeCol(rightQF,  'QF'));
  rightWing.appendChild(makeCol(rightSF,  'Semi-Final'));

  tree.appendChild(leftWing);
  tree.appendChild(spine);
  tree.appendChild(rightWing);
  el.appendChild(tree);
}

export function drawAnnexPanel() {
  const { LAST } = state;
  const el = document.getElementById('annexPanel');
  if (!LAST || !LAST.annexC) { el.innerHTML = ''; return; }

  const ac = LAST.annexC;
  const key = LAST.top8Key;
  const advancing = key.split('');

  let html =
    `<div class="annex-panel"><div class="annex-title">3rd Place Scenario for this Sim — Annex C/${key}</div>` +
    `<div style="font-size:11px;color:#888;margin-bottom:7px">Qualifying 3rd Place Teams: ` +
    advancing.map(g =>
      `<span class="gb">${g}: ${flag(LAST.grpSt[g][2]?.name)}${LAST.grpSt[g][2]?.name || '?'}</span>`
    ).join(' ') +
    `</div><div class="annex-title">R32 Dynamic Matchups</div><div class="annex-grid">`;

  for (const [first, third] of Object.entries(ac)) {
    const firstName = LAST.grpSt[first]?.[0]?.name || '?';
    const thirdName = LAST.grpSt[third]?.[2]?.name || '?';
    html +=
      `<div class="annex-item" onclick="goJourney('${firstName}')" style="cursor:pointer">` +
      `<span class="annex-lbl">1${first}</span>` +
      `<span class="annex-val">${flag(firstName)}${firstName.substring(0, 7)}</span>` +
      `<span style="color:#aaa;font-size:10px">vs</span>` +
      `<span class="annex-val">${flag(thirdName)}${thirdName.substring(0, 7)}</span>` +
      `<span class="annex-lbl">3${third}</span></div>`;
  }
  html += `</div></div>`;
  el.innerHTML = html;
}
