"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { MatchOption } from "./types";

interface SetPieceMatchFiltersBarProps {
  teams: Array<{ team_id: number; team_name: string }>;
  seasons: Array<{ season_id: number; season_name: string }>;
  selectedTeamId: number;
  selectedSeasonId: number | null;
  matchQuery: string;
  matchDropdownOpen: boolean;
  matchesLoading: boolean;
  matchesError: string | null;
  filteredMatches: MatchOption[];
  allSeasonSetPieces: boolean;
  onTeamChange: (teamId: number) => void;
  onSeasonChange: (seasonId: number | null) => void;
  onMatchQueryChange: (value: string) => void;
  onMatchSelect: (match: MatchOption) => void;
  onMatchFocus: () => void;
  onMatchBlur: () => void;
  onAllSeasonSetPiecesChange: (value: boolean) => void;
}

const SetPieceMatchFiltersBar = ({
  teams,
  seasons,
  selectedTeamId,
  selectedSeasonId,
  matchQuery,
  matchDropdownOpen,
  matchesLoading,
  matchesError,
  filteredMatches,
  allSeasonSetPieces,
  onTeamChange,
  onSeasonChange,
  onMatchQueryChange,
  onMatchSelect,
  onMatchFocus,
  onMatchBlur,
  onAllSeasonSetPiecesChange,
}: SetPieceMatchFiltersBarProps) => {
  return (
    <div className="w-full rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex w-full flex-row items-end gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Label className="text-xs font-semibold uppercase">Team</Label>
          <Select
            value={String(selectedTeamId)}
            onValueChange={(value) => onTeamChange(Number(value))}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.team_id} value={String(team.team_id)}>
                  {team.team_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <Label className="text-xs font-semibold uppercase">Season</Label>
          <Select
            value={selectedSeasonId != null ? String(selectedSeasonId) : "all"}
            onValueChange={(value) =>
              onSeasonChange(value === "all" ? null : Number(value))
            }
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {seasons.map((season) => (
                <SelectItem
                  key={season.season_id}
                  value={String(season.season_id)}
                >
                  {season.season_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative min-w-0 flex-1 space-y-2">
          <Label className="text-xs font-semibold uppercase">Match</Label>
          <Input
            className="h-9 w-full"
            placeholder={
              allSeasonSetPieces ? "All Season Set Pieces" : "Search match..."
            }
            value={matchQuery}
            onChange={(event) => onMatchQueryChange(event.target.value)}
            onFocus={onMatchFocus}
            onBlur={onMatchBlur}
            disabled={allSeasonSetPieces}
          />
          {!allSeasonSetPieces && matchDropdownOpen && (
            <div className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border bg-popover shadow-md">
              {matchesLoading ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Loading matches...
                </div>
              ) : matchesError ? (
                <div className="p-4 text-sm text-destructive">
                  {matchesError}
                </div>
              ) : filteredMatches.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No matches found
                </div>
              ) : (
                <div className="p-1">
                  {filteredMatches.map((match) => (
                    <button
                      key={match.match_id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onMatchSelect(match)}
                      className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="font-medium">{match.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {match.selected_team_name} vs{" "}
                        {match.opposition_team_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <Label className="text-xs font-semibold uppercase">Set Pieces</Label>
          <div className="flex h-9 w-full items-center gap-2 rounded-md border border-border px-3">
            <Checkbox
              checked={allSeasonSetPieces}
              onCheckedChange={(checked) =>
                onAllSeasonSetPiecesChange(checked === true)
              }
            />
            <span className="whitespace-nowrap text-sm">All Season</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetPieceMatchFiltersBar;
