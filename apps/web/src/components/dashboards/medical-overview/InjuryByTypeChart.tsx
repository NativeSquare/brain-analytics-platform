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
import { mockInjuryByType } from "./mock-data";

/**
 * Injury by Type donut chart.
 * Story 14.3 AC #15: Donut/pie chart showing injury distribution by type.
 */
export default function InjuryByTypeChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Injuries by Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={mockInjuryByType}
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
              {mockInjuryByType.map((entry) => (
                <Cell key={entry.type} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
