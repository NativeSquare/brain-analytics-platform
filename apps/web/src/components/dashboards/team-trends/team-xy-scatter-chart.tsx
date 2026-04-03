"use client";

import { useMemo } from "react";

import {
  XYScatterChart,
  type ScatterDataPoint,
} from "@/components/charts/XYScatterChart";
import { SCATTER_METRIC_GROUPS, DEFAULT_SCATTER_X, DEFAULT_SCATTER_Y } from "./constants";
import type { LeagueTeamAverage } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TeamXYScatterChartProps {
  data: LeagueTeamAverage[];
  selectedTeamId: string | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamXYScatterChart({
  data,
  selectedTeamId,
}: TeamXYScatterChartProps) {
  const scatterData: ScatterDataPoint[] = useMemo(
    () =>
      data.map((t) => ({
        id: String(t.team_id),
        name: t.team_name,
        imageUrl: t.team_image_url ?? undefined,
        // Spread all metric values so XYScatterChart can pick any key
        points: Number(t.points),
        x_points: Number(t.x_points),
        goals_for: Number(t.goals_for),
        goals_against: Number(t.goals_against),
        goal_difference: Number(t.goal_difference),
        shots_for: Number(t.shots_for),
        shots_against: Number(t.shots_against),
        xt_for: Number(t.xt_for),
        xt_against: Number(t.xt_against),
        xt_difference: Number(t.xt_difference),
        total_xg_for: Number(t.total_xg_for),
        total_xg_against: Number(t.total_xg_against),
        xg_difference: Number(t.xg_difference),
        build_up_goals_for: Number(t.build_up_goals_for),
        build_up_goals_against: Number(t.build_up_goals_against),
        build_up_shots_for: Number(t.build_up_shots_for),
        build_up_shots_against: Number(t.build_up_shots_against),
        build_up_xt_for: Number(t.build_up_xt_for),
        build_up_xt_against: Number(t.build_up_xt_against),
        build_up_xg_for: Number(t.build_up_xg_for),
        build_up_xg_against: Number(t.build_up_xg_against),
        transition_goals_for: Number(t.transition_goals_for),
        transition_goals_against: Number(t.transition_goals_against),
        transition_shots_for: Number(t.transition_shots_for),
        transition_shots_against: Number(t.transition_shots_against),
        transition_xt_for: Number(t.transition_xt_for),
        transition_xt_against: Number(t.transition_xt_against),
        transition_xg_for: Number(t.transition_xg_for),
        transition_xg_against: Number(t.transition_xg_against),
        set_piece_goals_for: Number(t.set_piece_goals_for),
        set_piece_goals_against: Number(t.set_piece_goals_against),
        set_piece_shots_for: Number(t.set_piece_shots_for),
        set_piece_shots_against: Number(t.set_piece_shots_against),
        set_piece_xt_for: Number(t.set_piece_xt_for),
        set_piece_xt_against: Number(t.set_piece_xt_against),
        set_piece_xg_for: Number(t.set_piece_xg_for),
        set_piece_xg_against: Number(t.set_piece_xg_against),
        possession_for: Number(t.possession_for),
        possession_against: Number(t.possession_against),
        passes_for: Number(t.passes_for),
        passes_against: Number(t.passes_against),
        ppda_for: Number(t.ppda_for),
        ppda_against: Number(t.ppda_against),
      })),
    [data],
  );

  // Compute league averages across all teams for reference lines
  const leagueAverages = useMemo(() => {
    if (data.length === 0) return {} as Record<string, number>;
    const keys = SCATTER_METRIC_GROUPS.flatMap((g) =>
      g.metrics.map((m) => m.key),
    );
    const uniqueKeys = [...new Set(keys)];
    const avgs: Record<string, number> = {};
    for (const key of uniqueKeys) {
      const values = data.map(
        (t) => Number((t as unknown as Record<string, number>)[key] ?? 0),
      );
      avgs[key] = values.reduce((s, v) => s + v, 0) / values.length;
    }
    return avgs;
  }, [data]);

  if (data.length === 0) {
    return null;
  }

  return (
    <XYScatterChart
      data={scatterData}
      metricGroups={SCATTER_METRIC_GROUPS}
      defaultXMetric={DEFAULT_SCATTER_X}
      defaultYMetric={DEFAULT_SCATTER_Y}
      xReferenceValue={leagueAverages[DEFAULT_SCATTER_X]}
      yReferenceValue={leagueAverages[DEFAULT_SCATTER_Y]}
      referenceLabel="League Avg"
      selectedPointId={selectedTeamId}
    />
  );
}
