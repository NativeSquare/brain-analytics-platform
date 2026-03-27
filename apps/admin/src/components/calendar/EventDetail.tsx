"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { MapPin, User, CalendarCheck } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EventTypeBadge } from "@/components/shared/EventTypeBadge";
import type { EventType } from "@/components/shared/EventTypeBadge";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EventDetailProps {
  eventId: Id<"calendarEvents"> | null;
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventDetail({ eventId, open, onClose }: EventDetailProps) {
  const event = useQuery(
    api.calendar.queries.getEventDetail,
    eventId ? { eventId } : "skip",
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        {event === undefined ? (
          <EventDetailSkeleton />
        ) : event === null ? (
          <SheetHeader>
            <SheetTitle>Event not found</SheetTitle>
            <SheetDescription>
              This event may have been deleted or you don&apos;t have access.
            </SheetDescription>
          </SheetHeader>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg">{event.name}</SheetTitle>
              <SheetDescription className="sr-only">
                Event details for {event.name}
              </SheetDescription>
              <div className="pt-1">
                <EventTypeBadge type={event.eventType as EventType} />
              </div>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-4">
              {/* Date / Time */}
              <div className="text-sm">
                <p className="font-medium">
                  {format(new Date(event.startsAt), "EEEE, d MMMM yyyy")}
                </p>
                <p className="text-muted-foreground">
                  {format(new Date(event.startsAt), "HH:mm")} &ndash;{" "}
                  {format(new Date(event.endsAt), "HH:mm")}
                </p>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1 font-medium">
                    Description
                  </p>
                  <p className="whitespace-pre-wrap">{event.description}</p>
                </div>
              )}

              {/* Created by */}
              <div className="flex items-center gap-2 text-sm">
                <User className="text-muted-foreground size-4 shrink-0" />
                <span className="text-muted-foreground">Created by</span>
                <span className="font-medium">{event.ownerName}</span>
              </div>

              {/* RSVP status */}
              <div className="flex items-center gap-2 text-sm">
                <CalendarCheck className="text-muted-foreground size-4 shrink-0" />
                <span className="text-muted-foreground">RSVP</span>
                <span className="font-medium">
                  {event.rsvpEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function EventDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-36" />
    </div>
  );
}
