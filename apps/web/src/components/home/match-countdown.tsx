"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  IconCalendarEvent,
  IconClock,
  IconTrophy,
} from "@tabler/icons-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SAMPDORIA_SPORTMONKS_TEAM_ID } from "@/lib/sportmonks-config";
import { useTranslation } from "@/hooks/useTranslation";

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
// Helpers
// ---------------------------------------------------------------------------

function formatCountdown(
  hoursTotal: number,
  t: { matchInHours: string; matchInDays: string },
): string {
  if (hoursTotal < 48) {
    return t.matchInHours.replace("{count}", String(hoursTotal));
  }
  return t.matchInDays.replace("{count}", String(Math.floor(hoursTotal / 24)));
}

// ---------------------------------------------------------------------------
// Sub-component: Team logo with fallback
// ---------------------------------------------------------------------------

function TeamLogo({
  logoUrl,
  teamName,
  size = "large",
}: {
  logoUrl?: string | null;
  teamName: string;
  size?: "large" | "small";
}) {
  if (size === "small") {
    return logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={teamName}
        className="size-full object-contain"
      />
    ) : (
      <IconTrophy
        className="size-4 text-muted-foreground/40"
        aria-hidden="true"
      />
    );
  }

  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={teamName}
      className="size-full object-contain"
    />
  ) : (
    <IconTrophy
      className="size-8 text-muted-foreground/40"
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MatchCountdown() {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchFixtures = useCallback(async (signal: AbortSignal) => {
    try {
      const url = `/api/sportmonks/fixtures?teamId=${SAMPDORIA_SPORTMONKS_TEAM_ID}&status=upcoming&limit=3`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as { data?: Fixture[] };
      // Filter to only upcoming matches (mock data doesn't filter server-side)
      const now = new Date();
      const upcoming = (json.data ?? [])
        .filter((f) => {
          const d = getFixtureDate(f);
          return d && new Date(d) > now;
        })
        .sort((a, b) => new Date(getFixtureDate(a)).getTime() - new Date(getFixtureDate(b)).getTime())
        .slice(0, 3);
      setFixtures(upcoming);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchFixtures(controller.signal);
    return () => controller.abort();
  }, [fetchFixtures]);

  // Force re-render every minute for countdown
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (error || fixtures.length === 0) {
    return (
      <Card className="overflow-hidden rounded-xl pt-0">
        <CardContent className="p-0">
          <div className="p-8 text-center">
            <IconCalendarEvent
              className="mx-auto mb-2 size-10 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              {t.home.noUpcomingMatch}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const leadMatch = fixtures[0]!;
  const subsequentMatches = fixtures.slice(1);

  const leadDate = new Date(getFixtureDate(leadMatch));
  const currentTime = Date.now();
  const leadMatchHours = Math.max(
    0,
    Math.floor((leadDate.getTime() - currentTime) / (1000 * 60 * 60)),
  );
  const leadCountdown = formatCountdown(leadMatchHours, {
    matchInHours: t.home.matchInHours,
    matchInDays: t.home.matchInDays,
  });

  const isHome = leadMatch.homeTeamId === SAMPDORIA_SPORTMONKS_TEAM_ID;
  const homeTeamName = isHome ? "UC Sampdoria" : leadMatch.homeTeamName;
  const awayTeamName = isHome ? leadMatch.awayTeamName : "UC Sampdoria";
  const homeTeamLogo = isHome ? null : leadMatch.homeTeamLogo;
  const awayTeamLogo = isHome ? leadMatch.awayTeamLogo : null;

  return (
    <Card className="overflow-hidden rounded-xl pt-0">
      <CardContent className="p-0">
        <div className="divide-y">
          {/* Featured Match */}
          <div className="bg-gradient-to-b from-primary/5 to-transparent p-6">
            {/* Date header + countdown badge */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <IconCalendarEvent className="size-3" aria-hidden="true" />
                {leadDate.toLocaleDateString(dateLocale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>
              <Badge
                variant="default"
                className="animate-pulse bg-primary px-3 py-1 text-xs font-bold"
              >
                {leadCountdown}
              </Badge>
            </div>

            {/* Teams row */}
            <div className="flex items-center justify-between gap-4 md:gap-8">
              {/* Home Team */}
              <div className="flex flex-1 flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                <div className="relative flex size-16 items-center justify-center rounded-2xl bg-background p-3 shadow-xs ring-1 ring-border sm:size-20">
                  <TeamLogo logoUrl={homeTeamLogo} teamName={homeTeamName} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t.home.home}
                  </p>
                  <p className="text-lg font-bold sm:text-xl">
                    {homeTeamName}
                  </p>
                </div>
              </div>

              {/* VS Divider */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-black tracking-tighter ring-4 ring-background">
                  VS
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <IconClock
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {format(leadDate, "HH:mm")}
                </div>
              </div>

              {/* Away Team */}
              <div className="flex flex-1 flex-col items-center gap-3 text-center sm:flex-row-reverse sm:text-right">
                <div className="relative flex size-16 items-center justify-center rounded-2xl bg-background p-3 shadow-xs ring-1 ring-border sm:size-20">
                  <TeamLogo logoUrl={awayTeamLogo} teamName={awayTeamName} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t.home.away}
                  </p>
                  <p className="text-lg font-bold sm:text-xl">
                    {awayTeamName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subsequent Matches */}
          {subsequentMatches.length > 0 && (
            <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {subsequentMatches.map((match) => {
                const matchIsHome =
                  match.homeTeamId === SAMPDORIA_SPORTMONKS_TEAM_ID;
                const opponentName = matchIsHome
                  ? match.awayTeamName
                  : match.homeTeamName;
                const opponentLogo = matchIsHome
                  ? match.awayTeamLogo
                  : match.homeTeamLogo;
                const matchDate = new Date(getFixtureDate(match));
                const matchLabel = matchIsHome
                  ? t.home.homeVs.replace("{opponent}", opponentName)
                  : t.home.awayAt.replace("{opponent}", opponentName);

                return (
                  <div
                    key={match.id ?? match.fixtureId}
                    className="group relative flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted p-1.5 ring-1 ring-border group-hover:bg-background">
                        <TeamLogo
                          logoUrl={opponentLogo}
                          teamName={opponentName}
                          size="small"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {matchLabel}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <IconCalendarEvent
                              className="size-2.5"
                              aria-hidden="true"
                            />
                            {matchDate.toLocaleDateString(dateLocale, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <IconClock
                              className="size-2.5"
                              aria-hidden="true"
                            />
                            {format(matchDate, "HH:mm")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium uppercase tracking-tighter"
                      >
                        {matchIsHome ? t.home.home : t.home.away}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
