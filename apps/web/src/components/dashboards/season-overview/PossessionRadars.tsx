"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PossessionMetrics } from "./types";

interface PossessionRadarsProps {
  data: {
    buildUp: PossessionMetrics | null;
    transitions: PossessionMetrics | null;
  } | null;
  loading: boolean;
}

export default function PossessionRadars({
  data,
  loading,
}: PossessionRadarsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Style of Play</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Efficiency in Phase of Play</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const buildUp = data.buildUp ?? {};
  const transitions = data.transitions ?? {};
  const totalTeams =
    Number(buildUp.total_teams) || Number(transitions.total_teams) || 20;

  const getScore = (rankInput: number | string | null, inverse = false) => {
    const rank = Number(rankInput);
    if (!rank) return 0;
    if (inverse) {
      return (rank / totalTeams) * 100;
    }
    return ((totalTeams - rank + 1) / totalTeams) * 100;
  };

  const styleData = [
    {
      subject: "Possession Control",
      A: getScore(buildUp.bu_minutes_rank),
      fullMark: 100,
    },
    {
      subject: "Pressing Intensity",
      A: getScore(transitions.ppda_rank),
      fullMark: 100,
    },
    {
      subject: "High Regains",
      A: getScore(transitions.atk_half_regains_rank),
      fullMark: 100,
    },
    {
      subject: "Transition Vol",
      A: getScore(transitions.transitions_count_rank),
      fullMark: 100,
    },
    {
      subject: "Deep Build Up",
      A: getScore(buildUp.def_third_possessions_rank),
      fullMark: 100,
    },
  ];

  const efficiencyData = [
    {
      subject: "Attack Quality",
      A: getScore(buildUp.xg_per_entry_rank),
      fullMark: 100,
    },
    {
      subject: "Shot Creation",
      A: getScore(buildUp.final_third_shot_pct_rank),
      fullMark: 100,
    },
    {
      subject: "Counter Eff",
      A: getScore(transitions.transition_xg_per_entry_rank),
      fullMark: 100,
    },
    {
      subject: "Build Up Safety",
      A: getScore(buildUp.def_third_lost_pct_rank, true),
      fullMark: 100,
    },
    {
      subject: "Scoring",
      A: getScore(buildUp.bu_goals_rank),
      fullMark: 100,
    },
  ];

  const hasAnyScore = [...styleData, ...efficiencyData].some(
    (point) => point.A > 0,
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Style of Play</CardTitle>
        </CardHeader>
        <CardContent>
          {hasAnyScore ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="80%"
                data={styleData}
              >
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Percentile Rank"
                  dataKey="A"
                  stroke="#1b5497"
                  fill="#1b5497"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{ height: 300 }}
              className="flex w-full items-center justify-center text-sm text-muted-foreground"
            >
              No style-of-play data available for this selection.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Efficiency in Phase of Play</CardTitle>
        </CardHeader>
        <CardContent>
          {hasAnyScore ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="80%"
                data={efficiencyData}
              >
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Percentile Rank"
                  dataKey="A"
                  stroke="#1b5497"
                  fill="#1b5497"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{ height: 300 }}
              className="flex w-full items-center justify-center text-sm text-muted-foreground"
            >
              No efficiency data available for this selection.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
