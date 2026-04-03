import type { MetricOption } from "./types";
import type { MetricGroup } from "@/components/charts/XYScatterChart";

// ---------------------------------------------------------------------------
// Line chart metric options
// ---------------------------------------------------------------------------

export const LINE_CHART_METRICS: MetricOption[] = [
  // Attack
  { key: "goals_for", label: "Goals For", category: "Attack" },
  { key: "goals_against", label: "Goals Against", category: "Attack" },
  { key: "total_xg_for", label: "xG For", category: "Attack" },
  { key: "total_xg_against", label: "xG Against", category: "Attack" },
  { key: "xg_difference", label: "xG Difference", category: "Attack" },
  { key: "shots_for", label: "Shots For", category: "Attack" },
  { key: "shots_against", label: "Shots Against", category: "Attack" },
  { key: "xt_for", label: "xT For", category: "Attack" },
  { key: "xt_against", label: "xT Against", category: "Attack" },
  { key: "xt_difference", label: "xT Difference", category: "Attack" },
  // Possession
  { key: "possession_for", label: "Possession %", category: "Possession" },
  { key: "passes_for", label: "Successful Passes", category: "Possession" },
  { key: "ppda_for", label: "PPDA", category: "Possession" },
  // Points
  { key: "points", label: "Points", category: "Results" },
  { key: "x_points", label: "Expected Points", category: "Results" },
  { key: "goal_difference", label: "Goal Difference", category: "Results" },
  // Build-up
  {
    key: "build_up_xg_for",
    label: "Build-up xG For",
    category: "Build-up",
  },
  {
    key: "build_up_shots_for",
    label: "Build-up Shots For",
    category: "Build-up",
  },
  // Transition
  {
    key: "transition_xg_for",
    label: "Transition xG For",
    category: "Transition",
  },
  {
    key: "transition_shots_for",
    label: "Transition Shots For",
    category: "Transition",
  },
  // Set Piece
  {
    key: "set_piece_xg_for",
    label: "Set Piece xG For",
    category: "Set Piece",
  },
  {
    key: "set_piece_shots_for",
    label: "Set Piece Shots For",
    category: "Set Piece",
  },
];

export const DEFAULT_LINE_METRIC = "total_xg_for";

// ---------------------------------------------------------------------------
// Scatter plot metric groups (used with XYScatterChart)
// ---------------------------------------------------------------------------

export const SCATTER_METRIC_GROUPS: MetricGroup[] = [
  {
    label: "Attack",
    metrics: [
      { key: "goals_for", label: "Goals For" },
      { key: "goals_against", label: "Goals Against" },
      { key: "total_xg_for", label: "xG For" },
      { key: "total_xg_against", label: "xG Against" },
      { key: "xg_difference", label: "xG Difference" },
      { key: "shots_for", label: "Shots For" },
      { key: "shots_against", label: "Shots Against" },
      { key: "xt_for", label: "xT For" },
      { key: "xt_against", label: "xT Against" },
    ],
  },
  {
    label: "Possession",
    metrics: [
      { key: "possession_for", label: "Possession %" },
      { key: "passes_for", label: "Successful Passes" },
      { key: "ppda_for", label: "PPDA" },
    ],
  },
  {
    label: "Defense",
    metrics: [
      { key: "goals_against", label: "Goals Against" },
      { key: "total_xg_against", label: "xG Against" },
      { key: "shots_against", label: "Shots Against" },
      { key: "xt_against", label: "xT Against" },
      { key: "ppda_against", label: "PPDA Against" },
    ],
  },
  {
    label: "Results",
    metrics: [
      { key: "points", label: "Points" },
      { key: "x_points", label: "Expected Points" },
      { key: "goal_difference", label: "Goal Difference" },
    ],
  },
];

export const DEFAULT_SCATTER_X = "total_xg_for";
export const DEFAULT_SCATTER_Y = "total_xg_against";

// ---------------------------------------------------------------------------
// Ranking metric options (for league-ranking-averages metricKey param)
// ---------------------------------------------------------------------------

export const RANKING_METRIC_KEY = "points";
