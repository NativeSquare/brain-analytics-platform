"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import type { ZoneStats, EventType } from "./types";
import { EVENT_TYPE_TABS } from "./constants";

interface PlayerStatsChartProps {
  zoneStats: ZoneStats[];
  activeTab: EventType;
}

const ZONE_COLORS: Record<string, string> = {
  ATT: "#10b981", // emerald-500
  MID: "#f59e0b", // amber-500
  DEF: "#3b82f6", // blue-500
};

export default function PlayerStatsChart({
  zoneStats,
  activeTab,
}: PlayerStatsChartProps) {
  const tabLabel =
    EVENT_TYPE_TABS.find((t) => t.key === activeTab)?.label ?? "Events";

  const chartData = (["ATT", "MID", "DEF"] as const).map((zone) => {
    const s = zoneStats.find((z) => z.zone === zone);
    return { zone, count: s?.count ?? 0 };
  });

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold uppercase">
        {tabLabel} by Zone
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="zone" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.zone}
                fill={ZONE_COLORS[entry.zone] ?? "#6b7280"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
