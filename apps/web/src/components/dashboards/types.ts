export type PitchEvent = {
  event_id: string;
  period: number;
  timestamp: string;
  location_x: number;
  location_y: number;
  player_name: string;
  match_date: string;
  opponent_team_name: string;
  pass_end_location_x?: number;
  pass_end_location_y?: number;
  pass_recipient_name?: string;
};

export type EventType =
  | "pressures"
  | "buildup"
  | "underPressure"
  | "interceptions";
