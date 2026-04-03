"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Loader2, UserSearch } from "lucide-react";
import type {
  LeaguePlayerStats,
  PlayerSeasonStats,
  PlayerSelection,
  PositionRole,
} from "./types";
import { positionToRole } from "./constants";
import {
  FULL_METRICS,
  OVERVIEW_METRICS,
  RADAR_METRICS,
} from "./constants";
import { calculateAllPercentiles } from "./percentiles";
import PlayerFilters from "./player-filters";
import PlayerInfoCard from "./player-info-card";
import PlayerOverview from "./player-overview";
import SeasonStatistics from "./season-statistics";
import PlayerRadarChart from "./player-radar-chart";
import PlayerScatterPlot from "./player-scatter-plot";
import PlayerComparison from "./player-comparison";

// ---------------------------------------------------------------------------
// Props (from dashboard registry)
// ---------------------------------------------------------------------------

interface PlayerAnalysisClientProps {
  slug: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerAnalysisClient({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  slug: _slug,
}: PlayerAnalysisClientProps) {
  // Selection state
  const [selection, setSelection] = useState<PlayerSelection | null>(null);
  const [positionRole, setPositionRole] = useState<PositionRole>("Midfielder");

  // Data
  const [playerStats, setPlayerStats] = useState<PlayerSeasonStats | null>(null);
  const [leagueStats, setLeagueStats] = useState<LeaguePlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch player + league data (called from handler, not from effect)
  // ---------------------------------------------------------------------------
  const fetchPlayerData = useCallback(
    async (sel: PlayerSelection) => {
      const { playerId, competitionId, seasonId } = sel;

      // Abort any in-flight request to prevent stale data overwrites
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const [playerRes, leagueRes] = await Promise.all([
          fetch(
            `/api/statsbomb/player-season-stats?playerId=${playerId}&competitionId=${competitionId}&seasonId=${seasonId}`,
            { signal: controller.signal },
          ),
          fetch(
            `/api/statsbomb/league-player-season-stats?competitionId=${competitionId}&seasonId=${seasonId}&minMinutes=300`,
            { signal: controller.signal },
          ),
        ]);

        if (!playerRes.ok || !leagueRes.ok) {
          throw new Error("API returned an error status");
        }

        const playerJson = await playerRes.json();
        const leagueJson = await leagueRes.json();

        // Guard against abort between fetch and state update
        if (controller.signal.aborted) return;

        const pData = playerJson.data as PlayerSeasonStats | null;
        const lData = (leagueJson.data ?? []) as LeaguePlayerStats[];

        if (!pData) {
          setError("No stats found for this player in the selected season.");
          setPlayerStats(null);
          setLeagueStats([]);
          return;
        }

        setPlayerStats(pData);
        setLeagueStats(lData);

        // Auto-detect role from position
        const detectedRole = positionToRole(pData.primary_position);
        setPositionRole(detectedRole);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Failed to load player data. Please try again.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handlePlayerSelected = useCallback(
    (sel: PlayerSelection) => {
      setSelection(sel);
      void fetchPlayerData(sel);
    },
    [fetchPlayerData],
  );

  const handleFiltersReset = useCallback(() => {
    setSelection(null);
    setPlayerStats(null);
    setLeagueStats([]);
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Compute percentiles
  // ---------------------------------------------------------------------------
  const percentiles = useMemo(() => {
    if (!playerStats || leagueStats.length === 0) return {};

    // Combine all metric definitions for the current role
    const allMetrics = [
      ...OVERVIEW_METRICS[positionRole],
      ...RADAR_METRICS[positionRole],
      ...FULL_METRICS[positionRole],
    ];

    // Deduplicate by key
    const seen = new Set<string>();
    const unique = allMetrics.filter((m) => {
      if (seen.has(m.key)) return false;
      seen.add(m.key);
      return true;
    });

    return calculateAllPercentiles(playerStats, leagueStats, unique);
  }, [playerStats, leagueStats, positionRole]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <PlayerFilters
        onPlayerSelected={handlePlayerSelected}
        onFiltersReset={handleFiltersReset}
      />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span>Loading player data...</span>
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {!selection && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <UserSearch className="size-12 opacity-40" />
          <p className="text-lg font-medium">Select a player to view their analysis</p>
          <p className="text-sm">
            Choose a competition, season, and search for a player above.
          </p>
        </div>
      )}

      {playerStats && !isLoading && !error && (
        <>
          <PlayerInfoCard
            player={playerStats}
            positionRole={positionRole}
            onRoleChange={setPositionRole}
          />

          <PlayerOverview
            positionRole={positionRole}
            percentiles={percentiles}
          />

          <SeasonStatistics
            player={playerStats}
            positionRole={positionRole}
            percentiles={percentiles}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PlayerRadarChart
              positionRole={positionRole}
              percentiles={percentiles}
            />
            <PlayerScatterPlot
              player={playerStats}
              leagueStats={leagueStats}
            />
          </div>

          <PlayerComparison
            positionRole={positionRole}
            percentiles={percentiles}
          />
        </>
      )}
    </div>
  );
}
