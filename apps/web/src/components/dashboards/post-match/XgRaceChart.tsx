"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import GraphInfoBadge from "./GraphInfoBadge";
import type { MatchEvent } from "./types";

interface XgRaceChartProps {
  events: MatchEvent[];
  team1: string;
  team2: string;
  team1Color: string;
  team2Color: string;
}

interface GoalDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: {
    goalTeam?: string | null;
    minute?: number;
  };
}

const PERIOD_START_MINUTES: Record<number, number> = { 1: 0, 2: 45, 3: 90, 4: 105 };

const getEventMinute = (e: MatchEvent): number | null =>
  e.event_time != null ? e.event_time / 60 : null;

const XgRaceChart = ({
  events,
  team1,
  team2,
  team1Color,
  team2Color,
}: XgRaceChartProps) => {
  const { chartData, periodEndTimes, stoppageAreas } = useMemo(() => {
    const empty = {
      chartData: [] as Array<{
        minute: number;
        team1Xg: number;
        team2Xg: number;
        goalTeam: string | null;
      }>,
      periodEndTimes: {} as Record<number, number>,
      stoppageAreas: [] as Array<{ x1: number; x2: number }>,
    };
    if (!events || events.length === 0) return empty;

    const periods = new Map<number, { startMinute: number; endMinute: number }>();
    events.forEach((e) => {
      if (e.period < 1 || e.period > 4) return;
      const minute = getEventMinute(e);
      if (minute === null) return;
      const periodStartMinute =
        e.period_start_seconds != null
          ? e.period_start_seconds / 60
          : (PERIOD_START_MINUTES[e.period] ?? 0);
      if (!periods.has(e.period)) {
        periods.set(e.period, { startMinute: periodStartMinute, endMinute: minute });
      } else {
        const p = periods.get(e.period)!;
        p.startMinute = Math.min(p.startMinute, periodStartMinute);
        p.endMinute = Math.max(p.endMinute, minute);
      }
    });

    const periodEndTimes: Record<number, number> = {};
    const stoppageAreas: Array<{ x1: number; x2: number }> = [];
    const normalDuration: Record<number, number> = { 1: 45, 2: 45, 3: 15, 4: 15 };

    periods.forEach((period, periodNum) => {
      periodEndTimes[periodNum] = period.endMinute;
      const nd = normalDuration[periodNum];
      if (!nd) return;
      const stoppageStart = period.startMinute + nd;
      if (period.endMinute > stoppageStart) {
        stoppageAreas.push({ x1: stoppageStart, x2: period.endMinute });
      }
    });

    const shots = events
      .filter(
        (e) => e.type === "Shot" && e.period <= 4 && e.shot_statsbomb_xg != null,
      )
      .flatMap((e) => {
        const minute = getEventMinute(e);
        return minute != null
          ? [
              {
                minute,
                team: e.team,
                xg: e.shot_statsbomb_xg as number,
                isGoal: e.shot_outcome === "Goal",
              },
            ]
          : [];
      })
      .sort((a, b) => a.minute - b.minute);

    let team1Cum = 0;
    let team2Cum = 0;
    const chartData: Array<{
      minute: number;
      team1Xg: number;
      team2Xg: number;
      goalTeam: string | null;
    }> = [{ minute: 0, team1Xg: 0, team2Xg: 0, goalTeam: null }];

    shots.forEach((shot) => {
      if (shot.team === team1) {
        team1Cum += shot.xg;
      } else if (shot.team === team2) {
        team2Cum += shot.xg;
      } else {
        return;
      }
      chartData.push({
        minute: shot.minute,
        team1Xg: team1Cum,
        team2Xg: team2Cum,
        goalTeam: shot.isGoal ? shot.team : null,
      });
    });

    const maxPeriodEnd = Object.values(periodEndTimes).length
      ? Math.max(...Object.values(periodEndTimes))
      : 0;
    const lastMin = chartData.length ? chartData[chartData.length - 1].minute : 0;
    const chartEndMinute = Math.max(maxPeriodEnd, lastMin);
    if (chartData[chartData.length - 1]?.minute < chartEndMinute) {
      chartData.push({
        minute: chartEndMinute,
        team1Xg: team1Cum,
        team2Xg: team2Cum,
        goalTeam: null,
      });
    }

    return { chartData, periodEndTimes, stoppageAreas };
  }, [events, team1, team2]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>xG Race</CardTitle>
          <CardAction>
            <GraphInfoBadge text="Cumulative expected goals (xG) over time from all shots." />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            xG data not available
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxMinute = Math.min(Math.max(...chartData.map((d) => d.minute)), 120);
  const baseTicks = Array.from({ length: Math.floor(maxMinute / 5) + 1 }, (_, i) => i * 5);
  const periodEndValues = Object.values(periodEndTimes);
  const xAxisTicks = [...new Set([...baseTicks, ...periodEndValues])]
    .filter((t) => t <= maxMinute)
    .sort((a, b) => a - b);

  return (
    <Card>
      <CardHeader>
        <CardTitle>xG Race</CardTitle>
        <CardAction>
          <GraphInfoBadge text="Cumulative xG over time from all shots." />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 24, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="pmXgFillTeam1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={team1Color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={team1Color} stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="pmXgFillTeam2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={team2Color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={team2Color} stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d0d0d0" opacity={0.3} />
            <XAxis
              dataKey="minute"
              type="number"
              scale="linear"
              domain={[0, maxMinute]}
              interval={0}
              ticks={xAxisTicks}
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => {
                const rounded = Math.round(value);
                return rounded % 5 === 0 ? rounded.toString() : "";
              }}
              label={{ value: "Minute", position: "insideBottom", offset: -5 }}
            />
            <YAxis tick={{ fontSize: 12 }} domain={[0, "auto"]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length < 2) return null;
                const t1Val = Number(payload[0]?.value ?? 0);
                const t2Val = Number(payload[1]?.value ?? 0);
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-lg">
                    <p className="text-sm font-medium">Minute: {Number(label).toFixed(1)}</p>
                    <p className="text-sm" style={{ color: team1Color }}>
                      {team1}: {t1Val.toFixed(2)} xG
                    </p>
                    <p className="text-sm" style={{ color: team2Color }}>
                      {team2}: {t2Val.toFixed(2)} xG
                    </p>
                  </div>
                );
              }}
            />
            {stoppageAreas.map((area, idx) => (
              <ReferenceArea
                key={`stoppage-${idx}`}
                x1={area.x1}
                x2={area.x2}
                fill="#d3d3d3"
                fillOpacity={0.35}
                stroke="none"
                ifOverflow="visible"
              />
            ))}
            {periodEndTimes[1] != null && (
              <ReferenceLine
                x={periodEndTimes[1]}
                stroke="#000"
                strokeWidth={2}
                strokeDasharray="6 4"
                label={{ value: "HT", position: "top", fill: "#000", fontSize: 12, fontWeight: "bold" }}
              />
            )}
            {periodEndTimes[2] != null && (
              <ReferenceLine
                x={periodEndTimes[2]}
                stroke="#000"
                strokeWidth={2}
                strokeDasharray="6 4"
                label={{ value: "FT", position: "top", fill: "#000", fontSize: 12, fontWeight: "bold" }}
              />
            )}
            {periodEndTimes[3] != null && (
              <ReferenceLine
                x={periodEndTimes[3]}
                stroke="#000"
                strokeWidth={2}
                strokeDasharray="6 4"
                label={{ value: "ET1", position: "top", fill: "#000", fontSize: 12, fontWeight: "bold" }}
              />
            )}
            {periodEndTimes[4] != null && (
              <ReferenceLine
                x={periodEndTimes[4]}
                stroke="#000"
                strokeWidth={2}
                strokeDasharray="6 4"
                label={{ value: "ET2", position: "top", fill: "#000", fontSize: 12, fontWeight: "bold" }}
              />
            )}
            <Area type="stepAfter" dataKey="team1Xg" stroke="none" fill="url(#pmXgFillTeam1)" />
            <Area type="stepAfter" dataKey="team2Xg" stroke="none" fill="url(#pmXgFillTeam2)" />
            <Line
              type="stepAfter"
              dataKey="team1Xg"
              stroke={team1Color}
              strokeWidth={3}
              name={team1}
              dot={(props: GoalDotProps) => {
                const { cx, cy, payload, index } = props;
                if (payload?.goalTeam === team1 && cx !== undefined && cy !== undefined) {
                  return <circle key={`g1-${index ?? 0}-${payload.minute ?? 0}`} cx={cx} cy={cy} r={8} fill={team1Color} />;
                }
                return <circle key={`d1-${index ?? 0}`} cx={cx ?? 0} cy={cy ?? 0} r={0} fill="transparent" />;
              }}
            />
            <Line
              type="stepAfter"
              dataKey="team2Xg"
              stroke={team2Color}
              strokeWidth={3}
              name={team2}
              dot={(props: GoalDotProps) => {
                const { cx, cy, payload, index } = props;
                if (payload?.goalTeam === team2 && cx !== undefined && cy !== undefined) {
                  return <circle key={`g2-${index ?? 0}-${payload.minute ?? 0}`} cx={cx} cy={cy} r={8} fill={team2Color} />;
                }
                return <circle key={`d2-${index ?? 0}`} cx={cx ?? 0} cy={cy ?? 0} r={0} fill="transparent" />;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default XgRaceChart;
