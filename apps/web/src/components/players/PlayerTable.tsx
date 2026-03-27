"use client";

import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { PlayerStatus } from "@packages/shared/players";

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

export function PlayerTable({ players, onPlayerClick }: PlayerTableProps) {
  return (
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
          <TableRow
            key={player._id}
            className="cursor-pointer"
            onClick={() => onPlayerClick(player._id)}
          >
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
        ))}
      </TableBody>
    </Table>
  );
}
