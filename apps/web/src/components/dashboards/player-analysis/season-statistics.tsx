"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PositionRole, PlayerSeasonStats, PercentileResult } from "./types";
import { FULL_METRICS, getPercentileColorClass } from "./constants";
import { readRawValue, readPer90Value } from "./percentiles";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SeasonStatisticsProps {
  player: PlayerSeasonStats;
  positionRole: PositionRole;
  percentiles: Record<string, PercentileResult>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SeasonStatistics({
  player,
  positionRole,
  percentiles,
}: SeasonStatisticsProps) {
  const metrics = FULL_METRICS[positionRole];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Season Statistics</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold">Metric</th>
              <th className="pb-2 pr-4 text-right font-semibold">Total</th>
              <th className="pb-2 pr-4 text-right font-semibold">Per 90</th>
              <th className="pb-2 text-right font-semibold">Percentile</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const raw = readRawValue(player, metric.key);
              const per90 = readPer90Value(player, metric.key);
              const result = percentiles[metric.key];
              const pct = result?.percentile ?? -1;
              const hasPercentile = pct >= 0;

              // For ratio / per-shot metrics, total = the ratio itself
              const isRate =
                metric.key.endsWith("_ratio") ||
                metric.key.endsWith("_per_shot") ||
                metric.key.endsWith("_90");

              return (
                <tr key={metric.key} className="border-b last:border-b-0">
                  <td className="py-2 pr-4 font-medium">{metric.label}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {isRate
                      ? formatValue(raw)
                      : Math.round(raw)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {isRate ? "--" : formatValue(per90)}
                  </td>
                  <td className="py-2 text-right">
                    {hasPercentile ? (
                      <span
                        className={cn(
                          "inline-block min-w-[48px] rounded-full px-2.5 py-0.5 text-center text-xs font-semibold",
                          getPercentileColorClass(pct),
                        )}
                      >
                        {pct}th
                      </span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function formatValue(v: number): string {
  if (!Number.isFinite(v)) return "--";
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}
