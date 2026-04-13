// ── Groups Panel ─────────────────────────────────────────────────────────────
// Draws the 12-group standings grid from the last simulation.

import { flag } from '../../lib/engine.js';
import { DATA } from '../../lib/data.js';
import { GKEYS } from '../../lib/constants.js';
import { state } from '../state.js';
import { tTeam } from '../../lib/i18n.js';

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
    c.innerHTML =
      `<div class="gch"><span>Group ${gk}</span><span>${st.map(x => flag(x.name)).join('')}</span></div>` +
      `<div class="gch2"><span></span><span>Team</span><span>GF</span><span>GA</span><span>GD</span><span>P</span></div>`;

    st.forEach((t, i) => {
      const cls = i === 0 ? 'q1' : i === 1 ? 'q2' : (i === 2 && top8grps.has(gk)) ? 'q3' : '';
      const gd = t.gf - t.ga;
      c.innerHTML +=
        `<div class="gr ${cls}" onclick="goJourney('${t.name}')"><span class="gn">${i + 1}</span>` +
        `<div class="gtm"><span>${flag(t.name)}</span><span data-team="${t.name}">${tTeam(t.name)}</span></div>` +
        `<span class="num">${t.gf}</span><span class="num">${t.ga}</span>` +
        `<span class="num">${gd > 0 ? '+' : ''}${gd}</span><span class="num b">${t.pts}</span></div>`;
    });

    const td = st.map(x => DATA[x.name]).filter(Boolean);
    c.innerHTML +=
      `<div class="gpwr">` +
      `<span>DF:${(td.reduce((s, t) => s + t.df, 0) / td.length).toFixed(1)}</span>` +
      `<span>MF:${(td.reduce((s, t) => s + t.mf, 0) / td.length).toFixed(1)}</span>` +
      `<span>FW:${(td.reduce((s, t) => s + t.fw, 0) / td.length).toFixed(1)}</span></div>`;

    wrap.appendChild(c);
  }
  el.appendChild(wrap);
}
