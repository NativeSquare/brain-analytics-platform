export interface PitchEvent {
  id: string;
  event_id: number;
  match_id: number;
  minute: number;
  second: number;
  added_time?: number;
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  type: string;
  outcome?: string;
  location_x: number; // StatsBomb x (0-120)
  location_y: number; // StatsBomb y (0-80)
  period: number;
  timestamp: string;
}

export type EventType = "interceptions" | "fouls" | "regains";

export type Zone = "ATT" | "MID" | "DEF";

export type Channel = "Left" | "Central" | "Right";

export interface ZoneStats {
  zone: Zone;
  count: number;
  percentage: number;
}
