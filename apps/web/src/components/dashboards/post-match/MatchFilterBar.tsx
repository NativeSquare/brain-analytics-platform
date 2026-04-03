"use client";

import { FilterBar, FilterSelect } from "@/components/dashboard";
import type { TeamOption, SeasonOption, MatchOption } from "./types";

interface MatchFilterBarProps {
  teams: TeamOption[];
  seasons: SeasonOption[];
  matches: MatchOption[];
  selectedTeamId: number | null;
  selectedSeasonId: number | null;
  selectedMatchId: number | null;
  matchesLoading: boolean;
  onTeamChange: (teamId: number) => void;
  onSeasonChange: (seasonId: number) => void;
  onMatchChange: (matchId: number) => void;
}

const MatchFilterBar = ({
  teams,
  seasons,
  matches,
  selectedTeamId,
  selectedSeasonId,
  selectedMatchId,
  matchesLoading,
  onTeamChange,
  onSeasonChange,
  onMatchChange,
}: MatchFilterBarProps) => {
  const teamOptions = teams.map((t) => ({
    value: String(t.team_id),
    label: t.team_name,
  }));

  const seasonOptions = seasons.map((s) => ({
    value: String(s.season_id),
    label: s.season_name,
  }));

  const matchOptions = matches.map((m) => ({
    value: String(m.match_id),
    label: m.label,
  }));

  return (
    <FilterBar>
      <FilterSelect
        label="Team"
        options={teamOptions}
        value={selectedTeamId != null ? String(selectedTeamId) : undefined}
        onChange={(val) => onTeamChange(Number(val))}
        placeholder="Select team..."
        className="min-w-0 flex-1"
      />
      <FilterSelect
        label="Season"
        options={seasonOptions}
        value={selectedSeasonId != null ? String(selectedSeasonId) : undefined}
        onChange={(val) => onSeasonChange(Number(val))}
        placeholder={matchesLoading ? "Loading..." : "Select season..."}
        className="min-w-0 flex-1"
      />
      <FilterSelect
        label="Match"
        options={matchOptions}
        value={selectedMatchId != null ? String(selectedMatchId) : undefined}
        onChange={(val) => onMatchChange(Number(val))}
        placeholder={
          matchesLoading
            ? "Loading matches..."
            : matches.length === 0
              ? "No matches"
              : "Select match..."
        }
        searchable
        className="min-w-0 flex-[2]"
      />
    </FilterBar>
  );
};

export default MatchFilterBar;
