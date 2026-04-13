// ── Bracket Panel ─────────────────────────────────────────────────────────────
// Draws the knockout bracket columns and the Annex C third-place scenario panel.

import { flag } from '../../lib/engine.js';
import { state } from '../state.js';
import { tTeam } from '../../lib/i18n.js';

export function drawBracket() {
  drawAnnexPanel();
  const { LAST } = state;
  const el = document.getElementById('bracketEl');
  el.innerHTML = '';

  const rounds = [
    { label: 'R32 Left (1-8)',   ms: LAST.r32.slice(0, 8) },
    { label: 'R32 Right (9-16)', ms: LAST.r32.slice(8, 16) },
    { label: 'Round of 16',      ms: LAST.r16 },
    { label: 'Quarter-Final',    ms: LAST.qf },
    { label: 'Semi-Final',       ms: LAST.sf },
    { label: 'Final',            ms: LAST.fin },
  ];

  for (const rd of rounds) {
    const col = document.createElement('div');
    col.className = 'bcol';
    col.innerHTML = `<div class="bch">${rd.label}</div>`;
    for (const m of rd.ms) {
      if (!m) continue;
      const wA = m.w === m.a;
      const box = document.createElement('div');
      box.className = 'bm';
      box.innerHTML =
        `<div class="bt ${wA ? 'W' : 'L'}" data-team="${m.a}">${flag(m.a)}${tTeam(m.a)}<span>${m.sa}</span></div>` +
        `<div class="bt ${!wA ? 'W' : 'L'}" data-team="${m.b}">${flag(m.b)}${tTeam(m.b)}<span>${m.sb}</span></div>` +
        (m.pen ? `<div class="bsub">pen.${m.penA}-${m.penB}</div>` : m.et ? `<div class="bsub">AET</div>` : '');
      const _m = m;
      box.onclick = () => window.openMatchModal(_m);
      col.appendChild(box);
    }
    el.appendChild(col);
  }

  // 3rd Place + Champion column
  const extra = document.createElement('div');
  extra.className = 'bcol';
  extra.innerHTML = '<div class="bch">🏆 & 3rd Place</div>';

  if (LAST.third) {
    const t = LAST.third, wA = t.w === t.a;
    const box = document.createElement('div');
    box.innerHTML =
      `<div style="padding:5px 6px"><div style="font-size:10px;color:#aaa;margin-bottom:3px;font-weight:700">3rd Place</div>` +
      `<div class="bm">` +
      `<div class="bt ${wA ? 'W' : 'L'}" data-team="${t.a}">${flag(t.a)}${tTeam(t.a)}<span>${t.sa}</span></div>` +
      `<div class="bt ${!wA ? 'W' : 'L'}" data-team="${t.b}">${flag(t.b)}${tTeam(t.b)}<span>${t.sb}</span></div>` +
      (t.pen ? `<div class="bsub">pen.${t.penA}-${t.penB}</div>` : t.et ? `<div class="bsub">AET</div>` : '') +
      `</div></div>`;
    const _t = LAST.third;
    box.querySelector('.bm').onclick = () => window.openMatchModal(_t);
    extra.appendChild(box);
  }

  const champ = document.createElement('div');
  champ.style.cssText = 'padding:14px 8px;text-align:center';
  champ.innerHTML =
    `<div style="font-size:28px">${flag(LAST.champion)}</div>` +
    `<div style="font-size:13px;font-weight:700;margin-top:6px">${tTeam(LAST.champion)}</div>` +
    `<div style="font-size:11px;color:#888;margin-top:3px">World Champion</div>`;
  extra.appendChild(champ);
  el.appendChild(extra);
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
