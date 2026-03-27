"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";

interface FolderDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: Id<"folders">;
  folderName: string;
}

export function FolderDeleteDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
}: FolderDeleteDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const deleteFolderMutation = useMutation(api.documents.mutations.deleteFolder);

  async function handleDelete() {
    setIsLoading(true);
    try {
      await deleteFolderMutation({ folderId });
      toast.success("Folder deleted");
      onOpenChange(false);
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={isLoading ? undefined : onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Folder</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{folderName}&rdquo;? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
