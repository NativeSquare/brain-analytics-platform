"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import HeatMapClient from "./HeatMapClient";
import type { MatchOption, MatchRow, TeamOption, SeasonOption } from "./types";

// ---------------------------------------------------------------------------
// HeatMapsDashboard
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HeatMapsDashboard({ slug }: { slug: string }) {
  // ---------- Filter state ----------
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number>(234);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchOption | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------- Load teams + seasons ----------
  useEffect(() => {
    let cancelled = false;
    const loadFilters = async () => {
      try {
        const [teamsRes, seasonsRes] = await Promise.all([
          fetch("/api/statsbomb/teams"),
          fetch("/api/statsbomb/seasons"),
        ]);
        if (!teamsRes.ok || !seasonsRes.ok) throw new Error("Failed to load filters");

        const teamsJson = (await teamsRes.json()) as
          | { data?: TeamOption[] }
          | TeamOption[];
        const seasonsJson = (await seasonsRes.json()) as
          | { data?: SeasonOption[] }
          | SeasonOption[];

        if (cancelled) return;

        const teamsData =
          (teamsJson as { data?: TeamOption[] }).data ?? (teamsJson as TeamOption[]);
        const seasonsData =
          (seasonsJson as { data?: SeasonOption[] }).data ??
          (seasonsJson as SeasonOption[]);

        setTeams(teamsData);
        setSeasons(seasonsData);

        // Default team
        const defaultTeam = teamsData.find((t) => t.team_id === 234);
        if (defaultTeam) setSelectedTeamId(defaultTeam.team_id);
      } catch {
        // silently ignore
      }
    };
    loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Load default season ----------
  useEffect(() => {
    if (!selectedTeamId) return;
    let cancelled = false;

    const loadDefaultSeason = async () => {
      try {
        const response = await fetch(
          `/api/statsbomb/default-season?teamId=${selectedTeamId}`,
        );
        if (!response.ok) throw new Error("Failed to load default season");
        const json = await response.json();
        const data = json.data ?? json;
        if (cancelled) return;
        if (data?.season_id) setSelectedSeasonId(data.season_id);
      } catch {
        // silently ignore
      }
    };
    loadDefaultSeason();
    return () => {
      cancelled = true;
    };
  }, [selectedTeamId]);

  // ---------- Load matches ----------
  const loadMatches = useCallback(async () => {
    if (!selectedTeamId) return;
    setMatchesLoading(true);
    setMatchesError(null);

    try {
      const params = new URLSearchParams();
      params.set("teamId", String(selectedTeamId));
      if (selectedSeasonId) params.set("seasonId", String(selectedSeasonId));

      const response = await fetch(`/api/statsbomb/matches?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load matches");

      const json = (await response.json()) as
        | { data?: MatchRow[] }
        | MatchRow[];
      if (!mountedRef.current) return;

      const rows =
        (json as { data?: MatchRow[] }).data ?? (json as MatchRow[]);

      const options: MatchOption[] = rows.map((match) => ({
        ...match,
        label: match.match_label,
      }));

      setMatches(options);
      setMatchesLoading(false);

      // Auto-select first match if none selected
      if (options.length > 0 && !selectedMatch) {
        setSelectedMatch(options[0]);
      } else if (
        selectedMatch &&
        !options.some((m) => m.match_id === selectedMatch.match_id)
      ) {
        setSelectedMatch(options.length > 0 ? options[0] : null);
      }
    } catch {
      if (!mountedRef.current) return;
      setMatchesError("Unable to load matches");
      setMatchesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, selectedSeasonId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // ---------- Render ----------
  return (
    <div className="flex h-full flex-col gap-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold">Heat Maps</h1>
        <p className="text-sm text-muted-foreground">
          Analyze player density and hot zones on a continuous canvas map.
        </p>
      </div>

      {/* Team & Season filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="heat-team-select"
            className="text-sm font-medium text-muted-foreground"
          >
            Team:
          </label>
          <select
            id="heat-team-select"
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
            value={selectedTeamId}
            onChange={(e) => {
              setSelectedTeamId(Number(e.target.value));
              setSelectedMatch(null);
            }}
          >
            {teams.map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.team_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="heat-season-select"
            className="text-sm font-medium text-muted-foreground"
          >
            Season:
          </label>
          <select
            id="heat-season-select"
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
            value={selectedSeasonId ?? ""}
            onChange={(e) => {
              setSelectedSeasonId(Number(e.target.value));
              setSelectedMatch(null);
            }}
          >
            {seasons.map((s) => (
              <option key={s.season_id} value={s.season_id}>
                {s.season_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Heat map client with event type tabs and pitch */}
      <HeatMapClient
        matches={matches}
        matchesLoading={matchesLoading}
        matchesError={matchesError}
        selectedMatch={selectedMatch}
        onMatchChange={setSelectedMatch}
      />
    </div>
  );
}

export default HeatMapsDashboard;
