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

interface DeleteFitnessDialogProps {
  fitnessId: Id<"playerFitness">;
  date: number;
  open: boolean;
  onClose: () => void;
}

export function DeleteFitnessDialog({
  fitnessId,
  date,
  open,
  onClose,
}: DeleteFitnessDialogProps) {
  const deleteFitness = useMutation(
    api.players.mutations.deletePlayerFitness
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  const formattedDate = format(new Date(date), "dd/MM/yyyy");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteFitness({ fitnessId });
      toast.success("Fitness entry deleted");
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(errorData.message ?? "Failed to delete fitness entry");
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
          <AlertDialogTitle>Delete Fitness Entry</AlertDialogTitle>
          <AlertDialogDescription>
            Delete fitness entry from {formattedDate}? This action cannot be
            undone.
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
