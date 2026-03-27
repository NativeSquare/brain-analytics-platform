"use client";

import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import type { PlayerStatus } from "@packages/shared/players";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayerStatusBadge } from "@/components/shared/PlayerStatusBadge";

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
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function PlayerProfileHeader({ player }: PlayerProfileHeaderProps) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/players">
          <IconArrowLeft className="mr-1 size-4" />
          Back to Players
        </Link>
      </Button>

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
          <h1 className="text-2xl font-semibold">
            {player.firstName} {player.lastName}
          </h1>
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
    </div>
  );
}
