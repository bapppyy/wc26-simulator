// ── Squads Panel ──────────────────────────────────────────────────────────────
// Renders all 48 team squads grouped by FIFA group.

import { DATA } from '../../lib/data.js';
import { GKEYS } from '../../lib/constants.js';

export function drawSquads() {
  const el = document.getElementById('squadsEl');
  if (!el) return;

  const posLabel = p => p ? ({ 1: 'GK', 2: 'DF', 3: 'OS', 4: 'FW' })[p[0]] || '?' : '?';
  const posOrder = { '1': 0, '2': 1, '3': 2, '4': 3 };

  let html = '';
  for (const gk of GKEYS) {
    const teams = Object.entries(DATA)
      .filter(([, d]) => d.g === gk)
      .map(([n, d]) => ({ name: n, ...d }));

    html += `<div class="sec">Group ${gk}</div><div class="squad-group-grid">`;
    for (const team of teams) {
      const sorted = [...team.p].sort((a, b) => {
        const pa = posOrder[a.p ? a.p[0] : '9'] ?? 9;
        const pb = posOrder[b.p ? b.p[0] : '9'] ?? 9;
        return pa !== pb ? pa - pb : b.o - a.o;
      });
      html +=
        `<div class="squad-team-card">` +
        `<div class="squad-team-hdr" onclick="goJourney('${team.name}')" style="cursor:pointer">` +
        `<span style="font-size:18px">${team.f}</span>` +
        `<span style="font-weight:700;font-size:13px">${team.name}</span>` +
        `<span class="gb">${gk}</span>` +
        `<span style="font-size:11px;color:#aaa;margin-left:auto">OVR ${team.ovr}</span>` +
        `</div>` +
        `<div class="squad-team-players">` +
        sorted.map(p =>
          `<div class="squad-pl ${p.r === 0 ? 'spl-star' : p.r === 1 ? 'spl-as' : 'spl-yedek'}">` +
          `<span class="spl-pos">${posLabel(p.p)}</span>` +
          `<span class="spl-name">${p.n || ''}</span>` +
          `<span class="spl-ovr">${p.o}${p.r === 0 ? '★' : ''}</span>` +
          `</div>`
        ).join('') +
        `</div></div>`;
    }
    html += `</div>`;
  }
  el.innerHTML = html;
}
