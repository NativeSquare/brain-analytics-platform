import type { MetricDefinition, PositionRole } from "./types";

// ---------------------------------------------------------------------------
// Position → Role mapping (StatsBomb position names → role bucket)
// ---------------------------------------------------------------------------

const POSITION_ROLE_MAP: Record<string, PositionRole> = {
  // Goalkeeper
  Goalkeeper: "Goalkeeper",
  // Defenders
  "Left Back": "Defender",
  "Right Back": "Defender",
  "Left Wing Back": "Defender",
  "Right Wing Back": "Defender",
  "Left Center Back": "Defender",
  "Right Center Back": "Defender",
  "Center Back": "Defender",
  // Midfielders
  "Left Defensive Midfield": "Midfielder",
  "Right Defensive Midfield": "Midfielder",
  "Center Defensive Midfield": "Midfielder",
  "Left Center Midfield": "Midfielder",
  "Right Center Midfield": "Midfielder",
  "Center Midfield": "Midfielder",
  "Left Midfield": "Midfielder",
  "Right Midfield": "Midfielder",
  "Left Attacking Midfield": "Midfielder",
  "Right Attacking Midfield": "Midfielder",
  "Center Attacking Midfield": "Midfielder",
  // Forwards
  "Left Wing": "Forward",
  "Right Wing": "Forward",
  "Left Center Forward": "Forward",
  "Right Center Forward": "Forward",
  "Center Forward": "Forward",
  "Striker": "Forward",
  "Secondary Striker": "Forward",
};

export function positionToRole(position: string | null | undefined): PositionRole {
  if (!position) return "Midfielder";
  return POSITION_ROLE_MAP[position] ?? "Midfielder";
}

export const POSITION_ROLES: PositionRole[] = [
  "Forward",
  "Midfielder",
  "Defender",
  "Goalkeeper",
];

// ---------------------------------------------------------------------------
// Metric definitions per role
// ---------------------------------------------------------------------------

// --- OVERVIEW (4-6 quick stat cards) ---

const FORWARD_OVERVIEW: MetricDefinition[] = [
  { key: "player_season_goals", label: "Goals" },
  { key: "player_season_np_xg", label: "npxG" },
  { key: "player_season_assists", label: "Assists" },
  { key: "player_season_xa", label: "xA" },
  { key: "player_season_np_shots", label: "Shots" },
  { key: "player_season_dribbles", label: "Dribbles" },
];

const MIDFIELDER_OVERVIEW: MetricDefinition[] = [
  { key: "player_season_goals", label: "Goals" },
  { key: "player_season_assists", label: "Assists" },
  { key: "player_season_key_passes", label: "Key Passes" },
  { key: "player_season_deep_progressions", label: "Deep Progressions" },
  { key: "player_season_passes", label: "Passes" },
  { key: "player_season_tackles", label: "Tackles" },
];

const DEFENDER_OVERVIEW: MetricDefinition[] = [
  { key: "player_season_tackles", label: "Tackles" },
  { key: "player_season_interceptions", label: "Interceptions" },
  { key: "player_season_clearances", label: "Clearances" },
  { key: "player_season_aerials", label: "Aerials Won" },
  { key: "player_season_ball_recoveries", label: "Ball Recoveries" },
  { key: "player_season_deep_progressions", label: "Deep Progressions" },
];

const GOALKEEPER_OVERVIEW: MetricDefinition[] = [
  { key: "player_season_save_ratio", label: "Save %" },
  { key: "player_season_gsaa_90", label: "GSAA /90" },
  { key: "player_season_goals_faced_90", label: "Goals Faced /90", inverted: true },
  { key: "player_season_shots_faced_90", label: "Shots Faced /90", inverted: true },
];

export const OVERVIEW_METRICS: Record<PositionRole, MetricDefinition[]> = {
  Forward: FORWARD_OVERVIEW,
  Midfielder: MIDFIELDER_OVERVIEW,
  Defender: DEFENDER_OVERVIEW,
  Goalkeeper: GOALKEEPER_OVERVIEW,
};

// --- RADAR (5-10 axes) ---

const FORWARD_RADAR: MetricDefinition[] = [
  { key: "player_season_np_xg_90", label: "npxG" },
  { key: "player_season_np_shots_90", label: "Shots" },
  { key: "player_season_xa_90", label: "xA" },
  { key: "player_season_key_passes_90", label: "Key Passes" },
  { key: "player_season_dribbles_90", label: "Dribbles" },
  { key: "player_season_touches_inside_box_90", label: "Box Touches" },
  { key: "player_season_xgchain_90", label: "xGChain" },
  { key: "player_season_pressures_90", label: "Pressures" },
];

