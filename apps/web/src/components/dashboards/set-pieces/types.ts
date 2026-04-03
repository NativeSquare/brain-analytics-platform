// ---------- Types for the Set Pieces dashboard ----------

export interface SetPiece {
  match_id: number;
  start_event_id: number;
  team_id: number | null;
  team_name: string | null;
  period: number | null;
  start_time: string | null;
  end_time: string | null;
  sp_type: string | null;
  sp_zone: string | null;
  side: string | null;
  technique: string | null;
  taker_id: number | null;
  location_x: number | null;
  location_y: number | null;
  taker: string | null;
  shot_outcome_name: string | null;
  shot_statsbomb_xg: number | null;
  shot_shot_execution_xg: number | null;
  shot_end_location_x: number | null;
  shot_end_location_y: number | null;
  shot_end_location_z: number | null;
  delivered_first_phase: boolean | null;
  is_short: boolean | null;
  is_long_throw: boolean | null;
  is_direct_sp: boolean | null;
  target: string | null;
  shots: number | null;
  goal: number | null;
  xg: number | null;
  delivered_first_phase_player_id: number | null;
  delivered_first_phase_player: string | null;
  delivered_first_phase_event_id: number | null;
  first_phase_first_contact_player_id: number | null;
  first_phase_first_contact_player: string | null;
  first_contact_won: boolean | null;
  first_phase_first_contact_event_id: number | null;
  first_phase_first_contact_x: number | null;
  first_phase_first_contact_y: number | null;
  first_phase_first_contact_team_id: number | null;
  first_phase_first_contact_shot: boolean | null;
  first_phase_first_contact_goal: boolean | null;
  first_phase_first_contact_xg: number | null;
  second_ball_won: boolean | null;
  second_ball_event_id: number | null;
  second_ball_x: number | null;
  second_ball_y: number | null;
  penalty_event_id: number | null;
}

export interface MatchRow {
  match_id: number;
  season_id: number | null;
  match_label: string;
  selected_team_name?: string;
  opposition_team_name?: string;
  team_name?: string;
  opponent_team_name?: string;
  selected_team_id?: number | null;
  opposition_team_id?: number | null;
  team_id?: number | null;
  opponent_team_id?: number | null;
}

export type MatchOption = MatchRow & {
  label: string;
};

export interface SetPieceSummaryStats {
  total: number;
  goals: number;
  totalXg: number;
  firstContactWon: number;
  firstPhaseShots: number;
  firstPhaseGoals: number;
  shortPct: number;
  goalsPerSp: number;
  xgPerSp: number;
}

export interface ZoneStats {
  zoneId: string;
  label: string;
  count: number;
  avgXg: number;
  totalXg: number;
  goals: number;
  polygon: Array<{ x: number; y: number }>;
  centroid: { x: number; y: number };
}

export type SetPieceMode = "indirect" | "direct";
export type PitchViewMode = "individual" | "zones";
