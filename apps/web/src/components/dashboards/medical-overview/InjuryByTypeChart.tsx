"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InjuryByTypeData {
  type: string;
  count: number;
}

/** Consistent color palette for the pie chart slices. */
const COLORS = [
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

/**
 * Injury by Type donut chart.
 * Story 14.3 AC #15: Donut/pie chart showing injury distribution by type.
 */
export default function InjuryByTypeChart({
  data,
}: {
  data: InjuryByTypeData[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Injuries by Type</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No injury data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                label={({ type, count }) => `${type}: ${count}`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.type}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
