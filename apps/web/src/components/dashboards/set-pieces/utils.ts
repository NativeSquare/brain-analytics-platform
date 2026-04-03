/**
 * Parse a timestamp string (HH:MM:SS.fff) into total seconds.
 */
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

/**
 * Return the approximate match minute from a timestamp and period.
 */
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
