"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RtpStatusBadge, normalizeRtpStatus } from "./rtp-status";

/**
 * Next valid status transition map.
 * Story 14.3 AC #4: Forward-only with re-injury exception.
 */
const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  active: { status: "rehab", label: "Move to Rehab" },
  current: { status: "rehab", label: "Move to Rehab" },
  rehab: { status: "assessment", label: "Move to RTP Assessment" },
  assessment: { status: "cleared", label: "Clear Player" },
  cleared: { status: "active", label: "Report Re-injury" },
  recovered: { status: "active", label: "Report Re-injury" },
};

interface RtpStatusDialogProps {
  injuryId: Id<"playerInjuries">;
  currentStatus: string;
  open: boolean;
  onClose: () => void;
}

export function RtpStatusDialog({
  injuryId,
  currentStatus,
  open,
  onClose,
}: RtpStatusDialogProps) {
  const [loading, setLoading] = useState(false);
  const updateStatus = useMutation(
    api.players.mutations.updateInjuryRtpStatus
  );

  const next = NEXT_STATUS[currentStatus];

  const handleTransition = async () => {
    if (!next) return;
    setLoading(true);
    try {
      await updateStatus({ injuryId, newStatus: next.status });
      const normalizedNext = normalizeRtpStatus(next.status);
      const label =
        normalizedNext === "active"
          ? "Active"
          : normalizedNext === "rehab"
            ? "Rehab"
            : normalizedNext === "assessment"
              ? "RTP Assessment"
              : "Cleared";
      toast.success(`Status updated to ${label}`);
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update status";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change RTP Status</DialogTitle>
          <DialogDescription>
            Update the Return-to-Play status for this injury.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              Current status:
            </span>
            <RtpStatusBadge status={currentStatus} />
          </div>
          {next && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Next step:</span>
              <RtpStatusBadge status={next.status} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {next && (
            <Button
              onClick={handleTransition}
              disabled={loading}
              variant={
                next.status === "active" ? "destructive" : "default"
              }
            >
              {loading ? "Updating..." : next.label}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
