// ── Analytics Panel — Premium Data Dashboard ──────────────────────────────────
import { flag } from '../../lib/engine.js';
import { analytics } from '../../lib/analytics.js';
import { tTeam } from '../../lib/i18n.js';

// ── Shared helpers ────────────────────────────────────────────────────────────

function pct(v, total) {
  return total > 0 ? (v / total * 100).toFixed(1) : '0.0';
}

function winSplit(wins, tA, tB) {
  const wA = wins[tA] || 0;
  const wB = wins[tB] || 0;
  const tot = wA + wB || 1;
  const pA = (wA / tot * 100).toFixed(0);
  const pB = (wB / tot * 100).toFixed(0);
  return `<div class="an-split-bar">` +
    `<div style="flex:${wA};background:var(--an-c1)" title="${tTeam(tA)}: ${pA}%"></div>` +
    `<div style="flex:${wB};background:var(--an-c2)" title="${tTeam(tB)}: ${pB}%"></div>` +
    `</div>` +
    `<div class="an-split-lbl">` +
    `<span style="color:var(--an-c1)">${pA}%</span>` +
    `<span style="color:var(--an-c2)">${pB}%</span>` +
    `</div>`;
}

function miniBar(val, max, color) {
  const w = max > 0 ? Math.round(val / max * 100) : 0;
  return `<div class="an-bar-track"><div class="an-bar-fill" style="width:${w}%;background:${color}"></div></div>`;
}

function sectionHdr(icon, title, sub) {
  return `<div class="an-sec-hdr"><span class="an-sec-icon">${icon}</span>` +
    `<div><div class="an-sec-title">${title}</div>` +
    `${sub ? `<div class="an-sec-sub">${sub}</div>` : ''}` +
    `</div></div>`;
}

// ── Main render ───────────────────────────────────────────────────────────────

export function drawAnalytics() {
  const el = document.getElementById('analyticsEl');
  if (!el) return;

  const n = analytics.simCount;
  if (n === 0) {
    el.innerHTML =
      `<div class="analytics-empty">` +
      `<div style="font-size:40px;margin-bottom:14px">📊</div>` +
      `<div style="font-size:15px;font-weight:700;color:#555;margin-bottom:6px">No data yet</div>` +
      `<div style="font-size:12px;color:#aaa">Run simulations to unlock the Analytics dashboard.</div>` +
      `</div>`;
    return;
  }

  // ── KPI strip ─────────────────────────────────────────────────────────────
  const thirds      = analytics.get3rdPlaceStats();
  const finals      = analytics.getDreamFinals(10);
  const penKings    = analytics.getPenKings(10);
  const matchups    = analytics.getTopMatchups(12);
  const depth       = analytics.getGroupDepth();

  const topFinal    = finals[0];
  const topPen      = penKings[0];
  const topDepth    = depth[0];

  let html = `<div class="an-dash-hdr">` +
    `<span class="an-dash-title">Analytics Dashboard</span>` +
    `<span class="an-dash-meta">Based on <b>${n.toLocaleString()}</b> simulations</span>` +
    `</div>`;

  // KPI cards
  html += `<div class="an-kpi-strip">`;
  if (topFinal) {
    const [tA, tB] = topFinal.teams;
    html += kpiCard('🌟', 'Dream Final', `${flag(tA)} vs ${flag(tB)}`, `${topFinal.pct.toFixed(1)}% of sims`);
  }
  if (topPen) {
    html += kpiCard('🥅', 'Penalty King', `${flag(topPen.team)} ${tTeam(topPen.team)}`, `${topPen.wins} shootout wins`);
  }
  if (topDepth) {
    html += kpiCard('💀', 'Group of Death', `Group ${topDepth.group}`, `${topDepth.avg.toFixed(2)} QF+ teams avg.`);
  }
  html += `</div>`;

  el.innerHTML = html;

  // ── Dashboard grid ────────────────────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'an-grid';
  el.appendChild(grid);

  // Card 1: Dream Finals
  grid.appendChild(buildDreamFinalsCard(finals, n));

  // Card 2: Penalty Kings
  grid.appendChild(buildPenKingsCard(penKings, n));

  // Card 3: Most Frequent KO Matchups
  grid.appendChild(buildMatchupCard(matchups, n));

  // Card 4: 3rd Place Advancement
  grid.appendChild(build3rdPlaceCard(thirds));

  // Full-width: Group of Death
  const depthCard = buildGroupDepthCard(depth, n);
  depthCard.classList.add('an-card-full');
  el.appendChild(depthCard);
}

