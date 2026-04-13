// ── Fixture Panel ────────────────────────────────────────────────────────────
// Draws all match results from the last simulation across all rounds.

import { flag } from '../../lib/engine.js';
import { state } from '../state.js';
import { tTeam } from '../../lib/i18n.js';

export function drawFixture() {
  const { LAST } = state;
  const el = document.getElementById('fixtureEl');
  el.innerHTML = '<div class="note">ℹ Last simulation matches · Click → full report</div>';

  const grpBg = {
    A: '#fff', B: '#e4e8f0', C: '#fff', D: '#e4e8f0',
    E: '#fff', F: '#e4e8f0', G: '#fff', H: '#e4e8f0',
    I: '#fff', J: '#e4e8f0', K: '#fff', L: '#e4e8f0',
  };

  const allMs = [
    ...Object.entries(LAST.grpMatches).flatMap(([gk, ms]) => ms.map(m => ({ ...m, round: 'Group', tag: 'Grp ' + gk, grpKey: gk }))),
    ...LAST.r32.map(m => ({ ...m, round: 'Round of 32' })),
    ...LAST.r16.map(m => ({ ...m, round: 'Round of 16' })),
    ...LAST.qf.map(m  => ({ ...m, round: 'Quarter-Final' })),
    ...LAST.sf.map(m  => ({ ...m, round: 'Semi-Final' })),
    ...(LAST.third ? [{ ...LAST.third, round: '3rd Place Match' }] : []),
    ...LAST.fin.map(m => ({ ...m, round: 'Final' })),
  ].filter(Boolean);

  for (const rnd of ['Group', 'Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', '3rd Place Match', 'Final']) {
    const ms = allMs.filter(m => m.round === rnd);
    if (!ms.length) continue;

    const sec = document.createElement('div');
    sec.className = 'fs';
    sec.innerHTML = `<div class="rl">${rnd === 'Group' ? 'Group Stage (' + ms.length + ' matches)' : rnd}</div>`;

    for (const m of ms) {
      const wA = m.w === m.a;
      let sub = '';
      if (m.pen) sub = 'pen. ' + m.penA + '-' + m.penB;
      else if (m.et) sub = 'AET';

      const tag = m.tag ? `<span class="sct">${m.tag}</span>` : '';
      const bg = m.grpKey ? (grpBg[m.grpKey] || '#fff') : '#fff';

      const card = document.createElement('div');
      card.className = 'mc';
      card.style.background = bg;
      card.style.borderColor = bg === '#fff' ? '#e5e5e0' : '#cdd3de';
      card.innerHTML =
        `<div class="mta ${wA ? 'W' : 'L'}"><span onclick="event.stopPropagation();goJourney('${m.a}')" style="cursor:pointer">${flag(m.a)}</span><span data-team="${m.a}" onclick="event.stopPropagation();goJourney('${m.a}')">${tTeam(m.a)}</span></div>` +
        `<div class="scc">${tag}<div class="scb">${m.sa}–${m.sb}</div>${sub ? `<div class="scs">${sub}</div>` : ''}</div>` +
        `<div class="mtb ${!wA ? 'W' : 'L'}"><span data-team="${m.b}" onclick="event.stopPropagation();goJourney('${m.b}')">${tTeam(m.b)}</span><span onclick="event.stopPropagation();goJourney('${m.b}')" style="cursor:pointer">${flag(m.b)}</span></div>`;

      const _m = m;
      card.onclick = () => window.openMatchModal(_m, rnd);
      sec.appendChild(card);
    }
    el.appendChild(sec);
  }
}
