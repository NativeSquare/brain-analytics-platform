import type {
  LeaguePlayerStats,
  MetricDefinition,
  PercentileResult,
  PlayerSeasonStats,
} from "./types";
import { MIN_QUALIFYING_PLAYERS } from "./constants";

// ---------------------------------------------------------------------------
// Core percentile calculation
// ---------------------------------------------------------------------------

/**
 * Calculate what percentile `playerValue` falls in among `allValues`.
 * If `invert` is true, lower is better (value is flipped).
 * Returns a number 0-100.
 */
export function calculatePercentile(
  playerValue: number,
  allValues: number[],
  invert?: boolean,
): number {
  const valid = allValues.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return 50;

  const countBelow = valid.filter((v) =>
    invert ? v > playerValue : v < playerValue,
  ).length;

  return Math.round((countBelow / valid.length) * 100);
}

// ---------------------------------------------------------------------------
// Batch percentile calculation
// ---------------------------------------------------------------------------

/**
 * Safely reads a numeric value from a stats record.
 */
function readMetricValue(
  stats: PlayerSeasonStats | LeaguePlayerStats,
  key: string,
): number {
  const raw = stats[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * Derive the per-90 key from a raw total key.
 * If the key already ends with "_90", return it as-is.
 * If the key ends with "_ratio" or "_per_shot", return it as-is (already a rate).
 */
function per90Key(key: string): string {
  if (key.endsWith("_90") || key.endsWith("_ratio") || key.endsWith("_per_shot")) {
    return key;
  }
  return `${key}_90`;
}

/**
 * Compute percentiles for all provided metrics for a single player
 * versus the league.
 */
export function calculateAllPercentiles(
  playerStats: PlayerSeasonStats,
  leagueStats: LeaguePlayerStats[],
  metrics: MetricDefinition[],
): Record<string, PercentileResult> {
  const result: Record<string, PercentileResult> = {};

  for (const metric of metrics) {
    const p90Key = per90Key(metric.key);
    const playerValue = readMetricValue(playerStats, p90Key);

    const allValues = leagueStats.map((lp) => readMetricValue(lp, p90Key));
    const validValues = allValues.filter((v) => Number.isFinite(v));

    if (validValues.length < MIN_QUALIFYING_PLAYERS) {
      result[metric.key] = { value: playerValue, percentile: -1, leagueAvg: 0 };
      continue;
    }

    const percentile = calculatePercentile(playerValue, validValues, metric.inverted);
    const leagueAvg =
      validValues.length > 0
        ? validValues.reduce((a, b) => a + b, 0) / validValues.length
        : 0;

    result[metric.key] = { value: playerValue, percentile, leagueAvg };
  }

  return result;
}

/**
 * Read a raw total value from stats.
 */
export function readRawValue(
  stats: PlayerSeasonStats | LeaguePlayerStats,
  key: string,
): number {
  return readMetricValue(stats, key);
}

/**
 * Read a per-90 value from stats.
 */
export function readPer90Value(
  stats: PlayerSeasonStats | LeaguePlayerStats,
  key: string,
): number {
  return readMetricValue(stats, per90Key(key));
}
