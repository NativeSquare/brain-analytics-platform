"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  PLAYER_STATUSES,
  PLAYER_STATUS_LABELS,
  type PlayerStatus,
} from "@packages/shared/players";
import { IconAlertTriangle } from "@tabler/icons-react";

import { Spinner } from "@/components/ui/spinner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerStatusBadge } from "@/components/shared/PlayerStatusBadge";

interface StatusChangeDialogProps {
  playerId: Id<"players">;
  currentStatus: string;
  playerName: string;
  open: boolean;
  onClose: () => void;
}

/** Contextual warning messages per target status (Story 5.6 AC #1, subtask 5.4). */
function getWarningMessage(
  playerName: string,
  newStatus: PlayerStatus
): string {
  switch (newStatus) {
    case "leftClub":
      return `This will deactivate ${playerName}'s account. They will no longer be able to log in. Their profile will remain accessible to admins.`;
    case "onLoan":
      return `${playerName} will retain account access with an 'On Loan' status indicator.`;
    case "active":
      return `${playerName}'s account will be fully restored to active status.`;
  }
}

export function StatusChangeDialog({
  playerId,
  currentStatus,
  playerName,
  open,
  onClose,
}: StatusChangeDialogProps) {
  const updateStatus = useMutation(
    api.players.mutations.updatePlayerStatus
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState<
    PlayerStatus | ""
  >("");

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) setSelectedStatus("");
  }, [open]);

  const availableStatuses = PLAYER_STATUSES.filter(
    (s) => s !== currentStatus
  );

  const handleConfirm = async () => {
    if (!selectedStatus) return;
    setIsSubmitting(true);
    try {
      await updateStatus({ playerId, status: selectedStatus });
      toast.success(
        `Player status updated to ${PLAYER_STATUS_LABELS[selectedStatus]}`
      );
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(errorData.message ?? "Failed to update player status");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDestructive = selectedStatus === "leftClub";

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Player Status</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Current status:
                </span>
                <PlayerStatusBadge
                  status={currentStatus as PlayerStatus}
                />
              </div>

              <Select
                value={selectedStatus}
                onValueChange={(val) =>
                  setSelectedStatus(val as PlayerStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {PLAYER_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedStatus && (
                <div
                  className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                    isDestructive
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : "border-muted bg-muted/50"
                  }`}
                >
                  <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {getWarningMessage(playerName, selectedStatus)}
                  </span>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant={isDestructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedStatus}
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 size-4" />
                Updating...
              </>
            ) : (
              "Confirm"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
