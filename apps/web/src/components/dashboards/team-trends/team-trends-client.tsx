"use client";

import { useEffect, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { FilterSelectOption } from "@/components/dashboard/FilterSelect";

import TeamTrendsFiltersBar from "./team-trends-filters-bar";
import TeamMetricProgressChart from "./team-metric-progress-chart";
import LeagueRankingChart from "./league-ranking-chart";
import TeamXYScatterChart from "./team-xy-scatter-chart";
import type { TeamTrendData, LeagueTeamAverage } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractData<T>(json: unknown): T[] {
  const obj = json as { data?: T[] };
  return (obj.data ?? (json as unknown as T[])) as T[];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TeamTrendsDashboard({ slug }: { slug: string }) {
  // --- Filter state ---
  const [teams, setTeams] = useState<
    Array<{ team_id: number; team_name: string }>
  >([]);
  const [seasons, setSeasons] = useState<
    Array<{ season_id: number; season_name: string }>
  >([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>();

  // --- Data state ---
  const [trendData, setTrendData] = useState<TeamTrendData[]>([]);
  const [leagueAverages, setLeagueAverages] = useState<LeagueTeamAverage[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // 1. Load teams + seasons on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const loadFilters = async () => {
      try {
        const [teamsRes, seasonsRes] = await Promise.all([
          fetch("/api/statsbomb/teams"),
          fetch("/api/statsbomb/seasons"),
        ]);
        if (!teamsRes.ok || !seasonsRes.ok)
          throw new Error("Failed to load filters");
        const teamsJson = (await teamsRes.json()) as {
          data?: Array<{ team_id: number; team_name: string }>;
        };
        const seasonsJson = (await seasonsRes.json()) as {
          data?: Array<{ season_id: number; season_name: string }>;
        };
        if (!isMounted) return;

        const teamsData =
          teamsJson.data ??
          (teamsJson as unknown as Array<{
            team_id: number;
            team_name: string;
          }>);
        const seasonsData =
          seasonsJson.data ??
          (seasonsJson as unknown as Array<{
            season_id: number;
            season_name: string;
          }>);
        setTeams(teamsData);
        setSeasons(seasonsData);

        // Default: UC Sampdoria (team_id 234)
        const defaultTeam = teamsData.find((t) => t.team_id === 234);
        if (defaultTeam) setSelectedTeamId(String(defaultTeam.team_id));
      } catch {
        // silently ignore
      }
    };

    loadFilters();
    return () => {
      isMounted = false;
    };
  }, []);

  // -----------------------------------------------------------------------
  // 2. Load default season when team changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!selectedTeamId) return;
    let isMounted = true;

    const loadDefaultSeason = async () => {
      try {
        const res = await fetch(
          `/api/statsbomb/default-season?teamId=${selectedTeamId}`,
        );
        if (!res.ok) throw new Error("Failed to load default season");
        const json = (await res.json()) as {
          data?: { season_id: number };
          season_id?: number;
        };
        const data = json.data ?? json;
        if (!isMounted) return;
        if (data?.season_id) setSelectedSeasonId(String(data.season_id));
      } catch {
        // silently ignore
      }
    };

    loadDefaultSeason();
    return () => {
      isMounted = false;
    };
  }, [selectedTeamId]);

  // -----------------------------------------------------------------------
  // 3. Load trend data + league averages when team/season selected
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!selectedTeamId || !selectedSeasonId) return;
    let isMounted = true;

    const loadData = async () => {
      setDataLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          teamId: selectedTeamId,
          seasonId: selectedSeasonId,
        });

        const [trendRes, avgRes] = await Promise.all([
          fetch(`/api/statsbomb/team-trends?${params.toString()}`),
          fetch(
            `/api/statsbomb/league-team-season-averages?${params.toString()}`,
          ),
        ]);

        if (!trendRes.ok) throw new Error("Failed to load team trends");
        if (!avgRes.ok) throw new Error("Failed to load league averages");

        const trendJson = await trendRes.json();
        const avgJson = await avgRes.json();

        if (!isMounted) return;

        setTrendData(extractData<TeamTrendData>(trendJson));
        setLeagueAverages(extractData<LeagueTeamAverage>(avgJson));
      } catch {
        if (isMounted) {
          setTrendData([]);
          setLeagueAverages([]);
          setError("Failed to load dashboard data");
        }
      } finally {
        if (isMounted) setDataLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedTeamId, selectedSeasonId]);

  // -----------------------------------------------------------------------
  // Derived: filter options
  // -----------------------------------------------------------------------
  const teamOptions: FilterSelectOption[] = useMemo(
    () =>
      teams.map((t) => ({
        value: String(t.team_id),
        label: t.team_name,
      })),
    [teams],
  );

  const seasonOptions: FilterSelectOption[] = useMemo(
    () =>
      seasons.map((s) => ({
        value: String(s.season_id),
        label: s.season_name,
      })),
    [seasons],
  );

  // -----------------------------------------------------------------------
  // Loading / empty states
  // -----------------------------------------------------------------------
  const hasFilters = !!selectedTeamId && !!selectedSeasonId;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="flex h-full flex-col gap-4">
      {/* Filter bar */}
      <TeamTrendsFiltersBar
        teams={teamOptions}
        seasons={seasonOptions}
        selectedTeamId={selectedTeamId}
        selectedSeasonId={selectedSeasonId}
        onTeamChange={(v) => {
          setSelectedTeamId(v);
          setSelectedSeasonId(undefined);
        }}
        onSeasonChange={setSelectedSeasonId}
      />

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Prompt to select filters */}
      {!hasFilters && !dataLoading && (
        <div className="flex flex-1 items-center justify-center rounded-xl border bg-card p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            Select a team and season to view trends.
          </p>
        </div>
      )}

      {/* Loading skeletons */}
      {dataLoading && (
        <div className="grid gap-4">
          <Skeleton className="h-80 w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-[420px] rounded-xl" />
          </div>
        </div>
      )}

      {/* Dashboard content */}
      {hasFilters && !dataLoading && trendData.length > 0 && (
        <>
          {/* Metric progression (full width) */}
          <TeamMetricProgressChart data={trendData} />

          {/* League ranking + XY scatter side by side */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <LeagueRankingChart data={trendData} />
            <TeamXYScatterChart
              data={leagueAverages}
              selectedTeamId={selectedTeamId}
            />
          </div>
        </>
      )}

      {/* No data after load */}
      {hasFilters && !dataLoading && trendData.length === 0 && !error && (
        <div className="flex flex-1 items-center justify-center rounded-xl border bg-card p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            No trend data found for the selected team and season.
          </p>
        </div>
      )}
    </div>
  );
}

export default TeamTrendsDashboard;
