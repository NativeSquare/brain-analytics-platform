"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { IconArrowLeft, IconMail, IconActivityHeartbeat, IconSwitchHorizontal, IconTrash } from "@tabler/icons-react";
import type { PlayerStatus } from "@packages/shared/players";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlayerStatusBadge } from "@/components/shared/PlayerStatusBadge";
import { StatusChangeDialog } from "./StatusChangeDialog";
import { DeletePlayerDialog } from "./DeletePlayerDialog";

export interface PlayerProfileData {
  _id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  position: string;
  squadNumber?: number;
  status: string;
  nationality?: string;
}

interface PlayerProfileHeaderProps {
  player: PlayerProfileData;
  /** Most recent invite status for this player. null = no invite sent. */
  inviteStatus?: string | null;
  /** Whether to show the invite/re-invite button (admin + no userId + has email). */
  showInviteButton?: boolean;
  /** Callback when the invite button is clicked. */
  onInviteClick?: () => void;
  /** Whether the current user is an admin (Story 5.6 AC #1). */
  isAdmin?: boolean;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export const PlayerProfileHeader = React.memo(function PlayerProfileHeader({
  player,
  inviteStatus,
  showInviteButton,
  onInviteClick,
  isAdmin,
}: PlayerProfileHeaderProps) {
  // Story 5.5 AC #12: Injury status indicator for all roles
  const injuryStatus = useQuery(
    api.players.queries.getPlayerInjuryStatus,
    { playerId: player._id as Id<"players"> }
  );

  // Story 5.6 AC #1: Status change dialog state
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const handleOpenStatusDialog = React.useCallback(() => setStatusDialogOpen(true), []);
  const handleCloseStatusDialog = React.useCallback(() => setStatusDialogOpen(false), []);

  // Story 12.3 AC #10: Delete player dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const handleOpenDeleteDialog = React.useCallback(() => setDeleteDialogOpen(true), []);
  const handleCloseDeleteDialog = React.useCallback(() => setDeleteDialogOpen(false), []);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/players">
          <IconArrowLeft className="mr-1 size-4" />
          Back to Players
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-24">
            {player.photoUrl ? (
              <AvatarImage
                src={player.photoUrl}
                alt={`${player.firstName} ${player.lastName}`}
              />
            ) : null}
            <AvatarFallback className="text-2xl">
              {getInitials(player.firstName, player.lastName)}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">
                {player.firstName} {player.lastName}
              </h1>
              {/* [Sprint 2 — Story 5.5] Injury status icon hidden until Sprint 2 delivery
              {injuryStatus?.hasCurrentInjury && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconActivityHeartbeat className="size-5 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>Currently injured</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              */}
              {inviteStatus === "pending" && (
                <Badge variant="secondary" className="text-xs">
                  Invited — awaiting response
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{player.position}</span>
              {player.squadNumber != null && (
                <Badge variant="outline">#{player.squadNumber}</Badge>
              )}
              <PlayerStatusBadge status={player.status as PlayerStatus} />
              {player.nationality && (
                <span className="text-muted-foreground text-sm">
                  {player.nationality}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Story 5.6 AC #1: Admin-only status change button */}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenStatusDialog}
            >
              <IconSwitchHorizontal className="mr-1 size-4" />
              Change Status
            </Button>
          )}

          {showInviteButton && onInviteClick && (
            <Button variant="outline" size="sm" onClick={onInviteClick}>
              <IconMail className="mr-1 size-4" />
              {inviteStatus === "pending" ? "Resend Invite" : "Invite to Platform"}
            </Button>
          )}

          {/* Story 12.3 AC #10: Admin-only delete player button */}
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleOpenDeleteDialog}
            >
              <IconTrash className="mr-1 size-4" />
              Delete Player
            </Button>
          )}
        </div>
      </div>

      {/* Story 5.6 AC #1, #3: Status change confirmation dialog */}
      {isAdmin && (
        <StatusChangeDialog
          playerId={player._id as Id<"players">}
          currentStatus={player.status}
          playerName={`${player.firstName} ${player.lastName}`}
          open={statusDialogOpen}
          onClose={handleCloseStatusDialog}
        />
      )}

      {/* Story 12.3 AC #10, #11: Delete player confirmation dialog */}
      {isAdmin && (
        <DeletePlayerDialog
          playerId={player._id as Id<"players">}
          playerName={`${player.firstName} ${player.lastName}`}
          open={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
        />
      )}
    </div>
  );
});
