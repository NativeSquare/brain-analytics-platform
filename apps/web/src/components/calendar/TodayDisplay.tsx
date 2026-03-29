"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EventTypeBadge,
  type EventType,
} from "@/components/shared/EventTypeBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TodayEvent {
  _id: string;
  name: string;
  eventType: EventType;
  startsAt: number;
  endsAt: number;
  location?: string;
}

export interface TodayDisplayProps {
  events: TodayEvent[] | undefined;
  /** Called at midnight so the parent can refresh the query date */
  onMidnightRollover: () => void;
}

// ---------------------------------------------------------------------------
// Border color lookup (TV-sized)
// ---------------------------------------------------------------------------

const BORDER_COLORS: Record<EventType, string> = {
  match: "border-l-red-500",
  training: "border-l-green-500",
  meeting: "border-l-blue-500",
  rehab: "border-l-orange-500",
};

// ---------------------------------------------------------------------------
// TodayDisplay
// ---------------------------------------------------------------------------

export function TodayDisplay({ events, onMidnightRollover }: TodayDisplayProps) {
  const [now, setNow] = useState(() => new Date());

  // ---- Live clock (updates every 60 s) ----
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ---- Midnight rollover ----
  useEffect(() => {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - Date.now();

    const timeout = setTimeout(() => {
      setNow(new Date());
      onMidnightRollover();
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, [now, onMidnightRollover]);

  const dateString = format(now, "EEEE, d MMMM yyyy");
  const timeString = format(now, "HH:mm");

  return (
    <div className="flex min-h-screen flex-col p-8 md:p-12 lg:p-16">
      {/* ---- Header ---- */}
      <header className="mb-10 flex flex-col items-center gap-4 text-center md:mb-14">
        <h1 className="text-muted-foreground text-xl font-medium tracking-widest uppercase md:text-2xl">
          What&apos;s on Today
        </h1>
        <p className="text-foreground text-3xl font-semibold md:text-4xl lg:text-5xl">
          {dateString}
        </p>
        <div className="flex items-center gap-3">
          <Clock className="text-muted-foreground size-8 md:size-10" />
          <span className="text-foreground tabular-nums text-5xl font-bold md:text-6xl lg:text-7xl">
            {timeString}
          </span>
        </div>
      </header>

      {/* ---- Content ---- */}
      <div className="flex-1 overflow-y-auto">
        {events === undefined ? (
          <LoadingSkeleton />
        ) : events.length === 0 ? (
          <EmptyState />
        ) : (
          <EventList events={events} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event List
// ---------------------------------------------------------------------------

function EventList({ events }: { events: TodayEvent[] }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {events.map((event) => (
        <TVEventCard key={event._id} event={event} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TV Event Card
// ---------------------------------------------------------------------------

function TVEventCard({ event }: { event: TodayEvent }) {
  const startTime = format(new Date(event.startsAt), "HH:mm");
  const endTime = format(new Date(event.endsAt), "HH:mm");

  return (
    <div
      className={cn(
        "bg-card flex items-center gap-6 rounded-xl border-l-[6px] p-6 shadow-sm md:gap-8 md:p-8",
        BORDER_COLORS[event.eventType],
      )}
    >
      {/* Time */}
      <div className="text-muted-foreground shrink-0 text-right text-2xl font-semibold tabular-nums md:text-3xl">
        {startTime}
        <span className="mx-1">—</span>
        {endTime}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-foreground truncate text-2xl font-bold md:text-3xl">
          {event.name}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <EventTypeBadge
            type={event.eventType}
            className="px-3 py-1 text-sm md:text-base [&>svg]:size-4 md:[&>svg]:size-5"
          />
          {event.location && (
            <span className="text-muted-foreground flex items-center gap-1.5 text-lg md:text-xl">
              <MapPin className="size-5 shrink-0 md:size-6" />
              {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <Calendar className="text-muted-foreground size-16 md:size-20" />
      <p className="text-muted-foreground text-2xl font-medium md:text-3xl">
        No events scheduled for today
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-card flex items-center gap-6 rounded-xl border-l-[6px] border-l-transparent p-6 shadow-sm md:gap-8 md:p-8"
        >
          <Skeleton className="h-10 w-40 rounded-md" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-8 w-64 rounded-md" />
            <Skeleton className="h-6 w-32 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
