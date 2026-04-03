"use client";

import { StatsItem } from "@/components/dashboard/StatsItem";

import type { SummaryStats } from "./types";

interface StatsBarProps {
  stats: SummaryStats;
  shotsCount: number;
}

const StatsBar = ({ stats, shotsCount }: StatsBarProps) => {
  return (
    <div className="w-full rounded-xl border bg-card p-4 text-sm shadow-sm">
      <div className="flex w-full flex-wrap items-start justify-between gap-6">
        <StatsItem label="Shots" value={shotsCount} />
        <StatsItem label="NP Shots" value={stats.nonPenaltyShots} />
        <StatsItem label="Goals" value={stats.goals} />
        <StatsItem label="NP Goals" value={stats.nonPenaltyGoals} />
        <StatsItem label="xG" value={stats.totalXg.toFixed(2)} />
        <StatsItem label="NPxG" value={stats.totalNpxg.toFixed(2)} />
        <StatsItem label="Goals/Shot" value={stats.avgGoalPerShot.toFixed(2)} />
        <StatsItem label="xG/Shot" value={stats.avgXg.toFixed(2)} />
        <StatsItem label="NPxG/Shot" value={stats.avgNpxg.toFixed(2)} />
        <StatsItem label="Avg Distance" value={stats.avgDistance.toFixed(1)} />
      </div>
    </div>
  );
};

export default StatsBar;
