// Tournament bracket pairs and UI constants for WC 2026.
// Pure data — no DOM access, no side effects.

// ── Bracket wiring — FIFA 2026 official bracket order ──────────────────────
// Each pair is [indexA, indexB] into the previous round's winners array.

export const R16_PAIRS = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]];
export const QF_PAIRS  = [[0,1],[2,3],[4,5],[6,7]];
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
  monte:   "pMonte",
  groups:  "pGroups",
  journey: "pJourney",
  fixture: "pFixture",
  bracket: "pBracket",
  browser: "pBrowser",
  power:   "pPower",
  squads:  "pSquads",
  vote:    "pVote",
};

// Ordered list of navigation keys (matches tab order in the UI)
export const NKEYS = [
  "monte", "groups", "journey", "fixture",
  "bracket", "browser", "power", "squads", "vote",
];

// ── Group keys — all 12 WC 2026 groups in order ────────────────────────────
export const GKEYS = ["A","B","C","D","E","F","G","H","I","J","K","L"];
