"use client";

import React, { useCallback, useMemo } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import type { PlayerSummary } from "./PlayerTable";

// ---------------------------------------------------------------------------
// Medical status groups — this is the primary grouping axis
// ---------------------------------------------------------------------------

const MEDICAL_GROUPS = [
  {
    key: "available",
    label: "AVAILABLE",
    borderColor: "border-t-green-500",
    gradient: "from-green-100/80 to-transparent dark:from-green-900/20",
    textColor: "text-green-600 dark:text-green-400",
    accentColor: "bg-green-500",
    dotColor: "bg-green-500",
  },
  {
    key: "rehab",
    label: "MODIFIED TRAINING",
    borderColor: "border-t-amber-400",
    gradient: "from-amber-100/80 to-transparent dark:from-amber-900/20",
    textColor: "text-amber-600 dark:text-amber-400",
    accentColor: "bg-amber-400",
    dotColor: "bg-amber-400",
  },
  {
    key: "assessment",
    label: "REHAB",
    borderColor: "border-t-orange-500",
    gradient: "from-orange-100/80 to-transparent dark:from-orange-900/20",
    textColor: "text-orange-600 dark:text-orange-400",
    accentColor: "bg-orange-500",
    dotColor: "bg-orange-500",
  },
  {
    key: "active",
    label: "INJURED",
    borderColor: "border-t-red-500",
    gradient: "from-red-100/80 to-transparent dark:from-red-900/20",
    textColor: "text-red-600 dark:text-red-400",
    accentColor: "bg-red-500",
    dotColor: "bg-red-500",
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// PlayerCard
// ---------------------------------------------------------------------------

interface MedicalGroupConfig {
  label: string;
  borderColor: string;
  gradient: string;
  textColor: string;
}

const PlayerCard = React.memo(function PlayerCard({
  player,
  config,
  appearances,
  onClick,
}: {
  player: PlayerSummary;
  config: MedicalGroupConfig;
  appearances: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col items-center overflow-hidden rounded-xl border border-border/60 border-t-4 bg-card shadow-sm transition-all hover:shadow-lg",
        config.borderColor,
      )}
    >
      {/* Gradient overlay */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b",
          config.gradient,
        )}
      />

      {/* Squad number watermark — large, top-right */}
      {player.squadNumber !== undefined && (
        <span className="absolute right-2 top-1 text-[3.5rem] font-black leading-none text-foreground/[0.06] select-none">
          {player.squadNumber}
        </span>
      )}

      {/* Medical status label — top-left, uppercase text */}
      <div className="relative z-10 self-start px-3 pt-2.5">
        <span className={cn("text-[10px] font-extrabold tracking-wider", config.textColor)}>
          {config.label}
        </span>
      </div>

      {/* Avatar */}
      <div className="relative z-10 pb-3 pt-1">
        <Avatar className="size-16 shadow-md ring-2 ring-white dark:ring-border">
          {player.photoUrl ? (
            <AvatarImage
              src={player.photoUrl}
              alt={`${player.firstName} ${player.lastName}`}
            />
          ) : null}
          <AvatarFallback className="text-base font-semibold bg-muted">
            {getInitials(player.firstName, player.lastName)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Name */}
      <p className="relative z-10 px-2 text-sm leading-tight text-center">
        {player.firstName}
        <br />
        <span className="font-extrabold">{player.lastName}</span>
      </p>

      {/* Appearances stat */}
      <div className="relative z-10 mt-auto flex w-full items-end justify-center px-4 pb-3 pt-2">
        <div className="flex flex-col items-center">
          <span className="text-xl font-black leading-none text-primary/70">
            {appearances}
          </span>
          <span className="mt-0.5 text-[7px] font-bold uppercase tracking-widest text-muted-foreground">
            Apps
          </span>
        </div>
      </div>
    </button>
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
  const { isAuthenticated } = useConvexAuth();

  const playerIds = useMemo(() => players.map((p) => p._id), [players]);
  const rtpStatuses = useQuery(
    api.players.queries.getPlayersRtpStatuses,
    isAuthenticated && playerIds.length > 0 ? { playerIds } : "skip",
  );
  const appearancesData = useQuery(
    api.players.queries.getPlayersAppearances,
    isAuthenticated && playerIds.length > 0 ? { playerIds } : "skip",
  );

  // Group players by medical status
  const grouped = useMemo(() => {
    const map = new Map<string, PlayerSummary[]>();
    for (const p of players) {
      const status = (rtpStatuses as Record<string, string | null> | undefined)?.[p._id] ?? "available";
      const key = status === "available" || status === null ? "available" : status;
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return map;
  }, [players, rtpStatuses]);

  const handleClick = useCallback(
    (playerId: Id<"players">) => () => onPlayerClick(playerId),
    [onPlayerClick],
  );

  return (
    <div className="space-y-10">
      {MEDICAL_GROUPS.map((group) => {
        const groupPlayers = grouped.get(group.key);
        if (!groupPlayers || groupPlayers.length === 0) return null;

        return (
          <section key={group.key}>
            {/* Section header */}
            <div className="mb-4 flex items-center gap-3">
              <div className={cn("h-5 w-1 rounded-full", group.accentColor)} />
              <h2 className={cn("text-sm font-bold tracking-wider", group.textColor)}>
                {group.label}
              </h2>
              <span className="text-sm font-medium text-muted-foreground">
                {groupPlayers.length}
              </span>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {groupPlayers.map((player) => (
                <PlayerCard
                  key={player._id}
                  player={player}
                  config={group}
                  appearances={(appearancesData as Record<string, number> | undefined)?.[player._id] ?? 0}
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
