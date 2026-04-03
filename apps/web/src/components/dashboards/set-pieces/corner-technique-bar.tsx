"use client";

import { useMemo } from "react";

import type { SetPiece } from "./types";

interface CornerTechniqueBarProps {
  items: SetPiece[];
}

const CornerTechniqueBar = ({ items }: CornerTechniqueBarProps) => {
  const data = useMemo(() => {
    const corners = items.filter((sp) =>
      sp.sp_type?.toLowerCase().includes("corner"),
    );
    const counts = new Map<string, number>();
    for (const sp of corners) {
      const tech = sp.technique ?? "Unknown";
      counts.set(tech, (counts.get(tech) ?? 0) + 1);
    }
    const entries = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    return entries;
  }, [items]);

  const maxCount = data.reduce((mx, [, c]) => Math.max(mx, c), 0);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold uppercase">
        Corner Technique
      </div>
      <div className="space-y-2">
        {data.map(([label, count]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-24 truncate text-xs text-muted-foreground">
              {label}
            </span>
            <div className="relative flex-1">
              <div
                className="h-5 rounded bg-primary/70"
                style={{
                  width: maxCount > 0 ? `${(count / maxCount) * 100}%` : "0%",
                }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CornerTechniqueBar;
