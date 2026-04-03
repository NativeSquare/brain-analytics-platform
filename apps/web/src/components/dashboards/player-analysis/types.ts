// ---------------------------------------------------------------------------
// Player Analysis Dashboard – shared types
// ---------------------------------------------------------------------------

/** Position role buckets for metric selection */
export type PositionRole = "Forward" | "Midfielder" | "Defender" | "Goalkeeper";

/** A single metric definition used across tables / charts */
export interface MetricDefinition {
  /** Column key in the stats object (e.g. "player_season_np_xg") */
  key: string;
  /** Human-readable label */
  label: string;
  /** When true, lower values are better (e.g. goals conceded) */
  inverted?: boolean;
}

/** Result of a percentile calculation for one metric */
export interface PercentileResult {
  value: number;
  percentile: number;
  leagueAvg: number;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

/**
 * Row returned by GET /api/statsbomb/player-season-stats
 * Uses `p.*` from silver.player_season_stats + gold.players join fields.
 * All metric columns follow the pattern player_season_<metric> (total)
 * and player_season_<metric>_90 (per 90).
 */
export interface PlayerSeasonStats {
  // Identity
  competition_id: number;
  season_id: number;
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  competition_name: string;
  season_name: string;
  primary_position: string | null;
  secondary_position: string | null;
  player_first_name: string | null;
  player_last_name: string | null;
  player_known_name: string | null;
  player_height: number | null;
  player_weight: number | null;
  birth_date: string | null;
  player_female: boolean | null;

  // gold.players join
  date_of_birth: string | null;
  height: number | null;
  weight: number | null;
  country_name: string | null;
  gender: string | null;

  // Minutes
  player_season_minutes: number;

  // All metrics – typed loosely since there are 100+ columns
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Row returned by GET /api/statsbomb/league-player-season-stats
 * Same shape as player_season_stats but without gold.players join.
 */
export interface LeaguePlayerStats {
  competition_id: number;
  season_id: number;
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  primary_position: string | null;
  player_season_minutes: number;
  [key: string]: string | number | boolean | null | undefined;
}

/** Selection passed from filters to orchestrator */
export interface PlayerSelection {
  playerId: string;
  competitionId: string;
  seasonId: string;
}

/** Player search result from the players API */
export interface PlayerSearchResult {
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  primary_position: string | null;
  player_season_minutes: number;
}
