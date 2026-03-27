"use client";

import "temporal-polyfill/global";
import { memo, useEffect, useMemo } from "react";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import { createViewMonthGrid } from "@schedule-x/calendar";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createCurrentTimePlugin } from "@schedule-x/current-time";
import { format } from "date-fns";

import { Repeat } from "lucide-react";
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

/** Convert Unix ms timestamp → "YYYY-MM-DD HH:mm" for Schedule-X */
function toScheduleXDateTime(ts: number): string {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/** Map our Convex events to Schedule-X event format */
function mapEvents(
  events: CalendarEvent[],
): Array<{
  id: string;
  title: string;
  start: string;
  end: string;
  calendarId: string;
  _customContent: { monthGrid: string };
  eventType: EventType;
  originalId: string;
}> {
  return events.map((e) => ({
    id: e._id,
    title: e.name,
    start: toScheduleXDateTime(e.startsAt),
    end: toScheduleXDateTime(e.endsAt),
    calendarId: e.eventType,
    _customContent: {
      monthGrid: `<span class="sx-event-name">${e.name}</span>`,
    },
    eventType: e.eventType,
    isRecurring: e.isRecurring ?? false,
    originalId: e._id,
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
    start: string;
    eventType?: EventType;
    isRecurring?: boolean;
    originalId?: string;
  };
}) {
  const eventType = (calendarEvent.eventType ?? "meeting") as EventType;
  const startTime = calendarEvent.start
    ? format(new Date(calendarEvent.start.replace(" ", "T")), "HH:mm")
    : "";

  return (
    <div className="flex items-center gap-1 truncate px-0.5 py-px text-xs">
      <EventTypeBadge type={eventType} size="sm" className="shrink-0" />
      <span className="text-muted-foreground shrink-0">{startTime}</span>
      <span className="truncate font-medium">{calendarEvent.title}</span>
      {calendarEvent.isRecurring && (
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
        // When the view range changes, figure out which month is displayed
        const start = new Date(range.start.toString());
        const end = new Date(range.end.toString());
        // mid-point gives the most representative month
        const mid = new Date((start.getTime() + end.getTime()) / 2);
        onMonthChange(mid.getFullYear(), mid.getMonth() + 1);
      },
    },
  }, [calendarControls, currentTimePlugin]);

  // Sync Convex events into Schedule-X whenever events change
  useEffect(() => {
    if (!calendarApp || !events) return;
    const mapped = mapEvents(events);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    calendarApp.events.set(mapped as any);
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
    <ScheduleXCalendar
      calendarApp={calendarApp}
      customComponents={{ monthGridEvent: MonthGridEvent }}
    />
  );
}
