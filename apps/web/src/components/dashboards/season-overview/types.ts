export type SeasonPointsData = {
  match_week: number | null;
  cumulative_points: number;
  cumulative_xPoints: number;
  match_id: number;
  match_date: string;
  venue: string | null;
  goals_scored: number;
  goals_conceded: number;
  points: number;
  xPoints: number | null;
  opponent_team_id: number | null;
  opponent_image_url: string | null;
};

export type IncomingSeasonPointsData = {
  match_week: number | null;
  cumulative_points: number | string;
  cumulative_xPoints?: number | string | null;
  cumulative_x_points?: number | string | null;
  match_id: number;
  match_date: string;
  venue?: string | null;
  goals_scored: number;
  goals_conceded: number;
  points: number;
  xPoints?: number | string | null;
  x_points?: number | string | null;
  opponent_team_id: number | null;
  opponent_image_url: string | null;
};

export type TeamPhaseAverages = {
  build_up_goals_for: number;
  build_up_goals_against: number;
  build_up_xt_for: number;
  build_up_xt_against: number;
  build_up_xg_for: number;
  build_up_xg_against: number;
  transition_goals_for: number;
  transition_goals_against: number;
  transition_xt_for: number;
  transition_xt_against: number;
  transition_xg_for: number;
  transition_xg_against: number;
  set_piece_goals_for: number;
  set_piece_goals_against: number;
  set_piece_xt_for: number;
  set_piece_xt_against: number;
  set_piece_xg_for: number;
  set_piece_xg_against: number;
};

export type IncomingLeagueTeamSeasonAveragesRow = {
  team_id: number | string | null;
  build_up_goals_for?: number | string | null;
  build_up_goals_against?: number | string | null;
  build_up_xt_for?: number | string | null;
  build_up_xt_against?: number | string | null;
  build_up_xg_for?: number | string | null;
  build_up_xg_against?: number | string | null;
  transition_goals_for?: number | string | null;
  transition_goals_against?: number | string | null;
  transition_xt_for?: number | string | null;
  transition_xt_against?: number | string | null;
  transition_xg_for?: number | string | null;
  transition_xg_against?: number | string | null;
  set_piece_goals_for?: number | string | null;
  set_piece_goals_against?: number | string | null;
  set_piece_xt_for?: number | string | null;
  set_piece_xt_against?: number | string | null;
  set_piece_xg_for?: number | string | null;
  set_piece_xg_against?: number | string | null;
};

export type PossessionMetrics = Record<string, number | string | null>;

export type PhaseRow = {
  key: "build_up" | "transition" | "set_piece";
  label: string;
  goalsDelta: number;
  xtDelta: number;
  xgDelta: number;
  score: number;
};

export type FormCode = "W" | "D" | "L";

export type PerformanceSplit = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  ppg: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
};

export type ComparisonMode = "none" | "xpoints" | "season";

export type TeamOption = { team_id: number; team_name: string };
export type SeasonOption = { season_id: number; season_name: string };
