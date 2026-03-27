"use client";

import { format } from "date-fns";
import { CheckCircle, Repeat, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventTypeBadge } from "@/components/shared/EventTypeBadge";
import type { EventType } from "@/components/shared/EventTypeBadge";

// ---------------------------------------------------------------------------
// Border color lookup
// ---------------------------------------------------------------------------

const BORDER_COLORS: Record<EventType, string> = {
  match: "border-l-red-500",
  training: "border-l-green-500",
  meeting: "border-l-blue-500",
  rehab: "border-l-orange-500",
};

// ---------------------------------------------------------------------------
// EventCard
// ---------------------------------------------------------------------------

export interface EventCardProps {
  name: string;
  eventType: EventType;
  startsAt: number;
  isRecurring?: boolean;
  /** User's RSVP status for this event (from batch query) */
  rsvpStatus?: "attending" | "not_attending";
  onClick?: () => void;
  className?: string;
}

export function EventCard({
  name,
  eventType,
  startsAt,
  isRecurring,
  rsvpStatus,
  onClick,
  className,
}: EventCardProps) {
  const startTime = format(new Date(startsAt), "HH:mm");

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:bg-accent flex w-full items-center gap-2 rounded-md border-l-4 px-3 py-2 text-left transition-colors",
        BORDER_COLORS[eventType],
        className,
      )}
    >
      <EventTypeBadge type={eventType} size="sm" className="shrink-0" />
      <span className="text-muted-foreground shrink-0 text-sm">{startTime}</span>
      <span className="truncate text-sm font-medium">{name}</span>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {rsvpStatus === "attending" && (
          <CheckCircle className="size-3.5 text-green-600 dark:text-green-400" />
        )}
        {rsvpStatus === "not_attending" && (
          <XCircle className="size-3.5 text-red-600 dark:text-red-400" />
        )}
        {isRecurring && (
          <Repeat className="text-muted-foreground size-3.5" />
        )}
      </div>
    </button>
  );
}
