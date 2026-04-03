// ---------- Shared types for the Post-Match Analysis dashboard ----------

/** Row returned by /api/statsbomb/matches */
export interface MatchRow {
  match_id: number;
  season_id: number | null;
  competition_id?: number | null;
  match_label: string;
  match_date?: string;
  team_name: string;
  opponent_team_name: string;
  team_id: number | null;
  opponent_team_id: number | null;
  image_url?: string | null;
  opponent_image_url?: string | null;
  venue?: string | null;
  competition_stage_name?: string | null;
  match_week?: number | null;
  stadium_name?: string | null;
  referee_name?: string | null;
  competition_name?: string | null;
  season_name?: string | null;
}

export type MatchOption = MatchRow & { label: string };

/** Row returned by /api/statsbomb/match-stats */
export interface MatchStatsRow {
  match_id: number;
  team_id: number;
  goals: number | null;
  xt: number | null;
  total_xg: number | null;
  build_up_xg: number | null;
  transition_xg: number | null;
  set_piece_xg: number | null;
  shots: number | null;
  passes: number | null;
  possession: number | null;
  ppda: number | null;
}

/** Row returned by /api/statsbomb/events */
export interface MatchEvent {
  event_id: string | number;
  match_id: number;
  index: number;
  period: number;
  team_id: number;
  team: string;
  event_type_id: number;
  type: string;
  minute?: number;
  second?: number;
  timestamp: string | null;
  location_x: number | null;
  location_y: number | null;
  player_id: number | null;
  obv_for_net: number | null;
  obv_total_net: number | null;
  pass_recipient_id: number | null;
  pass_outcome: string | null;
  substitution_replacement_id: number | null;
  shot_outcome: string | null;
  shot_statsbomb_xg: number | null;
  foul_committed_card_name: string | null;
  bad_behaviour_card_name: string | null;
  event_time: number | null;
  period_start_seconds: number | null;
}

/** Individual event detail (goal, card, etc.) attached to a lineup player */
export interface EventDetail {
  minute: number;
  event_id: string | number;
  timestamp: string | null;
  period: number | null;
}

/** Row returned by /api/statsbomb/lineups-processed */
export interface LineupPlayerRow {
  match_id: number;
  team_name: string;
  is_starter: boolean;
  pos: string;
  full_name: string;
  player: string;
  mins: number;
  goals: number[];
  goal_events: EventDetail[];
  assists: number[];
  assist_events: EventDetail[];
  own_goals: number[];
  own_goal_events: EventDetail[];
  yellow_cards: number[];
  yellow_card_events: EventDetail[];
  red_cards: number[];
  red_card_events: EventDetail[];
  sub_off_time: number | null;
  sub_off_event_id: string | null;
  sub_off_timestamp: string | null;
  sub_off_period: number | null;
  sub_on_time: number | null;
  sub_on_event_id: string | null;
  sub_on_timestamp: string | null;
  sub_on_period: number | null;
}

/** Mapped player data used by lineup/sub tables and EventIcons */
export interface PlayerData {
  MatchId: number;
  Pos: string;
  Player: string;
  Mins: number;
  Goals?: number[];
  GoalEvents?: EventDetail[];
  OwnGoals?: number[];
  OwnGoalEvents?: EventDetail[];
  Assists?: number[];
  AssistEvents?: EventDetail[];
  YellowCards?: number[];
  YellowCardEvents?: EventDetail[];
  RedCards?: number[];
  RedCardEvents?: EventDetail[];
  SubOffTime?: number;
  SubOnTime?: number;
}

/** Row returned by /api/statsbomb/win-probabilities */
export interface WinProbabilityRow {
  match_id: number;
  team_id: number;
  win_probability: number | null;
  draw_probability: number | null;
  loss_probability: number | null;
}

/** Row returned by /api/statsbomb/possessions */
export interface PossessionRow {
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

/** Filter options */
export interface TeamOption {
  team_id: number;
  team_name: string;
}

export interface SeasonOption {
  season_id: number;
  season_name: string;
}

// Possession details (from /api/statsbomb/possession-details)
export type Scope = "match" | "season_avg";
export type Side = "team" | "opponent";
export type MetricFormat = "minutes" | "int" | "int_avg" | "dec2" | "dec3" | "pct";

export interface MetricDefinition {
  label: string;
  key: string;
  rankKey?: string;
  matchFormat: MetricFormat;
  seasonFormat?: MetricFormat;
}

export interface ScopeRow {
  scope: Scope;
  side: Side;
  [key: string]: string | number | null | undefined;
}

export interface PossessionDetailsResponse {
  buildUp: ScopeRow[];
  transitions: ScopeRow[];
  goalkeeper: ScopeRow[];
  setPieces: (ScopeRow & { sp_type?: string | null })[];
}
