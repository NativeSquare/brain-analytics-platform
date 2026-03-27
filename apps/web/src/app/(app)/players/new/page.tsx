"use client";

import * as React from "react";
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

  // Auth guard: redirect non-admin users
  if (currentUser !== undefined && currentUser?.role !== "admin") {
    router.replace("/players");
    return null;
  }

  const handleSuccess = (playerId: string, data: PlayerFormData) => {
    setInviteDialogState({
      open: true,
      playerId: playerId as Id<"players">,
      firstName: data.firstName,
      lastName: data.lastName,
      personalEmail: data.personalEmail || undefined,
    });
  };

  const handleInviteClose = () => {
    setInviteDialogState((prev) => ({ ...prev, open: false }));
    // Navigate to the new player's profile
    if (inviteDialogState.playerId) {
      router.push(`/players/${inviteDialogState.playerId}`);
    }
  };

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
