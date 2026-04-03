"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PositionRole, PercentileResult } from "./types";
import { FULL_METRICS, getPercentileColorClass } from "./constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayerComparisonProps {
  positionRole: PositionRole;
  percentiles: Record<string, PercentileResult>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerComparison({
  positionRole,
  percentiles,
}: PlayerComparisonProps) {
  const metrics = FULL_METRICS[positionRole];

  // Build rows sorted by percentile descending
  const rows = metrics
    .map((metric) => {
      const result = percentiles[metric.key];
      return {
        label: metric.label,
        value: result?.value ?? 0,
        leagueAvg: result?.leagueAvg ?? 0,
        percentile: result?.percentile ?? -1,
        delta: (result?.value ?? 0) - (result?.leagueAvg ?? 0),
        inverted: metric.inverted,
      };
    })
    .sort((a, b) => b.percentile - a.percentile);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison vs League</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold">Metric</th>
              <th className="pb-2 pr-4 text-right font-semibold">Player /90</th>
              <th className="pb-2 pr-4 text-right font-semibold">League Avg</th>
              <th className="pb-2 pr-4 text-right font-semibold">Percentile</th>
              <th className="pb-2 text-right font-semibold">Delta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const hasPercentile = row.percentile >= 0;
              const deltaPositive = row.inverted
                ? row.delta < 0
                : row.delta > 0;
              const deltaNeutral = Math.abs(row.delta) < 0.005;

              return (
                <tr key={row.label} className="border-b last:border-b-0">
                  <td className="py-2 pr-4 font-medium">{row.label}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {fmt(row.value)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                    {fmt(row.leagueAvg)}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {hasPercentile ? (
                      <span
                        className={cn(
                          "inline-block min-w-[48px] rounded-full px-2.5 py-0.5 text-center text-xs font-semibold",
                          getPercentileColorClass(row.percentile),
                        )}
                      >
                        {row.percentile}th
                      </span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-xs font-semibold",
                        deltaNeutral
                          ? "text-muted-foreground"
                          : deltaPositive
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {deltaNeutral ? (
                        <Minus className="size-3" />
                      ) : deltaPositive ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )}
                      {deltaNeutral ? "0.00" : fmtDelta(row.delta)}
                    </span>
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

function fmt(v: number): string {
  if (!Number.isFinite(v)) return "--";
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

function fmtDelta(v: number): string {
  const abs = Math.abs(v);
  const formatted = abs % 1 === 0 ? String(abs) : abs.toFixed(2);
  return v >= 0 ? `+${formatted}` : `-${formatted}`;
}
