"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShotFiltersBarProps {
  teamOptions: string[];
  periodOptions: string[];
  outcomeOptions: string[];
  phaseOptions: string[];
  playerOptions: string[];
  teamFilter: string;
  periodFilter: string;
  outcomeFilter: string;
  phaseFilter: string;
  playerFilter: string;
  excludePenalties: boolean;
  allTeamShots: boolean;
  onTeamFilterChange: (value: string) => void;
  onPeriodFilterChange: (value: string) => void;
  onOutcomeFilterChange: (value: string) => void;
  onPhaseFilterChange: (value: string) => void;
  onPlayerFilterChange: (value: string) => void;
  onExcludePenaltiesChange: (value: boolean) => void;
  onReset: () => void;
}

const ShotFiltersBar = ({
  teamOptions,
  periodOptions,
  outcomeOptions,
  phaseOptions,
  playerOptions,
  teamFilter,
  periodFilter,
  outcomeFilter,
  phaseFilter,
  playerFilter,
  excludePenalties,
  allTeamShots,
  onTeamFilterChange,
  onPeriodFilterChange,
  onOutcomeFilterChange,
  onPhaseFilterChange,
  onPlayerFilterChange,
  onExcludePenaltiesChange,
  onReset,
}: ShotFiltersBarProps) => {
  return (
    <div className="w-full rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-7 items-end gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase">Team</Label>
          <Select
            value={teamFilter}
            onValueChange={onTeamFilterChange}
            disabled={allTeamShots}
          >
            <SelectTrigger className={`h-9 w-full ${allTeamShots ? "opacity-50" : ""}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teamOptions.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase">Half</Label>
          <Select value={periodFilter} onValueChange={onPeriodFilterChange}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((period) => (
                <SelectItem key={period} value={period}>
                  {period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase">Outcome</Label>
          <Select value={outcomeFilter} onValueChange={onOutcomeFilterChange}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {outcomeOptions.map((outcome) => (
                <SelectItem key={outcome} value={outcome}>
                  {outcome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase">Phase</Label>
          <Select value={phaseFilter} onValueChange={onPhaseFilterChange}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {phaseOptions.map((phase) => (
                <SelectItem key={phase} value={phase}>
                  {phase}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase">Player</Label>
          <Select value={playerFilter} onValueChange={onPlayerFilterChange}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {playerOptions.map((player) => (
                <SelectItem key={player} value={player}>
                  {player}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase">Penalties</Label>
          <div className="flex h-9 w-full items-center gap-2 rounded-md border border-border px-3">
            <Checkbox
              checked={excludePenalties}
              onCheckedChange={(checked) => onExcludePenaltiesChange(checked === true)}
            />
            <span className="whitespace-nowrap text-sm">Exclude Penalties</span>
          </div>
        </div>

        <div className="flex items-end">
          <Button variant="outline" className="h-9 w-full" onClick={onReset}>
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShotFiltersBar;
