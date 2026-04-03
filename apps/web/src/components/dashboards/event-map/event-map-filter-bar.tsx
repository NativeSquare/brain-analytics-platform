"use client";

import { FilterBar } from "@/components/dashboard/FilterBar";
import {
  FilterSelect,
  type FilterSelectOption,
} from "@/components/dashboard/FilterSelect";

interface EventMapFilterBarProps {
  teams: FilterSelectOption[];
  seasons: FilterSelectOption[];
  matches: FilterSelectOption[];
  venueOptions: FilterSelectOption[];
  selectedTeamId: string | undefined;
  selectedSeasonId: string | undefined;
  selectedMatchId: string | undefined;
  venueFilter: string | undefined;
  matchesLoading: boolean;
  onTeamChange: (value: string) => void;
  onSeasonChange: (value: string) => void;
  onMatchChange: (value: string) => void;
  onVenueChange: (value: string) => void;
}

export default function EventMapFilterBar({
  teams,
  seasons,
  matches,
  venueOptions,
  selectedTeamId,
  selectedSeasonId,
  selectedMatchId,
  venueFilter,
  matchesLoading,
  onTeamChange,
  onSeasonChange,
  onMatchChange,
  onVenueChange,
}: EventMapFilterBarProps) {
  return (
    <FilterBar>
      <FilterSelect
        label="Team"
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
        label="Match"
        options={matches}
        value={selectedMatchId}
        onChange={onMatchChange}
        placeholder={matchesLoading ? "Loading..." : "Select match"}
        searchable
        className="min-w-[260px] flex-[2]"
      />
      <FilterSelect
        label="Venue"
        options={venueOptions}
        value={venueFilter}
        onChange={onVenueChange}
        placeholder="All venues"
        searchable={false}
        className="min-w-[130px] flex-1"
      />
    </FilterBar>
  );
}
