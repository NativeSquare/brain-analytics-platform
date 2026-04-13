"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  IconCalendarEvent,
  IconClock,
  IconTrophy,
} from "@tabler/icons-react";

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
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
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
          <ul className="space-y-2">
            {fixtures.map((f) => {
              const isSampdoriaHome =
                f.homeTeamId === SAMPDORIA_SPORTMONKS_TEAM_ID;
              const opponent = isSampdoriaHome
                ? f.awayTeamName
                : f.homeTeamName;
              const opponentLogo = isSampdoriaHome
                ? f.awayTeamLogo
                : f.homeTeamLogo;
              const fixtureDate = new Date(getFixtureDate(f));

              return (
                <li
                  key={f.id ?? f.fixtureId}
                  className="group relative flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50"
                >
                  {/* Opponent logo */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted p-1.5 ring-1 ring-border">
                    {opponentLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={opponentLogo} alt={opponent} className="size-full object-contain" />
                    ) : (
                      <IconTrophy className="size-5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>

                  {/* Match info */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      vs {opponent}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <IconCalendarEvent className="size-2.5" aria-hidden="true" />
                        {format(fixtureDate, "dd/MM/yyyy")}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <IconClock className="size-2.5" aria-hidden="true" />
                        {format(fixtureDate, "HH:mm")}
                      </span>
                      {f.competitionName && (
                        <span>{f.competitionName}</span>
                      )}
                    </div>
                  </div>

                  {/* Home/Away badge */}
                  <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-tighter">
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
