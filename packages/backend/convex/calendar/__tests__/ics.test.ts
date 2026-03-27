import { describe, expect, it } from "vitest";
import {
  escapeIcsText,
  formatIcsDate,
  formatVEvent,
  generateIcsCalendar,
} from "../ics";
import type { IcsEvent } from "../ics";

// ---------------------------------------------------------------------------
// formatIcsDate
// ---------------------------------------------------------------------------

describe("formatIcsDate", () => {
  it("formats a UTC timestamp correctly", () => {
    // 2026-03-20T10:30:00Z
    const ts = Date.UTC(2026, 2, 20, 10, 30, 0);
    expect(formatIcsDate(ts)).toBe("20260320T103000Z");
  });

  it("pads single-digit values with leading zeros", () => {
    // 2026-01-05T03:07:09Z
    const ts = Date.UTC(2026, 0, 5, 3, 7, 9);
    expect(formatIcsDate(ts)).toBe("20260105T030709Z");
  });

  it("handles midnight correctly", () => {
    const ts = Date.UTC(2026, 11, 31, 0, 0, 0);
    expect(formatIcsDate(ts)).toBe("20261231T000000Z");
  });
});

// ---------------------------------------------------------------------------
// escapeIcsText
// ---------------------------------------------------------------------------

describe("escapeIcsText", () => {
  it("escapes backslashes", () => {
    expect(escapeIcsText("path\\file")).toBe("path\\\\file");
  });

  it("escapes semicolons", () => {
    expect(escapeIcsText("item;item")).toBe("item\\;item");
  });

  it("escapes commas", () => {
    expect(escapeIcsText("a, b, c")).toBe("a\\, b\\, c");
  });

  it("escapes newlines (LF)", () => {
    expect(escapeIcsText("line1\nline2")).toBe("line1\\nline2");
  });

  it("escapes newlines (CRLF)", () => {
    expect(escapeIcsText("line1\r\nline2")).toBe("line1\\nline2");
  });

  it("escapes carriage returns (CR)", () => {
    expect(escapeIcsText("line1\rline2")).toBe("line1\\nline2");
  });

  it("handles multiple special chars together", () => {
    expect(escapeIcsText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });

  it("returns plain text unchanged", () => {
    expect(escapeIcsText("Hello World")).toBe("Hello World");
  });
});

// ---------------------------------------------------------------------------
// formatVEvent
// ---------------------------------------------------------------------------

describe("formatVEvent", () => {
  const baseEvent: IcsEvent = {
    uid: "event_abc123",
    summary: "Sprint Review",
    startsAt: Date.UTC(2026, 2, 20, 10, 0, 0),
    endsAt: Date.UTC(2026, 2, 20, 11, 0, 0),
    eventType: "meeting",
    createdAt: Date.UTC(2026, 2, 15, 8, 0, 0),
  };

  it("produces a valid VEVENT with required fields", () => {
    const output = formatVEvent(baseEvent);
    expect(output).toContain("BEGIN:VEVENT");
    expect(output).toContain("END:VEVENT");
    expect(output).toContain("UID:event_abc123");
    expect(output).toContain("DTSTART:20260320T100000Z");
    expect(output).toContain("DTEND:20260320T110000Z");
    expect(output).toContain("SUMMARY:Sprint Review");
    expect(output).toContain("DTSTAMP:20260315T080000Z");
    expect(output).toContain("CATEGORIES:Meeting");
  });

  it("includes DESCRIPTION when present", () => {
    const event = { ...baseEvent, description: "Review the sprint goals" };
    const output = formatVEvent(event);
    expect(output).toContain("DESCRIPTION:Review the sprint goals");
  });

  it("omits DESCRIPTION when absent", () => {
    const output = formatVEvent(baseEvent);
    expect(output).not.toContain("DESCRIPTION:");
  });

  it("includes LOCATION when present", () => {
    const event = { ...baseEvent, location: "Room 42" };
    const output = formatVEvent(event);
    expect(output).toContain("LOCATION:Room 42");
  });

  it("omits LOCATION when absent", () => {
    const output = formatVEvent(baseEvent);
    expect(output).not.toContain("LOCATION:");
  });

  it("maps event types to correct CATEGORIES", () => {
    expect(formatVEvent({ ...baseEvent, eventType: "match" })).toContain(
      "CATEGORIES:Match",
    );
    expect(formatVEvent({ ...baseEvent, eventType: "training" })).toContain(
      "CATEGORIES:Training",
    );
    expect(formatVEvent({ ...baseEvent, eventType: "meeting" })).toContain(
      "CATEGORIES:Meeting",
    );
    expect(formatVEvent({ ...baseEvent, eventType: "rehab" })).toContain(
      "CATEGORIES:Rehab",
    );
  });

  it("escapes special characters in SUMMARY", () => {
    const event = { ...baseEvent, summary: "Team A; vs Team B, Final" };
    const output = formatVEvent(event);
    expect(output).toContain("SUMMARY:Team A\\; vs Team B\\, Final");
  });

  it("escapes special characters in DESCRIPTION", () => {
    const event = {
      ...baseEvent,
      description: "Line 1\nLine 2; with, commas",
    };
    const output = formatVEvent(event);
    expect(output).toContain(
      "DESCRIPTION:Line 1\\nLine 2\\; with\\, commas",
    );
  });
});

// ---------------------------------------------------------------------------
// generateIcsCalendar
// ---------------------------------------------------------------------------

describe("generateIcsCalendar", () => {
  const sampleEvent: IcsEvent = {
    uid: "event_001",
    summary: "Training Session",
    startsAt: Date.UTC(2026, 2, 20, 9, 0, 0),
    endsAt: Date.UTC(2026, 2, 20, 10, 30, 0),
    eventType: "training",
    createdAt: Date.UTC(2026, 2, 10, 12, 0, 0),
  };

  it("produces valid VCALENDAR wrapper", () => {
    const output = generateIcsCalendar([sampleEvent], "FC Example Events");
    expect(output).toContain("BEGIN:VCALENDAR");
    expect(output).toContain("END:VCALENDAR");
    expect(output).toContain("VERSION:2.0");
    expect(output).toContain("PRODID:-//BrainAnalytics//Calendar Feed//EN");
    expect(output).toContain("CALSCALE:GREGORIAN");
    expect(output).toContain("X-WR-CALNAME:FC Example Events");
  });

  it("includes VEVENT components for each event", () => {
    const events = [
      sampleEvent,
      {
        ...sampleEvent,
        uid: "event_002",
        summary: "Match Day",
        eventType: "match",
      },
    ];
    const output = generateIcsCalendar(events, "Test Team");

    // Count VEVENT blocks
    const veventCount = (output.match(/BEGIN:VEVENT/g) || []).length;
    expect(veventCount).toBe(2);
    expect(output).toContain("SUMMARY:Training Session");
    expect(output).toContain("SUMMARY:Match Day");
  });

  it("produces a valid but empty calendar when no events", () => {
    const output = generateIcsCalendar([], "Empty Calendar");
    expect(output).toContain("BEGIN:VCALENDAR");
    expect(output).toContain("END:VCALENDAR");
    expect(output).toContain("VERSION:2.0");
    expect(output).not.toContain("BEGIN:VEVENT");
  });

  it("escapes calendar name in X-WR-CALNAME", () => {
    const output = generateIcsCalendar([], "Team A, The Best; Club");
    expect(output).toContain(
      "X-WR-CALNAME:Team A\\, The Best\\; Club",
    );
  });

  it("uses CRLF line endings per RFC 5545", () => {
    const output = generateIcsCalendar([sampleEvent], "Test");
    // Check that lines are separated by \r\n
    expect(output).toContain("\r\n");
    // Ensure no bare \n without \r
    const lines = output.split("\r\n");
    for (const line of lines) {
      // After splitting on \r\n, no line should contain standalone \n
      expect(line).not.toMatch(/[^\r]\n/);
    }
  });
});
