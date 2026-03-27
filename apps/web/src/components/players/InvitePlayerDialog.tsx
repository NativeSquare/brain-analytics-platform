"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

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

interface InvitePlayerDialogProps {
  playerId: Id<"players">;
  firstName: string;
  lastName: string;
  personalEmail: string | undefined;
  open: boolean;
  onClose: () => void;
}

export function InvitePlayerDialog({
  playerId,
  firstName,
  lastName,
  personalEmail,
  open,
  onClose,
}: InvitePlayerDialogProps) {
  const invitePlayer = useMutation(api.players.mutations.invitePlayer);
  const [isSending, setIsSending] = React.useState(false);

  const handleSendInvite = async () => {
    setIsSending(true);
    try {
      await invitePlayer({ playerId });
      toast.success(`Invitation sent to ${personalEmail}`);
      onClose();
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  if (!personalEmail) {
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
          <DialogTitle>Invite Player</DialogTitle>
          <DialogDescription>
            Would you like to invite {firstName} {lastName} to create their
            account? An invitation email will be sent to {personalEmail}.
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
