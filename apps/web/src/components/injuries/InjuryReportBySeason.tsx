"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function InjuryReportBySeason() {
  const data = useQuery(api.injuries.queries.getInjuryReportBySeason, {});

  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Injuries per Season</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Reverse for chronological order on chart (oldest left, newest right)
  const chartData = data ? [...data].reverse() : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Injuries per Season</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No injury data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="season" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="totalInjuries"
                name="Total Injuries"
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
