"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PositionRole, PercentileResult } from "./types";
import { RADAR_METRICS } from "./constants";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayerRadarChartProps {
  positionRole: PositionRole;
  percentiles: Record<string, PercentileResult>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerRadarChart({
  positionRole,
  percentiles,
}: PlayerRadarChartProps) {
  const metrics = RADAR_METRICS[positionRole];

  const data = metrics.map((m) => {
    const result = percentiles[m.key];
    return {
      metric: m.label,
      percentile: result?.percentile !== undefined && result.percentile >= 0
        ? result.percentile
        : 0,
      fullMark: 100,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Radar Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="#d0d0d0" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 11, fill: "currentColor" }}
              />
              <Radar
                name="Percentile"
                dataKey="percentile"
                stroke="#1b5497"
                fill="#1b5497"
                fillOpacity={0.3}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0]?.payload as {
                    metric: string;
                    percentile: number;
                  } | undefined;
                  if (!item) return null;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-lg">
                      <p className="text-sm font-semibold">{item.metric}</p>
                      <p className="text-sm">
                        Percentile: <strong>{item.percentile}</strong>
                      </p>
                    </div>
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
