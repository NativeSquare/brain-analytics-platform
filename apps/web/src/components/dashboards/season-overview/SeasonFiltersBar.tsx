"use client";

import { FilterBar } from "@/components/dashboard/FilterBar";
import { FilterSelect } from "@/components/dashboard/FilterSelect";
import type { TeamOption, SeasonOption } from "./types";

interface SeasonFiltersBarProps {
  teams: TeamOption[];
  seasons: SeasonOption[];
  selectedTeamId: number;
  selectedSeasonId: number | null;
  onTeamChange: (teamId: number) => void;
  onSeasonChange: (seasonId: number | null) => void;
}

export default function SeasonFiltersBar({
  teams,
  seasons,
  selectedTeamId,
  selectedSeasonId,
  onTeamChange,
  onSeasonChange,
}: SeasonFiltersBarProps) {
  const teamOptions = teams.map((t) => ({
    value: String(t.team_id),
    label: t.team_name,
  }));

  const seasonOptions = seasons.map((s) => ({
    value: String(s.season_id),
    label: s.season_name,
  }));

  return (
    <FilterBar>
      <FilterSelect
        label="Team"
        options={teamOptions}
        value={String(selectedTeamId)}
        onChange={(v) => onTeamChange(Number(v))}
        placeholder="Select team"
        searchable
        className="min-w-0 flex-1"
      />
      <FilterSelect
        label="Season"
        options={seasonOptions}
        value={selectedSeasonId ? String(selectedSeasonId) : undefined}
        onChange={(v) => onSeasonChange(v === "" ? null : Number(v))}
        placeholder="Select season"
        searchable
        className="min-w-0 flex-1"
      />
    </FilterBar>
  );
}