const MIDFIELDER_RADAR: MetricDefinition[] = [
  { key: "player_season_np_xg_90", label: "npxG" },
  { key: "player_season_xa_90", label: "xA" },
  { key: "player_season_deep_progressions_90", label: "Deep Prog." },
  { key: "player_season_key_passes_90", label: "Key Passes" },
  { key: "player_season_passing_ratio", label: "Pass %" },
  { key: "player_season_tackles_90", label: "Tackles" },
  { key: "player_season_interceptions_90", label: "Interceptions" },
  { key: "player_season_pressures_90", label: "Pressures" },
  { key: "player_season_xgchain_90", label: "xGChain" },
];

const DEFENDER_RADAR: MetricDefinition[] = [
  { key: "player_season_padj_tackles_90", label: "pAdj Tackles" },
  { key: "player_season_padj_interceptions_90", label: "pAdj Int." },
  { key: "player_season_padj_clearances_90", label: "pAdj Clear." },
  { key: "player_season_aerial_ratio", label: "Aerial %" },
  { key: "player_season_ball_recoveries_90", label: "Recoveries" },
  { key: "player_season_passing_ratio", label: "Pass %" },
  { key: "player_season_deep_progressions_90", label: "Deep Prog." },
  { key: "player_season_pressures_90", label: "Pressures" },
];

const GOALKEEPER_RADAR: MetricDefinition[] = [
  { key: "player_season_save_ratio", label: "Save %" },
  { key: "player_season_gsaa_90", label: "GSAA" },
  { key: "player_season_xs_ratio", label: "xS %" },
  { key: "player_season_goals_faced_90", label: "Goals Faced", inverted: true },
  { key: "player_season_shots_faced_90", label: "Shots Faced", inverted: true },
];

export const RADAR_METRICS: Record<PositionRole, MetricDefinition[]> = {
  Forward: FORWARD_RADAR,
  Midfielder: MIDFIELDER_RADAR,
  Defender: DEFENDER_RADAR,
  Goalkeeper: GOALKEEPER_RADAR,
};

// --- FULL TABLE (10-15 detailed metrics) ---

const FORWARD_FULL: MetricDefinition[] = [
  { key: "player_season_goals", label: "Goals" },
  { key: "player_season_np_goals", label: "Non-Pen Goals" },
  { key: "player_season_np_xg", label: "npxG" },
  { key: "player_season_np_shots", label: "Shots" },
  { key: "player_season_np_shots_on_target", label: "Shots on Target" },
  { key: "player_season_np_xg_per_shot", label: "npxG/Shot" },
  { key: "player_season_assists", label: "Assists" },
  { key: "player_season_xa", label: "xA" },
  { key: "player_season_key_passes", label: "Key Passes" },
  { key: "player_season_dribbles", label: "Dribbles" },
  { key: "player_season_touches_inside_box", label: "Box Touches" },
  { key: "player_season_xgchain", label: "xGChain" },
  { key: "player_season_xgbuildup", label: "xGBuildup" },
  { key: "player_season_pressures", label: "Pressures" },
  { key: "player_season_obv", label: "OBV" },
];

const MIDFIELDER_FULL: MetricDefinition[] = [
  { key: "player_season_goals", label: "Goals" },
  { key: "player_season_np_xg", label: "npxG" },
  { key: "player_season_assists", label: "Assists" },
  { key: "player_season_xa", label: "xA" },
  { key: "player_season_key_passes", label: "Key Passes" },
  { key: "player_season_passes", label: "Passes" },
  { key: "player_season_successful_passes", label: "Successful Passes" },
  { key: "player_season_passing_ratio", label: "Pass %" },
  { key: "player_season_deep_progressions", label: "Deep Progressions" },
  { key: "player_season_deep_completions", label: "Deep Completions" },
  { key: "player_season_tackles", label: "Tackles" },
  { key: "player_season_interceptions", label: "Interceptions" },
  { key: "player_season_pressures", label: "Pressures" },
  { key: "player_season_xgchain", label: "xGChain" },
  { key: "player_season_obv", label: "OBV" },
];

