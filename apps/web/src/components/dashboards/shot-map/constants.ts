import { GOAL_HEIGHT } from "@/components/dashboards/GoalBase";

// ---- Outcome colors (matching source) ----

export const OUTCOME_COLORS: Record<string, string> = {
  Goal: "#1b5497",
  "On Target": "#c21718",
  "Off Target": "#9ca3af", // only used in legend; actual shots use CSS class
  Blocked: "#9ca3af",
} as const;

/**
 * Map raw StatsBomb outcome to display category.
 */
export function outcomeCategory(raw: string | null): string {
  if (!raw) return "Off Target";
  const lower = raw.toLowerCase();
  if (lower.includes("goal")) return "Goal";
  if (lower.includes("saved")) return "On Target";
  if (lower.includes("blocked")) return "Blocked";
  // Off T, Wayward, Post -> Off Target
  return "Off Target";
}

/**
 * Returns the fill color for a shot outcome, or null for off-target
 * (off-target shots use the `.shot-off-target` CSS class for dark mode support).
 */
export function outcomeColor(raw: string | null): string | null {
  const category = outcomeCategory(raw);
  if (category === "Off Target") return null;
  return OUTCOME_COLORS[category] ?? null;
}

// ---- xG -> circle radius ----

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function xgToRadius(xg: number): number {
  return clamp(0.9 + xg * 3.2, 0.9, 3.2);
}

// ---- Coordinate mapping ----

const HALF_START_X = 60;

export function isAttackingHalf(sbX: number): boolean {
  return sbX >= HALF_START_X;
}

/**
 * StatsBomb (120x80) -> SVG half-pitch (80x60, rotated 90deg so goal is at top).
 */
export function sbToPitchSvg(sbX: number, sbY: number): { x: number; y: number } {
  return { x: sbY, y: 120 - sbX };
}

/**
 * StatsBomb end-location -> GoalBase SVG coordinates.
 */
const GOAL_LEFT = 36;

export function sbToGoalSvg(endY: number, endZ: number): { x: number; y: number } {
  return {
    x: endY - GOAL_LEFT,
    y: GOAL_HEIGHT - endZ,
  };
}

// ---- Phase shape (reused from source) ----

export function phaseShape(phase: string | null): "circle" | "triangle" | "diamond" | "square" {
  const value = (phase ?? "").toLowerCase();
  if (value.includes("set")) return "triangle";
  if (value.includes("build")) return "circle";
  if (value.includes("contested")) return "diamond";
  if (value.includes("transition")) return "square";
  if (value.includes("open")) return "circle";
  return "diamond";
}

// ---- Timestamp parsing ----

export function parseTimestamp(timestamp: string | null): number | null {
  if (!timestamp) return null;
  const parts = timestamp.split(":");
  if (parts.length !== 3) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secondsWithMs = parts[2];
  const secondsParts = secondsWithMs.split(".");
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = secondsParts[1] ? parseFloat(`0.${secondsParts[1]}`) : 0;

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
  return hours * 3600 + minutes * 60 + seconds + milliseconds;
}

export function getMatchMinute(
  timestamp: string | null,
  period: number | string | null,
): number | null {
  if (!timestamp || period == null) return null;

  const periodNum = typeof period === "string" ? parseInt(period, 10) : period;
  if (isNaN(periodNum)) return null;

  const ts = parseTimestamp(timestamp);
  if (ts == null) return null;

  const minutes = ts / 60;
  if (periodNum === 1) return minutes;
  if (periodNum === 2) return 45 + minutes;
  if (periodNum === 3) return 90 + minutes;
  if (periodNum === 4) return 105 + minutes;
  return null;
}
