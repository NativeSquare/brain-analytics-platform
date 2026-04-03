"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { IconListDetails } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
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

const outcomeBadgeVariant: Record<
  Outcome,
  "default" | "secondary" | "destructive"
> = {
  W: "default",
  D: "secondary",
  L: "destructive",
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
          <ul className="space-y-3">
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
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      Sampdoria{" "}
                      <span className="font-bold">
                        {sampdoriaScore ?? "-"} - {opponentScore ?? "-"}
                      </span>{" "}
                      {opponent}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(getFixtureDate(f)), "d MMM yyyy")}
                      {f.competitionName ? ` \u00b7 ${f.competitionName}` : ""}
                    </span>
                  </div>
                  <Badge variant={outcomeBadgeVariant[outcome]}>
                    {outcome}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
