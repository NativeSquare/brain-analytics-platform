"use client";

import { useMemo, useState } from "react";
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
import {
  FilterSelect,
  type FilterSelectOption,
} from "@/components/dashboard/FilterSelect";

import { LINE_CHART_METRICS, DEFAULT_LINE_METRIC } from "./constants";
import type { TeamTrendData } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TeamMetricProgressChartProps {
  data: TeamTrendData[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BRAND_BLUE = "#1b5497";

export default function TeamMetricProgressChart({
  data,
}: TeamMetricProgressChartProps) {
  const [selectedMetric, setSelectedMetric] = useState(DEFAULT_LINE_METRIC);

  const metricLabel = useMemo(() => {
    const m = LINE_CHART_METRICS.find((m) => m.key === selectedMetric);
    return m?.label ?? selectedMetric;
  }, [selectedMetric]);

  const metricOptions: FilterSelectOption[] = useMemo(
    () =>
      LINE_CHART_METRICS.map((m) => ({
        value: m.key,
        label: `${m.category} - ${m.label}`,
      })),
    [],
  );

  const chartData = useMemo(
    () =>
      data.map((row, idx) => ({
        matchweek: row.match_week ?? idx + 1,
        value: Number(
          (row as unknown as Record<string, number>)[selectedMetric] ?? 0,
        ),
        opponent_team_id: row.opponent_team_id,
        match_date: row.match_date,
      })),
    [data, selectedMetric],
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Metric Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No data available for the selected filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle>Metric Progression</CardTitle>
        <FilterSelect
          options={metricOptions}
          value={selectedMetric}
          onChange={setSelectedMetric}
          placeholder="Select metric..."
          className="w-64"
          searchable
        />
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
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
                tick={{ fontSize: 12 }}
                label={{
                  value: metricLabel,
                  angle: -90,
                  position: "insideLeft",
                }}
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
                        <span className="font-medium">{metricLabel}:</span>{" "}
                        {typeof d.value === "number"
                          ? d.value.toFixed(2)
                          : d.value}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.match_date}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={BRAND_BLUE}
                strokeWidth={2}
                dot={{ r: 4, fill: BRAND_BLUE }}
                activeDot={{ r: 6 }}
                name={metricLabel}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
