"use client";

import { useMemo } from "react";

import type { SetPiece } from "./types";

const OUTCOME_COLORS: Record<string, string> = {
  Goal: "#1b5497",
  Saved: "#c21718",
  Blocked: "#9ca3af",
  "Off Target": "#6b7280",
};

function categorize(raw: string | null): string {
  if (!raw) return "Off Target";
  const lower = raw.toLowerCase();
  if (lower.includes("goal")) return "Goal";
  if (lower.includes("saved")) return "Saved";
  if (lower.includes("blocked")) return "Blocked";
  return "Off Target";
}

interface OutcomeBarChartProps {
  items: SetPiece[];
}

const OutcomeBarChart = ({ items }: OutcomeBarChartProps) => {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sp of items) {
      if (!sp.is_direct_sp) continue;
      const cat = categorize(sp.shot_outcome_name);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    // Fixed order
    const order = ["Goal", "Saved", "Blocked", "Off Target"];
    return order
      .filter((key) => (counts.get(key) ?? 0) > 0)
      .map((key) => ({ label: key, count: counts.get(key) ?? 0 }));
  }, [items]);

  const maxCount = data.reduce((mx, d) => Math.max(mx, d.count), 0);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold uppercase">
        Shot Outcomes
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="w-20 truncate text-xs text-muted-foreground">
              {d.label}
            </span>
            <div className="relative flex-1">
              <div
                className="h-5 rounded"
                style={{
                  width:
                    maxCount > 0 ? `${(d.count / maxCount) * 100}%` : "0%",
                  backgroundColor: OUTCOME_COLORS[d.label] ?? "#6b7280",
                }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium">
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OutcomeBarChart;
