"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { IconMail, IconX, IconClock, IconRefresh } from "@tabler/icons-react";
import { ROLE_LABELS, type UserRole } from "@/utils/roles";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Spinner } from "@/components/ui/spinner";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";

function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) {
    return "Expired";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  return `${hours}h remaining`;
}

type PendingInviteData = {
  _id: string;
  _creationTime: number;
  email: string;
  name: string;
  role: string;
  expiresAt: number;
  inviterName: string;
};

/** Memoized list item to prevent re-renders when sibling items change. */
const PendingInviteItem = React.memo(function PendingInviteItem({
  invite,
  resendingId,
  onResend,
  onCancelClick,
}: {
  invite: PendingInviteData;
  resendingId: Id<"invitations"> | null;
  onResend: (id: Id<"invitations">, email: string) => void;
  onCancelClick: (id: Id<"invitations">) => void;
}) {
  const roleLabel = ROLE_LABELS[invite.role as UserRole] ?? invite.role;
  const inviteId = invite._id as Id<"invitations">;

  const handleResendClick = React.useCallback(() => {
    onResend(inviteId, invite.email);
  }, [onResend, inviteId, invite.email]);

  const handleCancelClick = React.useCallback(() => {
    onCancelClick(inviteId);
  }, [onCancelClick, inviteId]);

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{invite.name}</span>
          <Badge variant="secondary" className="text-xs">
            {roleLabel}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <IconClock className="mr-1 h-3 w-3" />
            {formatTimeRemaining(invite.expiresAt)}
          </Badge>
        </div>
        <span className="text-muted-foreground text-sm">{invite.email}</span>
        {invite.inviterName && (
          <span className="text-muted-foreground text-xs">
            Invited by {invite.inviterName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary"
          disabled={resendingId === inviteId}
          onClick={handleResendClick}
          title="Resend invitation"
        >
          {resendingId === inviteId ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <IconRefresh className="h-4 w-4" />
          )}
          <span className="sr-only">Resend invitation</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleCancelClick}
        >
          <IconX className="h-4 w-4" />
          <span className="sr-only">Cancel invitation</span>
        </Button>
      </div>
    </div>
  );
});

export function PendingInvites() {
  const invites = useQuery(api.invitations.queries.listPendingInvites);
  const cancelInvite = useMutation(api.invitations.mutations.cancelInvite);
  const resendInvite = useMutation(api.invitations.mutations.resendInvite);

  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [inviteToCancel, setInviteToCancel] =
    React.useState<Id<"invitations"> | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [resendingId, setResendingId] =
    React.useState<Id<"invitations"> | null>(null);

  const handleCancel = React.useCallback(async () => {
    if (!inviteToCancel) return;

    setIsLoading(true);
    try {
      await cancelInvite({ invitationId: inviteToCancel });
      toast.success("Invitation cancelled");
    } catch (error) {
      toast.error("Failed to cancel invitation", {
        description: getConvexErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
      setCancelDialogOpen(false);
      setInviteToCancel(null);
    }
  }, [inviteToCancel, cancelInvite]);

  const handleResend = React.useCallback(async (
    invitationId: Id<"invitations">,
    email: string,
  ) => {
    setResendingId(invitationId);
    try {
      await resendInvite({ invitationId });
      toast.success("Invitation resent", {
        description: `Invitation resent to ${email}`,
      });
    } catch (error) {
      toast.error("Failed to resend invitation", {
        description: getConvexErrorMessage(error),
      });
    } finally {
      setResendingId(null);
    }
  }, [resendInvite]);

  const handleCancelClick = React.useCallback(
    (id: Id<"invitations">) => {
      setInviteToCancel(id);
      setCancelDialogOpen(true);
    },
    [],
  );

  // Don't render anything if there are no pending invites
  if (invites === undefined) {
    return null;
  }

  if (invites.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <IconMail className="h-4 w-4" />
            Pending Invitations
          </CardTitle>
          <CardDescription>
            {invites.length} pending invitation
            {invites.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invites.map((invite) => (
              <PendingInviteItem
                key={invite._id}
                invite={invite}
                resendingId={resendingId}
                onResend={handleResend}
                onCancelClick={handleCancelClick}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invitation? The invite link
              will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Keep Invitation
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? <Spinner className="mr-2" /> : null}
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
