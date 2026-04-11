"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@packages/backend/convex/_generated/api";
import { toast } from "sonner";

import type { Id } from "@packages/backend/convex/_generated/dataModel";

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
import { StaffStatusBadge } from "./StaffStatusBadge";
import { Spinner } from "@/components/ui/spinner";
import type { StaffStatus } from "@packages/shared/staff";

interface StaffStatusChangeDialogProps {
  staffId: Id<"staff">;
  currentStatus: string;
  staffName: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Admin dialog to deactivate or reactivate a staff member.
 *
 * Story 13.4 AC #8, #11, #12: Confirmation dialog with appropriate messaging.
 */
export function StaffStatusChangeDialog({
  staffId,
  currentStatus,
  staffName,
  open,
  onClose,
}: StaffStatusChangeDialogProps) {
  const updateStatus = useMutation(api.staff.mutations.updateStaffStatus);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isDeactivating = currentStatus === "active";
  const newStatus = isDeactivating ? "inactive" : "active";

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateStatus({ staffId, status: newStatus });
      toast.success(
        isDeactivating
          ? "Staff member deactivated"
          : "Staff member reactivated"
      );
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(errorData.message ?? "Failed to update status");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDeactivating ? "Deactivate" : "Reactivate"} Staff Member
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{staffName}</span>
                <StaffStatusBadge status={currentStatus as StaffStatus} />
              </div>
              <p>
                {isDeactivating
                  ? `Deactivating ${staffName} will revoke their platform access. Their profile will remain visible to admins for reference.`
                  : `Reactivating ${staffName} will restore their platform access.`}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={isDeactivating ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 size-4" />
                {isDeactivating ? "Deactivating..." : "Reactivating..."}
              </>
            ) : isDeactivating ? (
              "Deactivate"
            ) : (
              "Reactivate"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
