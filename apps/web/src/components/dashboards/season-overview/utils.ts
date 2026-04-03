import type { SeasonPointsData, FormCode, PerformanceSplit } from "./types";

export const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatSigned = (value: number, digits = 2): string => {
  const rounded = Number(value.toFixed(digits));
  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(digits)}`;
};

export const formatPpg = (value: number): string => value.toFixed(2);

export const getResultCode = (points: unknown): FormCode => {
  const value = toNumber(points);
  if (value >= 3) return "W";
  if (value >= 1) return "D";
  return "L";
};

export const getVenueCode = (
  venue: string | null | undefined,
): "home" | "away" | null => {
  if (!venue) return null;
  const normalized = venue.toLowerCase();
  if (normalized === "home") return "home";
  if (normalized === "away") return "away";
  return null;
};

export const buildSplit = (rows: SeasonPointsData[]): PerformanceSplit => {
  const games = rows.length;
  const wins = rows.filter((row) => getResultCode(row.points) === "W").length;
  const draws = rows.filter((row) => getResultCode(row.points) === "D").length;
  const losses = rows.filter((row) => getResultCode(row.points) === "L").length;
  const points = rows.reduce((sum, row) => sum + toNumber(row.points), 0);
  const goalsFor = rows.reduce(
    (sum, row) => sum + toNumber(row.goals_scored),
    0,
  );
  const goalsAgainst = rows.reduce(
    (sum, row) => sum + toNumber(row.goals_conceded),
    0,
  );

  return {
    games,
    wins,
    draws,
    losses,
    points,
    ppg: games > 0 ? points / games : 0,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
  };
};

export const classifyPace = (projectedPoints: number): string => {
  if (projectedPoints >= 71.3) return "Automatic Promotion";
  if (projectedPoints >= 53.3) return "Playoff";
  if (projectedPoints >= 41.5) return "Mid-table";
  if (projectedPoints >= 38.5) return "Relegation Play-out";
  return "Relegation";
};

export const TOTAL_GAMES = 38;

export const sortByMatchWeek = (
  data: SeasonPointsData[],
): SeasonPointsData[] =>
  [...data].sort((a, b) => {
    const weekA = a.match_week ?? Number.MAX_SAFE_INTEGER;
    const weekB = b.match_week ?? Number.MAX_SAFE_INTEGER;
    if (weekA !== weekB) return weekA - weekB;
    return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
  });
