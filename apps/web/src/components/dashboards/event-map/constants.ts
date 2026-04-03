import type { EventType, Zone, Channel } from "./types";

// ---------------------------------------------------------------------------
// Event type tab definitions
// ---------------------------------------------------------------------------

export const EVENT_TYPE_TABS: {
  key: EventType;
  label: string;
  color: string;
  /** Matches against the `type` field returned by events.sql */
  matchType: string;
}[] = [
  {
    key: "interceptions",
    label: "Interceptions",
    color: "#3b82f6", // blue-500
    matchType: "Interception",
  },
  {
    key: "fouls",
    label: "Fouls",
    color: "#ef4444", // red-500
    matchType: "Foul Committed",
  },
  {
    key: "regains",
    label: "Regains",
    color: "#22c55e", // green-500
    matchType: "Ball Recovery",
  },
];

export function getEventColor(eventType: EventType): string {
  return EVENT_TYPE_TABS.find((t) => t.key === eventType)?.color ?? "#6b7280";
}

export function getMatchTypeForTab(eventType: EventType): string {
  return (
    EVENT_TYPE_TABS.find((t) => t.key === eventType)?.matchType ?? ""
  );
}

// ---------------------------------------------------------------------------
// Zone / channel classification
// ---------------------------------------------------------------------------

export function classifyZone(statsbomb_x: number): Zone {
  if (statsbomb_x >= 80) return "ATT";
  if (statsbomb_x >= 40) return "MID";
  return "DEF";
}

export function classifyChannel(statsbomb_y: number): Channel {
  if (statsbomb_y < 26.67) return "Left";
  if (statsbomb_y < 53.33) return "Central";
  return "Right";
}

export function describeLocation(x: number, y: number): string {
  const zone = classifyZone(x);
  const channel = classifyChannel(y);
  const zoneLabel =
    zone === "ATT"
      ? "Attacking Third"
      : zone === "MID"
        ? "Middle Third"
        : "Defensive Third";
  return `${zoneLabel} - ${channel} Channel`;
}

// ---------------------------------------------------------------------------
// Coordinate mapping: StatsBomb (120x80 horizontal) -> SVG (80x120 vertical)
// ---------------------------------------------------------------------------

export function sbToFullPitchSvg(
  sbX: number,
  sbY: number,
): { x: number; y: number } {
  return { x: sbY, y: 120 - sbX };
}

// ---------------------------------------------------------------------------
// Timestamp parsing (reuses same logic as shot-map)
// ---------------------------------------------------------------------------

export function parseTimestamp(timestamp: string | null): number | null {
  if (!timestamp) return null;
  const parts = timestamp.split(":");
  if (parts.length !== 3) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secondsWithMs = parts[2];
  const secondsParts = secondsWithMs.split(".");
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = secondsParts[1]
    ? parseFloat(`0.${secondsParts[1]}`)
    : 0;

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
  return hours * 3600 + minutes * 60 + seconds + milliseconds;
}

// ---------------------------------------------------------------------------
// Minute display helper
// ---------------------------------------------------------------------------

export function formatMinute(
  minute: number,
  second: number,
  period?: number,
): string {
  // Extra time display: 45+X' or 90+X'
  if (period === 1 && minute >= 45) return `45+${minute - 45}'`;
  if (period === 2 && minute >= 90) return `90+${minute - 90}'`;
  if (period === 3 && minute >= 105) return `105+${minute - 105}'`;
  if (period === 4 && minute >= 120) return `120+${minute - 120}'`;
  return `${minute}'`;
}
