"use client";

import { useCallback, useEffect, useState } from "react";
import { FilterBar } from "@/components/dashboard/FilterBar";
import {
  FilterSelect,
  type FilterSelectOption,
} from "@/components/dashboard/FilterSelect";
import type { PlayerSearchResult, PlayerSelection } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayerFiltersProps {
  onPlayerSelected: (selection: PlayerSelection) => void;
  onFiltersReset: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerFilters({
  onPlayerSelected,
  onFiltersReset,
}: PlayerFiltersProps) {
  // Filter state
  const [competitions, setCompetitions] = useState<FilterSelectOption[]>([]);
  const [teams, setTeams] = useState<FilterSelectOption[]>([]);
  const [seasons, setSeasons] = useState<FilterSelectOption[]>([]);
  const [players, setPlayers] = useState<FilterSelectOption[]>([]);
  const [playersRaw, setPlayersRaw] = useState<PlayerSearchResult[]>([]);

  const [competitionId, setCompetitionId] = useState<string | undefined>();
  const [teamId, setTeamId] = useState<string | undefined>();
  const [seasonId, setSeasonId] = useState<string | undefined>();
  const [playerId, setPlayerId] = useState<string | undefined>();

  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // -----------------------------------------------------------------------
  // Load competitions on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    fetch("/api/statsbomb/competitions")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch competitions");
        return r.json();
      })
      .then(
        (json: {
          data?: { competition_id: number; competition_name: string }[];
        }) => {
          if (!cancelled && json.data) {
            setCompetitions(
              json.data.map((c) => ({
                value: String(c.competition_id),
                label: c.competition_name,
              })),
            );
          }
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------------------------
  // Load seasons (global)
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    fetch("/api/statsbomb/seasons")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch seasons");
        return r.json();
      })
      .then(
        (json: {
          data?: { season_id: number; season_name: string }[];
        }) => {
          if (!cancelled && json.data) {
            setSeasons(
              json.data.map((s) => ({
                value: String(s.season_id),
                label: s.season_name,
              })),
            );
          }
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------------------------
  // Load teams when competition changes
  // -----------------------------------------------------------------------
  const fetchTeams = useCallback((compId: string) => {
    fetch(`/api/statsbomb/teams-by-competition?competitionId=${compId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch teams");
        return r.json();
      })
      .then(
        (json: {
          data?: { team_id: number; team_name: string }[];
        }) => {
          setTeams(
            (json.data ?? []).map((t) => ({
              value: String(t.team_id),
              label: t.team_name,
            })),
          );
        },
      )
      .catch(() => setTeams([]));
  }, []);

  // -----------------------------------------------------------------------
  // Load players when competition + season + team are selected
  // -----------------------------------------------------------------------
  const fetchPlayers = useCallback(
    (compId: string, sznId: string, tmId?: string) => {
      setLoadingPlayers(true);
      const params = new URLSearchParams({
        competitionId: compId,
        seasonId: sznId,
      });
      if (tmId) params.set("teamId", tmId);

      fetch(`/api/statsbomb/players?${params}`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to fetch players");
          return r.json();
        })
        .then((json: { data?: PlayerSearchResult[] }) => {
          const raw = json.data ?? [];
          setPlayersRaw(raw);
          setPlayers(
            raw.map((p) => ({
              value: String(p.player_id),
              label: `${p.player_name}${p.primary_position ? ` (${p.primary_position})` : ""}`,
            })),
          );
        })
        .catch(() => {
          setPlayersRaw([]);
          setPlayers([]);
        })
        .finally(() => setLoadingPlayers(false));
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Cascading resets + data loading
  // -----------------------------------------------------------------------
  const handleCompetitionChange = useCallback(
    (value: string) => {
      setCompetitionId(value);
      setTeamId(undefined);
      setSeasonId(undefined);
      setPlayerId(undefined);
      setTeams([]);
      setPlayers([]);
      setPlayersRaw([]);
      onFiltersReset();
      fetchTeams(value);
    },
    [onFiltersReset, fetchTeams],
  );

  const handleTeamChange = useCallback(
    (value: string) => {
      setTeamId(value);
      setPlayerId(undefined);
      setPlayers([]);
      setPlayersRaw([]);
      onFiltersReset();
      // Load players if we have competition + season
      if (competitionId && seasonId) {
        fetchPlayers(competitionId, seasonId, value);
      }
    },
    [onFiltersReset, competitionId, seasonId, fetchPlayers],
  );

  const handleSeasonChange = useCallback(
    (value: string) => {
      setSeasonId(value);
      setPlayerId(undefined);
      setPlayers([]);
      setPlayersRaw([]);
      onFiltersReset();
      // Load players if we have competition + team
      if (competitionId) {
        fetchPlayers(competitionId, value, teamId);
      }
    },
    [onFiltersReset, competitionId, teamId, fetchPlayers],
  );

  const handlePlayerChange = useCallback(
    (value: string) => {
      setPlayerId(value);
      if (!competitionId || !seasonId) return;

      const player = playersRaw.find((p) => String(p.player_id) === value);
      if (player) {
        onPlayerSelected({
          playerId: String(player.player_id),
          competitionId,
          seasonId,
        });
      }
    },
    [competitionId, seasonId, playersRaw, onPlayerSelected],
  );

  const canSelectPlayer = Boolean(competitionId && seasonId);

  return (
    <FilterBar>
      <FilterSelect
        label="Competition"
        options={competitions}
        value={competitionId}
        onChange={handleCompetitionChange}
        placeholder="Select competition"
        searchable
        className="min-w-[200px] flex-1"
      />
      <FilterSelect
        label="Team"
        options={teams}
        value={teamId}
        onChange={handleTeamChange}
        placeholder={
          competitionId ? "All teams" : "Select competition first"
        }
        searchable
        className="min-w-[180px] flex-1"
      />
      <FilterSelect
        label="Season"
        options={seasons}
        value={seasonId}
        onChange={handleSeasonChange}
        placeholder="Select season"
        searchable
        className="min-w-[160px] flex-1"
      />
      <FilterSelect
        label="Player"
        options={players}
        value={playerId}
        onChange={handlePlayerChange}
        placeholder={
          loadingPlayers
            ? "Loading players..."
            : canSelectPlayer
              ? "Select player"
              : "Select competition & season first"
        }
        searchable
        className="min-w-[240px] flex-1"
      />
    </FilterBar>
  );
}
