"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import DetailsPane from "./details-pane";
import GoalMap from "./goal-map";
import MatchFiltersBar from "./match-filters-bar";
import ShotFiltersBar from "./shot-filters-bar";
import ShotPitchMap from "./shot-pitch-map";
import ShotsTable from "./shots-table";
import StatsBar from "./stats-bar";
import type { MatchOption, MatchRow, Shot } from "./types";

// ---------------------------------------------------------------------------
// ShotMapDashboard
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ShotMapDashboard({ slug }: { slug: string }) {
  const searchParams = useSearchParams();

  // ---------- match filter state ----------
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [matchQuery, setMatchQuery] = useState("");
  const [matchDropdownOpen, setMatchDropdownOpen] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchOption | null>(null);
  const [teams, setTeams] = useState<Array<{ team_id: number; team_name: string }>>([]);
  const [seasons, setSeasons] = useState<Array<{ season_id: number; season_name: string }>>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number>(234);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [allTeamShots, setAllTeamShots] = useState(false);
  const [useGoalMap, setUseGoalMap] = useState(false);

  // ---------- shot data state ----------
  const [shots, setShots] = useState<Shot[]>([]);
  const [shotsLoading, setShotsLoading] = useState(false);
  const [shotsError, setShotsError] = useState<string | null>(null);
  const [hoveredShotId, setHoveredShotId] = useState<number | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<number | null>(null);
  const [pitchScale, setPitchScale] = useState<number>(1);

  // ---------- shot filter state ----------
  const [teamFilter, setTeamFilter] = useState<string>("All");
  const [periodFilter, setPeriodFilter] = useState<string>("All");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("All");
  const [phaseFilter, setPhaseFilter] = useState<string>("All");
  const [playerFilter, setPlayerFilter] = useState<string>("All");
  const [excludePenalties, setExcludePenalties] = useState(false);

  const [requestedMatchId, setRequestedMatchId] = useState<number | null>(null);
  const [requestedSeasonId, setRequestedSeasonId] = useState<number | null>(null);

  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnTo = searchParams.get("return_to");
  const postMatchMatchIdParam = searchParams.get("post_match_match_id");
  const postMatchMatchId =
    postMatchMatchIdParam && !Number.isNaN(Number(postMatchMatchIdParam))
      ? Number(postMatchMatchIdParam)
      : null;
  const showBackToPostMatch = returnTo === "post-match";

  // ---- URL search-param driven state ----
  useEffect(() => {
    const teamIdParam = searchParams.get("team_id");
    const seasonIdParam = searchParams.get("season_id");
    const matchIdParam = searchParams.get("match_id");

    const teamId = teamIdParam ? Number(teamIdParam) : null;
    const seasonId = seasonIdParam ? Number(seasonIdParam) : null;
    const matchId = matchIdParam ? Number(matchIdParam) : null;

    if (teamId && !Number.isNaN(teamId)) setSelectedTeamId(teamId);
    if (seasonId && !Number.isNaN(seasonId)) {
      setRequestedSeasonId(seasonId);
      setSelectedSeasonId(seasonId);
    } else {
      setRequestedSeasonId(null);
    }
    if (matchId && !Number.isNaN(matchId)) {
      setRequestedMatchId(matchId);
    } else {
      setRequestedMatchId(null);
    }
  }, [searchParams]);

  // ---- Load teams + seasons ----
  useEffect(() => {
    let isMounted = true;
    const loadFilters = async () => {
      try {
        const [teamsResponse, seasonsResponse] = await Promise.all([
          fetch("/api/statsbomb/teams"),
          fetch("/api/statsbomb/seasons"),
        ]);
        if (!teamsResponse.ok || !seasonsResponse.ok) throw new Error("Failed to load filters");
        const teamsJson = await teamsResponse.json();
        const seasonsJson = await seasonsResponse.json();
        if (!isMounted) return;
        const teamsData = teamsJson.data ?? teamsJson;
        const seasonsData = seasonsJson.data ?? seasonsJson;
        setTeams(teamsData);
        setSeasons(seasonsData);

        const defaultTeam = teamsData.find((t: { team_id: number }) => t.team_id === 234);
        if (defaultTeam) setSelectedTeamId(defaultTeam.team_id);
      } catch {
        // silently ignore
      }
    };
    loadFilters();
    return () => { isMounted = false; };
  }, []);

  // ---- Load default season ----
  useEffect(() => {
    if (!selectedTeamId) return;
    if (requestedSeasonId != null) return;
    let isMounted = true;

    const loadDefaultSeason = async () => {
      try {
        const response = await fetch(
          `/api/statsbomb/default-season?teamId=${selectedTeamId}`,
        );
        if (!response.ok) throw new Error("Failed to load default season");
        const json = await response.json();
        const data = json.data ?? json;
        if (!isMounted) return;
        if (data?.season_id) setSelectedSeasonId(data.season_id);
      } catch {
        // silently ignore
      }
    };
    loadDefaultSeason();
    return () => { isMounted = false; };
  }, [selectedTeamId, requestedSeasonId]);

  // ---- Load matches ----
  useEffect(() => {
    let isMounted = true;
    const loadMatches = async () => {
      setMatchesLoading(true);
      setMatchesError(null);
      try {
        const params = new URLSearchParams();
        if (requestedMatchId) params.set("matchId", String(requestedMatchId));
        if (selectedTeamId) params.set("teamId", String(selectedTeamId));
        if (selectedSeasonId) params.set("seasonId", String(selectedSeasonId));
        const response = await fetch(`/api/statsbomb/matches?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to load matches");
        const matchesJson = await response.json();
        const rows = (matchesJson.data ?? matchesJson) as MatchRow[];
        if (!isMounted) return;

        const options: MatchOption[] = rows.map((match) => ({
          ...match,
          label: match.match_label,
        }));

        setMatches(options);
        setMatchesLoading(false);

        const requestedOption = requestedMatchId
          ? options.find((m) => Number(m.match_id) === Number(requestedMatchId))
          : null;

        if (requestedOption) {
          setSelectedMatch(requestedOption);
          setMatchQuery(requestedOption.label);
          setRequestedMatchId(null);
        } else if (
          options.length > 0 &&
          (!selectedMatch || !options.some((m) => Number(m.match_id) === Number(selectedMatch.match_id)))
        ) {
          setSelectedMatch(options[0]);
          setMatchQuery(options[0].label);
        }
      } catch {
        if (!isMounted) return;
        setMatchesError("Unable to load matches");
        setMatchesLoading(false);
      }
    };

    loadMatches();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, selectedSeasonId, requestedMatchId]);

  // ---- Load shots ----
  useEffect(() => {
    if (!selectedMatch && !allTeamShots) return;
    let isMounted = true;

    const loadShots = async () => {
      setShotsLoading(true);
      setShotsError(null);
      setHoveredShotId(null);
      setSelectedShotId(null);

      try {
        const params = new URLSearchParams();
        if (allTeamShots) {
          params.set("allTeamShots", "true");
          params.set("teamId", String(selectedTeamId));
          if (selectedSeasonId) params.set("seasonId", String(selectedSeasonId));
        } else if (selectedMatch) {
          params.set("matchId", String(selectedMatch.match_id));
        }

        const response = await fetch(`/api/statsbomb/shots?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to load shots");
        const shotsJson = await response.json();
        const shotRows = (shotsJson.data ?? shotsJson) as Shot[];
        if (!isMounted) return;
        setShots(shotRows);
        setShotsLoading(false);
      } catch {
        if (!isMounted) return;
        setShotsError("Unable to load shots");
        setShotsLoading(false);
      }
    };

    loadShots();
    return () => { isMounted = false; };
  }, [selectedMatch, allTeamShots, selectedTeamId, selectedSeasonId]);

  // ---- Auto-select team filter when match changes ----
  useEffect(() => {
    if (!selectedMatch || allTeamShots) return;
    const selectedId = Number(selectedTeamId);
    const selectedMatchTeamId = Number(selectedMatch.selected_team_id);
    const oppositionMatchTeamId = Number(selectedMatch.opposition_team_id);
    const selectedMatchTeamName = selectedMatch.selected_team_name;
    const oppositionMatchTeamName = selectedMatch.opposition_team_name;

    const isSelectedTeamMatchTeam =
      !Number.isNaN(selectedMatchTeamId) && selectedMatchTeamId === selectedId;
    const isSelectedTeamOpposition =
      !Number.isNaN(oppositionMatchTeamId) && oppositionMatchTeamId === selectedId;

    if (isSelectedTeamMatchTeam && selectedMatchTeamName) {
      setTeamFilter(selectedMatchTeamName);
      return;
    }
    if (isSelectedTeamOpposition && oppositionMatchTeamName) {
      setTeamFilter(oppositionMatchTeamName);
      return;
    }

    const selectedTeam = teams.find((t) => t.team_id === selectedTeamId);
    if (
      selectedTeam?.team_name &&
      [selectedMatchTeamName, oppositionMatchTeamName].includes(selectedTeam.team_name)
    ) {
      setTeamFilter(selectedTeam.team_name);
      return;
    }

    if (selectedMatchTeamName) setTeamFilter(selectedMatchTeamName);
  }, [selectedMatch, selectedTeamId, teams, allTeamShots]);

  // ---- Fuzzy-filtered matches (simple case-insensitive includes) ----
  const filteredMatches = useMemo(() => {
    if (!matchQuery) return matches;
    const q = matchQuery.toLowerCase();
    return matches.filter((m) => {
      const label = m.label ?? m.match_label ?? "";
      const teamName = m.selected_team_name ?? m.team_name ?? "";
      const oppName = m.opposition_team_name ?? m.opponent_team_name ?? "";
      return (
        label.toLowerCase().includes(q) ||
        teamName.toLowerCase().includes(q) ||
        oppName.toLowerCase().includes(q)
      );
    });
  }, [matchQuery, matches]);

  // ---- Derived: shot lookup, active shot ----
  const shotLookup = useMemo(() => new Map(shots.map((s) => [s.event_id, s])), [shots]);
  const activeShot = selectedShotId ? (shotLookup.get(selectedShotId) ?? null) : null;
  const activeShotId = selectedShotId;

  // ---- Filter option lists ----
  const teamOptions = useMemo(() => {
    const set = new Set(shots.map((s) => s.team_name).filter((n): n is string => Boolean(n)));
    return ["All", ...Array.from(set).sort()];
  }, [shots]);

  const periodOptions = useMemo(() => {
    const set = new Set(shots.map((s) => s.period).filter((v): v is number => v != null));
    return ["All", ...Array.from(set).sort((a, b) => a - b).map(String)];
  }, [shots]);

  const outcomeOptions = useMemo(() => {
    const set = new Set(shots.map((s) => s.shot_outcome_name).filter((v): v is string => Boolean(v)));
    return ["All", ...Array.from(set).sort()];
  }, [shots]);

  const phaseOptions = useMemo(() => {
    const set = new Set(shots.map((s) => s.phase).filter((v): v is string => Boolean(v)));
    return ["All", ...Array.from(set).sort()];
  }, [shots]);

  const playerOptions = useMemo(() => {
    const scoped = teamFilter === "All" ? shots : shots.filter((s) => s.team_name === teamFilter);
    const set = new Set(scoped.map((s) => s.player_name).filter((v): v is string => Boolean(v)));
    return ["All", ...Array.from(set).sort()];
  }, [shots, teamFilter]);

  // Reset player filter if the selected player is no longer in the list
  useEffect(() => {
    if (playerFilter !== "All" && !playerOptions.includes(playerFilter)) {
      setPlayerFilter("All");
    }
  }, [playerFilter, playerOptions]);

  // ---- Filtered shots ----
  const baseFilteredShots = useMemo(() => {
    return shots.filter((s) => {
      if (teamFilter !== "All" && s.team_name !== teamFilter) return false;
      if (periodFilter !== "All" && String(s.period ?? "") !== periodFilter) return false;
      if (outcomeFilter !== "All" && s.shot_outcome_name !== outcomeFilter) return false;
      if (phaseFilter !== "All" && s.phase !== phaseFilter) return false;
      if (playerFilter !== "All" && s.player_name !== playerFilter) return false;
      return true;
    });
  }, [shots, teamFilter, periodFilter, outcomeFilter, phaseFilter, playerFilter]);

  const filteredShots = useMemo(() => {
    if (!excludePenalties) return baseFilteredShots;
    return baseFilteredShots.filter((s) => (s.shot_type_name ?? "").toLowerCase() !== "penalty");
  }, [baseFilteredShots, excludePenalties]);

  // Shots for table (excludes team filter)
  const chartAndTableFilteredShots = useMemo(() => {
    return shots.filter((s) => {
      if (periodFilter !== "All" && String(s.period ?? "") !== periodFilter) return false;
      if (outcomeFilter !== "All" && s.shot_outcome_name !== outcomeFilter) return false;
      if (phaseFilter !== "All" && s.phase !== phaseFilter) return false;
      if (playerFilter !== "All" && s.player_name !== playerFilter) return false;
      return true;
    });
  }, [shots, periodFilter, outcomeFilter, phaseFilter, playerFilter]);

  const chartAndTableShots = useMemo(() => {
    if (!excludePenalties) return chartAndTableFilteredShots;
    return chartAndTableFilteredShots.filter(
      (s) => (s.shot_type_name ?? "").toLowerCase() !== "penalty",
    );
  }, [chartAndTableFilteredShots, excludePenalties]);

  // ---- Summary stats ----
  const summaryStats = useMemo(() => {
    const total = baseFilteredShots.length;
    const goals = baseFilteredShots.filter((s) =>
      (s.shot_outcome_name ?? "").toLowerCase().includes("goal"),
    ).length;
    const totalXg = baseFilteredShots.reduce((sum, s) => sum + (s.shot_statsbomb_xg ?? 0), 0);
    const avgXg = total > 0 ? totalXg / total : 0;
    const avgGoalPerShot = total > 0 ? goals / total : 0;

    const nonPenaltyShots = baseFilteredShots.filter(
      (s) => (s.shot_type_name ?? "").toLowerCase() !== "penalty",
    );
    const nonPenaltyGoals = nonPenaltyShots.filter((s) =>
      (s.shot_outcome_name ?? "").toLowerCase().includes("goal"),
    ).length;
    const totalNpxg = nonPenaltyShots.reduce((sum, s) => sum + (s.shot_statsbomb_xg ?? 0), 0);
    const avgNpxg = nonPenaltyShots.length > 0 ? totalNpxg / nonPenaltyShots.length : 0;

    const totalDistance = filteredShots.reduce((sum, s) => {
      if (s.location_x === null || s.location_y === null) return sum;
      const dx = 120 - s.location_x;
      const dy = 40 - s.location_y;
      return sum + Math.hypot(dx, dy);
    }, 0);
    const avgDistance = filteredShots.length > 0 ? totalDistance / filteredShots.length : 0;

    return {
      goals,
      nonPenaltyGoals,
      nonPenaltyShots: nonPenaltyShots.length,
      avgGoalPerShot,
      totalXg,
      avgXg,
      totalNpxg,
      avgNpxg,
      avgDistance,
    };
  }, [baseFilteredShots, filteredShots]);

  // ---- Handlers ----
  const handleResetFilters = () => {
    setTeamFilter("All");
    setPeriodFilter("All");
    setOutcomeFilter("All");
    setPhaseFilter("All");
    setPlayerFilter("All");
    setExcludePenalties(false);
  };

  const handleShotSelect = useCallback(
    (eventId: number | null) => {
      setSelectedShotId(eventId);
      if (eventId != null) {
        const shot =
          chartAndTableShots.find((s) => s.event_id === eventId) ??
          shots.find((s) => s.event_id === eventId);
        if (shot?.team_name) setTeamFilter(shot.team_name);
      }
    },
    [chartAndTableShots, shots],
  );

  const handleMatchFocus = () => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }
    setMatchDropdownOpen(true);
  };

  const handleMatchBlur = () => {
    blurTimeout.current = setTimeout(() => {
      setMatchDropdownOpen(false);
    }, 150);
  };

  const backToPostMatchHref = useMemo(() => {
    const matchId = postMatchMatchId ?? selectedMatch?.match_id ?? requestedMatchId;
    if (matchId == null) return "/dashboards/post-match";
    return `/dashboards/post-match?match_id=${matchId}`;
  }, [postMatchMatchId, selectedMatch, requestedMatchId]);

  // ---- Render ----
  return (
    <div className="flex h-full flex-col gap-4">
      {showBackToPostMatch && (
        <div className="flex justify-end">
          <Button asChild size="sm" variant="outline" className="bg-background">
            <Link href={backToPostMatchHref}>Back to Post Match</Link>
          </Button>
        </div>
      )}

      <MatchFiltersBar
        teams={teams}
        seasons={seasons}
        selectedTeamId={selectedTeamId}
        selectedSeasonId={selectedSeasonId}
        matchQuery={matchQuery}
        matchDropdownOpen={matchDropdownOpen}
        matchesLoading={matchesLoading}
        matchesError={matchesError}
        filteredMatches={filteredMatches}
        allTeamShots={allTeamShots}
        useGoalMap={useGoalMap}
        onTeamChange={setSelectedTeamId}
        onSeasonChange={setSelectedSeasonId}
        onMatchQueryChange={(value) => {
          setMatchQuery(value);
          setMatchDropdownOpen(true);
        }}
        onMatchSelect={(match) => {
          setSelectedMatch(match);
          setMatchQuery(match.label);
          setMatchDropdownOpen(false);
        }}
        onMatchFocus={handleMatchFocus}
        onMatchBlur={handleMatchBlur}
        onAllTeamShotsChange={setAllTeamShots}
        onGoalMapChange={setUseGoalMap}
      />

      <ShotFiltersBar
        teamOptions={teamOptions}
        periodOptions={periodOptions}
        outcomeOptions={outcomeOptions}
        phaseOptions={phaseOptions}
        playerOptions={playerOptions}
        teamFilter={teamFilter}
        periodFilter={periodFilter}
        outcomeFilter={outcomeFilter}
        phaseFilter={phaseFilter}
        playerFilter={playerFilter}
        excludePenalties={excludePenalties}
        allTeamShots={allTeamShots}
        onTeamFilterChange={setTeamFilter}
        onPeriodFilterChange={setPeriodFilter}
        onOutcomeFilterChange={setOutcomeFilter}
        onPhaseFilterChange={setPhaseFilter}
        onPlayerFilterChange={setPlayerFilter}
        onExcludePenaltiesChange={setExcludePenalties}
        onReset={handleResetFilters}
      />

      <StatsBar stats={summaryStats} shotsCount={baseFilteredShots.length} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {shotsLoading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : shotsError ? (
            <div className="rounded-xl border bg-card p-4 text-sm text-destructive">
              {shotsError}
            </div>
          ) : useGoalMap ? (
            <GoalMap
              shots={filteredShots}
              hoveredShotId={hoveredShotId}
              selectedShotId={selectedShotId}
              activeShotId={activeShotId}
              pitchScale={pitchScale}
              onHover={setHoveredShotId}
              onSelect={setSelectedShotId}
            />
          ) : (
            <ShotPitchMap
              shots={filteredShots}
              hoveredShotId={hoveredShotId}
              selectedShotId={selectedShotId}
              activeShotId={activeShotId}
              onHover={setHoveredShotId}
              onSelect={setSelectedShotId}
              onScaleChange={setPitchScale}
            />
          )}

          {/* Shots Table -- only for single-match view */}
          {!allTeamShots && selectedMatch && !shotsLoading && !shotsError && (
            <ShotsTable
              shots={chartAndTableShots}
              selectedMatch={selectedMatch}
              selectedTeamId={selectedTeamId}
              selectedTeamName={
                teams.find((t) => t.team_id === selectedTeamId)?.team_name ?? null
              }
              onShotClick={handleShotSelect}
              hoveredShotId={hoveredShotId}
              selectedShotId={selectedShotId}
            />
          )}
        </div>

        <div className="sticky top-4 self-start">
          <DetailsPane
            activeShot={activeShot}
            allTeamShots={allTeamShots}
            pitchScale={pitchScale}
            matchId={selectedMatch?.match_id ?? null}
          />
        </div>
      </div>
    </div>
  );
}

export default ShotMapDashboard;
