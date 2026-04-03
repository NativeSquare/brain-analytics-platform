"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { PositionRole, PercentileResult } from "./types";
import { OVERVIEW_METRICS, getPercentileColorClass } from "./constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayerOverviewProps {
  positionRole: PositionRole;
  percentiles: Record<string, PercentileResult>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerOverview({
  positionRole,
  percentiles,
}: PlayerOverviewProps) {
  const metrics = OVERVIEW_METRICS[positionRole];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {metrics.map((metric) => {
        const result = percentiles[metric.key];
        const value = result?.value ?? 0;
        const pct = result?.percentile ?? -1;
        const hasPercentile = pct >= 0;

        return (
          <Card key={metric.key}>
            <CardContent className="flex flex-col items-center p-4 text-center">
              <span className="text-xs font-medium text-muted-foreground">
                {metric.label}
              </span>
              <span className="mt-1 text-2xl font-bold tabular-nums">
                {typeof value === "number" && Number.isFinite(value)
                  ? value % 1 === 0
                    ? value
                    : value.toFixed(2)
                  : "--"}
              </span>
              {hasPercentile && (
                <span
                  className={cn(
                    "mt-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                    getPercentileColorClass(pct),
                  )}
                >
                  {pct}th
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
