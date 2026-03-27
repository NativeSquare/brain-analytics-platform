import { describe, expect, it } from "vitest";
import { computeOccurrenceDates } from "../utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

function ms(year: number, month: number, day: number, hour = 10, minute = 0) {
  return new Date(year, month, day, hour, minute).getTime();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeOccurrenceDates", () => {
  it("daily frequency generates correct count", () => {
    const startsAt = ms(2026, 2, 1); // Mar 1 10:00
    const endsAt = startsAt + ONE_HOUR_MS; // Mar 1 11:00
    const seriesEnd = ms(2026, 2, 7, 23, 59); // Mar 7 23:59

    const result = computeOccurrenceDates(startsAt, endsAt, "daily", seriesEnd);
    expect(result).toHaveLength(7); // Mar 1-7
    // First occurrence is the original date
    expect(result[0].startsAt).toBe(startsAt);
    // Second is next day
    expect(result[1].startsAt).toBe(startsAt + ONE_DAY_MS);
  });

  it("weekly generates every 7 days", () => {
    const startsAt = ms(2026, 5, 1); // Jun 1 (no DST transition)
    const endsAt = startsAt + ONE_HOUR_MS;
    const seriesEnd = ms(2026, 5, 29, 23, 59); // Jun 29

    const result = computeOccurrenceDates(
      startsAt,
      endsAt,
      "weekly",
      seriesEnd,
    );
    // Jun 1, 8, 15, 22, 29 = 5 weeks
    expect(result).toHaveLength(5);

    // Verify calendar dates advance by 7 days each
    const dates = result.map((o) => new Date(o.startsAt));
    expect(dates[0].getDate()).toBe(1);
    expect(dates[1].getDate()).toBe(8);
    expect(dates[2].getDate()).toBe(15);
    expect(dates[3].getDate()).toBe(22);
    expect(dates[4].getDate()).toBe(29);
    // All preserve time of day
    for (const d of dates) {
      expect(d.getHours()).toBe(10);
      expect(d.getMinutes()).toBe(0);
    }
  });

  it("bi-weekly generates every 14 days", () => {
    const startsAt = ms(2026, 5, 1); // Jun 1
    const endsAt = startsAt + ONE_HOUR_MS;
    const seriesEnd = ms(2026, 7, 10, 23, 59); // Aug 10

    const result = computeOccurrenceDates(
      startsAt,
      endsAt,
      "biweekly",
      seriesEnd,
    );
    // Jun 1, Jun 15, Jun 29, Jul 13, Jul 27, Aug 10 = 6
    expect(result).toHaveLength(6);

    const dates = result.map((o) => new Date(o.startsAt));
    expect(dates[0].getDate()).toBe(1);
    expect(dates[1].getDate()).toBe(15);
    expect(dates[2].getDate()).toBe(29);
    expect(dates[3].getDate()).toBe(13);
    expect(dates[4].getDate()).toBe(27);
    expect(dates[5].getDate()).toBe(10);
  });

  it("monthly handles month-end edge cases (Jan 31 -> Feb 28)", () => {
    // 2026 is NOT a leap year
    const startsAt = ms(2026, 0, 31); // Jan 31
    const endsAt = startsAt + ONE_HOUR_MS;
    const seriesEnd = ms(2026, 5, 30, 23, 59); // Jun 30

    const result = computeOccurrenceDates(
      startsAt,
      endsAt,
      "monthly",
      seriesEnd,
    );

    // Jan 31, Feb 28, Mar 28, Apr 28, May 28, Jun 28 — date-fns clamps to last day
    expect(result.length).toBeGreaterThanOrEqual(5);

    // Feb occurrence should be Feb 28 (not 31)
    const febOcc = new Date(result[1].startsAt);
    expect(febOcc.getMonth()).toBe(1); // February
    expect(febOcc.getDate()).toBe(28);
  });

  it("stops at seriesEndDate boundary", () => {
    const startsAt = ms(2026, 2, 1); // Mar 1 10:00
    const endsAt = startsAt + ONE_HOUR_MS;
    // End date is before the 3rd occurrence would start (Mar 3 09:00)
    const seriesEnd = ms(2026, 2, 3, 9, 0);

    const result = computeOccurrenceDates(startsAt, endsAt, "daily", seriesEnd);
    // Mar 1 (10:00), Mar 2 (10:00) — Mar 3 (10:00) > seriesEnd (09:00) so excluded
    expect(result).toHaveLength(2);
  });

  it("preserves event duration across all occurrences", () => {
    const duration = 2 * ONE_HOUR_MS; // 2 hours
    const startsAt = ms(2026, 2, 1);
    const endsAt = startsAt + duration;
    const seriesEnd = ms(2026, 2, 5, 23, 59);

    const result = computeOccurrenceDates(startsAt, endsAt, "daily", seriesEnd);
    for (const occ of result) {
      expect(occ.endsAt - occ.startsAt).toBe(duration);
    }
  });

  it("caps at 365 occurrences maximum", () => {
    const startsAt = ms(2024, 0, 1); // Jan 1 2024
    const endsAt = startsAt + ONE_HOUR_MS;
    // 2 years out — would be 730+ daily occurrences
    const seriesEnd = ms(2025, 11, 31, 23, 59);

    const result = computeOccurrenceDates(startsAt, endsAt, "daily", seriesEnd);
    expect(result).toHaveLength(365);
  });

  it("includes original date as first occurrence", () => {
    const startsAt = ms(2026, 5, 15, 14, 30); // Jun 15 14:30
    const endsAt = startsAt + 90 * 60 * 1000; // 90 min
    const seriesEnd = ms(2026, 6, 15, 23, 59);

    const result = computeOccurrenceDates(
      startsAt,
      endsAt,
      "weekly",
      seriesEnd,
    );
    expect(result[0].startsAt).toBe(startsAt);
    expect(result[0].endsAt).toBe(endsAt);
  });

  it("returns single occurrence when seriesEnd equals startsAt", () => {
    const startsAt = ms(2026, 2, 1, 10, 0);
    const endsAt = startsAt + ONE_HOUR_MS;
    const seriesEnd = startsAt; // Same instant

    const result = computeOccurrenceDates(startsAt, endsAt, "daily", seriesEnd);
    expect(result).toHaveLength(1);
    expect(result[0].startsAt).toBe(startsAt);
  });
});
