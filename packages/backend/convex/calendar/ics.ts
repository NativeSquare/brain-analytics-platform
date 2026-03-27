/**
 * ICS (iCalendar / RFC 5545) generation utility for calendar feed.
 *
 * Generates valid iCalendar output without external dependencies.
 * @see https://datatracker.ietf.org/doc/html/rfc5545
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IcsEvent {
  /** Stable unique identifier (Convex document _id) */
  uid: string;
  /** Event name */
  summary: string;
  /** Optional description */
  description?: string;
  /** Optional location */
  location?: string;
  /** Start time as Unix timestamp (ms) */
  startsAt: number;
  /** End time as Unix timestamp (ms) */
  endsAt: number;
  /** Event type for CATEGORIES field */
  eventType: string;
  /** Creation / modification timestamp (ms) */
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a Unix timestamp (ms) as an iCalendar UTC datetime string.
 * Output: `YYYYMMDDTHHMMSSZ`
 */
export function formatIcsDate(timestampMs: number): string {
  const d = new Date(timestampMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape text values per RFC 5545 §3.3.11:
 * - Backslashes → \\
 * - Semicolons → \;
 * - Commas → \,
 * - Newlines → \n
 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\r/g, "\\n")
    .replace(/\n/g, "\\n");
}

/**
 * Fold a content line per RFC 5545 §3.1.
 * Lines longer than 75 octets are split with CRLF followed by a single
 * whitespace character (linear white space).
 */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  parts.push(line.slice(0, 75));
  let remaining = line.slice(75);
  while (remaining.length > 0) {
    // 74 chars because the leading space counts as 1 octet
    parts.push(remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return parts.join("\r\n ");
}

/**
 * Map event type to a human-readable CATEGORIES value.
 */
const EVENT_TYPE_CATEGORY: Record<string, string> = {
  match: "Match",
  training: "Training",
  meeting: "Meeting",
  rehab: "Rehab",
};

// ---------------------------------------------------------------------------
// VEVENT formatting
// ---------------------------------------------------------------------------

/**
 * Format a single event as an RFC 5545 VEVENT component.
 */
export function formatVEvent(event: IcsEvent): string {
  const lines: string[] = [
    "BEGIN:VEVENT",
    foldLine(`UID:${event.uid}`),
    foldLine(`DTSTAMP:${formatIcsDate(event.createdAt)}`),
    foldLine(`DTSTART:${formatIcsDate(event.startsAt)}`),
    foldLine(`DTEND:${formatIcsDate(event.endsAt)}`),
    foldLine(`SUMMARY:${escapeIcsText(event.summary)}`),
  ];

  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeIcsText(event.description)}`));
  }

  if (event.location) {
    lines.push(foldLine(`LOCATION:${escapeIcsText(event.location)}`));
  }

  const category = EVENT_TYPE_CATEGORY[event.eventType] ?? event.eventType;
  lines.push(foldLine(`CATEGORIES:${escapeIcsText(category)}`));

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

// ---------------------------------------------------------------------------
// VCALENDAR generation
// ---------------------------------------------------------------------------

/**
 * Generate a complete iCalendar document from an array of events.
 *
 * @param events - Array of events to include. Cancelled events should be
 *   pre-filtered before calling this function.
 * @param calendarName - Display name for the calendar (X-WR-CALNAME).
 * @returns A valid RFC 5545 iCalendar string.
 */
export function generateIcsCalendar(
  events: IcsEvent[],
  calendarName: string,
): string {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    foldLine("PRODID:-//BrainAnalytics//Calendar Feed//EN"),
    "CALSCALE:GREGORIAN",
    foldLine(`X-WR-CALNAME:${escapeIcsText(calendarName)}`),
  ].join("\r\n");

  const vevents = events.map(formatVEvent).join("\r\n");

  const footer = "END:VCALENDAR";

  if (events.length === 0) {
    return `${header}\r\n${footer}\r\n`;
  }

  return `${header}\r\n${vevents}\r\n${footer}\r\n`;
}
