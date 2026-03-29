"use client";

import * as React from "react";
import { use, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { IconArrowLeft } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerProfileHeader } from "@/components/players/PlayerProfileHeader";
import { PlayerProfileTabs } from "@/components/players/PlayerProfileTabs";
import { InvitePlayerDialog } from "@/components/players/InvitePlayerDialog";

interface PlayerProfilePageProps {
  params: Promise<{ playerId: string }>;
}

export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const { playerId } = use(params);
  const typedPlayerId = playerId as Id<"players">;

  const player = useQuery(api.players.queries.getPlayerById, {
    playerId: typedPlayerId,
  });
  const tabAccess = useQuery(api.players.queries.getPlayerTabAccess, {
    playerId: typedPlayerId,
  });
  const currentUser = useQuery(api.table.users.currentUser);
  const inviteStatus = useQuery(
    api.players.queries.getPlayerInviteStatus,
    player ? { playerId: typedPlayerId } : "skip"
  );

  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);

  // Memoize callbacks to preserve React.memo on PlayerProfileHeader
  const handleInviteClick = useCallback(() => {
    setInviteDialogOpen(true);
  }, []);

  const handleInviteDialogClose = useCallback(() => {
    setInviteDialogOpen(false);
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const hasNoAccount = player && !player.userId;
  const hasEmail = player && player.personalEmail;
  const showInviteButton = isAdmin && hasNoAccount && hasEmail;

  // Loading state (AC #12)
  if (player === undefined || tabAccess === undefined) {
    return <ProfileSkeleton />;
  }

  // Not found state
  if (player === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <h2 className="text-lg font-medium">Player not found</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          This player does not exist or you don&apos;t have access.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/players">
            <IconArrowLeft className="mr-1.5 size-4" />
            Back to Players
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <PlayerProfileHeader
        player={player}
        inviteStatus={inviteStatus}
        showInviteButton={!!showInviteButton}
        onInviteClick={handleInviteClick}
        isAdmin={isAdmin}
      />
      <PlayerProfileTabs tabAccess={tabAccess} player={player} playerId={typedPlayerId} isAdmin={isAdmin} canEditFitness={currentUser?.role === "admin" || currentUser?.role === "physio"} />

      {showInviteButton && (
        <InvitePlayerDialog
          playerId={typedPlayerId}
          firstName={player.firstName}
          lastName={player.lastName}
          personalEmail={player.personalEmail}
          open={inviteDialogOpen}
          onClose={handleInviteDialogClose}
        />
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Back button skeleton */}
      <Skeleton className="h-8 w-32" />

      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="size-24 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-96" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
