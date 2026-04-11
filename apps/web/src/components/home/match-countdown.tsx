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
      <Card className="overflow-hidden rounded-xl">
        <div className="bg-gradient-to-b from-primary/5 to-transparent px-6 py-8">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <IconCalendarEvent
              className="size-10 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">No upcoming match</p>
          </div>
        </div>
      </Card>
    );
  }

  const isSampdoriaHome =
    fixture.homeTeamId === SAMPDORIA_SPORTMONKS_TEAM_ID;
  const opponent = isSampdoriaHome
    ? fixture.awayTeamName
    : fixture.homeTeamName;

  return (
    <Card className="overflow-hidden rounded-xl">
      {/* Gradient header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconCalendarEvent
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Next Match
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6 py-2">
            {/* Teams row with logos and VS divider */}
            <div className="flex w-full items-center justify-center gap-6">
              {/* Home team */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background p-3 shadow-xs ring-1 ring-border sm:h-20 sm:w-20">
                  <IconTrophy className="size-8 text-primary sm:size-10" aria-hidden="true" />
                </div>
                <span className="max-w-[100px] truncate text-xs font-bold sm:max-w-[120px] sm:text-sm">
                  {isSampdoriaHome ? "Sampdoria" : opponent}
                </span>
              </div>

              {/* VS divider */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-black ring-4 ring-background">
                VS
              </div>

              {/* Away team */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background p-3 shadow-xs ring-1 ring-border sm:h-20 sm:w-20">
                  <IconTrophy className="size-8 text-muted-foreground sm:size-10" aria-hidden="true" />
                </div>
                <span className="max-w-[100px] truncate text-xs font-bold sm:max-w-[120px] sm:text-sm">
                  {isSampdoriaHome ? opponent : "Sampdoria"}
                </span>
              </div>
            </div>

            {/* Competition and venue badges */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge variant={isSampdoriaHome ? "default" : "secondary"}>
                {isSampdoriaHome ? "Home" : "Away"}
              </Badge>
              {fixture.competitionName && (
                <Badge variant="outline">{fixture.competitionName}</Badge>
              )}
            </div>

            {/* Date row */}
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <IconCalendarEvent className="size-2.5" aria-hidden="true" />
              <span>
                {format(
                  new Date(getFixtureDate(fixture)),
                  "EEEE dd/MM/yyyy 'at' HH:mm"
                )}
              </span>
            </div>

            {/* Countdown */}
            {countdown.days === 0 &&
            countdown.hours === 0 &&
            countdown.minutes === 0 ? (
              <Badge className="animate-pulse bg-primary px-3 py-1 text-xs font-bold">
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
      </div>
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
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
