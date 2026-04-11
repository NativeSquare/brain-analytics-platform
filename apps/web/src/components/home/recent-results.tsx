"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { IconListDetails, IconTrophy } from "@tabler/icons-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SAMPDORIA_SPORTMONKS_TEAM_ID } from "@/lib/sportmonks-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Fixture {
  id?: number;
  fixtureId?: number;
  startingAt?: string;
  startDate?: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  competitionName: string | null;
  status: string;
}

function getFixtureDate(f: Fixture): string {
  return f.startingAt ?? f.startDate ?? "";
}

type Outcome = "W" | "D" | "L";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOutcome(fixture: Fixture): Outcome {
  const isSampdoriaHome =
    fixture.homeTeamId === SAMPDORIA_SPORTMONKS_TEAM_ID;
  const sampdoriaScore = isSampdoriaHome
    ? fixture.homeScore
    : fixture.awayScore;
  const opponentScore = isSampdoriaHome
    ? fixture.awayScore
    : fixture.homeScore;

  if (sampdoriaScore == null || opponentScore == null) return "D";
  if (sampdoriaScore > opponentScore) return "W";
  if (sampdoriaScore < opponentScore) return "L";
  return "D";
}

const outcomeColors: Record<Outcome, string> = {
  W: "bg-green-500 text-white",
  D: "bg-gray-400 text-white",
  L: "bg-red-500 text-white",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecentResults() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async (signal: AbortSignal) => {
    try {
      const url = `/api/sportmonks/fixtures?teamId=${SAMPDORIA_SPORTMONKS_TEAM_ID}&status=finished&limit=5`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as { data?: Fixture[] };
      setFixtures(json.data ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchResults(controller.signal);
    return () => controller.abort();
  }, [fetchResults]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconListDetails
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
          Recent Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : fixtures.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No recent results available
          </p>
        ) : (
          <ul className="space-y-2">
            {fixtures.map((f) => {
              const isSampdoriaHome =
                f.homeTeamId === SAMPDORIA_SPORTMONKS_TEAM_ID;
              const opponent = isSampdoriaHome
                ? f.awayTeamName
                : f.homeTeamName;
              const sampdoriaScore = isSampdoriaHome
                ? f.homeScore
                : f.awayScore;
              const opponentScore = isSampdoriaHome
                ? f.awayScore
                : f.homeScore;
              const outcome = getOutcome(f);

              return (
                <li
                  key={f.id ?? f.fixtureId}
                  className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50"
                >
                  {/* Opponent logo placeholder */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted p-1.5 ring-1 ring-border">
                    <IconTrophy className="size-5 text-muted-foreground" aria-hidden="true" />
                  </div>

                  {/* Match info */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      vs {opponent}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(getFixtureDate(f)), "dd/MM/yyyy")}
                      {f.competitionName ? ` \u00b7 ${f.competitionName}` : ""}
                    </span>
                  </div>

                  {/* Score */}
                  <span className="text-sm font-black tracking-tighter">
                    {sampdoriaScore ?? "-"} - {opponentScore ?? "-"}
                  </span>

                  {/* W/D/L badge */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-black ring-4 ring-background ${outcomeColors[outcome]}`}
                  >
                    {outcome}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
