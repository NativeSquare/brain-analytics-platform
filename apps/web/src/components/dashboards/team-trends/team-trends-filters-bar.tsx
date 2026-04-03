"use client";

import { FilterBar } from "@/components/dashboard/FilterBar";
import {
  FilterSelect,
  type FilterSelectOption,
} from "@/components/dashboard/FilterSelect";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TeamTrendsFiltersBarProps {
  teams: FilterSelectOption[];
  seasons: FilterSelectOption[];
  selectedTeamId: string | undefined;
  selectedSeasonId: string | undefined;
  onTeamChange: (value: string) => void;
  onSeasonChange: (value: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamTrendsFiltersBar({
  teams,
  seasons,
  selectedTeamId,
  selectedSeasonId,
  onTeamChange,
  onSeasonChange,
}: TeamTrendsFiltersBarProps) {
  return (
    <FilterBar>
      <FilterSelect
        label="Team"
        options={teams}
        value={selectedTeamId}
        onChange={onTeamChange}
        placeholder="Select team..."
        className="w-56"
      />
      <FilterSelect
        label="Season"
        options={seasons}
        value={selectedSeasonId}
        onChange={onSeasonChange}
        placeholder="Select season..."
        className="w-44"
      />
    </FilterBar>
  );
}
