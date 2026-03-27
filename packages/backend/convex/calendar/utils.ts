import { addDays, addWeeks, addMonths } from "date-fns";
import type { RecurrenceFrequency } from "@packages/shared/calendar";

/**
 * Compute all occurrence start/end timestamps for a recurring event series.
 *
 * Includes the original date as the first occurrence. Stops when
 * `startsAt` of the next occurrence exceeds `seriesEndDate`, or when
 * `maxOccurrences` is reached (safety cap).
 */
export function computeOccurrenceDates(
  startsAt: number,
  endsAt: number,
  frequency: RecurrenceFrequency,
  seriesEndDate: number,
  maxOccurrences = 365,
): Array<{ startsAt: number; endsAt: number }> {
  const duration = endsAt - startsAt;
  const occurrences: Array<{ startsAt: number; endsAt: number }> = [];
  let currentStart = new Date(startsAt);

  while (
    currentStart.getTime() <= seriesEndDate &&
    occurrences.length < maxOccurrences
  ) {
    const occStartMs = currentStart.getTime();
    occurrences.push({ startsAt: occStartMs, endsAt: occStartMs + duration });

    switch (frequency) {
      case "daily":
        currentStart = addDays(currentStart, 1);
        break;
      case "weekly":
        currentStart = addWeeks(currentStart, 1);
        break;
      case "biweekly":
        currentStart = addWeeks(currentStart, 2);
        break;
      case "monthly":
        currentStart = addMonths(currentStart, 1);
        break;
    }
  }

  return occurrences;
}
