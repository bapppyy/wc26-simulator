// ── Fixture Panel ────────────────────────────────────────────────────────────
// Draws all match results from the last simulation across all rounds.
// Each round section is collapsible. Default: Group + R32 + R16 closed;
// QF / SF / 3rd / Final open (most relevant stages surfaced immediately).

import { flag } from '../../lib/engine.js';
import { state } from '../state.js';
import { tTeam, t } from '../../lib/i18n.js';

// Rounds that start expanded (English keys — internal only)
const OPEN_ROUNDS = new Set(['Quarter-Final', 'Semi-Final', '3rd Place Match', 'Final']);

// Map internal round keys → translation keys
const ROUND_I18N = {
  'Round of 32':    'round.r32',
  'Round of 16':    'round.r16',
  'Quarter-Final':  'round.qf',
  'Semi-Final':     'round.sf',
  '3rd Place Match':'round.third',
  'Final':          'round.final',
};

function makeSection(labelText, isEvenGroup, isOpen) {
  const sec = document.createElement('div');
  sec.className = isEvenGroup ? 'fs fs-even' : 'fs';

  // ── Toggle header ─────────────────────────────────────────────────────────
  const rl = document.createElement('div');
  rl.className = 'rl acc-toggle';

  const labelSpan = document.createElement('span');
  labelSpan.textContent = labelText;

  const arrow = document.createElement('span');
  arrow.className = 'acc-arrow' + (isOpen ? '' : ' closed');
  arrow.textContent = '▾';

  rl.appendChild(labelSpan);
  rl.appendChild(arrow);
  sec.appendChild(rl);

  // ── Collapsible body ──────────────────────────────────────────────────────
  const body = document.createElement('div');
  body.className = 'fs-body' + (isOpen ? '' : ' acc-closed');

  rl.onclick = () => {
    const nowClosed = body.classList.toggle('acc-closed');
    arrow.classList.toggle('closed', nowClosed);
  };

  sec.appendChild(body);
  return { sec, body };
}

function buildMatchCard(m, rnd, showTag) {
  const wA = m.w === m.a;
  let sub = '';
  if (m.pen) sub = 'pen. ' + m.penA + '-' + m.penB;
  else if (m.et) sub = 'AET';

  const tag = showTag && m.tag ? `<span class="sct">${m.tag}</span>` : '';

  const card = document.createElement('div');
  card.className = 'mc';
  card.innerHTML =
    `<div class="mta ${wA ? 'W' : 'L'}">` +
      `<span onclick="event.stopPropagation();goJourney('${m.a}')" style="cursor:pointer">${flag(m.a)}</span>` +
      `<span data-team="${m.a}" onclick="event.stopPropagation();goJourney('${m.a}')">${tTeam(m.a)}</span>` +
    `</div>` +
    `<div class="scc">${tag}<div class="scb">${m.sa}–${m.sb}</div>${sub ? `<div class="scs">${sub}</div>` : ''}</div>` +
    `<div class="mtb ${!wA ? 'W' : 'L'}">` +
      `<span data-team="${m.b}" onclick="event.stopPropagation();goJourney('${m.b}')">${tTeam(m.b)}</span>` +
      `<span onclick="event.stopPropagation();goJourney('${m.b}')" style="cursor:pointer">${flag(m.b)}</span>` +
    `</div>`;

  const _m = m;
  card.onclick = () => window.openMatchModal(_m, rnd);
  return card;
}

export function drawFixture() {
  const { LAST } = state;
  const el = document.getElementById('fixtureEl');
  el.innerHTML = `<div class="note">${t('fixture.note')}</div>`;

  const allMs = [
    ...Object.entries(LAST.grpMatches).flatMap(([gk, ms]) =>
      ms.map(m => ({ ...m, round: 'Group', tag: 'Grp ' + gk, grpKey: gk }))),
    ...LAST.r32.map(m  => ({ ...m, round: 'Round of 32' })),
    ...LAST.r16.map(m  => ({ ...m, round: 'Round of 16' })),
    ...LAST.qf.map(m   => ({ ...m, round: 'Quarter-Final' })),
    ...LAST.sf.map(m   => ({ ...m, round: 'Semi-Final' })),
    ...(LAST.third ? [{ ...LAST.third, round: '3rd Place Match' }] : []),
    ...LAST.fin.map(m  => ({ ...m, round: 'Final' })),
  ].filter(Boolean);

  const GRP_KEYS_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  for (const rnd of ['Group', 'Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', '3rd Place Match', 'Final']) {
    if (rnd === 'Group') {
      for (let gi = 0; gi < GRP_KEYS_ORDER.length; gi++) {
        const gk = GRP_KEYS_ORDER[gi];
        const ms = allMs.filter(m => m.grpKey === gk);
        if (!ms.length) continue;

        const { sec, body } = makeSection(`${t('round.group')} ${gk}`, gi % 2 === 1, false);
        for (const m of ms) body.appendChild(buildMatchCard(m, rnd, true));
        el.appendChild(sec);
      }
      continue;
    }

    const ms = allMs.filter(m => m.round === rnd);
    if (!ms.length) continue;

    const label = ROUND_I18N[rnd] ? t(ROUND_I18N[rnd]) : rnd;
    const { sec, body } = makeSection(label, false, OPEN_ROUNDS.has(rnd));
    for (const m of ms) body.appendChild(buildMatchCard(m, rnd, false));
    el.appendChild(sec);
  }
}
