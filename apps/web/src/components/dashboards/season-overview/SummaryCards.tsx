"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StatsItem } from "@/components/dashboard/StatsItem";
import type { SeasonPointsData } from "./types";
import { toNumber, getResultCode, sortByMatchWeek } from "./utils";

interface SummaryCardsProps {
  data: SeasonPointsData[];
}

export default function SummaryCards({ data }: SummaryCardsProps) {
  if (!data || data.length === 0) return null;

  const sorted = sortByMatchWeek(data);
  const games = sorted.length;
  const wins = sorted.filter((m) => getResultCode(m.points) === "W").length;
  const draws = sorted.filter((m) => getResultCode(m.points) === "D").length;
  const losses = sorted.filter((m) => getResultCode(m.points) === "L").length;

  const goalsFor = sorted.reduce(
    (sum, m) => sum + toNumber(m.goals_scored),
    0,
  );
  const goalsAgainst = sorted.reduce(
    (sum, m) => sum + toNumber(m.goals_conceded),
    0,
  );
  const goalDiff = goalsFor - goalsAgainst;
  const totalPoints = sorted.reduce((sum, m) => sum + toNumber(m.points), 0);
  const ppg = games > 0 ? totalPoints / games : 0;

  const stats = [
    { label: "Games", value: String(games) },
    { label: "W-D-L", value: `${wins}-${draws}-${losses}` },
    { label: "PPG", value: ppg.toFixed(1) },
    { label: "Goals For", value: String(goalsFor) },
    { label: "Goals Against", value: String(goalsAgainst) },
    { label: "Goal Diff", value: `${goalDiff >= 0 ? "+" : ""}${goalDiff}` },
  ];

  return (
    <div className="overflow-x-auto">
      <Card className="min-w-[840px]">
        <CardContent className="flex flex-nowrap gap-2 p-4">
          {stats.map((item) => (
            <StatsItem key={item.label} label={item.label} value={item.value} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
