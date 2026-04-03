"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Generic client-side data-fetching hook.
 * Skips fetching when `url` is null (e.g. no match selected yet).
 */
export function useFetch<T>(url: string | null): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const [retryKey, setRetryKey] = useState(0);

  const refetch = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!url) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        const json = (await response.json()) as { data?: T } | T;
        if (cancelled) return;

        // API routes wrap in { data: ... }
        const payload = (json as { data?: T }).data ?? (json as T);
        setData(payload);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load data";
        console.error(`[useFetch] ${url}`, message);
        setError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [url, retryKey]);

  return { data, isLoading, error, refetch };
}

// ---- Convenience hooks for specific endpoints ----

import type {
  TeamOption,
  SeasonOption,
  MatchRow,
  MatchStatsRow,
  LineupPlayerRow,
  WinProbabilityRow,
  MatchEvent,
  PossessionRow,
} from "./types";

export function useTeams() {
  return useFetch<TeamOption[]>("/api/statsbomb/teams?competitionId=84");
}

export function useSeasons() {
  return useFetch<SeasonOption[]>("/api/statsbomb/seasons");
}

export function useDefaultSeason(teamId: number | null) {
  const url = teamId ? `/api/statsbomb/default-season?teamId=${teamId}` : null;
  return useFetch<{ season_id: number }>(url);
}

export function useMatches(teamId: number | null, seasonId: number | null) {
  const url =
    teamId && seasonId
      ? `/api/statsbomb/matches?teamId=${teamId}&seasonId=${seasonId}`
      : teamId
        ? `/api/statsbomb/matches?teamId=${teamId}`
        : null;
  return useFetch<MatchRow[]>(url);
}

export function useMatchStats(matchId: number | null) {
  const url = matchId
    ? `/api/statsbomb/match-stats?matchId=${matchId}`
    : null;
  return useFetch<MatchStatsRow[]>(url);
}

export function useLineups(matchId: number | null) {
  const url = matchId
    ? `/api/statsbomb/lineups-processed?matchId=${matchId}`
    : null;
  return useFetch<LineupPlayerRow[]>(url);
}

export function useWinProbabilities(matchId: number | null) {
  const url = matchId
    ? `/api/statsbomb/win-probabilities?matchId=${matchId}`
    : null;
  return useFetch<WinProbabilityRow[]>(url);
}

export function useEvents(matchId: number | null) {
  const url = matchId
    ? `/api/statsbomb/events?matchId=${matchId}`
    : null;
  return useFetch<MatchEvent[]>(url);
}

export function usePossessions(matchId: number | null) {
  const url = matchId
    ? `/api/statsbomb/possessions?matchId=${matchId}`
    : null;
  return useFetch<PossessionRow[]>(url);
}
