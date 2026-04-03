"use client";

import {
  Line,
  LineChart,
  type DotProps,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import type { SeasonPointsData, ComparisonMode, SeasonOption } from "./types";

type DotPropsWithIndex = DotProps & { index?: number };

interface PointsChartProps {
  data: SeasonPointsData[];
  comparisonMode?: ComparisonMode;
  comparisonData?: SeasonPointsData[];
  seasons?: SeasonOption[];
  selectedSeasonId?: number | null;
  comparisonSeasonId?: number | null;
  onComparisonModeChange?: (mode: ComparisonMode) => void;
  onComparisonSeasonChange?: (seasonId: number | null) => void;
}

type AxisTickProps = {
  x: number;
  y: number;
  payload: { value: number };
};

type LineLabelProps = {
  index?: number;
  x?: number;
  y?: number;
};

const TARGET_TOTALS = [
  { total: 78, label: "1st", color: "#FFD700" },
  { total: 71.3, label: "Automatic Promotion", color: "#00FF00" },
  { total: 53.3, label: "Play offs", color: "#0000FF" },
  { total: 41.5, label: "Relegation Play-out", color: "#FFA500" },
  { total: 38.5, label: "Relegation", color: "#FF0000" },
];

const POINTS_COLOR = "#1b5497";
const XPOINTS_COLOR = "#991b1b";
const RESULT_COLORS = {
  W: "#16a34a",
  D: "#ca8a04",
  L: "#dc2626",
} as const;

export default function PointsChart({
  data,
  comparisonMode = "none",
  comparisonData = [],
  seasons = [],
  selectedSeasonId = null,
  comparisonSeasonId = null,
  onComparisonModeChange,
  onComparisonSeasonChange,
}: PointsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Points Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            No data available. Please select a team and season.
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredData = data
    .filter((d) => d.match_week != null)
    .sort((a, b) => (a.match_week as number) - (b.match_week as number));

  if (filteredData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Points Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            No matchweek data available for this season.
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxMatchWeek = Math.max(
    ...filteredData.map((d) => d.match_week as number),
  );
  const numGamesPlayed = filteredData.length;
  const totalSeasonGames = 38;

  const targetLinesData = TARGET_TOTALS.map((target) => ({
    ...target,
    pointsPerGame: target.total / totalSeasonGames,
  }));

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return dateString;
    }
  };

  const filteredComparisonData =
    comparisonMode === "season" && comparisonData.length > 0
      ? comparisonData
          .filter((d) => d.match_week != null)
          .sort((a, b) => (a.match_week as number) - (b.match_week as number))
      : [];

  const chartData = filteredData.map((d, index) => {
    const matchweek = d.match_week as number;
    const gameNumber = index + 1;
    const dataPoint: Record<string, number | string | null> = {
      match_week: matchweek,
      cumulative_points: Number(d.cumulative_points ?? 0),
      cumulative_xPoints: Number(d.cumulative_xPoints ?? 0),
      match_id: d.match_id,
      match_date: formatDate(d.match_date),
      opponent_image_url: d.opponent_image_url,
      points: Number(d.points ?? 0),
    };

    if (comparisonMode === "season" && filteredComparisonData.length > 0) {
      let comparisonPoint = filteredComparisonData.find(
        (cd) => cd.match_week === matchweek,
      );
      if (!comparisonPoint) {
        const validComparisons = filteredComparisonData
          .filter(
            (cd) => cd.match_week != null && cd.match_week <= matchweek,
          )
          .sort(
            (a, b) => (b.match_week as number) - (a.match_week as number),
          );
        comparisonPoint = validComparisons[0];
      }
      if (!comparisonPoint && filteredComparisonData.length > 0) {
        comparisonPoint =
          filteredComparisonData[filteredComparisonData.length - 1];
      }
      if (comparisonPoint) {
        dataPoint.comparison_cumulative_points = Number(
          comparisonPoint.cumulative_points ?? 0,
        );
      }
    }

    targetLinesData.forEach((target) => {
      const key = `target_${target.label.replace(/\s+/g, "_")}`;
      dataPoint[key] = target.pointsPerGame * gameNumber;
    });

    return dataPoint;
  });

  const maxPoints = Math.max(
    ...chartData.map((d) => d.cumulative_points as number),
    ...chartData.map((d) => d.cumulative_xPoints as number),
    ...chartData.map(
      (d) => (d.comparison_cumulative_points as number) ?? 0,
    ),
    ...targetLinesData.map((t) => t.pointsPerGame * numGamesPlayed),
  );

  const getResult = (points: number): "W" | "D" | "L" => {
    if (points >= 3) return "W";
    if (points >= 1) return "D";
    return "L";
  };

  const renderResultDot = (props: DotPropsWithIndex) => {
    const { cx, cy, index } = props;
    if (
      cx == null ||
      cy == null ||
      index == null ||
      index < 0 ||
      index >= chartData.length
    ) {
      return <g />;
    }
    const row = chartData[index] as { points?: number };
    const result = getResult(Number(row.points ?? 0));
    const color = RESULT_COLORS[result];

    return (
      <circle
        key={`result-dot-${index}`}
        cx={cx}
        cy={cy}
        r={4.5}
        fill={color}
        stroke={POINTS_COLOR}
        strokeWidth={1.5}
      />
    );
  };

  const comparisonSeasons = seasons.filter(
    (season) => season.season_id !== selectedSeasonId,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Points Progress</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={comparisonMode}
              onValueChange={(value) => {
                const mode = value as ComparisonMode;
                onComparisonModeChange?.(mode);
                if (mode !== "season") {
                  onComparisonSeasonChange?.(null);
                }
              }}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No comparison</SelectItem>
                <SelectItem value="xpoints">xPoints</SelectItem>
                <SelectItem value="season">Season comparison</SelectItem>
              </SelectContent>
            </Select>
            {comparisonMode === "season" && (
              <Select
                value={comparisonSeasonId ? String(comparisonSeasonId) : ""}
                onValueChange={(value) => {
                  onComparisonSeasonChange?.(
                    value === "" ? null : Number(value),
                  );
                }}
              >
                <SelectTrigger className="h-8 w-[160px]">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  {comparisonSeasons.map((season) => (
                    <SelectItem
                      key={season.season_id}
                      value={String(season.season_id)}
                    >
                      {season.season_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 150, left: 20, bottom: 50 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#d0d0d0"
              opacity={0.3}
            />
            <XAxis
              dataKey="match_week"
              type="number"
              scale="linear"
              domain={[1, maxMatchWeek]}
              label={{
                value: "Matchweek",
                position: "insideBottom",
                offset: -45,
              }}
              tick={(props: AxisTickProps) => {
                const { x, y, payload } = props;
                const dataPoint = chartData.find(
                  (d) => d.match_week === payload.value,
                );
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={16}
                      textAnchor="middle"
                      fill="#666"
                      fontSize={12}
                    >
                      {payload.value}
                    </text>
                    {dataPoint?.opponent_image_url && (
                      <foreignObject x={-10} y={20} width={20} height={20}>
                        <div className="flex items-center justify-center">
                          <Image
                            src={dataPoint.opponent_image_url as string}
                            alt={`Matchweek ${payload.value}`}
                            width={20}
                            height={20}
                            className="rounded-full"
                            unoptimized
                          />
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              domain={[0, Math.ceil(maxPoints / 10) * 10]}
              label={{ value: "Points", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const dataPoint = chartData.find(
                  (d) => d.match_week === label,
                );
                const pointsPayload = payload.find(
                  (p) => p.dataKey === "cumulative_points",
                );
                const xPointsPayload = payload.find(
                  (p) => p.dataKey === "cumulative_xPoints",
                );
                const comparisonPayload = payload.find(
                  (p) => p.dataKey === "comparison_cumulative_points",
                );
                const pointsValue = pointsPayload
                  ? Number(pointsPayload.value)
                  : null;
                const xPointsValue = xPointsPayload
                  ? Number(xPointsPayload.value)
                  : null;
                const delta =
                  pointsValue != null && xPointsValue != null
                    ? pointsValue - xPointsValue
                    : null;

                const comparisonSeason = comparisonSeasonId
                  ? seasons.find((s) => s.season_id === comparisonSeasonId)
                  : null;

                return (
                  <div className="rounded-lg border bg-background p-2 shadow-lg">
                    <p className="text-sm font-medium">{`Matchweek: ${label}`}</p>
                    {pointsPayload && (
                      <p
                        className="text-sm"
                        style={{ color: POINTS_COLOR }}
                      >{`Points: ${Number(pointsPayload.value).toFixed(0)}`}</p>
                    )}
                    {comparisonMode === "xpoints" && xPointsPayload && (
                      <p
                        className="text-sm"
                        style={{ color: XPOINTS_COLOR }}
                      >{`xPoints: ${Number(xPointsPayload.value).toFixed(1)}`}</p>
                    )}
                    {comparisonMode === "season" &&
                      comparisonPayload &&
                      comparisonSeason && (
                        <p
                          className="text-sm"
                          style={{ color: XPOINTS_COLOR }}
                        >{`${comparisonSeason.season_name}: ${Number(comparisonPayload.value).toFixed(0)}`}</p>
                      )}
                    {delta != null && comparisonMode === "xpoints" && (
                      <p className="text-xs text-muted-foreground">{`Delta (Pts - xPts): ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`}</p>
                    )}
                    {dataPoint && (
                      <p className="text-xs text-muted-foreground">
                        {dataPoint.match_date}
                      </p>
                    )}
                  </div>
                );
              }}
            />

            {/* Target lines */}
            {targetLinesData.map((target) => {
              const targetKey = `target_${target.label.replace(/\s+/g, "_")}`;
              return (
                <Line
                  key={target.label}
                  type="linear"
                  dataKey={targetKey}
                  stroke={target.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name={target.label}
                  legendType="none"
                  label={(props: LineLabelProps) => {
                    if (props.index !== chartData.length - 1) return <g />;
                    const x = props.x ?? 0;
                    const y = props.y ?? 0;
                    return (
                      <text
                        x={x + 8}
                        y={y}
                        fill={target.color}
                        fontSize={11}
                        fontWeight="bold"
                        textAnchor="start"
                      >
                        {target.label}
                      </text>
                    );
                  }}
                />
              );
            })}

            {/* Actual points line */}
            <Line
              type="monotone"
              dataKey="cumulative_points"
              stroke={POINTS_COLOR}
              strokeWidth={3}
              dot={renderResultDot}
              name="Cumulative Points"
            />
            {/* xPoints comparison */}
            {comparisonMode === "xpoints" && (
              <Line
                type="monotone"
                dataKey="cumulative_xPoints"
                stroke={XPOINTS_COLOR}
                strokeWidth={3}
                dot={{ r: 4 }}
                name="Cumulative xPoints"
              />
            )}
            {/* Season comparison */}
            {comparisonMode === "season" && (
              <Line
                type="monotone"
                dataKey="comparison_cumulative_points"
                stroke={XPOINTS_COLOR}
                strokeWidth={3}
                dot={{ r: 4 }}
                name="Comparison Season"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        {/* Custom legend */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <svg width="32" height="8" viewBox="0 0 32 8" aria-hidden>
              <line
                x1="0"
                y1="4"
                x2="32"
                y2="4"
                stroke={POINTS_COLOR}
                strokeWidth="3"
              />
            </svg>
            <span>Points</span>
          </div>
          {comparisonMode === "xpoints" && (
            <div className="flex items-center gap-2">
              <svg width="32" height="8" viewBox="0 0 32 8" aria-hidden>
                <line
                  x1="0"
                  y1="4"
                  x2="32"
                  y2="4"
                  stroke={XPOINTS_COLOR}
                  strokeWidth="3"
                />
              </svg>
              <span>xPoints</span>
            </div>
          )}
          {comparisonMode === "season" && (
            <div className="flex items-center gap-2">
              <svg width="32" height="8" viewBox="0 0 32 8" aria-hidden>
                <line
                  x1="0"
                  y1="4"
                  x2="32"
                  y2="4"
                  stroke={XPOINTS_COLOR}
                  strokeWidth="3"
                />
              </svg>
              <span>Comparison Season</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: RESULT_COLORS.W }}
            />
            <span>W</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: RESULT_COLORS.D }}
            />
            <span>D</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: RESULT_COLORS.L }}
            />
            <span>L</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
