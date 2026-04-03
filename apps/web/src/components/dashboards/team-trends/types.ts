// ---------------------------------------------------------------------------
// Team Trends – Type definitions
// ---------------------------------------------------------------------------

/** A single match-week row returned by the team-trends API. */
export interface TeamTrendData {
  match_id: number;
  match_date: string;
  match_week: number | null;
  opponent_team_id: number;
  opponent_image_url: string | null;
  league_rank: number | null;
  league_average_rank: number | null;
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

/** League ranking data returned by league-ranking-averages API. */
export interface LeagueRankingRow {
  team_id: number | null;
  team_name: string;
  team_image_url: string | null;
  average_value: number;
  is_average: boolean;
}

/** Per-team season averages from the league-team-season-averages API. */
export interface LeagueTeamAverage {
  team_id: number;
  team_name: string;
  team_image_url: string | null;
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

/** Metric option for dropdowns. */
export interface MetricOption {
  key: string;
  label: string;
  category: string;
}
