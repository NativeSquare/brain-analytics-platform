"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
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
import { Spinner } from "@/components/ui/spinner";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";

// Map staff department to platform role for RBAC
const DEPARTMENT_TO_ROLE: Record<string, string> = {
  Coaching: "coach",
  Medical: "physio",
  Analytics: "analyst",
  Operations: "staff",
  Management: "admin",
  Academy: "coach",
};

function departmentToRole(department: string): string {
  return DEPARTMENT_TO_ROLE[department] ?? "staff";
}

interface InviteStaffDialogProps {
  firstName: string;
  lastName: string;
  email: string | undefined;
  department: string;
  open: boolean;
  onClose: () => void;
}

export function InviteStaffDialog({
  firstName,
  lastName,
  email,
  department,
  open,
  onClose,
}: InviteStaffDialogProps) {
  const createInvite = useMutation(api.invitations.mutations.createInvite);
  const [isSending, setIsSending] = React.useState(false);

  const handleSendInvite = async () => {
    if (!email) return;
    setIsSending(true);
    try {
      await createInvite({
        email,
        name: `${firstName} ${lastName}`,
        role: departmentToRole(department) as "admin" | "coach" | "analyst" | "physio" | "player" | "staff",
      });
      toast.success(`Invitation sent to ${email}`);
      onClose();
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  if (!email) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Email Address</DialogTitle>
            <DialogDescription>
              No email address was provided for {firstName} {lastName}. You can
              add their email later and invite them from their profile page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Staff Member</DialogTitle>
          <DialogDescription>
            Would you like to invite {firstName} {lastName} to create their
            account? An invitation email will be sent to {email}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Skip
          </Button>
          <Button onClick={handleSendInvite} disabled={isSending}>
            {isSending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Sending...
              </>
            ) : (
              "Send Invite"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
