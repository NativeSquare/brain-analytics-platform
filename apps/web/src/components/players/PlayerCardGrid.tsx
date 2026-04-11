"use client";

import React, { useCallback, useMemo } from "react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { PlayerStatus } from "@packages/shared/players";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { PlayerStatusBadge } from "@/components/shared/PlayerStatusBadge";
import { cn } from "@/lib/utils";

import type { PlayerSummary } from "./PlayerTable";

// ---------------------------------------------------------------------------
// Position group config — order and colors matching client reference screenshots
// ---------------------------------------------------------------------------

const POSITION_GROUPS = [
  {
    key: "Goalkeeper",
    label: "Goalkeepers",
    accentColor: "bg-amber-400",
    headerText: "text-amber-700 dark:text-amber-400",
    headerBg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    key: "Defender",
    label: "Defenders",
    accentColor: "bg-green-500",
    headerText: "text-green-700 dark:text-green-400",
    headerBg: "bg-green-50 dark:bg-green-950/30",
  },
  {
    key: "Midfielder",
    label: "Midfielders",
    accentColor: "bg-blue-500",
    headerText: "text-blue-700 dark:text-blue-400",
    headerBg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    key: "Forward",
    label: "Forwards",
    accentColor: "bg-red-500",
    headerText: "text-red-700 dark:text-red-400",
    headerBg: "bg-red-50 dark:bg-red-950/30",
  },
] as const;

// ---------------------------------------------------------------------------
// Status → card border color mapping
// ---------------------------------------------------------------------------

const STATUS_BORDER: Record<string, string> = {
  active: "border-l-green-500",
  onLoan: "border-l-amber-500",
  leftClub: "border-l-gray-400",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// PlayerCard
// ---------------------------------------------------------------------------

const PlayerCard = React.memo(function PlayerCard({
  player,
  onClick,
}: {
  player: PlayerSummary;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        "group cursor-pointer border-l-4 p-4 transition-shadow hover:shadow-md",
        STATUS_BORDER[player.status] ?? "border-l-gray-300",
      )}
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        {/* Avatar */}
        <Avatar className="size-16">
          {player.photoUrl ? (
            <AvatarImage
              src={player.photoUrl}
              alt={`${player.firstName} ${player.lastName}`}
            />
          ) : null}
          <AvatarFallback className="text-base font-medium">
            {getInitials(player.firstName, player.lastName)}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <p className="w-full truncate text-sm font-semibold">
          {player.firstName} {player.lastName}
        </p>

        {/* Squad number */}
        {player.squadNumber !== undefined && (
          <span className="text-xs text-muted-foreground">
            #{player.squadNumber}
          </span>
        )}

        {/* Status */}
        <PlayerStatusBadge
          status={player.status as PlayerStatus}
          className="text-[10px]"
        />
      </div>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// PlayerCardGrid
// ---------------------------------------------------------------------------

interface PlayerCardGridProps {
  players: PlayerSummary[];
  onPlayerClick: (playerId: Id<"players">) => void;
}

export function PlayerCardGrid({ players, onPlayerClick }: PlayerCardGridProps) {
  // Group players by position
  const grouped = useMemo(() => {
    const map = new Map<string, PlayerSummary[]>();
    for (const p of players) {
      const list = map.get(p.position) ?? [];
      list.push(p);
      map.set(p.position, list);
    }
    return map;
  }, [players]);

  const handleClick = useCallback(
    (playerId: Id<"players">) => () => onPlayerClick(playerId),
    [onPlayerClick],
  );

  return (
    <div className="space-y-8">
      {POSITION_GROUPS.map((group) => {
        const groupPlayers = grouped.get(group.key);
        if (!groupPlayers || groupPlayers.length === 0) return null;

        return (
          <section key={group.key}>
            {/* Section header */}
            <div className="mb-4 flex items-center gap-3">
              <div
                className={cn(
                  "h-6 w-1 rounded-full",
                  group.accentColor,
                )}
              />
              <h2
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-semibold uppercase tracking-wide",
                  group.headerBg,
                  group.headerText,
                )}
              >
                {group.label}
              </h2>
              <span className="text-xs text-muted-foreground">
                {groupPlayers.length}
              </span>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {groupPlayers.map((player) => (
                <PlayerCard
                  key={player._id}
                  player={player}
                  onClick={handleClick(player._id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
