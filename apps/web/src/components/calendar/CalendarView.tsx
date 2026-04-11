"use client";

import "temporal-polyfill/global";
import "@schedule-x/theme-shadcn/dist/index.css";
import { memo, useEffect, useMemo, useRef } from "react";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import { createViewMonthGrid } from "@schedule-x/calendar";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createCurrentTimePlugin } from "@schedule-x/current-time";
import { format } from "date-fns";

import { Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EventTypeBadge } from "@/components/shared/EventTypeBadge";
import type { EventType } from "@/components/shared/EventTypeBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  _id: string;
  name: string;
  eventType: EventType;
  startsAt: number;
  endsAt: number;
  location?: string;
  description?: string;
  isRecurring?: boolean;
}

interface CalendarViewProps {
  events: CalendarEvent[] | undefined;
  onEventClick: (eventId: string) => void;
  onDateClick: (timestamp: number) => void;
  onMonthChange: (year: number, month: number) => void;
}

// ---------------------------------------------------------------------------
// Color mappings — calendarId ↔ Schedule-X CalendarType colors
// ---------------------------------------------------------------------------

const CALENDAR_TYPES = {
  match: {
    colorName: "match",
    lightColors: { main: "#dc2626", container: "#fee2e2", onContainer: "#991b1b" },
    darkColors: { main: "#f87171", container: "#7f1d1d30", onContainer: "#fca5a5" },
  },
  training: {
    colorName: "training",
    lightColors: { main: "#16a34a", container: "#dcfce7", onContainer: "#166534" },
    darkColors: { main: "#4ade80", container: "#14532d30", onContainer: "#86efac" },
  },
  meeting: {
    colorName: "meeting",
    lightColors: { main: "#2563eb", container: "#dbeafe", onContainer: "#1e40af" },
    darkColors: { main: "#60a5fa", container: "#1e3a5f30", onContainer: "#93bbfd" },
  },
  rehab: {
    colorName: "rehab",
    lightColors: { main: "#ea580c", container: "#ffedd5", onContainer: "#9a3412" },
    darkColors: { main: "#fb923c", container: "#7c2d1230", onContainer: "#fdba74" },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert Unix ms timestamp → Temporal.ZonedDateTime for Schedule-X v4 */
function toScheduleXDateTime(ts: number) {
  const instant = Temporal.Instant.fromEpochMilliseconds(ts);
  return instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
}

/** Map our Convex events to Schedule-X event format */
function mapEvents(events: CalendarEvent[]) {
  return events.map((e) => ({
    id: e._id,
    title: e.name,
    start: toScheduleXDateTime(e.startsAt),
    end: toScheduleXDateTime(e.endsAt),
    calendarId: e.eventType,
    // Do NOT set `_customContent.monthGrid` here — when a React custom
    // component (`monthGridEvent`) is provided via `customComponents`, the
    // Preact MonthGridEvent still renders the `_customContent` innerHTML in
    // addition to the React portal, causing every event to show duplicate
    // content.
    //
    // Custom props for our MonthGridEvent renderer (prefixed with _ to avoid
    // Schedule-X interpreting them). Do NOT pass `isRecurring` or `rrule` as
    // top-level props — Schedule-X would generate duplicate visual occurrences
    // for events that are already individual occurrences in our DB.
    _eventType: e.eventType,
    _isRecurring: e.isRecurring ?? false,
    _originalId: e._id,
  }));
}

// ---------------------------------------------------------------------------
// Custom month grid event component for Schedule-X
// ---------------------------------------------------------------------------

const MonthGridEvent = memo(function MonthGridEvent({
  calendarEvent,
}: {
  calendarEvent: {
    id: string | number;
    title?: string;
    start: unknown;
    _eventType?: EventType;
    _isRecurring?: boolean;
    _originalId?: string;
  };
}) {
  const eventType = (calendarEvent._eventType ?? "meeting") as EventType;
  const startTime = (() => {
    const s = calendarEvent.start;
    if (!s) return "";
    if (typeof s === "object" && "hour" in s && "minute" in s) {
      const h = String((s as { hour: number }).hour).padStart(2, "0");
      const m = String((s as { minute: number }).minute).padStart(2, "0");
      return `${h}:${m}`;
    }
    if (typeof s === "string") {
      try { return format(new Date(s.replace(" ", "T")), "HH:mm"); } catch { return ""; }
    }
    return "";
  })();

  const barColor: Record<string, string> = {
    match: "bg-red-500",
    training: "bg-green-500",
    meeting: "bg-blue-500",
    rehab: "bg-orange-500",
  };

  return (
    <div className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs">
      <div className={cn("w-0.5 self-stretch shrink-0 rounded-full", barColor[eventType] ?? "bg-blue-500")} />
      <EventTypeBadge type={eventType} size="sm" className="shrink-0" />
      <span className="text-muted-foreground shrink-0">{startTime}</span>
      <span className="truncate font-medium">{calendarEvent.title}</span>
      {calendarEvent._isRecurring && (
        <Repeat className="text-muted-foreground ml-auto size-3 shrink-0" />
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// CalendarView
// ---------------------------------------------------------------------------

export function CalendarView({
  events,
  onEventClick,
  onDateClick,
  onMonthChange,
}: CalendarViewProps) {
  const calendarControls = useMemo(() => createCalendarControlsPlugin(), []);
  const currentTimePlugin = useMemo(() => createCurrentTimePlugin(), []);

  // IMPORTANT: All hooks must be called unconditionally (before any early
  // return) to satisfy the Rules of Hooks.  Moving this `useMemo` above the
  // loading guard ensures the reference is stable across renders and prevents
  // ScheduleXCalendar's internal useEffect (which depends on
  // `customComponents`) from re-running destroy/render cycles that accumulate
  // stale React portal entries.
  const customComponents = useMemo(
    () => ({ monthGridEvent: MonthGridEvent }),
    [],
  );

  const calendarApp = useNextCalendarApp({
    views: [createViewMonthGrid()],
    defaultView: "month-grid",
    theme: "shadcn",
    events: [],
    calendars: CALENDAR_TYPES,
    callbacks: {
      onEventClick(event) {
        const id = String(event.id);
        onEventClick(id);
      },
      onClickDate(date) {
        // date is Temporal.PlainDate — convert to ms timestamp for midnight
        const d = new Date(date.toString());
        onDateClick(d.getTime());
      },
      onRangeUpdate(range) {
        // Clear the snapshot so the next events sync always pushes fresh data.
        // Without this, navigating to a month and back can skip the
        // `calendarApp.events.set()` call because the snapshot string still
        // matches, even though Schedule-X's visible range has changed.
        prevSnapshotRef.current = "";

        // When the view range changes, figure out which month is displayed
        const start = new Date(range.start.toString());
        const end = new Date(range.end.toString());
        // mid-point gives the most representative month
        const mid = new Date((start.getTime() + end.getTime()) / 2);
        onMonthChange(mid.getFullYear(), mid.getMonth() + 1);
      },
    },
  }, [calendarControls, currentTimePlugin]);

  // Stable snapshot to avoid redundant syncs when Convex returns a new
  // array reference with identical data.
  const prevSnapshotRef = useRef<string>("");

  // Sync Convex events into Schedule-X whenever events change.
  // Use .set() which is the official "replace all events" API.
  useEffect(() => {
    if (!calendarApp || !events) return;

    const snapshot = events
      .map((e) => `${e._id}|${e.startsAt}|${e.endsAt}|${e.name}`)
      .sort()
      .join(";");

    if (snapshot === prevSnapshotRef.current) return;
    prevSnapshotRef.current = snapshot;

    calendarApp.events.set(mapEvents(events));
  }, [calendarApp, events]);

  if (events === undefined) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div style={{ height: "calc(100vh - 250px)" }}>
      <ScheduleXCalendar
        calendarApp={calendarApp}
        customComponents={customComponents}
      />
    </div>
  );
}
