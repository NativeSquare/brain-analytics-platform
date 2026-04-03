"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { IconCalendarEvent } from "@tabler/icons-react";

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
  competitionName: string | null;
  status: string;
}

function getFixtureDate(f: Fixture): string {
  return f.startingAt ?? f.startDate ?? "";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UpcomingFixtures() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFixtures = useCallback(async (signal: AbortSignal) => {
    try {
      const url = `/api/sportmonks/fixtures?teamId=${SAMPDORIA_SPORTMONKS_TEAM_ID}&status=upcoming&limit=5`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as { data?: Fixture[] };
      setFixtures(json.data ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchFixtures(controller.signal);
    return () => controller.abort();
  }, [fetchFixtures]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconCalendarEvent
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
          Upcoming Fixtures
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
            No upcoming fixtures
          </p>
        ) : (
          <ul className="space-y-3">
            {fixtures.map((f) => {
              const isSampdoriaHome =
                f.homeTeamId === SAMPDORIA_SPORTMONKS_TEAM_ID;
              const opponent = isSampdoriaHome
                ? f.awayTeamName
                : f.homeTeamName;

              return (
                <li
                  key={f.id ?? f.fixtureId}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      vs {opponent}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(
                        new Date(getFixtureDate(f)),
                        "EEE, d MMM yyyy 'at' HH:mm"
                      )}
                      {f.competitionName
                        ? ` \u00b7 ${f.competitionName}`
                        : ""}
                    </span>
                  </div>
                  <Badge variant={isSampdoriaHome ? "default" : "secondary"}>
                    {isSampdoriaHome ? "Home" : "Away"}
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
