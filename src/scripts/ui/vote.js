// ── Community Vote Panel ──────────────────────────────────────────────────────
// Renders per-team rating sliders and vote submission buttons.

import { DATA } from '../../lib/data.js';
import { GKEYS } from '../../lib/constants.js';
import { flagHtml } from '../../lib/flagSvg.js';
import { tTeam } from '../../lib/i18n.js';

export function drawVote() {
  const el = document.getElementById('voteEl');
  if (!el) return;

  el.innerHTML = '';
  for (const gk of GKEYS) {
    const grpDiv = document.createElement('div');
    grpDiv.className = 'vote-group';

    const grpHdr = document.createElement('div');
    grpHdr.className = 'vote-grp-hdr';
    grpHdr.textContent = 'Group ' + gk;
    grpDiv.appendChild(grpHdr);

    const names = Object.keys(DATA);
    for (const name of names) {
      const d = DATA[name];
      if (d.g !== gk) continue;

      const safeId = name.replace(/[^a-zA-Z0-9]/g, '_');
      const card = document.createElement('div');
      card.className = 'vote-card';

      // Header
      const hdr = document.createElement('div');
      hdr.className = 'vote-card-hdr';
      const fl = document.createElement('span');
      fl.className = 'vote-flag'; fl.innerHTML = flagHtml(name, d.f);
      const nm = document.createElement('span');
      nm.className = 'vote-name'; nm.textContent = tTeam(name);
      hdr.appendChild(fl); hdr.appendChild(nm);
      card.appendChild(hdr);

      // Sliders
      const sls = document.createElement('div');
      sls.className = 'vote-sliders';
      const fields = [['DF', Math.round(d.df), '#9b74ff'], ['MF', Math.round(d.mf), '#8b5cf6'], ['FW', Math.round(d.fw), '#f59e0b']];

      for (const [fname, fval, fcol] of fields) {
        const row = document.createElement('div'); row.className = 'vote-sl-row';
        const lbl = document.createElement('span'); lbl.className = 'vote-sl-lbl'; lbl.style.color = fcol; lbl.textContent = fname;
        const sl  = document.createElement('input'); sl.type = 'range'; sl.min = 40; sl.max = 100; sl.value = fval;
        sl.className = 'vote-sl'; sl.id = `vsl_${safeId}_${fname}`; sl.style.accentColor = fcol;
        const vspan = document.createElement('span'); vspan.className = 'vote-sl-val';
        vspan.id = `vsv_${safeId}_${fname}`; vspan.textContent = fval;
        (function(slEl, vEl) { slEl.addEventListener('input', function() { vEl.textContent = slEl.value; }); })(sl, vspan);
        row.appendChild(lbl); row.appendChild(sl); row.appendChild(vspan); sls.appendChild(row);
      }
      card.appendChild(sls);

      // Vote + Reset buttons
      const btn = document.createElement('button');
      btn.className = 'vote-submit'; btn.textContent = 'Vote';

      const resetBtn = document.createElement('button');
      resetBtn.className = 'vote-reset';
      resetBtn.textContent = 'Reset';
      resetBtn.style.cssText = 'font-size:12px;padding:5px 12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;color:#888;font-family:inherit';
      resetBtn.onmouseover = () => { resetBtn.style.background = '#f0f0ee'; };
      resetBtn.onmouseout  = () => { resetBtn.style.background = '#fff'; };

      (function(tname, tSafeId, tBtn, tReset, initDf, initMf, initFw) {
        tBtn.addEventListener('click', function() {
          const df = parseInt(document.getElementById(`vsl_${tSafeId}_DF`).value);
          const mf = parseInt(document.getElementById(`vsl_${tSafeId}_MF`).value);
          const fw = parseInt(document.getElementById(`vsl_${tSafeId}_FW`).value);
          console.log(tname + ' votes:', { DF: df, MF: mf, FW: fw });
          alert(tname + ' votes saved!');
          tBtn.textContent = 'Saved ✓'; tBtn.classList.add('vote-submitted');
        });
        tReset.addEventListener('click', function() {
          ['DF', 'MF', 'FW'].forEach((f, i) => {
            const val = [initDf, initMf, initFw][i];
            const sl = document.getElementById(`vsl_${tSafeId}_${f}`);
            const vsp = document.getElementById(`vsv_${tSafeId}_${f}`);
            if (sl) sl.value = val;
            if (vsp) vsp.textContent = val;
          });
          tBtn.textContent = 'Vote'; tBtn.classList.remove('vote-submitted');
        });
      })(name, safeId, btn, resetBtn, Math.round(d.df), Math.round(d.mf), Math.round(d.fw));

      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px';
      btnRow.appendChild(resetBtn);
      btnRow.appendChild(btn);
      card.appendChild(btnRow);
      grpDiv.appendChild(card);
    }
    el.appendChild(grpDiv);
  }
}