// ── KPI card helper ───────────────────────────────────────────────────────────

function kpiCard(icon, label, value, sub) {
  return `<div class="an-kpi-card">` +
    `<div class="an-kpi-icon">${icon}</div>` +
    `<div class="an-kpi-body">` +
    `<div class="an-kpi-label">${label}</div>` +
    `<div class="an-kpi-value">${value}</div>` +
    `<div class="an-kpi-sub">${sub}</div>` +
    `</div></div>`;
}

// ── Table card builders ───────────────────────────────────────────────────────

function buildMatchupCard(matchups, n) {
  const card = document.createElement('div');
  card.className = 'an-card';
  card.innerHTML = sectionHdr('🔁', 'Most Frequent KO Matchups',
    'Pairs that meet most often across all knockout rounds');

  if (!matchups.length) { card.innerHTML += `<div class="an-empty">No data</div>`; return card; }

  const tbl = document.createElement('table');
  tbl.className = 'an-tbl';
  tbl.innerHTML = `<thead><tr><th>#</th><th>Matchup</th><th class="num">Freq.</th><th class="num">% Sims</th><th>Split</th></tr></thead>`;
  const tbody = document.createElement('tbody');

  matchups.slice(0, 12).forEach(({ teams, count, pct: p, wins }, i) => {
    const [tA, tB] = teams;
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td class="an-rank">${i + 1}</td>` +
      `<td class="an-matchup">${flag(tA)}&nbsp;<span>${tTeam(tA)}</span>` +
      `<span class="an-vs">vs</span>` +
      `${flag(tB)}&nbsp;<span>${tTeam(tB)}</span></td>` +
      `<td class="num an-bold">${count.toLocaleString()}</td>` +
      `<td class="num" style="color:#9b74ff;font-weight:700">${p.toFixed(1)}%</td>` +
      `<td>${winSplit(wins, tA, tB)}</td>`;
    tbody.appendChild(tr);
  });

  tbl.appendChild(tbody);
  card.appendChild(tbl);
  return card;
}

function buildDreamFinalsCard(finals, n) {
  const card = document.createElement('div');
  card.className = 'an-card';
  card.innerHTML = sectionHdr('🌟', 'Dream Finals',
    'Finals fans want to see — the most common championship showdowns');

  if (!finals.length) { card.innerHTML += `<div class="an-empty">No data</div>`; return card; }

  const tbl = document.createElement('table');
  tbl.className = 'an-tbl';
  tbl.innerHTML = `<thead><tr><th>#</th><th>Final</th><th class="num">Times</th><th class="num">% Sims</th><th>Winner</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  const maxCnt = finals[0]?.count || 1;

  finals.forEach(({ teams, count, pct: p, wins }, i) => {
    const [tA, tB] = teams;
    const wA = wins[tA] || 0;
    const wB = wins[tB] || 0;
    const topWinner = wA >= wB ? tA : tB;
    const topWinPct = ((Math.max(wA, wB) / (wA + wB || 1)) * 100).toFixed(0);
    const color = p >= 5 ? '#00c4ff' : p >= 2 ? '#9b74ff' : '#aaa';
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td class="an-rank">${i + 1}</td>` +
      `<td class="an-matchup">${flag(tA)}&nbsp;<span>${tTeam(tA)}</span>` +
      `<span class="an-vs">vs</span>` +
      `${flag(tB)}&nbsp;<span>${tTeam(tB)}</span></td>` +
      `<td class="num an-bold" style="color:${color}">${count.toLocaleString()}</td>` +
      `<td class="num" style="color:${color};font-weight:700">${p.toFixed(1)}%</td>` +
      `<td><span class="an-winner">${flag(topWinner)}&nbsp;${tTeam(topWinner)}</span>` +
      `<span class="an-winner-pct">${topWinPct}%</span></td>`;
    tbody.appendChild(tr);
  });

  tbl.appendChild(tbody);
  card.appendChild(tbl);
  return card;
}

function build3rdPlaceCard(thirds) {
  const card = document.createElement('div');
  card.className = 'an-card';
  card.innerHTML = sectionHdr('🥉', '3rd Place → R32 Rates',
    'How often each group\'s 3rd-place team qualifies for the Round of 32');

  if (!thirds.length) { card.innerHTML += `<div class="an-empty">No data</div>`; return card; }

  const tbl = document.createElement('table');
  tbl.className = 'an-tbl';
  tbl.innerHTML = `<thead><tr><th>Group</th><th class="num">Qualified</th><th class="num">Rate</th><th>Probability</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  const maxPct = thirds[0]?.pct || 100;

  thirds.forEach(({ group, qualified, total, pct: p }) => {
    const color = p >= 70 ? '#00c4ff' : p >= 50 ? '#9b74ff' : p >= 33 ? '#f59e0b' : '#e87c5d';
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td style="font-weight:700">Group ${group}</td>` +
      `<td class="num an-bold">${qualified.toLocaleString()}</td>` +
      `<td class="num" style="color:${color};font-weight:700">${p.toFixed(1)}%</td>` +
      `<td>${miniBar(p, maxPct, color)}</td>`;
    tbody.appendChild(tr);
  });

  tbl.appendChild(tbody);
  card.appendChild(tbl);
  return card;
}

function buildPenKingsCard(penKings, n) {
  const card = document.createElement('div');
  card.className = 'an-card';
  card.innerHTML = sectionHdr('🥅', 'Penalty Kings',
    'Teams that advance through the most penalty shootouts');

  if (!penKings.length) {
    card.innerHTML += `<div class="an-empty">No shootout data yet</div>`;
    return card;
  }

  const tbl = document.createElement('table');
  tbl.className = 'an-tbl';
  tbl.innerHTML = `<thead><tr><th>#</th><th>Team</th><th class="num">Wins</th><th class="num">Appearances</th><th class="num">Win %</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  const maxWins = penKings[0]?.wins || 1;

  penKings.forEach(({ team, wins, appearances, pct: p }, i) => {
    const color = p >= 70 ? '#00c4ff' : p >= 50 ? '#9b74ff' : '#f59e0b';
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td class="an-rank">${i + 1}</td>` +
      `<td><span style="display:inline-flex;align-items:center;gap:4px">${flag(team)}&nbsp;<b>${tTeam(team)}</b></span></td>` +
      `<td class="num"><span style="display:inline-flex;align-items:center;gap:3px">` +
      `${miniBar(wins, maxWins, '#9b74ff')}<b>${wins}</b></span></td>` +
      `<td class="num" style="color:#aaa">${appearances}</td>` +
      `<td class="num" style="color:${color};font-weight:700">${p.toFixed(0)}%</td>`;
    tbody.appendChild(tr);
  });

  tbl.appendChild(tbody);
  card.appendChild(tbl);
  return card;
}

function buildGroupDepthCard(depth, n) {
  const card = document.createElement('div');
  card.className = 'an-card';
  card.innerHTML = sectionHdr('💀', 'Group of Death Index',
    'Average number of teams from each group reaching the Quarter-Finals or beyond — higher = tougher group');

  if (!depth.length) { card.innerHTML += `<div class="an-empty">No data</div>`; return card; }

  const container = document.createElement('div');
  container.className = 'an-depth-grid';
  const maxAvg = depth[0]?.avg || 1;

  depth.forEach(({ group, avg, total }, rank) => {
    const pctW = maxAvg > 0 ? Math.round(avg / maxAvg * 100) : 0;
    const color = rank === 0 ? '#e87c5d' : rank <= 2 ? '#f59e0b' : rank <= 5 ? '#9b74ff' : '#00c4ff';
    const label = rank === 0 ? ' 💀' : rank <= 2 ? ' 🔥' : '';
    container.innerHTML +=
      `<div class="an-depth-row">` +
      `<div class="an-depth-grp" style="color:${color}">Group ${group}${label}</div>` +
      `<div class="an-depth-bar-wrap">` +
      `<div class="an-bar-track an-depth-track">` +
      `<div class="an-bar-fill" style="width:${pctW}%;background:${color}"></div>` +
      `</div>` +
      `</div>` +
      `<div class="an-depth-val" style="color:${color}">${avg.toFixed(2)}</div>` +
      `<div class="an-depth-total">${total.toLocaleString()} QF+ appearances</div>` +
      `</div>`;
  });

  card.appendChild(container);
  return card;
}
