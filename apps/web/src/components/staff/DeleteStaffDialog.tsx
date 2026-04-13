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

interface DeleteStaffDialogProps {
  staffId: Id<"staff">;
  staffName: string;
  open: boolean;
  onClose: () => void;
}

export function DeleteStaffDialog({
  staffId,
  staffName,
  open,
  onClose,
}: DeleteStaffDialogProps) {
  const router = useRouter();
  const deleteStaff = useMutation(api.staff.mutations.permanentlyDeleteStaff);
  const [confirmName, setConfirmName] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  const nameMatches = confirmName === staffName;

  React.useEffect(() => {
    if (open) setConfirmName("");
  }, [open]);

  const handleDelete = async () => {
    if (!nameMatches) return;
    setIsDeleting(true);
    try {
      await deleteStaff({ staffId });
      toast.success(
        `${staffName} and all associated data permanently deleted`,
      );
      onClose();
      router.push("/staff");
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(errorData.message ?? "Failed to delete staff member");
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
          <AlertDialogTitle>Permanently Delete Staff Member</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This will permanently delete{" "}
                <strong>{staffName}</strong> and ALL associated data:
                certifications, invitations, and stored files.
              </p>
              <p className="font-semibold text-destructive">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Field>
          <FieldLabel htmlFor="confirm-staff-name">
            Type &quot;{staffName}&quot; to confirm
          </FieldLabel>
          <Input
            id="confirm-staff-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={staffName}
            autoComplete="off"
          />
        </Field>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
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
              "Permanently Delete"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
