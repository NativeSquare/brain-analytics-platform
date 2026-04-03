// ---------- Types for the Referee Analysis dashboard ----------

/** Row returned by /api/statsbomb/referee-analysis (fouls array) */
export interface RefereeRow {
  match_id: number;
  match_date: string | null;
  match_label: string | null;
  fouls_home: number | null;
  fouls_away: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  penalties: number | null;
}

/** Totals block returned by /api/statsbomb/referee-analysis */
export interface RefereeTotals {
  referee_id: number;
  referee_name: string | null;
  matches: number;
  fouls: number;
  fouls_per_match: number;
  advantages: number;
  advantages_per_match: number;
  yellow_cards: number;
  yellow_cards_per_match: number;
  second_yellow_cards: number;
  second_yellow_cards_per_match: number;
  straight_red_cards: number;
  straight_red_cards_per_match: number;
  red_cards: number;
  red_cards_per_match: number;
  penalties: number;
  penalties_per_match: number;
}

/** League totals from /api/statsbomb/referee-analysis */
export interface LeagueTotals {
  fouls_per_match: number;
  advantages_per_match: number;
  yellow_cards_per_match: number;
  second_yellow_cards_per_match: number;
  straight_red_cards_per_match: number;
  red_cards_per_match: number;
  penalties_per_match: number;
}

/** Full response from /api/statsbomb/referee-analysis */
export interface RefereeAnalysisResponse {
  competitions: CompetitionOption[];
  referees: RefereeOption[];
  active_referee_id: number | null;
  leagueTotals: LeagueTotals | null;
  totals: RefereeTotals | null;
  fouls: RefereeRow[];
  refereeAverages: RefereeTotals[];
}

/** Summary data from /api/statsbomb/referee-summary */
export interface RefereeSummary {
  referee_id: number;
  referee_name: string | null;
  total_matches: number | null;
  avg_fouls_per_game: number | null;
  avg_yellow_cards_per_game: number | null;
  avg_red_cards_per_game: number | null;
}

/** Competition dropdown option */
export interface CompetitionOption {
  competition_id: number;
  competition_name: string | null;
}

/** Referee dropdown option */
export interface RefereeOption {
  referee_id: number;
  referee_name: string | null;
}
