// ── Onboarding (Team Picker) Modal ────────────────────────────────────────────
// Handles the team-selection overlay shown on first load.
// Also provides highlight-on-selection behaviour across all panels.

import { DATA } from '../lib/data.js';
import { GKEYS } from '../lib/constants.js';

let obTeam    = null;   // confirmed team
let obPending = null;   // pending in picker

/** Returns the currently confirmed team name, or null. */
export function getObTeam() { return obTeam; }

// ── Highlight selected team across all rendered panels ────────────────────────
export function obHighlight() {
  if (!obTeam) return;
  const ut = obTeam;

  // Stage table rows
  document.querySelectorAll('#stageBody tr').forEach(tr => {
    const el = tr.querySelector('.tcl');
    tr.classList.toggle('hl-row', !!(el && el.textContent.indexOf(ut) >= 0));
  });

  // Power table rows
  document.querySelectorAll('#pwBody tr').forEach(tr => {
    const el = tr.querySelector('.pw-team-name');
    tr.classList.toggle('hl-row', !!(el && el.textContent.trim() === ut));
  });

  // Groups panel
  document.querySelectorAll('.gr').forEach(div => {
    const el = div.querySelector('.gtm span:last-child');
    div.classList.toggle('hl-gr', !!(el && el.textContent.trim() === ut));
  });

  // Fixture panel match cards
  document.querySelectorAll('.mc').forEach(card => {
    let found = false;
    card.querySelectorAll('.mta span:last-child,.mtb span:first-child').forEach(s => {
      if (s.textContent.trim() === ut) found = true;
    });
    card.classList.toggle('hl-mc', found);
  });

  // Bracket boxes
  document.querySelectorAll('.bm').forEach(bm => {
    let found = false;
    bm.querySelectorAll('.bt').forEach(bt => {
      if (bt.textContent.replace(/\d+/g, '').trim().indexOf(ut) >= 0) found = true;
    });
    bm.classList.toggle('hl-bm', found);
    bm.querySelectorAll('.bt').forEach(bt => {
      bt.classList.toggle('hl-bt', bt.textContent.replace(/\d+/g, '').trim().indexOf(ut) >= 0);
    });
  });

  // Monte Carlo cards
  document.querySelectorAll('.mci').forEach(card => {
    const el = card.querySelector('.mcn');
    const match = !!(el && el.textContent.trim() === ut);
    card.style.outline   = match ? '2px solid #f59e0b' : '';
    card.style.background = match ? '#fffbeb' : '';
  });
}

// ── Build the team list (filtering by search term) ────────────────────────────
export function obBuild(filter) {
  const list = document.getElementById('obList');
  if (!list) return;

  const fl = (filter || '').toLowerCase().trim();
  list.innerHTML = '';
  let totalFound = 0;

  for (const gk of GKEYS) {
    const rows = [];
    for (const name of Object.keys(DATA)) {
      if (DATA[name].g !== gk) continue;
      if (fl && name.toLowerCase().indexOf(fl) < 0) continue;
      rows.push(name);
    }
    if (!rows.length) continue;

    const hdr = document.createElement('div');
    hdr.className = 'ob-grp';
    hdr.textContent = 'GROUP ' + gk;
    list.appendChild(hdr);

    for (const name of rows) {
      const d = DATA[name];
      const row = document.createElement('div');
      row.className = 'ob-row' + (name === obPending ? ' sel' : '');
      row.setAttribute('data-n', name);

      const flagEl = document.createElement('span'); flagEl.className = 'ob-rflag'; flagEl.textContent = d.f;
      const nameEl = document.createElement('span'); nameEl.className = 'ob-rname'; nameEl.textContent = name;
      const ovrEl  = document.createElement('span'); ovrEl.className  = 'ob-rovr';  ovrEl.textContent  = 'OVR ' + d.ovr;
      row.appendChild(flagEl); row.appendChild(nameEl); row.appendChild(ovrEl);
      list.appendChild(row);
      totalFound++;
    }
  }

  if (!totalFound) {
    const msg = document.createElement('div');
    msg.style.cssText = 'padding:24px;text-align:center;color:#bbb;font-size:13px';
    msg.textContent = 'No team found';
    list.appendChild(msg);
  }
}

// ── Toggle selection (highlight row without full re-render) ───────────────────
export function obSelect(name) {
  obPending = name;
  const list = document.getElementById('obList');
  if (list) {
    list.querySelectorAll('.ob-row').forEach(r => {
      const isSel = r.getAttribute('data-n') === name;
      r.classList.toggle('sel', isSel);
      r.querySelector('.ob-rname').style.fontWeight = isSel ? '700' : '';
    });
  }
  const btn = document.getElementById('obOkBtn');
  if (btn) { btn.disabled = false; btn.classList.add('ready'); }
}

// ── Open the picker modal ─────────────────────────────────────────────────────
export function obOpen() {
  obPending = obTeam;
  const bg = document.getElementById('obBg');
  if (bg) bg.style.display = 'flex';
  const si = document.getElementById('obSearch');
  if (si) si.value = '';
  obBuild('');
  setTimeout(() => {
    const sel = document.querySelector('#obList .ob-row.sel');
    if (sel) sel.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 60);
}

// ── Confirm selection ─────────────────────────────────────────────────────────
export function obConfirm() {
  if (!obPending) return;
  obTeam = obPending;
  const bg = document.getElementById('obBg');
  if (bg) bg.style.display = 'none';

  const d = DATA[obTeam];
  if (d) {
    const badge = document.getElementById('obBadge');
    if (badge) badge.style.display = 'flex';
    const fl = document.getElementById('obBadgeFlag');
    if (fl) fl.textContent = d.f;
    const nm = document.getElementById('obBadgeName');
    if (nm) nm.textContent = obTeam;
  }

  const jSel = document.getElementById('journeyTeam');
  if (jSel) jSel.value = obTeam;

  setTimeout(obHighlight, 30);
}

// ── Pick a random team ────────────────────────────────────────────────────────
export function obRandom() {
  const names = Object.keys(DATA);
  const name  = names[Math.floor(Math.random() * names.length)];
  const list  = document.getElementById('obList');
  const si    = document.getElementById('obSearch');
  if (list && !list.querySelector('[data-n]')) {
    if (si) si.value = '';
    obBuild('');
  }
  obSelect(name);
  setTimeout(() => {
    const sel = document.querySelector('#obList .ob-row.sel');
    if (sel) sel.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 60);
}

// ── Wire up all event listeners ───────────────────────────────────────────────
export function initOnboarding() {
  // List click → event delegation
  const list = document.getElementById('obList');
  if (list) {
    list.addEventListener('click', e => {
      const row = e.target.closest('.ob-row');
      if (row && row.getAttribute('data-n')) obSelect(row.getAttribute('data-n'));
    });
  }

  // Search filter
  const si = document.getElementById('obSearch');
  if (si) si.addEventListener('input', () => obBuild(si.value));

  // Confirm button
  const okBtn = document.getElementById('obOkBtn');
  if (okBtn) okBtn.addEventListener('click', obConfirm);

  // Skip button
  const skipBtn = document.getElementById('obSkipBtn');
  if (skipBtn) skipBtn.addEventListener('click', () => {
    const bg = document.getElementById('obBg');
    if (bg) bg.style.display = 'none';
    obTeam = null;
  });

  // Random button
  const randBtn = document.getElementById('obRandBtn');
  if (randBtn) randBtn.addEventListener('click', obRandom);

  // Pre-populate the list
  obBuild('');
}
