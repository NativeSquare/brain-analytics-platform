"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { format } from "date-fns";
import {
  MapPin,
  User,
  CalendarCheck,
  Repeat,
  Pencil,
  X,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@packages/backend/convex/_generated/api";
import { RECURRENCE_FREQUENCY_LABELS } from "@packages/shared/calendar";
import type { RecurrenceFrequency } from "@packages/shared/calendar";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventTypeBadge } from "@/components/shared/EventTypeBadge";
import type { EventType } from "@/components/shared/EventTypeBadge";
import { EventForm } from "@/components/calendar/EventForm";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EventDetailProps {
  eventId: Id<"calendarEvents"> | null;
  open: boolean;
  onClose: () => void;
  /** Current user role for admin-only UI */
  isAdmin?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventDetail({
  eventId,
  open,
  onClose,
  isAdmin,
}: EventDetailProps) {
  const event = useQuery(
    api.calendar.queries.getEventDetail,
    eventId ? { eventId } : "skip",
  );

  const seriesInfo = useQuery(
    api.calendar.queries.getSeriesInfo,
    event?.isRecurring && event?.seriesId
      ? { seriesId: event.seriesId }
      : "skip",
  );

  const cancelEventMutation = useMutation(api.calendar.mutations.cancelEvent);
  const deleteSeriesMutation = useMutation(
    api.calendar.mutations.deleteEventSeries,
  );

  const [isEditing, setIsEditing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteSeriesDialog, setShowDeleteSeriesDialog] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);

  function handleEditSuccess() {
    toast.success("Event updated");
    setIsEditing(false);
  }

  async function handleCancelOccurrence() {
    if (!eventId) return;
    setIsActionPending(true);
    try {
      await cancelEventMutation({ eventId });
      toast.success("Occurrence cancelled");
      setShowCancelDialog(false);
      onClose();
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsActionPending(false);
    }
  }

  async function handleDeleteSeries() {
    if (!event?.seriesId) return;
    setIsActionPending(true);
    try {
      const result = await deleteSeriesMutation({
        seriesId: event.seriesId,
      });
      toast.success(
        `Series deleted — ${result.deletedCount} occurrences removed`,
      );
      setShowDeleteSeriesDialog(false);
      onClose();
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsActionPending(false);
    }
  }

  // Reset state when panel closes
  function handleClose() {
    setIsEditing(false);
    setShowCancelDialog(false);
    setShowDeleteSeriesDialog(false);
    onClose();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
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
          ) : isEditing ? (
            <>
              <SheetHeader>
                <SheetTitle>Edit Event</SheetTitle>
                <SheetDescription>
                  {event.isRecurring
                    ? "Editing this occurrence only. Other occurrences will not be affected."
                    : "Edit event details."}
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4">
                <ScrollArea className="max-h-[70vh]">
                  <EventForm
                    mode="edit"
                    event={event}
                    onSuccess={handleEditSuccess}
                    onCancel={() => setIsEditing(false)}
                  />
                </ScrollArea>
              </div>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{event.name}</SheetTitle>
                <SheetDescription className="sr-only">
                  Event details for {event.name}
                </SheetDescription>
                <div className="flex items-center gap-2 pt-1">
                  <EventTypeBadge type={event.eventType as EventType} />
                  {event.isRecurring && (
                    <span className="border-border text-muted-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium">
                      <Repeat className="size-3" />
                      Recurring
                    </span>
                  )}
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

                {/* Series info (AC #11) */}
                {event.isRecurring && seriesInfo && (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Repeat className="text-muted-foreground size-4 shrink-0" />
                      <span className="font-medium">
                        Part of a{" "}
                        {RECURRENCE_FREQUENCY_LABELS[
                          seriesInfo.series
                            .frequency as RecurrenceFrequency
                        ]?.toLowerCase() ?? seriesInfo.series.frequency}{" "}
                        series
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {seriesInfo.activeOccurrences} of{" "}
                      {seriesInfo.totalOccurrences} occurrences
                    </p>
                    <p className="text-muted-foreground">
                      Series ends{" "}
                      {format(
                        new Date(seriesInfo.series.endDate),
                        "d MMMM yyyy",
                      )}
                    </p>
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

                {/* Admin action buttons */}
                {isAdmin && (
                  <div className="flex flex-col gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="justify-start"
                    >
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCancelDialog(true)}
                      className="text-destructive hover:text-destructive justify-start"
                    >
                      <X className="mr-2 size-4" />
                      {event.isRecurring
                        ? "Cancel This Occurrence"
                        : "Cancel This Event"}
                    </Button>

                    {event.isRecurring && event.seriesId && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteSeriesDialog(true)}
                        className="justify-start"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete Entire Series
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Cancel occurrence dialog */}
      <AlertDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this occurrence?</AlertDialogTitle>
            <AlertDialogDescription>
              {event
                ? `Cancel this occurrence of ${event.name} on ${format(new Date(event.startsAt), "EEEE, d MMMM yyyy")}?${event.isRecurring ? " Other occurrences will not be affected." : ""}`
                : "Cancel this event?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionPending}>
              Keep Event
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleCancelOccurrence}
              disabled={isActionPending}
            >
              {isActionPending ? "Cancelling…" : "Cancel Event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete series dialog */}
      <AlertDialog
        open={showDeleteSeriesDialog}
        onOpenChange={setShowDeleteSeriesDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entire series?</AlertDialogTitle>
            <AlertDialogDescription>
              {event && seriesInfo
                ? `Delete all ${seriesInfo.totalOccurrences} occurrences of ${event.name}? This cannot be undone.`
                : "Delete all occurrences? This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionPending}>
              Keep Series
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteSeries}
              disabled={isActionPending}
            >
              {isActionPending ? "Deleting…" : "Delete Series"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
