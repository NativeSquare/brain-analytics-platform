"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldLabel } from "@/components/ui/field";

interface DeletePlayerDialogProps {
  playerId: Id<"players">;
  playerName: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Two-step confirmation dialog for GDPR player deletion.
 *
 * Story 12.3 AC #10, #11, #12, #13:
 * - Requires admin to type the player's full name to confirm.
 * - Calls deletePlayer cascade mutation.
 * - Shows success toast and redirects to /players on completion.
 * - Shows error toast and keeps dialog open on failure.
 */
export function DeletePlayerDialog({
  playerId,
  playerName,
  open,
  onClose,
}: DeletePlayerDialogProps) {
  const router = useRouter();
  const deletePlayer = useMutation(api.players.mutations.deletePlayer);
  const [confirmName, setConfirmName] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  const nameMatches = confirmName === playerName;

  // Reset input when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setConfirmName("");
    }
  }, [open]);

  const handleDelete = async () => {
    if (!nameMatches) return;
    setIsDeleting(true);
    try {
      await deletePlayer({ playerId });
      toast.success(
        `Player ${playerName} and all associated data permanently deleted`
      );
      onClose();
      router.push("/players");
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(errorData.message ?? "Failed to delete player");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently Delete Player</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This will permanently delete{" "}
                <strong>{playerName}</strong> and ALL associated data:
                performance stats, fitness records, injury history, contracts,
                calendar RSVPs, notifications, and document reads.
              </p>
              <p className="font-semibold text-destructive">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Field>
          <FieldLabel htmlFor="confirm-player-name">
            Type &quot;{playerName}&quot; to confirm
          </FieldLabel>
          <Input
            id="confirm-player-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={playerName}
            autoComplete="off"
          />
        </Field>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!nameMatches || isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner className="mr-2 size-4" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
