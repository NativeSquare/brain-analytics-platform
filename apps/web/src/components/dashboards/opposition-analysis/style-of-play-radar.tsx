"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OPPONENT_COLOR } from "./constants";
import type { StyleOfPlayMetric } from "./types";

interface StyleOfPlayRadarProps {
  data: StyleOfPlayMetric[];
  teamName: string;
  color?: string;
}

export default function StyleOfPlayRadar({
  data,
  teamName,
  color = OPPONENT_COLOR,
}: StyleOfPlayRadarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Style of Play</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No data available
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
              <PolarGrid gridType="polygon" radialLines={false} />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tickCount={6}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
              />
              <Radar
                name={teamName}
                dataKey="value"
                stroke={color}
                fill={color}
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
