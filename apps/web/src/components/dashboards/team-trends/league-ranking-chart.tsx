"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamTrendData } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LeagueRankingChartProps {
  data: TeamTrendData[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BRAND_BLUE = "#1b5497";

export default function LeagueRankingChart({ data }: LeagueRankingChartProps) {
  const chartData = useMemo(() => {
    return data
      .filter((row) => row.league_rank != null && row.match_week != null)
      .map((row, idx) => ({
        matchweek: row.match_week ?? idx + 1,
        position: Number(row.league_rank),
        averagePosition: Number(row.league_average_rank ?? 0),
      }));
  }, [data]);

  const maxPosition = useMemo(() => {
    if (chartData.length === 0) return 20;
    return Math.max(
      ...chartData.map((d) => d.position),
      ...chartData.map((d) => d.averagePosition),
      20,
    );
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>League Position</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No ranking data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>League Position</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 24, bottom: 24, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#d0d0d0"
                opacity={0.3}
              />
              <XAxis
                dataKey="matchweek"
                tick={{ fontSize: 12 }}
                label={{
                  value: "Matchweek",
                  position: "insideBottom",
                  offset: -12,
                }}
              />
              <YAxis
                reversed
                domain={[1, maxPosition]}
                tick={{ fontSize: 12 }}
                label={{
                  value: "Position",
                  angle: -90,
                  position: "insideLeft",
                }}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d = payload[0]?.payload as
                    | (typeof chartData)[number]
                    | undefined;
                  if (!d) return null;

                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="mb-1 text-sm font-semibold">
                        Matchweek {d.matchweek}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Position:</span>{" "}
                        {d.position}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="position"
                stroke={BRAND_BLUE}
                strokeWidth={2}
                dot={(props: Record<string, unknown>) => {
                  const { cx, cy, index } = props as {
                    cx: number;
                    cy: number;
                    index: number;
                  };
                  const isLast = index === chartData.length - 1;
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={isLast ? 6 : 4}
                      fill={isLast ? "#f59e0b" : BRAND_BLUE}
                      stroke={isLast ? "#f59e0b" : BRAND_BLUE}
                      strokeWidth={isLast ? 2 : 1}
                    />
                  );
                }}
                activeDot={{ r: 6 }}
                name="Position"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
