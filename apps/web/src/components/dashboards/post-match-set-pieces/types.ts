// Re-export the SetPiece type from the main set-pieces dashboard
export type { SetPiece, MatchRow, MatchOption } from "../set-pieces/types";

/** Team option */
export interface TeamOption {
  team_id: number;
  team_name: string;
}

/** Season option */
export interface SeasonOption {
  season_id: number;
  season_name: string;
}
