"use client";

import { FilterBar } from "@/components/dashboard/FilterBar";
import {
  FilterSelect,
  type FilterSelectOption,
} from "@/components/dashboard/FilterSelect";

interface OppositionFilterBarProps {
  teams: FilterSelectOption[];
  seasons: FilterSelectOption[];
  opponents: FilterSelectOption[];
  selectedTeamId: string | undefined;
  selectedSeasonId: string | undefined;
  selectedOpponentId: string | undefined;
  matchesLoading: boolean;
  onTeamChange: (value: string) => void;
  onSeasonChange: (value: string) => void;
  onOpponentChange: (value: string) => void;
}

export default function OppositionFilterBar({
  teams,
  seasons,
  opponents,
  selectedTeamId,
  selectedSeasonId,
  selectedOpponentId,
  matchesLoading,
  onTeamChange,
  onSeasonChange,
  onOpponentChange,
}: OppositionFilterBarProps) {
  return (
    <FilterBar>
      <FilterSelect
        label="Your Team"
        options={teams}
        value={selectedTeamId}
        onChange={onTeamChange}
        placeholder="Select team"
        searchable
        className="min-w-[180px] flex-1"
      />
      <FilterSelect
        label="Season"
        options={seasons}
        value={selectedSeasonId}
        onChange={onSeasonChange}
        placeholder="Select season"
        searchable
        className="min-w-[160px] flex-1"
      />
      <FilterSelect
        label="Opponent"
        options={opponents}
        value={selectedOpponentId}
        onChange={onOpponentChange}
        placeholder={matchesLoading ? "Loading..." : "Select opponent"}
        searchable
        className="min-w-[220px] flex-[2]"
      />
    </FilterBar>
  );
}
