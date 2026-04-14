/**
 * extract_stats.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone Monte Carlo stats extractor for BapLab WC26 Simulator.
 *
 * Runs the simulation engine N times and writes group-stage finish probabilities
 * plus R32 advancement rates to team_probabilities.csv at the project root.
 *
 * Usage (project root):
 *   node scripts/extract_stats.js
 *   node scripts/extract_stats.js 10000    ← explicit iteration count
 *   node scripts/extract_stats.js 1000     ← quick smoke-test
 *
 * Requires Node ≥ 22 and "type": "module" in package.json (already set).
 */

import { createWriteStream } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// ── Resolve paths relative to project root ───────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// Dynamic imports must use file:// URLs on Windows
const toUrl = (rel) => pathToFileURL(resolve(PROJECT_ROOT, rel)).href;

// ── Import engine & data ─────────────────────────────────────────────────────
const { simTournament, setRunSeed } = await import(toUrl('src/lib/engine.js'));
const { DATA }  = await import(toUrl('src/lib/data.js'));
const { GKEYS } = await import(toUrl('src/lib/constants.js'));

// ── Configuration ─────────────────────────────────────────────────────────────
const N          = parseInt(process.argv[2] || '10000', 10);
const OUT_PATH   = resolve(PROJECT_ROOT, 'team_probabilities.csv');
const LOG_EVERY  = Math.max(1, Math.floor(N / 10));   // log progress 10 times

console.log(`\nWC26 Stats Extractor — running ${N.toLocaleString()} simulations…\n`);

// Use a fixed seed so results are reproducible across runs.
// Change this number to get a different but equally reproducible set.
const SEED = 0xBA914B;   // "BapLab" numeric approximation — change to reseed
setRunSeed(SEED);

// ── Per-team accumulators ────────────────────────────────────────────────────
//
//   grpPos[team][0..3]  → times finished 1st / 2nd / 3rd / 4th in group
//   r32Count[team]      → times advanced to R32 (or beyond)
//
const grpPos   = {};   // { teamName: [cnt1st, cnt2nd, cnt3rd, cnt4th] }
const r32Count = {};   // { teamName: count }

for (const name of Object.keys(DATA)) {
  grpPos[name]   = [0, 0, 0, 0];
  r32Count[name] = 0;
}

// Stages that mean the team reached (at least) R32
const R32_OR_BEYOND = new Set([
  'R32', 'R16', 'QF', 'SF', 'Final', 'Champion', '3.Yer',
]);

// ── Simulation loop ───────────────────────────────────────────────────────────
const t0 = Date.now();

for (let i = 0; i < N; i++) {
  // storeDetail = false → fast path (no match events, no XI, no player stats)
  const s = simTournament(i + 1, false);

  // Group standings: grpSt[gk] is sorted [1st, 2nd, 3rd, 4th]
  for (const gk of GKEYS) {
    const ranked = s.grpSt[gk];     // sorted array of { name, pts, gf, ga }
    if (!ranked) continue;
    for (let pos = 0; pos < ranked.length && pos < 4; pos++) {
      const { name } = ranked[pos];
      if (grpPos[name]) grpPos[name][pos]++;
    }
  }

  // R32 advancement from reached map
  for (const [name, stage] of Object.entries(s.reached)) {
    if (R32_OR_BEYOND.has(stage)) r32Count[name]++;
  }

  // Progress log
  if ((i + 1) % LOG_EVERY === 0) {
    const pct = ((i + 1) / N * 100).toFixed(0);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    process.stdout.write(`  ${(i + 1).toLocaleString()} / ${N.toLocaleString()} (${pct}%) — ${elapsed}s\n`);
  }
}

const totalTime = ((Date.now() - t0) / 1000).toFixed(2);
console.log(`\nSimulations complete in ${totalTime}s. Writing CSV…`);

// ── Build team data rows ──────────────────────────────────────────────────────
const rows = [];

for (const [name, td] of Object.entries(DATA)) {
  const [c1, c2, c3, c4] = grpPos[name];
  const adv = r32Count[name];

  // Guard against division by zero (shouldn't happen, but be safe)
  const pct = (cnt) => N > 0 ? (cnt / N * 100).toFixed(2) : '0.00';

  rows.push({
    team:       name,
    group:      td.g,
    ovr:        td.ovr.toFixed(1),
    p1st:       pct(c1),
    p2nd:       pct(c2),
    p3rd:       pct(c3),
    p4th:       pct(c4),
    pR32:       pct(adv),
  });
}

// Sort by group, then by R32 probability desc within each group
rows.sort((a, b) =>
  a.group.localeCompare(b.group) ||
  parseFloat(b.pR32) - parseFloat(a.pR32)
);

// ── Write CSV ─────────────────────────────────────────────────────────────────
const HEADER = [
  'Team',
  'Group',
  'OVR',
  'P(1st in Group) %',
  'P(2nd in Group) %',
  'P(3rd in Group) %',
  'P(4th in Group) %',
  'P(Advance to R32) %',
].join(',');

const ws = createWriteStream(OUT_PATH, { encoding: 'utf8' });

ws.write(HEADER + '\n');

for (const r of rows) {
  // Escape team names that might contain commas (e.g. "Bosnia-Herz.")
  const safeName = r.team.includes(',') ? `"${r.team}"` : r.team;
  ws.write(
    `${safeName},${r.group},${r.ovr},${r.p1st},${r.p2nd},${r.p3rd},${r.p4th},${r.pR32}\n`
  );
}

ws.end(() => {
  console.log(`\nOutput written to: ${OUT_PATH}`);
  console.log(`Rows: ${rows.length} teams  |  Simulations: ${N.toLocaleString()}  |  Seed: 0x${SEED.toString(16).toUpperCase()}\n`);
});
