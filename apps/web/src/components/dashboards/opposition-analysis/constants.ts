// ---------------------------------------------------------------------------
// Opposition Analysis – constants
// ---------------------------------------------------------------------------

/**
 * Metrics used for strengths/weaknesses analysis.
 * Each metric maps to a key from LeagueTeamAverages plus a human label
 * and a `higherIsBetter` flag used to determine polarity.
 */
export const ANALYSIS_METRICS: {
  key: string;
  label: string;
  higherIsBetter: boolean;
}[] = [
  { key: "goals_for", label: "Goals Scored", higherIsBetter: true },
  { key: "goals_against", label: "Goals Conceded", higherIsBetter: false },
  { key: "total_xg_for", label: "xG Created", higherIsBetter: true },
  { key: "total_xg_against", label: "xG Conceded", higherIsBetter: false },
  { key: "shots_for", label: "Shots For", higherIsBetter: true },
  { key: "shots_against", label: "Shots Conceded", higherIsBetter: false },
  { key: "possession_for", label: "Possession", higherIsBetter: true },
  { key: "passes_for", label: "Successful Passes", higherIsBetter: true },
  { key: "ppda_for", label: "PPDA (Pressing)", higherIsBetter: false },
  { key: "xt_for", label: "xT Created", higherIsBetter: true },
  { key: "xt_against", label: "xT Conceded", higherIsBetter: false },
  { key: "build_up_xg_for", label: "Build-up xG", higherIsBetter: true },
  { key: "transition_xg_for", label: "Transition xG", higherIsBetter: true },
  { key: "set_piece_xg_for", label: "Set-piece xG", higherIsBetter: true },
  {
    key: "build_up_xg_against",
    label: "Build-up xG Conceded",
    higherIsBetter: false,
  },
  {
    key: "transition_xg_against",
    label: "Transition xG Conceded",
    higherIsBetter: false,
  },
  {
    key: "set_piece_xg_against",
    label: "Set-piece xG Conceded",
    higherIsBetter: false,
  },
];

/**
 * Radar axis definitions for style-of-play radar chart.
 * Each axis maps to a LeagueTeamAverages key used for percentile calculation.
 */
export const RADAR_AXES: { axis: string; key: string; invert: boolean }[] = [
  { axis: "Possession", key: "possession_for", invert: false },
  { axis: "Pressing Intensity", key: "ppda_for", invert: true }, // lower PPDA = more pressing
  { axis: "Pace", key: "transition_xg_for", invert: false },
  { axis: "Directness", key: "xt_for", invert: false },
  { axis: "Width", key: "passes_for", invert: false },
  { axis: "Defensive Line Height", key: "ppda_against", invert: false },
];

/**
 * Phase composite score weights.
 * Each phase has contributing metric keys (from LeagueTeamAverages)
 * and their weight in the composite score.
 */
export const PHASE_WEIGHTS: {
  phase: string;
  metrics: { key: string; label: string; weight: number }[];
}[] = [
  {
    phase: "Build-up",
    metrics: [
      { key: "build_up_xg_for", label: "xG", weight: 0.35 },
      { key: "build_up_shots_for", label: "Shots", weight: 0.25 },
      { key: "build_up_xt_for", label: "xT", weight: 0.25 },
      { key: "possession_for", label: "Possession", weight: 0.15 },
    ],
  },
  {
    phase: "Transition",
    metrics: [
      { key: "transition_xg_for", label: "xG", weight: 0.35 },
      { key: "transition_shots_for", label: "Shots", weight: 0.25 },
      { key: "transition_xt_for", label: "xT", weight: 0.25 },
      { key: "transition_goals_for", label: "Goals", weight: 0.15 },
    ],
  },
  {
    phase: "Set-piece",
    metrics: [
      { key: "set_piece_xg_for", label: "xG", weight: 0.4 },
      { key: "set_piece_shots_for", label: "Shots", weight: 0.3 },
      { key: "set_piece_goals_for", label: "Goals", weight: 0.3 },
    ],
  },
];

/** Rating thresholds for phase-of-play scores (percentile-based) */
export const RATING_THRESHOLDS = {
  strong: 65,
  weak: 35,
} as const;

/** Default opponent accent color for the radar chart */
export const OPPONENT_COLOR = "#e74c3c";
