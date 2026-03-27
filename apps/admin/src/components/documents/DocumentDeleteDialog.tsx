"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";

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
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";

interface DocumentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: Id<"documents">;
  documentName: string;
  onDeleted: () => void;
}

export function DocumentDeleteDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  onDeleted,
}: DocumentDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const deleteDocument = useMutation(api.documents.mutations.deleteDocument);

  async function handleConfirm() {
    setIsDeleting(true);
    try {
      await deleteDocument({ documentId });
      toast.success("Document deleted");
      onDeleted();
      onOpenChange(false);
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Document</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{documentName}&rdquo;? This
            will permanently remove the file and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
