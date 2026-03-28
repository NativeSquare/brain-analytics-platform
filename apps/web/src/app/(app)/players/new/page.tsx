"use client";

import * as React from "react";
import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { ProfileForm } from "@/components/players/ProfileForm";
import { InvitePlayerDialog } from "@/components/players/InvitePlayerDialog";
import type { PlayerFormData } from "@/components/players/playerFormSchema";

export default function AddPlayerPage() {
  const router = useRouter();
  const currentUser = useQuery(api.table.users.currentUser);

  const [inviteDialogState, setInviteDialogState] = React.useState<{
    open: boolean;
    playerId: Id<"players"> | null;
    firstName: string;
    lastName: string;
    personalEmail: string | undefined;
  }>({
    open: false,
    playerId: null,
    firstName: "",
    lastName: "",
    personalEmail: undefined,
  });

  // Ref to always access the latest playerId in callbacks (avoids stale closures)
  const playerIdRef = useRef(inviteDialogState.playerId);
  playerIdRef.current = inviteDialogState.playerId;

  // Auth guard: redirect non-admin users
  if (currentUser !== undefined && currentUser?.role !== "admin") {
    router.replace("/players");
    return null;
  }

  const handleSuccess = useCallback((playerId: string, data: PlayerFormData) => {
    setInviteDialogState({
      open: true,
      playerId: playerId as Id<"players">,
      firstName: data.firstName,
      lastName: data.lastName,
      personalEmail: data.personalEmail || undefined,
    });
  }, []);

  const handleInviteClose = useCallback(() => {
    setInviteDialogState((prev) => ({ ...prev, open: false }));
    // Navigate to the new player's profile — read from ref to avoid stale closure
    if (playerIdRef.current) {
      router.push(`/players/${playerIdRef.current}`);
    }
  }, [router]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Add Player</h1>
      <div className="mx-auto w-full max-w-3xl">
        <ProfileForm onSuccess={handleSuccess} />
      </div>

      {inviteDialogState.playerId && (
        <InvitePlayerDialog
          playerId={inviteDialogState.playerId}
          firstName={inviteDialogState.firstName}
          lastName={inviteDialogState.lastName}
          personalEmail={inviteDialogState.personalEmail}
          open={inviteDialogState.open}
          onClose={handleInviteClose}
        />
      )}
    </div>
  );
}
