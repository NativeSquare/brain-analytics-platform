"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { api } from "@packages/backend/convex/_generated/api";

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

  const dayLabel = date !== null ? format(new Date(date), "EEEE, d MMMM yyyy") : "";

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
              <EventCard
                key={event._id}
                name={event.name}
                eventType={event.eventType as EventType}
                startsAt={event.startsAt}
                onClick={() => onEventClick(event._id)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