const DEFENDER_FULL: MetricDefinition[] = [
  { key: "player_season_tackles", label: "Tackles" },
  { key: "player_season_padj_tackles_90", label: "pAdj Tackles /90" },
  { key: "player_season_interceptions", label: "Interceptions" },
  { key: "player_season_padj_interceptions_90", label: "pAdj Int. /90" },
  { key: "player_season_clearances", label: "Clearances" },
  { key: "player_season_padj_clearances_90", label: "pAdj Clear. /90" },
  { key: "player_season_aerials", label: "Aerials" },
  { key: "player_season_aerial_ratio", label: "Aerial %" },
  { key: "player_season_ball_recoveries", label: "Ball Recoveries" },
  { key: "player_season_shots_blocked", label: "Shots Blocked" },
  { key: "player_season_deep_progressions", label: "Deep Progressions" },
  { key: "player_season_passing_ratio", label: "Pass %" },
  { key: "player_season_pressures", label: "Pressures" },
  { key: "player_season_obv", label: "OBV" },
];

const GOALKEEPER_FULL: MetricDefinition[] = [
  { key: "player_season_save_ratio", label: "Save %" },
  { key: "player_season_gsaa_90", label: "GSAA /90" },
  { key: "player_season_xs_ratio", label: "xS %" },
  { key: "player_season_goals_faced_90", label: "Goals Faced /90", inverted: true },
  { key: "player_season_shots_faced_90", label: "Shots Faced /90", inverted: true },
  { key: "player_season_np_psxg", label: "PSxG" },
];

export const FULL_METRICS: Record<PositionRole, MetricDefinition[]> = {
  Forward: FORWARD_FULL,
  Midfielder: MIDFIELDER_FULL,
  Defender: DEFENDER_FULL,
  Goalkeeper: GOALKEEPER_FULL,
};

// ---------------------------------------------------------------------------
// Scatter plot metric groups (for XYScatterChart)
// ---------------------------------------------------------------------------

export const SCATTER_METRIC_GROUPS = [
  {
    label: "Shooting",
    metrics: [
      { key: "player_season_np_xg_90", label: "npxG /90" },
      { key: "player_season_np_shots_90", label: "Shots /90" },
      { key: "player_season_goals_90", label: "Goals /90" },
      { key: "player_season_np_xg_per_shot", label: "npxG/Shot" },
    ],
  },
  {
    label: "Creation",
    metrics: [
      { key: "player_season_xa_90", label: "xA /90" },
      { key: "player_season_key_passes_90", label: "Key Passes /90" },
      { key: "player_season_assists_90", label: "Assists /90" },
      { key: "player_season_through_balls_90", label: "Through Balls /90" },
    ],
  },
  {
    label: "Passing",
    metrics: [
      { key: "player_season_passes_90", label: "Passes /90" },
      { key: "player_season_passing_ratio", label: "Pass %" },
      { key: "player_season_deep_progressions_90", label: "Deep Prog. /90" },
      { key: "player_season_long_ball_ratio", label: "Long Ball %" },
    ],
  },
  {
    label: "Defence",
    metrics: [
      { key: "player_season_padj_tackles_90", label: "pAdj Tackles /90" },
      { key: "player_season_padj_interceptions_90", label: "pAdj Int. /90" },
      { key: "player_season_pressures_90", label: "Pressures /90" },
      { key: "player_season_ball_recoveries_90", label: "Recoveries /90" },
    ],
  },
  {
    label: "Possession Value",
    metrics: [
      { key: "player_season_obv_90", label: "OBV /90" },
      { key: "player_season_xgchain_90", label: "xGChain /90" },
      { key: "player_season_xgbuildup_90", label: "xGBuildup /90" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Inverted metrics (lower is better)
// ---------------------------------------------------------------------------

export const INVERTED_METRIC_KEYS = new Set([
  "player_season_goals_faced_90",
  "player_season_shots_faced_90",
  "player_season_fouls_90",
  "player_season_dispossessions_90",
  "player_season_dribbled_past_90",
]);

// ---------------------------------------------------------------------------
// Percentile color scale
// ---------------------------------------------------------------------------

export function getPercentileColorClass(percentile: number): string {
  if (percentile <= 20) return "bg-red-500/20 text-red-700 dark:text-red-400";
  if (percentile <= 40) return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
  if (percentile <= 60) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
  if (percentile <= 80) return "bg-green-500/20 text-green-700 dark:text-green-400";
  return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400";
}

/** Minimum qualifying players to show percentiles */
export const MIN_QUALIFYING_PLAYERS = 5;
