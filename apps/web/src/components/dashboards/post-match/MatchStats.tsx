"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchStatsRow } from "./types";

interface StatConfig {
  key: keyof MatchStatsRow;
  label: string;
  format: (v: number) => string;
}

const STATS_CONFIG: StatConfig[] = [
  { key: "goals", label: "Goals", format: (v) => v.toFixed(0) },
  { key: "xt", label: "xT", format: (v) => v.toFixed(2) },
  { key: "total_xg", label: "xG", format: (v) => v.toFixed(2) },
  { key: "build_up_xg", label: "Build-up xG", format: (v) => v.toFixed(2) },
  { key: "transition_xg", label: "Transition xG", format: (v) => v.toFixed(2) },
  { key: "set_piece_xg", label: "Set Piece xG", format: (v) => v.toFixed(2) },
  { key: "shots", label: "Shots", format: (v) => v.toFixed(0) },
  { key: "passes", label: "Passes", format: (v) => v.toFixed(0) },
  { key: "possession", label: "Possession %", format: (v) => v.toFixed(1) },
  { key: "ppda", label: "PPDA", format: (v) => v.toFixed(2) },
];

interface MatchStatsProps {
  stats: MatchStatsRow[];
  selectedTeamId: number;
  oppositionTeamId: number;
  isLoading: boolean;
}

const TEAM_COLOR = "#1a365d";
const OPP_COLOR = "#991b1b";

export default function MatchStats({
  stats,
  selectedTeamId,
  oppositionTeamId,
  isLoading,
}: MatchStatsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const selectedTeamStats = stats.find((s) => s.team_id === selectedTeamId);
  const oppositionTeamStats = stats.find((s) => s.team_id === oppositionTeamId);

  if (!selectedTeamStats || !oppositionTeamStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No match stats available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <div
        className="rounded-t py-2 px-3 text-center text-sm font-bold text-white"
        style={{ backgroundColor: "#666666" }}
      >
        Match Stats
      </div>
      <div className="rounded-b border border-border bg-card p-4">
        <div className="space-y-1">
          {STATS_CONFIG.map((config) => {
            const selectedValue = Number(selectedTeamStats[config.key] ?? 0);
            const oppositionValue = Number(oppositionTeamStats[config.key] ?? 0);
            const formatDisplay = (v: number) => (v === 0 ? "0" : config.format(v));

            let maxValue: number;
            if (config.key === "possession") {
              maxValue = 100;
            } else {
              maxValue = Math.max(selectedValue, oppositionValue) * 1.1;
              if (maxValue === 0) maxValue = 1;
            }

            const selectedPercent = maxValue > 0 ? (selectedValue / maxValue) * 100 : 0;
            const oppositionPercent = maxValue > 0 ? (oppositionValue / maxValue) * 100 : 0;

            return (
              <div key={config.key} className="mb-3">
                <div className="mb-1.5 text-center text-xs font-semibold text-muted-foreground">
                  {config.label}
                </div>
                <div className="relative flex items-center">
                  {/* Selected team bar (left side) */}
                  <div className="flex flex-1 justify-end pr-1">
                    <div
                      className="flex h-7 items-center justify-end rounded transition-opacity hover:opacity-80"
                      style={{
                        width: `${selectedPercent}%`,
                        backgroundColor: TEAM_COLOR,
                        minWidth: "30px",
                      }}
                    >
                      <span className="whitespace-nowrap px-2 text-xs font-semibold text-white">
                        {formatDisplay(selectedValue)}
                      </span>
                    </div>
                  </div>
                  {/* Opposition team bar (right side) */}
                  <div className="flex flex-1 pl-1">
                    <div
                      className="flex h-7 items-center rounded transition-opacity hover:opacity-80"
                      style={{
                        width: `${oppositionPercent}%`,
                        backgroundColor: OPP_COLOR,
                        minWidth: "30px",
                      }}
                    >
                      <span className="whitespace-nowrap px-2 text-xs font-semibold text-white">
                        {formatDisplay(oppositionValue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
