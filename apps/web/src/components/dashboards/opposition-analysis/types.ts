// ---------------------------------------------------------------------------
// Opposition Analysis – shared types
// ---------------------------------------------------------------------------

/** Raw team row from /api/statsbomb/teams */
export interface OppositionTeam {
  team_id: number;
  team_name: string;
}

/** Raw match row returned by /api/statsbomb/matches */
export interface MatchRow {
  match_id: number;
  season_id: number;
  competition_id: number;
  match_date: string;
  match_label: string;
  team_name: string;
  opponent_team_name: string;
  team_id: number;
  opponent_team_id: number;
  venue: "home" | "away";
  competition_stage_name?: string;
  match_week?: number;
  stadium_name?: string;
  referee_name?: string;
  competition_name?: string;
  season_name?: string;
  image_url?: string;
  opponent_image_url?: string;
}

/** Row from /api/statsbomb/league-team-season-averages */
export interface LeagueTeamAverages {
  team_id: number;
  team_name: string;
  team_image_url?: string;
  points: number;
  x_points: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  shots_for: number;
  shots_against: number;
  xt_for: number;
  xt_against: number;
  xt_difference: number;
  total_xg_for: number;
  total_xg_against: number;
  xg_difference: number;
  build_up_goals_for: number;
  build_up_goals_against: number;
  build_up_shots_for: number;
  build_up_shots_against: number;
  build_up_xt_for: number;
  build_up_xt_against: number;
  build_up_xg_for: number;
  build_up_xg_against: number;
  transition_goals_for: number;
  transition_goals_against: number;
  transition_shots_for: number;
  transition_shots_against: number;
  transition_xt_for: number;
  transition_xt_against: number;
  transition_xg_for: number;
  transition_xg_against: number;
  set_piece_goals_for: number;
  set_piece_goals_against: number;
  set_piece_shots_for: number;
  set_piece_shots_against: number;
  set_piece_xt_for: number;
  set_piece_xt_against: number;
  set_piece_xg_for: number;
  set_piece_xg_against: number;
  possession_for: number;
  possession_against: number;
  passes_for: number;
  passes_against: number;
  ppda_for: number;
  ppda_against: number;
}

/** Aggregated stats for the opponent */
export interface OppositionStats {
  recent_form: MatchResult[];
  xg_for: number;
  xg_against: number;
  goals_for: number;
  goals_against: number;
  possession_pct: number;
  ppda: number;
}

/** Single match result for form display */
export interface MatchResult {
  match_id: number;
  opponent_name: string;
  goals_scored: number;
  goals_conceded: number;
  result: "W" | "D" | "L";
  date: string;
}

/** Radar chart axis value */
export interface StyleOfPlayMetric {
  axis: string;
  value: number; // percentile 0-100
}

/** Phase-of-play rating */
export interface PhaseRating {
  phase: string;
  score: number; // 0-100
  rating: "Strong" | "Average" | "Weak";
  metrics: { label: string; value: number }[];
}

/** Unavailable player */
export interface UnavailablePlayer {
  name: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  reason: "suspended" | "injured";
  detail: string;
  expected_return?: string;
}

/** Formation usage entry */
export interface FormationUsage {
  formation: string;
  count: number;
  percentage: number;
  isMostUsed: boolean;
}

/** Strength or weakness item */
export interface StrengthWeakness {
  label: string;
  metricKey: string;
  value: number;
  leagueAvg: number;
  deviation: number; // how many std devs above/below mean
  type: "strength" | "weakness";
}
