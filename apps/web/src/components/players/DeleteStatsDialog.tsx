"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { format } from "date-fns";

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

interface DeleteStatsDialogProps {
  statsId: Id<"playerStats">;
  opponent: string;
  matchDate: number;
  open: boolean;
  onClose: () => void;
}

export function DeleteStatsDialog({
  statsId,
  opponent,
  matchDate,
  open,
  onClose,
}: DeleteStatsDialogProps) {
  const deleteStats = useMutation(api.players.mutations.deletePlayerStats);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const formattedDate = format(new Date(matchDate), "dd/MM/yyyy");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteStats({ statsId });
      toast.success("Match stats deleted");
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(errorData.message ?? "Failed to delete stats");
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
          <AlertDialogTitle>Delete Match Stats</AlertDialogTitle>
          <AlertDialogDescription>
            Delete match stats vs {opponent} on {formattedDate}? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner className="mr-2 size-4" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
