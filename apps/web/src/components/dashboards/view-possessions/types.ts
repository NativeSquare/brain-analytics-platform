// ---------- Types for the View Possessions dashboard ----------

/** Row returned by /api/statsbomb/possessions */
export interface Possession {
  match_id: number;
  possession_team: string;
  out_of_possession_team: string;
  possession_team_id: number;
  out_of_possession_team_id: number;
  period: number;
  start_time: string;
  end_time: string;
  phase: string;
  starting_third: string;
  xT: number;
  shot_count: number;
  total_xg: number;
  goal: number;
  duration_seconds: number;
  regain: number;
  restart: number;
  quick_restart: number;
}

/** Row returned by /api/statsbomb/match-periods */
export interface MatchPeriod {
  match_id: number;
  period: number;
  period_label: string;
  start_time: string;
  end_time: string;
}

/** Team option from /api/statsbomb/teams */
export interface TeamOption {
  team_id: number;
  team_name: string;
}

/** Season option from /api/statsbomb/seasons */
export interface SeasonOption {
  season_id: number;
  season_name: string;
}

/** Match option from /api/statsbomb/matches */
export interface MatchRow {
  match_id: number;
  season_id: number | null;
  match_label: string;
  team_name: string;
  opponent_team_name: string;
  team_id: number | null;
  opponent_team_id: number | null;
}

export type MatchOption = MatchRow & { label: string };
