"use client";

import { StatsItem } from "@/components/dashboard/StatsItem";

import type { SetPieceSummaryStats, SetPieceMode } from "./types";

interface SetPieceStatsBarProps {
  stats: SetPieceSummaryStats;
  mode: SetPieceMode;
}

const SetPieceStatsBar = ({ stats, mode }: SetPieceStatsBarProps) => {
  return (
    <div className="w-full rounded-xl border bg-card p-4 text-sm shadow-sm">
      <div className="flex w-full flex-wrap items-start justify-between gap-6">
        <StatsItem label="Total" value={stats.total} />
        <StatsItem label="Goals" value={stats.goals} />
        <StatsItem label="Total xG" value={stats.totalXg.toFixed(2)} />
        {mode === "indirect" && (
          <StatsItem label="1st Contact Won" value={stats.firstContactWon} />
        )}
        <StatsItem label="1st Phase Shots" value={stats.firstPhaseShots} />
        <StatsItem label="1st Phase Goals" value={stats.firstPhaseGoals} />
        <StatsItem
          label="Short%"
          value={`${stats.shortPct.toFixed(0)}%`}
        />
        <StatsItem label="Goals/SP" value={stats.goalsPerSp.toFixed(2)} />
        <StatsItem label="xG/SP" value={stats.xgPerSp.toFixed(2)} />
      </div>
    </div>
  );
};

export default SetPieceStatsBar;
