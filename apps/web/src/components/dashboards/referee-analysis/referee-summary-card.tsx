"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { RefereeTotals } from "./types";

interface RefereeSummaryCardProps {
  totals: RefereeTotals | null;
}

export default function RefereeSummaryCard({ totals }: RefereeSummaryCardProps) {
  if (!totals) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Select a referee to view summary.
        </CardContent>
      </Card>
    );
  }

  const items = [
    { label: "Referee", value: totals.referee_name ?? "Unknown" },
    { label: "Total Matches", value: totals.matches },
    {
      label: "Avg Fouls / Game",
      value: totals.fouls_per_match.toFixed(1),
    },
    {
      label: "Avg Yellow Cards / Game",
      value: totals.yellow_cards_per_match.toFixed(2),
    },
    {
      label: "Avg Red Cards / Game",
      value: totals.red_cards_per_match.toFixed(2),
    },
  ];

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-6 p-4">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <span className="text-xs uppercase text-muted-foreground">
              {item.label}
            </span>
            <span className="text-lg font-semibold">{item.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
