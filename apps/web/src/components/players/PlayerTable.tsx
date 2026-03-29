"use client";

import React, { useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { PlayerStatus } from "@packages/shared/players";
import { IconActivityHeartbeat } from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlayerStatusBadge } from "@/components/shared/PlayerStatusBadge";

export interface PlayerSummary {
  _id: Id<"players">;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  position: string;
  squadNumber?: number;
  status: string;
  nationality?: string;
  inviteStatus?: string | null;
}

interface PlayerTableProps {
  players: PlayerSummary[];
  onPlayerClick: (playerId: Id<"players">) => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Memoized table row to prevent re-renders when sibling rows change. */
const PlayerRow = React.memo(function PlayerRow({
  player,
  onPlayerClick,
  hasCurrentInjury,
}: {
  player: PlayerSummary;
  onPlayerClick: (playerId: Id<"players">) => void;
  hasCurrentInjury?: boolean;
}) {
  const handleClick = useCallback(() => {
    onPlayerClick(player._id);
  }, [onPlayerClick, player._id]);

  return (
    <TableRow className="cursor-pointer" onClick={handleClick}>
      <TableCell>
        <Avatar className="size-8">
          {player.photoUrl ? (
            <AvatarImage
              src={player.photoUrl}
              alt={`${player.firstName} ${player.lastName}`}
            />
          ) : null}
          <AvatarFallback className="text-xs">
            {getInitials(player.firstName, player.lastName)}
          </AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell className="font-medium">
        <span className="inline-flex items-center gap-1.5">
          {player.firstName} {player.lastName}
          {player.inviteStatus === "pending" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Invited
            </Badge>
          )}
          {hasCurrentInjury && (
            <Tooltip>
              <TooltipTrigger asChild>
                <IconActivityHeartbeat className="size-4 text-destructive" />
              </TooltipTrigger>
              <TooltipContent>Currently injured</TooltipContent>
            </Tooltip>
          )}
        </span>
      </TableCell>
      <TableCell>{player.position}</TableCell>
      <TableCell className="text-center">
        {player.squadNumber ?? "—"}
      </TableCell>
      <TableCell>
        <PlayerStatusBadge
          status={player.status as PlayerStatus}
        />
      </TableCell>
      <TableCell>{player.nationality ?? "—"}</TableCell>
    </TableRow>
  );
});

export function PlayerTable({ players, onPlayerClick }: PlayerTableProps) {
  // Story 5.5 AC #12, Task 11.2: Batch query to avoid N+1 per-row queries
  const playerIds = useMemo(
    () => players.map((p) => p._id),
    [players]
  );

  const injuryStatuses = useQuery(
    api.players.queries.getPlayersInjuryStatuses,
    playerIds.length > 0 ? { playerIds } : "skip"
  );

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Position</TableHead>
            <TableHead className="text-center">#</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Nationality</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <PlayerRow
              key={player._id}
              player={player}
              onPlayerClick={onPlayerClick}
              hasCurrentInjury={injuryStatuses?.[player._id] ?? false}
            />
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
