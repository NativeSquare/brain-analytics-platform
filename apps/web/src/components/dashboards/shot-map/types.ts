// ---------- Types for the Shot Map dashboard ----------

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

export interface Shot {
  event_id: number;
  location_x: number | null;
  location_y: number | null;
  player_name: string | null;
  team_name: string | null;
  team_id: number | null;
  match_id?: number | null;
  match_date?: string | null;
  selected_team_name?: string | null;
  opposition_team_name?: string | null;
  period: number | null;
  timestamp: string | null;
  under_pressure: boolean | null;
  shot_body_part_name: string | null;
  shot_end_location_x: number | null;
  shot_end_location_y: number | null;
  shot_end_location_z: number | null;
  shot_first_time: boolean | null;
  shot_gk_positioning_xg_suppression: number | null;
  shot_gk_save_difficulty_xg: number | null;
  shot_gk_shot_stopping_xg_suppression: number | null;
  shot_outcome_name: string | null;
  shot_shot_execution_xg: number | null;
  shot_shot_execution_xg_uplift: number | null;
  shot_statsbomb_xg: number | null;
  shot_technique_name: string | null;
  shot_type_name: string | null;
  phase: string | null;
  set_piece_type: string | null;
  penalty_won?: number | null;
  penalty_scored?: number | null;
  penalty_xg?: number | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface SummaryStats {
  goals: number;
  nonPenaltyGoals: number;
  nonPenaltyShots: number;
  avgGoalPerShot: number;
  totalXg: number;
  avgXg: number;
  totalNpxg: number;
  avgNpxg: number;
  avgDistance: number;
}

export type ViewMode = "pitch" | "goal";
