"use client";

import { StatsItem } from "@/components/dashboard/StatsItem";
import type { OppositionStats } from "./types";

interface OppositionStatsBarProps {
  stats: OppositionStats;
}

const RESULT_COLORS: Record<string, string> = {
  W: "bg-emerald-500 text-white",
  D: "bg-amber-500 text-white",
  L: "bg-red-500 text-white",
};

export default function OppositionStatsBar({ stats }: OppositionStatsBarProps) {
  return (
    <div className="w-full rounded-xl border bg-card p-4 text-sm shadow-sm">
      <div className="flex w-full flex-wrap items-start justify-between gap-6">
        {/* Recent form badges */}
        <div className="flex flex-1 flex-col items-center gap-1 text-center">
          <span className="text-xs uppercase text-muted-foreground">
            Recent Form
          </span>
          <div className="flex gap-1">
            {stats.recent_form.length > 0 ? (
              stats.recent_form.slice(0, 5).map((m) => (
                <span
                  key={m.match_id}
                  className={`inline-flex size-7 items-center justify-center rounded-md text-xs font-bold ${RESULT_COLORS[m.result]}`}
                  title={`${m.opponent_name} ${m.goals_scored}-${m.goals_conceded}`}
                >
                  {m.result}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">--</span>
            )}
          </div>
        </div>

        <StatsItem label="xG For" value={stats.xg_for.toFixed(2)} />
        <StatsItem label="xG Against" value={stats.xg_against.toFixed(2)} />
        <StatsItem label="Goals For" value={stats.goals_for.toFixed(1)} />
        <StatsItem
          label="Goals Against"
          value={stats.goals_against.toFixed(1)}
        />
        <StatsItem
          label="Possession %"
          value={`${stats.possession_pct.toFixed(1)}%`}
        />
        <StatsItem label="PPDA" value={stats.ppda.toFixed(1)} />
      </div>
    </div>
  );
}
