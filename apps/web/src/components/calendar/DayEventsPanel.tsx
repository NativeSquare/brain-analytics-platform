"use client";

import { memo, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "./EventCard";
import type { EventType } from "@/components/shared/EventTypeBadge";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DayEventsPanelProps {
  /** Midnight timestamp (ms) of the selected day, or null if not open. */
  date: number | null;
  open: boolean;
  onClose: () => void;
  onEventClick: (eventId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DayEventsPanel({
  date,
  open,
  onClose,
  onEventClick,
}: DayEventsPanelProps) {
  const events = useQuery(
    api.calendar.queries.getDayEvents,
    date !== null ? { date } : "skip",
  );

  // Batch-fetch RSVP statuses for all RSVP-enabled events
  const rsvpEnabledEventIds = useMemo(() => {
    if (!events) return [];
    return events
      .filter((e) => e.rsvpEnabled)
      .map((e) => e._id as Id<"calendarEvents">);
  }, [events]);

  const rsvpStatuses = useQuery(
    api.calendar.queries.getUserRsvpsByEventIds,
    rsvpEnabledEventIds.length > 0
      ? { eventIds: rsvpEnabledEventIds }
      : "skip",
  );

  const dayLabel = date !== null ? format(new Date(date), "EEEE, d MMMM yyyy") : "";

  // Stable click handler factory to avoid inline arrow functions per item
  const handleEventClick = useCallback(
    (eventId: string) => {
      onEventClick(eventId);
    },
    [onEventClick],
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{dayLabel}</SheetTitle>
          <SheetDescription>Events for this day</SheetDescription>
        </SheetHeader>

        <div className="space-y-1 px-4 pb-4">
          {events === undefined ? (
            <DayEventsSkeleton />
          ) : events.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No events scheduled
            </p>
          ) : (
            events.map((event) => (
              <DayEventItem
                key={event._id}
                event={event}
                rsvpStatus={
                  rsvpStatuses?.[event._id] as
                    | "attending"
                    | "not_attending"
                    | undefined
                }
                onEventClick={handleEventClick}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Memoized list item to avoid inline closures per event
// ---------------------------------------------------------------------------

interface DayEventItemProps {
  event: {
    _id: string;
    name: string;
    eventType: string;
    startsAt: number;
    isRecurring: boolean;
  };
  rsvpStatus?: "attending" | "not_attending";
  onEventClick: (eventId: string) => void;
}

const DayEventItem = memo(function DayEventItem({
  event,
  rsvpStatus,
  onEventClick,
}: DayEventItemProps) {
  const handleClick = useCallback(() => {
    onEventClick(event._id);
  }, [onEventClick, event._id]);

  return (
    <EventCard
      name={event.name}
      eventType={event.eventType as EventType}
      startsAt={event.startsAt}
      isRecurring={event.isRecurring}
      rsvpStatus={rsvpStatus}
      onClick={handleClick}
    />
  );
});

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DayEventsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}
