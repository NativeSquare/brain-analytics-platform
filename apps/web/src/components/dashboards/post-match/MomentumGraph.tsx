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

interface MomentumGraphProps {
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
    hasGoal?: boolean;
    goalTeam?: string | null;
    minute?: number;
  };
}

const PERIOD_START_MINUTES: Record<number, number> = { 1: 0, 2: 45, 3: 90, 4: 105 };
const MOMENTUM_SMOOTHING_POINTS = 9;

const MomentumGraph = ({
  events,
  team1,
  team2,
  team1Color,
  team2Color,
}: MomentumGraphProps) => {
  const momentumData = useMemo(() => {
    if (!events || events.length === 0) return [];

    const obvCol = events.some((e) => e.obv_for_net !== null)
      ? "obv_for_net"
      : "obv_total_net";

    const eventsWithObv = events
      .filter(
        (e) =>
          e.event_time != null &&
          (e.obv_for_net != null || e.obv_total_net != null),
      )
      .map((e) => ({
        ...e,
        minute_float: (e.event_time ?? 0) / 60,
        obv: obvCol === "obv_for_net" ? e.obv_for_net : e.obv_total_net,
      }))
      .filter((e) => e.obv != null)
      .sort((a, b) => a.minute_float - b.minute_float);

    if (eventsWithObv.length === 0) return [];

    const allMinuteFloats = events
      .filter((e) => e.event_time != null && e.period >= 1 && e.period <= 4)
      .map((e) => e.event_time! / 60);
    const maxMin = Math.min(Math.max(...allMinuteFloats), 120);

    const timePoints: number[] = [];
    const maxTenths = Math.floor(maxMin * 10);
    for (let i = 0; i <= maxTenths; i++) {
      timePoints.push(i * 0.1);
    }

    return timePoints.map((time) => {
      const windowStart = Math.max(0, time - 10);
      const eventsInWindow = eventsWithObv.filter(
        (e) => e.minute_float > windowStart && e.minute_float <= time,
      );

      const team1Obv = eventsInWindow
        .filter((e) => e.team === team1)
        .reduce((sum, e) => sum + (e.obv || 0), 0);

      const team2Obv = eventsInWindow
        .filter((e) => e.team === team2)
        .reduce((sum, e) => sum + (e.obv || 0), 0);

      return {
        minute: Math.round(time * 10) / 10,
        team1Obv,
        team2Obv,
        obvDifference: team1Obv - team2Obv,
      };
    });
  }, [events, team1, team2]);

  const goals = useMemo(() => {
    if (!events || events.length === 0) return [];
    const shotGoals = events
      .filter(
        (e) =>
          e.type === "Shot" &&
          e.shot_outcome === "Goal" &&
          e.period <= 4 &&
          e.event_time != null,
      )
      .map((e) => ({ minute: e.event_time! / 60, team: e.team }));

    const ownGoals = events
      .filter(
        (e) =>
          e.type === "Own Goal For" &&
          e.period <= 4 &&
          e.event_time != null,
      )
      .map((e) => ({ minute: e.event_time! / 60, team: e.team }));

    return [...shotGoals, ...ownGoals];
  }, [events]);

  const { stoppageAreas, periodEndTimes } = useMemo(() => {
    if (!events || events.length === 0)
      return { stoppageAreas: [] as Array<{ x1: number; x2: number }>, periodEndTimes: {} as Record<number, number> };

    const periods = new Map<number, { startMinute: number; endMinute: number }>();
    events.forEach((e) => {
      if (e.period < 1 || e.period > 4 || e.event_time == null) return;
      const minute = e.event_time / 60;
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

    const stoppageAreas: Array<{ x1: number; x2: number }> = [];
    const periodEndTimes: Record<number, number> = {};
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

    return { stoppageAreas, periodEndTimes };
  }, [events]);

  if (momentumData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Momentum</CardTitle>
          <CardAction>
            <GraphInfoBadge text="10-minute rolling xT momentum difference." />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            OBV data not available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create goal map for dot rendering
  const goalMap = new Map<number, { team: string }>();
  goals.forEach((goal) => {
    const closest = momentumData.reduce((prev, curr) =>
      Math.abs(curr.minute - goal.minute) < Math.abs(prev.minute - goal.minute) ? curr : prev,
    );
    const rounded = Math.round(closest.minute * 10) / 10;
    goalMap.set(rounded, { team: goal.team });
  });

  // Prepare data with smoothing
  const rawChartData = momentumData.map((d) => {
    const rounded = Math.round(d.minute * 10) / 10;
    const goal = goalMap.get(rounded);
    return {
      minute: d.minute,
      obvDifference: d.obvDifference,
      hasGoal: !!goal,
      goalTeam: goal?.team || null,
    };
  });

  const smoothingRadius = Math.floor(MOMENTUM_SMOOTHING_POINTS / 2);
  const areaChartData = rawChartData.map((point, idx) => {
    let sum = 0;
    let count = 0;
    const start = Math.max(0, idx - smoothingRadius);
    const end = Math.min(rawChartData.length - 1, idx + smoothingRadius);
    for (let i = start; i <= end; i++) {
      sum += rawChartData[i].obvDifference;
      count++;
    }
    const smoothed = count > 0 ? sum / count : point.obvDifference;
    return {
      ...point,
      obvDifference: smoothed,
      positive: smoothed >= 0 ? smoothed : 0,
      negative: smoothed < 0 ? smoothed : 0,
    };
  });

  const maxFromChart = areaChartData.length > 0 ? areaChartData[areaChartData.length - 1].minute : 0;
  const eventMinutes = events
    .filter((e) => e.event_time != null && e.period >= 1 && e.period <= 4)
    .map((e) => (e.event_time ?? 0) / 60);
  const maxFromEvents = eventMinutes.length > 0 ? Math.max(...eventMinutes) : 0;
  const maxFromPeriodEnds = Object.values(periodEndTimes).length > 0
    ? Math.max(...Object.values(periodEndTimes))
    : 0;
  const cappedMaxMinute = Math.min(
    Math.max(maxFromChart, maxFromEvents, maxFromPeriodEnds),
    120,
  );
  const baseTicks = Array.from({ length: Math.floor(cappedMaxMinute / 5) + 1 }, (_, i) => i * 5);
  const xAxisTicks = [...new Set([...baseTicks, ...Object.values(periodEndTimes)])]
    .filter((t) => t <= cappedMaxMinute)
    .sort((a, b) => a - b);

  const maxAbsObv = Math.max(...areaChartData.map((d) => Math.abs(d.obvDifference)), 0);
  const yAxisLimit = Math.max(0.1, Math.ceil(maxAbsObv * 1.1 * 10) / 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Momentum</CardTitle>
        <CardAction>
          <GraphInfoBadge text="10-minute rolling xT momentum difference." />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={areaChartData} margin={{ top: 24, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="pmFillAbove" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={team1Color} stopOpacity={0.55} />
                <stop offset="100%" stopColor={team1Color} stopOpacity={0.12} />
              </linearGradient>
              <linearGradient id="pmFillBelow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={team2Color} stopOpacity={0.12} />
                <stop offset="100%" stopColor={team2Color} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d0d0d0" opacity={0.3} />
            <XAxis
              dataKey="minute"
              type="number"
              scale="linear"
              domain={[0, cappedMaxMinute]}
              interval={0}
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => {
                const rounded = Math.round(value);
                return rounded % 5 === 0 ? rounded.toString() : "";
              }}
              ticks={xAxisTicks}
              allowDecimals={false}
              label={{ value: "Minute", position: "insideBottom", offset: -5 }}
            />
            <YAxis tick={{ fontSize: 12 }} domain={[-yAxisLimit, yAxisLimit]} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as (typeof areaChartData)[0];
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-lg">
                      <p className="text-sm font-medium">Minute: {d.minute.toFixed(1)}</p>
                      <p className="text-sm" style={{ color: team1Color }}>
                        OBV Difference: {d.obvDifference.toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {stoppageAreas.map((area, i) => (
              <ReferenceArea
                key={`stoppage-${i}`}
                x1={area.x1}
                x2={area.x2}
                fill="#d3d3d3"
                fillOpacity={0.35}
                stroke="none"
                ifOverflow="visible"
              />
            ))}
            <ReferenceLine y={0} stroke="#000" strokeDasharray="2 2" opacity={0.5} />
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
            <Area type="monotone" dataKey="positive" fill="url(#pmFillAbove)" stroke="none" />
            <Area type="monotone" dataKey="negative" fill="url(#pmFillBelow)" stroke="none" />
            <Line
              type="monotone"
              dataKey="obvDifference"
              stroke={team1Color}
              strokeWidth={2.5}
              dot={(props: GoalDotProps) => {
                const { cx, cy, payload, index } = props;
                if (payload?.hasGoal && cx !== undefined && cy !== undefined) {
                  const color = payload.goalTeam === team1 ? team1Color : team2Color;
                  return (
                    <circle
                      key={`goal-${index ?? 0}-${payload.minute ?? 0}`}
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill={color}
                    />
                  );
                }
                return (
                  <circle
                    key={`dot-${index ?? 0}`}
                    cx={cx ?? 0}
                    cy={cy ?? 0}
                    r={0}
                    fill="transparent"
                  />
                );
              }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MomentumGraph;
