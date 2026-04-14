// ── Fixture Panel ────────────────────────────────────────────────────────────
// Draws all match results from the last simulation across all rounds.

import { flag } from '../../lib/engine.js';
import { state } from '../state.js';
import { tTeam } from '../../lib/i18n.js';

export function drawFixture() {
  const { LAST } = state;
  const el = document.getElementById('fixtureEl');
  el.innerHTML = '<div class="note">ℹ Last simulation matches · Click → full report</div>';


  const allMs = [
    ...Object.entries(LAST.grpMatches).flatMap(([gk, ms]) => ms.map(m => ({ ...m, round: 'Group', tag: 'Grp ' + gk, grpKey: gk }))),
    ...LAST.r32.map(m => ({ ...m, round: 'Round of 32' })),
    ...LAST.r16.map(m => ({ ...m, round: 'Round of 16' })),
    ...LAST.qf.map(m  => ({ ...m, round: 'Quarter-Final' })),
    ...LAST.sf.map(m  => ({ ...m, round: 'Semi-Final' })),
    ...(LAST.third ? [{ ...LAST.third, round: '3rd Place Match' }] : []),
    ...LAST.fin.map(m => ({ ...m, round: 'Final' })),
  ].filter(Boolean);

  // Group-round sections get alternating zebra classes so CSS can stripe them
  const GRP_KEYS_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  for (const rnd of ['Group', 'Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', '3rd Place Match', 'Final']) {
    if (rnd === 'Group') {
      // Render one section per group with alternating zebra class
      for (let gi = 0; gi < GRP_KEYS_ORDER.length; gi++) {
        const gk = GRP_KEYS_ORDER[gi];
        const ms = allMs.filter(m => m.grpKey === gk);
        if (!ms.length) continue;

        const sec = document.createElement('div');
        sec.className = 'fs' + (gi % 2 === 1 ? ' fs-even' : '');

        const rl = document.createElement('div');
        rl.className = 'rl';
        rl.textContent = `Group ${gk}`;
        sec.appendChild(rl);

        for (const m of ms) {
          const wA = m.w === m.a;
          let sub = '';
          if (m.pen) sub = 'pen. ' + m.penA + '-' + m.penB;
          else if (m.et) sub = 'AET';

          const tag = m.tag ? `<span class="sct">${m.tag}</span>` : '';

          const card = document.createElement('div');
          card.className = 'mc';
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
      continue;
    }

    const ms = allMs.filter(m => m.round === rnd);
    if (!ms.length) continue;

    const sec = document.createElement('div');
    sec.className = 'fs';
    sec.innerHTML = `<div class="rl">${rnd}</div>`;

    for (const m of ms) {
      const wA = m.w === m.a;
      let sub = '';
      if (m.pen) sub = 'pen. ' + m.penA + '-' + m.penB;
      else if (m.et) sub = 'AET';

      const card = document.createElement('div');
      card.className = 'mc';
      card.innerHTML =
        `<div class="mta ${wA ? 'W' : 'L'}"><span onclick="event.stopPropagation();goJourney('${m.a}')" style="cursor:pointer">${flag(m.a)}</span><span data-team="${m.a}" onclick="event.stopPropagation();goJourney('${m.a}')">${tTeam(m.a)}</span></div>` +
        `<div class="scc"><div class="scb">${m.sa}–${m.sb}</div>${sub ? `<div class="scs">${sub}</div>` : ''}</div>` +
        `<div class="mtb ${!wA ? 'W' : 'L'}"><span data-team="${m.b}" onclick="event.stopPropagation();goJourney('${m.b}')">${tTeam(m.b)}</span><span onclick="event.stopPropagation();goJourney('${m.b}')" style="cursor:pointer">${flag(m.b)}</span></div>`;

      const _m = m;
      card.onclick = () => window.openMatchModal(_m, rnd);
      sec.appendChild(card);
    }
    el.appendChild(sec);
  }
}
