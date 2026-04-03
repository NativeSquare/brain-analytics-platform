"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  IconCalendarEvent,
  IconTrophy,
} from "@tabler/icons-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeCountdown(targetDate: Date): CountdownValues {
  const now = new Date();
  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MatchCountdown() {
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [countdown, setCountdown] = useState<CountdownValues>({
    days: 0,
    hours: 0,
    minutes: 0,
  });

  const fetchFixture = useCallback(async (signal: AbortSignal) => {
    try {
      const url = `/api/sportmonks/fixtures?teamId=${SAMPDORIA_SPORTMONKS_TEAM_ID}&status=upcoming&limit=1`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as { data?: Fixture[] };
      const fixtures = json.data ?? [];
      if (fixtures.length > 0) {
        setFixture(fixtures[0]!);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchFixture(controller.signal);
    return () => controller.abort();
  }, [fetchFixture]);

  // Countdown timer
  useEffect(() => {
    if (!fixture) return;
    const target = new Date(getFixtureDate(fixture));
    setCountdown(computeCountdown(target));

    const interval = setInterval(() => {
      setCountdown(computeCountdown(target));
    }, 60_000);

    return () => clearInterval(interval);
  }, [fixture]);

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (error || !fixture) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <IconCalendarEvent
            className="size-10 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">No upcoming match</p>
        </CardContent>
      </Card>
    );
  }

  const isSampdoriaHome =
    fixture.homeTeamId === SAMPDORIA_SPORTMONKS_TEAM_ID;
  const opponent = isSampdoriaHome
    ? fixture.awayTeamName
    : fixture.homeTeamName;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconTrophy
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
          Next Match
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Match info */}
          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold">vs {opponent}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isSampdoriaHome ? "default" : "secondary"}>
                {isSampdoriaHome ? "Home" : "Away"}
              </Badge>
              {fixture.competitionName && (
                <Badge variant="outline">{fixture.competitionName}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <IconCalendarEvent className="size-4" aria-hidden="true" />
              <span>
                {format(
                  new Date(getFixtureDate(fixture)),
                  "EEEE, d MMMM yyyy 'at' HH:mm"
                )}
              </span>
            </div>
          </div>

          {/* Countdown */}
          {countdown.days === 0 &&
          countdown.hours === 0 &&
          countdown.minutes === 0 ? (
            <Badge variant="default" className="text-sm">
              Match in progress
            </Badge>
          ) : (
            <div className="flex items-center gap-4">
              <CountdownBlock value={countdown.days} label="Days" />
              <CountdownBlock value={countdown.hours} label="Hours" />
              <CountdownBlock value={countdown.minutes} label="Min" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-bold tabular-nums text-primary">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
