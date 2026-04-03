"use client";

import { useMemo } from "react";

import type { SetPiece } from "./types";

interface FirstContactsBarChartProps {
  items: SetPiece[];
  onPlayerClick: (player: string | null) => void;
  highlightedPlayer: string | null;
}

const FirstContactsBarChart = ({
  items,
  onPlayerClick,
  highlightedPlayer,
}: FirstContactsBarChartProps) => {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sp of items) {
      const player = sp.first_phase_first_contact_player;
      if (!player) continue;
      counts.set(player, (counts.get(player) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [items]);

  const maxCount = data.reduce((mx, [, c]) => Math.max(mx, c), 0);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold uppercase">
        First Contacts
      </div>
      <div className="space-y-2">
        {data.map(([label, count]) => {
          const isActive = highlightedPlayer === label;
          return (
            <button
              key={label}
              type="button"
              className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-muted"
              onClick={() => onPlayerClick(isActive ? null : label)}
            >
              <span
                className={`w-28 truncate text-xs ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
              <div className="relative flex-1">
                <div
                  className={`h-5 rounded ${isActive ? "bg-blue-700" : "bg-blue-700/70"}`}
                  style={{
                    width:
                      maxCount > 0 ? `${(count / maxCount) * 100}%` : "0%",
                  }}
                />
              </div>
              <span className="w-8 text-right text-xs font-medium">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FirstContactsBarChart;
