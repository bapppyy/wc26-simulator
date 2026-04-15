// Tournament bracket pairs and UI constants for WC 2026.
// Pure data — no DOM access, no side effects.

// ── Bracket wiring — FIFA 2026 official bracket order ──────────────────────
// Each pair is [indexA, indexB] into the previous round's winners array.

// Left wing uses skip-one pairing; right wing uses consecutive pairing (FIFA 2026 asymmetric bracket):
// R16-1: M73(0) vs M75(2), R16-2: M74(1) vs M76(3), R16-3: M77(4) vs M79(6), R16-4: M78(5) vs M80(7)
// R16-5: M81(8) vs M82(9), R16-6: M83(10) vs M84(11), R16-7: M85(12) vs M86(13), R16-8: M87(14) vs M88(15)
export const R16_PAIRS = [[0,1], [2,3], [4,5], [6,7], [8,9], [15,12], [11,10], [13,14]];
export const QF_PAIRS  = [[0,1], [2,3], [4,5], [6,7]];
export const SF_PAIRS  = [[0,1],[2,3]];

// ── Stage display labels ────────────────────────────────────────────────────
export const STAGE_LABELS = {
  Group:     "Eliminated in Groups",
  R32:       "Eliminated in R32",
  R16:       "Eliminated in R16",
  QF:        "Eliminated in QF",
  SF:        "Eliminated in SF",
  Final:     "Finalist",
  "3rd Place": "3rd Place",
  Champion:  "🏆 Champion",
};

// ── Stage CSS tag classes (used for coloured badges) ───────────────────────
export const STAGE_TAG = {
  Champion:    "tc",
  Final:       "tf",
  "3rd Place": "tf",
  SF:          "ts",
  QF:          "tq",
  R16:         "te",
  R32:         "te",
  Group:       "te",
};

// ── Navigation — maps tab key → pane element ID ────────────────────────────
export const PMAP = {
  monte:     "pMonte",
  groups:    "pGroups",
  journey:   "pJourney",
  fixture:   "pFixture",
  bracket:   "pBracket",
  browser:   "pBrowser",
  power:     "pPower",
  squads:    "pSquads",
  vote:      "pVote",
  analytics: "pAnalytics",
};

// Ordered list of navigation keys (matches tab order in the UI)
export const NKEYS = [
  "monte", "groups", "journey", "fixture",
  "bracket", "browser", "power", "squads", "analytics",
];

// ── Group keys — all 12 WC 2026 groups in order ────────────────────────────
export const GKEYS = ["A","B","C","D","E","F","G","H","I","J","K","L"];
