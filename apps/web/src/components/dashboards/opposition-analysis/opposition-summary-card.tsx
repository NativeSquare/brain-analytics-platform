"use client";

import { Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MatchResult } from "./types";

interface OppositionSummaryCardProps {
  teamName: string;
  leaguePosition: number | null;
  totalTeams: number;
  lastResults: MatchResult[];
}

const RESULT_COLORS: Record<string, string> = {
  W: "bg-emerald-500 text-white",
  D: "bg-amber-500 text-white",
  L: "bg-red-500 text-white",
};

export default function OppositionSummaryCard({
  teamName,
  leaguePosition,
  totalTeams,
  lastResults,
}: OppositionSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Shield className="size-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle>{teamName}</CardTitle>
            {leaguePosition != null && (
              <p className="text-sm text-muted-foreground">
                League position: {leaguePosition} / {totalTeams}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Last {lastResults.length} Results
        </h4>
        {lastResults.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent results</p>
        ) : (
          <div className="space-y-1.5">
            {lastResults.map((m) => (
              <div
                key={m.match_id}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate text-muted-foreground">
                  vs {m.opponent_name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">
                    {m.goals_scored}-{m.goals_conceded}
                  </span>
                  <span
                    className={`inline-flex size-6 items-center justify-center rounded text-xs font-bold ${RESULT_COLORS[m.result]}`}
                  >
                    {m.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
