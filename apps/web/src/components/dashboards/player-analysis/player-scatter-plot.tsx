"use client";

import { useMemo } from "react";
import {
  XYScatterChart,
  type ScatterDataPoint,
} from "@/components/charts/XYScatterChart";
import type { PlayerSeasonStats, LeaguePlayerStats } from "./types";
import { SCATTER_METRIC_GROUPS } from "./constants";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayerScatterPlotProps {
  player: PlayerSeasonStats;
  leagueStats: LeaguePlayerStats[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerScatterPlot({
  player,
  leagueStats,
}: PlayerScatterPlotProps) {
  const defaultX = SCATTER_METRIC_GROUPS[0]!.metrics[0]!.key;
  const defaultY = SCATTER_METRIC_GROUPS[1]!.metrics[0]!.key;

  // Build data points for every league player
  const { data, xRef, yRef } = useMemo(() => {
    const allMetricKeys = SCATTER_METRIC_GROUPS.flatMap((g) =>
      g.metrics.map((m) => m.key),
    );

    const points: ScatterDataPoint[] = leagueStats.map((lp) => {
      const point: ScatterDataPoint = {
        id: String(lp.player_id),
        name: lp.player_name,
      };
      for (const key of allMetricKeys) {
        point[key] = toNumber(lp[key]);
      }
      return point;
    });

    // Ensure the selected player is included (may already be in league data)
    const playerExists = points.some((p) => p.id === String(player.player_id));
    if (!playerExists) {
      const point: ScatterDataPoint = {
        id: String(player.player_id),
        name: player.player_name,
      };
      for (const key of allMetricKeys) {
        point[key] = toNumber(player[key]);
      }
      points.push(point);
    }

    // Calculate league averages for default axes
    const xVals = points
      .map((p) => toNumber(p[defaultX]))
      .filter((v): v is number => v !== undefined);
    const yVals = points
      .map((p) => toNumber(p[defaultY]))
      .filter((v): v is number => v !== undefined);

    const xAvg = xVals.length > 0 ? xVals.reduce((a, b) => a + b, 0) / xVals.length : undefined;
    const yAvg = yVals.length > 0 ? yVals.reduce((a, b) => a + b, 0) / yVals.length : undefined;

    return { data: points, xRef: xAvg, yRef: yAvg };
  }, [leagueStats, player, defaultX, defaultY]);

  return (
    <XYScatterChart
      data={data}
      metricGroups={SCATTER_METRIC_GROUPS}
      defaultXMetric={defaultX}
      defaultYMetric={defaultY}
      xReferenceValue={xRef}
      yReferenceValue={yRef}
      referenceLabel="Avg"
      selectedPointId={String(player.player_id)}
      height={420}
    />
  );
}
