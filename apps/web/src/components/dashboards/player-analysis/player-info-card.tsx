"use client";

import { User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { PlayerSeasonStats } from "./types";
import type { PositionRole } from "./types";
import { POSITION_ROLES } from "./constants";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayerInfoCardProps {
  player: PlayerSeasonStats;
  positionRole: PositionRole;
  onRoleChange: (role: PositionRole) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerInfoCard({
  player,
  positionRole,
  onRoleChange,
}: PlayerInfoCardProps) {
  const age = calculateAge(player.date_of_birth ?? player.birth_date);
  const position = player.primary_position ?? "Unknown";
  const minutes = player.player_season_minutes ?? 0;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-6 p-5">
        {/* Avatar / photo placeholder */}
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="size-8 text-muted-foreground" />
        </div>

        {/* Name + details */}
        <div className="flex-1 space-y-1">
          <h2 className="text-xl font-bold leading-tight">
            {player.player_name}
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{position}</span>
            {age !== null && <span>{age} years</span>}
            <span>{player.team_name}</span>
            <span>{Math.round(minutes)} min played</span>
            {player.competition_name && (
              <span>{player.competition_name}</span>
            )}
            {player.season_name && <span>{player.season_name}</span>}
          </div>
        </div>

        {/* Role selector */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase">
            Position Role
          </Label>
          <Select
            value={positionRole}
            onValueChange={(v) => onRoleChange(v as PositionRole)}
          >
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITION_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
