// ---------- Types for the Heat Maps dashboard ----------

export interface TeamOption {
  team_id: number;
  team_name: string;
}

export interface SeasonOption {
  season_id: number;
  season_name: string;
}

export interface MatchRow {
  match_id: number;
  season_id: number | null;
  match_label: string;
  team_name: string;
  opponent_team_name: string;
  team_id: number;
  opponent_team_id: number;
  match_date: string;
  venue: string;
}

export type MatchOption = MatchRow & {
  label: string;
};

/** Raw event row from the /api/statsbomb/events endpoint */
export interface RawEvent {
  event_id: string;
  match_id: number;
  index: number;
  period: number;
  team_id: number;
  team: string;
  event_type_id: number;
  type: string;
  minute: number;
  second: number;
  timestamp: string;
  location_x: number | null;
  location_y: number | null;
  player_id: number | null;
  player_name: string | null;
  under_pressure: boolean | null;
  obv_for_net: number | null;
  obv_total_net: number | null;
  pass_recipient_id: number | null;
  pass_recipient_name: string | null;
  pass_outcome: string | null;
  pass_end_location_x: number | null;
  pass_end_location_y: number | null;
  substitution_replacement_id: number | null;
  shot_outcome: string | null;
  shot_statsbomb_xg: number | null;
  foul_committed_card_name: string | null;
  bad_behaviour_card_name: string | null;
  event_time: number | null;
  period_start_seconds: number;
}
