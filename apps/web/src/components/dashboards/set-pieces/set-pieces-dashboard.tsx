"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import CornerTechniqueBar from "./corner-technique-bar";
import FirstContactsBarChart from "./first-contacts-bar-chart";
import OutcomeBarChart from "./outcome-bar-chart";
import SetPieceDetailsPane from "./set-piece-details-pane";
import SetPieceFiltersBar from "./set-piece-filters-bar";
import SetPieceMatchFiltersBar from "./set-piece-match-filters-bar";
import SetPieceStatsBar from "./set-piece-stats-bar";
import SetPiecesGoalMap from "./set-pieces-goal-map";
import SetPiecesPitchMap from "./set-pieces-pitch-map";
import TakersBarChart from "./takers-bar-chart";
import { ZONES, sbToSvg, assignToZone } from "./set-piece-zones";
import type {
  MatchOption,
  MatchRow,
  SetPiece,
  SetPieceMode,
  SetPieceSummaryStats,
  PitchViewMode,
  ZoneStats,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SetPiecesDashboard({ slug }: { slug: string }) {
  // ---------- match filter state ----------
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [matchQuery, setMatchQuery] = useState("");
  const [matchDropdownOpen, setMatchDropdownOpen] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchOption | null>(null);
  const [teams, setTeams] = useState<
    Array<{ team_id: number; team_name: string }>
  >([]);
  const [seasons, setSeasons] = useState<
    Array<{ season_id: number; season_name: string }>
  >([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number>(234);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [allSeasonSetPieces, setAllSeasonSetPieces] = useState(false);

  // ---------- data state ----------
  const [rawData, setRawData] = useState<SetPiece[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // ---------- interaction state ----------
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(
    null,
  );

  // ---------- mode & view state ----------
  const [mode, setMode] = useState<SetPieceMode>("indirect");
  const [pitchView, setPitchView] = useState<PitchViewMode>("individual");

  // ---------- filter state ----------
  const [attackDefenseFilter, setAttackDefenseFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [zoneFilter, setZoneFilter] = useState("All");
  const [sideFilter, setSideFilter] = useState("All");
  const [techniqueFilter, setTechniqueFilter] = useState("All");
  const [targetFilter, setTargetFilter] = useState("All");
  const [takerFilter, setTakerFilter] = useState("All");

  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeout.current) {
        clearTimeout(blurTimeout.current);
      }
    };
  }, []);

  // ---- Load teams + seasons ----
  useEffect(() => {
    let isMounted = true;
    const loadFilters = async () => {
      try {
        const [teamsResponse, seasonsResponse] = await Promise.all([
          fetch("/api/statsbomb/teams"),
          fetch("/api/statsbomb/seasons"),
        ]);
        if (!teamsResponse.ok || !seasonsResponse.ok)
          throw new Error("Failed to load filters");
        const teamsJson = await teamsResponse.json();
        const seasonsJson = await seasonsResponse.json();
        if (!isMounted) return;
        const teamsData = teamsJson.data ?? teamsJson;
        const seasonsData = seasonsJson.data ?? seasonsJson;
        setTeams(teamsData);
        setSeasons(seasonsData);

        const defaultTeam = teamsData.find(
          (t: { team_id: number }) => t.team_id === 234,
        );
        if (defaultTeam) setSelectedTeamId(defaultTeam.team_id);
      } catch {
        // silently ignore
      }
    };
    loadFilters();
    return () => {
      isMounted = false;
    };
  }, []);

  // ---- Load default season ----
  useEffect(() => {
    if (!selectedTeamId) return;
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
    return () => {
      isMounted = false;
    };
  }, [selectedTeamId]);

  // ---- Load matches ----
  useEffect(() => {
    let isMounted = true;
    const loadMatches = async () => {
      setMatchesLoading(true);
      setMatchesError(null);
      try {
        const params = new URLSearchParams();
        if (selectedTeamId) params.set("teamId", String(selectedTeamId));
        if (selectedSeasonId) params.set("seasonId", String(selectedSeasonId));
        const response = await fetch(
          `/api/statsbomb/matches?${params.toString()}`,
        );
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

        if (
          options.length > 0 &&
          (!selectedMatch ||
            !options.some(
              (m) => Number(m.match_id) === Number(selectedMatch.match_id),
            ))
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
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, selectedSeasonId]);

  // ---- Load set pieces data ----
  useEffect(() => {
    if (!selectedMatch && !allSeasonSetPieces) return;
    let isMounted = true;

    const loadData = async () => {
      setDataLoading(true);
      setDataError(null);
      setHoveredId(null);
      setSelectedId(null);
      setHighlightedPlayer(null);

      try {
        const params = new URLSearchParams();
        if (allSeasonSetPieces) {
          params.set("allSeasonSetPieces", "true");
          params.set("teamId", String(selectedTeamId));
          if (selectedSeasonId)
            params.set("seasonId", String(selectedSeasonId));
        } else if (selectedMatch) {
          params.set("matchId", String(selectedMatch.match_id));
        }

        const response = await fetch(
          `/api/statsbomb/set-pieces?${params.toString()}`,
        );
        if (!response.ok) throw new Error("Failed to load set pieces");
        const json = await response.json();
        const rows = (json.data ?? json) as SetPiece[];
        if (!isMounted) return;
        setRawData(rows);
        setDataLoading(false);
      } catch {
        if (!isMounted) return;
        setDataError("Unable to load set pieces");
        setDataLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedMatch, allSeasonSetPieces, selectedTeamId, selectedSeasonId]);

  // ---- Mode-filtered data ----
  const modeData = useMemo(() => {
    if (mode === "direct") {
      return rawData.filter((sp) => sp.is_direct_sp === true);
    }
    return rawData.filter((sp) => sp.is_direct_sp !== true);
  }, [rawData, mode]);

  // ---- Fuzzy-filtered matches ----
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

  // ---- Filter option lists ----
  const buildOptions = useCallback(
    (getter: (sp: SetPiece) => string | null | undefined) => {
      const set = new Set(
        modeData.map(getter).filter((v): v is string => Boolean(v)),
      );
      return ["All", ...Array.from(set).sort()];
    },
    [modeData],
  );

  const attackDefenseOptions = useMemo(() => {
    // Simple attack/defense based on team_id matching selectedTeamId
    return ["All", "Attack", "Defense"];
  }, []);

  const periodOptions = useMemo(() => {
    const set = new Set(
      modeData
        .map((sp) => sp.period)
        .filter((v): v is number => v != null),
    );
    return ["All", ...Array.from(set).sort((a, b) => a - b).map(String)];
  }, [modeData]);

  const typeOptions = useMemo(
    () => buildOptions((sp) => sp.sp_type),
    [buildOptions],
  );
  const zoneOptions = useMemo(
    () => buildOptions((sp) => sp.sp_zone),
    [buildOptions],
  );
  const sideOptions = useMemo(
    () => buildOptions((sp) => sp.side),
    [buildOptions],
  );
  const techniqueOptions = useMemo(
    () => buildOptions((sp) => sp.technique),
    [buildOptions],
  );
  const targetOptions = useMemo(
    () => buildOptions((sp) => sp.target),
    [buildOptions],
  );
  const takerOptions = useMemo(
    () => buildOptions((sp) => sp.taker),
    [buildOptions],
  );

  // ---- Filtered data ----
  const filteredData = useMemo(() => {
    return modeData.filter((sp) => {
      if (
        attackDefenseFilter !== "All" &&
        attackDefenseFilter === "Attack" &&
        sp.team_id !== selectedTeamId
      )
        return false;
      if (
        attackDefenseFilter !== "All" &&
        attackDefenseFilter === "Defense" &&
        sp.team_id === selectedTeamId
      )
        return false;
      if (
        periodFilter !== "All" &&
        String(sp.period ?? "") !== periodFilter
      )
        return false;
      if (typeFilter !== "All" && sp.sp_type !== typeFilter) return false;
      if (zoneFilter !== "All" && sp.sp_zone !== zoneFilter) return false;
      if (sideFilter !== "All" && sp.side !== sideFilter) return false;
      if (
        techniqueFilter !== "All" &&
        sp.technique !== techniqueFilter
      )
        return false;
      if (targetFilter !== "All" && sp.target !== targetFilter) return false;
      if (takerFilter !== "All" && sp.taker !== takerFilter) return false;
      return true;
    });
  }, [
    modeData,
    attackDefenseFilter,
    periodFilter,
    typeFilter,
    zoneFilter,
    sideFilter,
    techniqueFilter,
    targetFilter,
    takerFilter,
    selectedTeamId,
  ]);

  // ---- Summary stats ----
  const summaryStats: SetPieceSummaryStats = useMemo(() => {
    const total = filteredData.length;
    const goals = filteredData.reduce(
      (sum, sp) => sum + (sp.goal ?? 0),
      0,
    );
    const totalXg = filteredData.reduce(
      (sum, sp) => sum + (sp.xg ?? 0),
      0,
    );
    const firstContactWon = filteredData.filter(
      (sp) => sp.first_contact_won,
    ).length;
    const firstPhaseShots = filteredData.filter(
      (sp) => sp.first_phase_first_contact_shot,
    ).length;
    const firstPhaseGoals = filteredData.filter(
      (sp) => sp.first_phase_first_contact_goal,
    ).length;
    const shortCount = filteredData.filter((sp) => sp.is_short).length;
    const shortPct = total > 0 ? (shortCount / total) * 100 : 0;
    const goalsPerSp = total > 0 ? goals / total : 0;
    const xgPerSp = total > 0 ? totalXg / total : 0;

    return {
      total,
      goals,
      totalXg,
      firstContactWon,
      firstPhaseShots,
      firstPhaseGoals,
      shortPct,
      goalsPerSp,
      xgPerSp,
    };
  }, [filteredData]);

  // ---- Zone stats (for zone view) ----
  const zoneStats: ZoneStats[] = useMemo(() => {
    if (mode !== "indirect" || pitchView !== "zones") return [];

    const zoneMap = new Map<
      string,
      { count: number; totalXg: number; goals: number }
    >();

    for (const sp of filteredData) {
      const contactX = sp.first_phase_first_contact_x;
      const contactY = sp.first_phase_first_contact_y;
      if (contactX == null || contactY == null) continue;

      const svg = sbToSvg(contactX, contactY);
      const zone = assignToZone(svg.x, svg.y);
      if (!zone) continue;

      const existing = zoneMap.get(zone.id) ?? {
        count: 0,
        totalXg: 0,
        goals: 0,
      };
      existing.count += 1;
      existing.totalXg += sp.first_phase_first_contact_xg ?? 0;
      existing.goals += sp.first_phase_first_contact_goal ? 1 : 0;
      zoneMap.set(zone.id, existing);
    }

    return ZONES.filter((z) => zoneMap.has(z.id)).map((zone) => {
      const stats = zoneMap.get(zone.id)!;
      return {
        zoneId: zone.id,
        label: zone.label,
        count: stats.count,
        avgXg: stats.count > 0 ? stats.totalXg / stats.count : 0,
        totalXg: stats.totalXg,
        goals: stats.goals,
        polygon: zone.svgPolygon,
        centroid: zone.centroid,
      };
    });
  }, [filteredData, mode, pitchView]);

  const maxZoneCount = useMemo(
    () => zoneStats.reduce((mx, z) => Math.max(mx, z.count), 0),
    [zoneStats],
  );

  // ---- Active item ----
  const itemLookup = useMemo(
    () => new Map(filteredData.map((sp) => [sp.start_event_id, sp])),
    [filteredData],
  );
  const activeItem = selectedId ? (itemLookup.get(selectedId) ?? null) : null;

  // ---- Handlers ----
  const handleResetFilters = () => {
    setAttackDefenseFilter("All");
    setPeriodFilter("All");
    setTypeFilter("All");
    setZoneFilter("All");
    setSideFilter("All");
    setTechniqueFilter("All");
    setTargetFilter("All");
    setTakerFilter("All");
    setHighlightedPlayer(null);
  };

  const handleModeChange = (newMode: SetPieceMode) => {
    setMode(newMode);
    setSelectedId(null);
    setHoveredId(null);
    setHighlightedPlayer(null);
    setPitchView("individual");
  };

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

  const handleBarChartPlayerClick = (player: string | null) => {
    setHighlightedPlayer(player);
    setSelectedId(null);
  };

  // ---- Render ----
  return (
    <div className="flex h-full flex-col gap-4">
      <SetPieceMatchFiltersBar
        teams={teams}
        seasons={seasons}
        selectedTeamId={selectedTeamId}
        selectedSeasonId={selectedSeasonId}
        matchQuery={matchQuery}
        matchDropdownOpen={matchDropdownOpen}
        matchesLoading={matchesLoading}
        matchesError={matchesError}
        filteredMatches={filteredMatches}
        allSeasonSetPieces={allSeasonSetPieces}
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
        onAllSeasonSetPiecesChange={setAllSeasonSetPieces}
      />

      <SetPieceFiltersBar
        mode={mode}
        pitchView={pitchView}
        attackDefenseFilter={attackDefenseFilter}
        periodFilter={periodFilter}
        typeFilter={typeFilter}
        zoneFilter={zoneFilter}
        sideFilter={sideFilter}
        techniqueFilter={techniqueFilter}
        targetFilter={targetFilter}
        takerFilter={takerFilter}
        attackDefenseOptions={attackDefenseOptions}
        periodOptions={periodOptions}
        typeOptions={typeOptions}
        zoneOptions={zoneOptions}
        sideOptions={sideOptions}
        techniqueOptions={techniqueOptions}
        targetOptions={targetOptions}
        takerOptions={takerOptions}
        onModeChange={handleModeChange}
        onPitchViewChange={setPitchView}
        onAttackDefenseChange={setAttackDefenseFilter}
        onPeriodChange={setPeriodFilter}
        onTypeChange={setTypeFilter}
        onZoneChange={setZoneFilter}
        onSideChange={setSideFilter}
        onTechniqueChange={setTechniqueFilter}
        onTargetChange={setTargetFilter}
        onTakerChange={setTakerFilter}
        onReset={handleResetFilters}
      />

      <SetPieceStatsBar stats={summaryStats} mode={mode} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {dataLoading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : dataError ? (
            <div className="rounded-xl border bg-card p-4 text-sm text-destructive">
              {dataError}
            </div>
          ) : (
            <>
              <SetPiecesPitchMap
                items={filteredData}
                mode={mode}
                pitchView={pitchView}
                hoveredId={hoveredId}
                selectedId={selectedId}
                highlightedPlayer={highlightedPlayer}
                zoneStats={zoneStats}
                maxZoneCount={maxZoneCount}
                onHover={setHoveredId}
                onSelect={setSelectedId}
              />

              {mode === "direct" && (
                <SetPiecesGoalMap
                  items={filteredData}
                  hoveredId={hoveredId}
                  selectedId={selectedId}
                  pitchScale={1}
                  onHover={setHoveredId}
                  onSelect={setSelectedId}
                />
              )}
            </>
          )}

          {/* Bar charts */}
          {!dataLoading && !dataError && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TakersBarChart
                items={filteredData}
                onTakerClick={handleBarChartPlayerClick}
                highlightedPlayer={highlightedPlayer}
              />
              <CornerTechniqueBar items={filteredData} />

              {mode === "indirect" && (
                <FirstContactsBarChart
                  items={filteredData}
                  onPlayerClick={handleBarChartPlayerClick}
                  highlightedPlayer={highlightedPlayer}
                />
              )}

              {mode === "direct" && <OutcomeBarChart items={filteredData} />}
            </div>
          )}
        </div>

        <div className="sticky top-4 self-start">
          <SetPieceDetailsPane
            activeItem={activeItem}
            mode={mode}
            matchId={selectedMatch?.match_id ?? null}
          />
        </div>
      </div>
    </div>
  );
}

export default SetPiecesDashboard;
