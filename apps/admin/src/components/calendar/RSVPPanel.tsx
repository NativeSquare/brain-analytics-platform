"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RSVPPanelProps {
  eventId: Id<"calendarEvents">;
  rsvpEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RSVPPanel({ eventId, rsvpEnabled }: RSVPPanelProps) {
  const myRsvp = useQuery(
    api.calendar.queries.getUserEventRsvp,
    rsvpEnabled ? { eventId } : "skip",
  );
  const submitRsvp = useMutation(api.calendar.mutations.submitRsvp);

  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);

  // Don't render anything if RSVP is disabled
  if (!rsvpEnabled) return null;

  // Loading state
  if (myRsvp === undefined) {
    return (
      <div className="space-y-3 border-t pt-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
    );
  }

  async function handleAttending() {
    setIsPending(true);
    try {
      await submitRsvp({ eventId, status: "attending" });
      toast.success("RSVP submitted — Attending");
      setShowReasonInput(false);
      setReason("");
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  function handleNotAttendingClick() {
    setShowReasonInput(true);
  }

  async function handleSubmitNotAttending() {
    setIsPending(true);
    try {
      await submitRsvp({
        eventId,
        status: "not_attending",
        reason: reason.trim() || undefined,
      });
      toast.success("RSVP submitted — Not Attending");
      setShowReasonInput(false);
      setReason("");
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  const REASON_MAX = 500;

  return (
    <div className="space-y-3 border-t pt-4">
      <p className="text-sm font-medium">Your RSVP</p>

      {/* No response yet label */}
      {myRsvp === null && !showReasonInput && (
        <p className="text-muted-foreground text-sm">
          You haven&apos;t responded yet
        </p>
      )}

      {/* RSVP Buttons */}
      <div className="flex gap-2">
        <Button
          variant={myRsvp?.status === "attending" ? "default" : "outline"}
          size="sm"
          onClick={handleAttending}
          disabled={isPending}
        >
          <CheckCircle className="mr-2 size-4" />
          Attending
        </Button>
        <Button
          variant={
            myRsvp?.status === "not_attending" ? "destructive" : "outline"
          }
          size="sm"
          onClick={handleNotAttendingClick}
          disabled={isPending}
        >
          <XCircle className="mr-2 size-4" />
          Not Attending
        </Button>
      </div>

      {/* Reason input for "Not Attending" */}
      {showReasonInput && (
        <div className="space-y-2">
          <Textarea
            placeholder="Reason for absence (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REASON_MAX}
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              {reason.length}/{REASON_MAX}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReasonInput(false);
                  setReason("");
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitNotAttending}
                disabled={isPending}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Display existing reason */}
      {myRsvp?.status === "not_attending" &&
        myRsvp.reason &&
        !showReasonInput && (
          <p className="text-muted-foreground text-sm">
            <span className="font-medium">Reason:</span> {myRsvp.reason}
          </p>
        )}
    </div>
  );
}
