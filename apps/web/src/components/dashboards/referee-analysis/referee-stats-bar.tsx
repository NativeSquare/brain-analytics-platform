"use client";

import { StatsItem } from "@/components/dashboard";
import type { RefereeTotals } from "./types";

interface RefereeStatsBarProps {
  totals: RefereeTotals | null;
}

export default function RefereeStatsBar({ totals }: RefereeStatsBarProps) {
  const tiles = [
    {
      label: "Total Fouls",
      value: totals?.fouls ?? 0,
      sub: totals ? `${totals.fouls_per_match.toFixed(1)} / match` : undefined,
    },
    {
      label: "Yellow Cards",
      value: totals?.yellow_cards ?? 0,
      sub: totals
        ? `${totals.yellow_cards_per_match.toFixed(2)} / match`
        : undefined,
    },
    {
      label: "Red Cards",
      value: totals?.red_cards ?? 0,
      sub: totals
        ? `${totals.red_cards_per_match.toFixed(2)} / match`
        : undefined,
    },
    {
      label: "Penalties",
      value: totals?.penalties ?? 0,
      sub: totals
        ? `${totals.penalties_per_match.toFixed(2)} / match`
        : undefined,
    },
  ];

  return (
    <div className="flex flex-wrap items-stretch gap-4 rounded-xl border bg-card p-4 shadow-sm">
      {tiles.map((tile) => (
        <StatsItem
          key={tile.label}
          label={tile.label}
          value={tile.value}
          subValue={tile.sub}
          className="min-w-[100px]"
        />
      ))}
    </div>
  );
}
