"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FormationUsage } from "./types";

interface FormationUsageCardProps {
  formations: FormationUsage[];
}

const ACCENT = "hsl(var(--primary))";
const MUTED = "hsl(var(--muted-foreground) / 0.3)";

export default function FormationUsageCard({
  formations,
}: FormationUsageCardProps) {
  const chartData = formations
    .sort((a, b) => b.count - a.count)
    .map((f) => ({
      ...f,
      label: `${f.percentage.toFixed(0)}% (${f.count} matches)`,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formation Usage</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No formation data available
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(chartData.length * 44, 120)}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 0, right: 100, bottom: 0, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="hsl(var(--border))"
              />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="formation"
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={24}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.formation}
                    fill={entry.isMostUsed ? ACCENT : MUTED}
                  />
                ))}
                <LabelList
                  dataKey="label"
                  position="right"
                  style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
