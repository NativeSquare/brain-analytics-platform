"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockInjuryByRegion } from "./mock-data";

/**
 * Injury by Body Region bar chart.
 * Story 14.3 AC #14: Horizontal bar chart showing injury count by body region.
 */
export default function InjuryByRegionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Injuries by Body Region</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={mockInjuryByRegion}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="region"
              width={90}
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
              name="Injuries"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
