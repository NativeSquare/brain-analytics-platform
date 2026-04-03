"use client";

import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import SeasonFiltersBar from "./SeasonFiltersBar";
import PointsChart from "./PointsChart";
import SummaryCards from "./SummaryCards";
import PossessionRadars from "./PossessionRadars";
import SeasonInsightsPanels from "./SeasonInsightsPanels";
import PhaseStrengthsAndProjection from "./PhaseStrengthsAndProjection";
import type {
  SeasonPointsData,
  IncomingSeasonPointsData,
  IncomingLeagueTeamSeasonAveragesRow,
  TeamPhaseAverages,
  PossessionMetrics,
  ComparisonMode,
  TeamOption,
  SeasonOption,
} from "./types";
import { toNumber } from "./utils";

function normalizePointsData(
  data: IncomingSeasonPointsData[],
): SeasonPointsData[] {
  let runningXPoints = 0;
  return data.map((row) => {
    const xPointsValue = toNumber(row.xPoints ?? row.x_points ?? 0);
    runningXPoints += xPointsValue;
    return {
      match_week: row.match_week,
      cumulative_points: toNumber(row.cumulative_points),
      cumulative_xPoints: runningXPoints,
      match_id: row.match_id,
      match_date: row.match_date,
      venue: row.venue ?? null,
      goals_scored: row.goals_scored,
      goals_conceded: row.goals_conceded,
      points: row.points,
      xPoints: xPointsValue,
      opponent_team_id: row.opponent_team_id,
      opponent_image_url: row.opponent_image_url,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function SeasonOverview({ slug }: { slug: string }) {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number>(234);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>("xpoints");
  const [comparisonSeasonId, setComparisonSeasonId] = useState<number | null>(
    null,
  );
  const [pointsData, setPointsData] = useState<SeasonPointsData[]>([]);
  const [comparisonPointsData, setComparisonPointsData] = useState<
    SeasonPointsData[]
  >([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [filtersLoading, setFiltersLoading] = useState(true);

  const [possessionData, setPossessionData] = useState<{
    buildUp: PossessionMetrics | null;
    transitions: PossessionMetrics | null;
  } | null>(null);
  const [possessionLoading, setPossessionLoading] = useState(false);
  const [teamPhaseAverages, setTeamPhaseAverages] =
    useState<TeamPhaseAverages | null>(null);

  // Load filters (teams + seasons)
  useEffect(() => {
    let isMounted = true;
    const loadFilters = async () => {
      try {
        const [teamsResponse, seasonsResponse] = await Promise.all([
          fetch("/api/statsbomb/teams?competitionId=84"),
          fetch("/api/statsbomb/seasons"),
        ]);

        if (!teamsResponse.ok || !seasonsResponse.ok)
          throw new Error("Failed to load filters");

        const teamsJson = (await teamsResponse.json()) as {
          data: TeamOption[];
        };
        const seasonsJson = (await seasonsResponse.json()) as {
          data: SeasonOption[];
        };

        if (!isMounted) return;
        setTeams(teamsJson.data ?? teamsJson);
        setSeasons(seasonsJson.data ?? seasonsJson);

        const teamsArr = teamsJson.data ?? teamsJson;
        const defaultTeam = (teamsArr as TeamOption[]).find(
          (team) => team.team_id === 234,
        );
        if (defaultTeam) {
          setSelectedTeamId(defaultTeam.team_id);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error loading filters:", error);
      } finally {
        if (isMounted) setFiltersLoading(false);
      }
    };

    loadFilters();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load default season when team changes
  useEffect(() => {
    if (!selectedTeamId) return;
    let isMounted = true;

    const loadDefaultSeason = async () => {
      try {
        const response = await fetch(
          `/api/statsbomb/default-season?teamId=${selectedTeamId}`,
        );
        if (!response.ok) return;
        const json = (await response.json()) as {
          data?: { season_id: number } | null;
          season_id?: number;
        };
        if (!isMounted) return;
        const seasonId =
          (json.data as { season_id: number } | null)?.season_id ??
          json.season_id;
        if (seasonId) {
          setSelectedSeasonId(seasonId);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error loading default season:", error);
      }
    };

    loadDefaultSeason();
    return () => {
      isMounted = false;
    };
  }, [selectedTeamId]);

  // Load main data when team + season change
  useEffect(() => {
    if (!selectedTeamId || !selectedSeasonId) {
      setPointsData([]);
      setPossessionData(null);
      setTeamPhaseAverages(null);
      return;
    }

    let isMounted = true;
    setPointsLoading(true);
    setPointsError(null);
    setPossessionLoading(true);

    const loadData = async () => {
      try {
        const [pointsResponse, possessionResponse, leagueAveragesResponse] =
          await Promise.all([
            fetch(
              `/api/statsbomb/season-points?teamId=${selectedTeamId}&seasonId=${selectedSeasonId}&competitionId=84`,
              { cache: "no-store" },
            ),
            fetch(
              `/api/statsbomb/season-possession-details?teamId=${selectedTeamId}&seasonId=${selectedSeasonId}&competitionId=84`,
              { cache: "no-store" },
            ),
            fetch(
              `/api/statsbomb/league-team-season-averages?teamId=${selectedTeamId}&seasonId=${selectedSeasonId}`,
              { cache: "no-store" },
            ),
          ]);

        if (pointsResponse.ok) {
          const json = (await pointsResponse.json()) as {
            data?: IncomingSeasonPointsData[];
          };
          const rows = json.data ?? (json as unknown as IncomingSeasonPointsData[]);
          if (isMounted) setPointsData(normalizePointsData(rows));
        } else {
          throw new Error("Failed to load season points");
        }

        if (possessionResponse.ok) {
          const json = (await possessionResponse.json()) as {
            data?: {
              buildUp: PossessionMetrics | null;
              transitions: PossessionMetrics | null;
            };
            buildUp?: PossessionMetrics | null;
            transitions?: PossessionMetrics | null;
          };
          const possession = json.data ?? {
            buildUp: json.buildUp ?? null,
            transitions: json.transitions ?? null,
          };
          if (isMounted) setPossessionData(possession);
        } else {
          console.error("Failed to load possession details");
        }

        if (leagueAveragesResponse.ok) {
          const json =
            (await leagueAveragesResponse.json()) as {
              data?: IncomingLeagueTeamSeasonAveragesRow[];
            };
          const averagesArr =
            json.data ??
            (json as unknown as IncomingLeagueTeamSeasonAveragesRow[]);
          const selectedTeam = averagesArr.find(
            (row) => toNumber(row.team_id) === selectedTeamId,
          );

          if (isMounted) {
            if (!selectedTeam) {
              setTeamPhaseAverages(null);
            } else {
              setTeamPhaseAverages({
                build_up_goals_for: toNumber(selectedTeam.build_up_goals_for),
                build_up_goals_against: toNumber(
                  selectedTeam.build_up_goals_against,
                ),
                build_up_xt_for: toNumber(selectedTeam.build_up_xt_for),
                build_up_xt_against: toNumber(
                  selectedTeam.build_up_xt_against,
                ),
                build_up_xg_for: toNumber(selectedTeam.build_up_xg_for),
                build_up_xg_against: toNumber(
                  selectedTeam.build_up_xg_against,
                ),
                transition_goals_for: toNumber(
                  selectedTeam.transition_goals_for,
                ),
                transition_goals_against: toNumber(
                  selectedTeam.transition_goals_against,
                ),
                transition_xt_for: toNumber(selectedTeam.transition_xt_for),
                transition_xt_against: toNumber(
                  selectedTeam.transition_xt_against,
                ),
                transition_xg_for: toNumber(selectedTeam.transition_xg_for),
                transition_xg_against: toNumber(
                  selectedTeam.transition_xg_against,
                ),
                set_piece_goals_for: toNumber(
                  selectedTeam.set_piece_goals_for,
                ),
                set_piece_goals_against: toNumber(
                  selectedTeam.set_piece_goals_against,
                ),
                set_piece_xt_for: toNumber(selectedTeam.set_piece_xt_for),
                set_piece_xt_against: toNumber(
                  selectedTeam.set_piece_xt_against,
                ),
                set_piece_xg_for: toNumber(selectedTeam.set_piece_xg_for),
                set_piece_xg_against: toNumber(
                  selectedTeam.set_piece_xg_against,
                ),
              });
            }
          }
        } else {
          console.error("Failed to load league team season averages");
          if (isMounted) setTeamPhaseAverages(null);
        }
      } catch (error) {
        if (!isMounted) return;
        setPointsError(
          error instanceof Error ? error.message : "Failed to load season data",
        );
        console.error("Error loading season data:", error);
      } finally {
        if (isMounted) {
          setPointsLoading(false);
          setPossessionLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedTeamId, selectedSeasonId]);

  // Reset comparison when main filters change
  useEffect(() => {
    setComparisonMode("xpoints");
    setComparisonSeasonId(null);
  }, [selectedTeamId, selectedSeasonId]);

  // Auto-select most recent season for comparison mode
  useEffect(() => {
    if (
      comparisonMode === "season" &&
      !comparisonSeasonId &&
      selectedSeasonId &&
      seasons.length > 0
    ) {
      const available = seasons.filter(
        (s) => s.season_id !== selectedSeasonId,
      );
      if (available.length > 0) {
        setComparisonSeasonId(available[0].season_id);
      }
    }
  }, [comparisonMode, selectedSeasonId, seasons, comparisonSeasonId]);

  // Fetch comparison season data
  useEffect(() => {
    if (
      comparisonMode !== "season" ||
      !selectedTeamId ||
      !comparisonSeasonId
    ) {
      setComparisonPointsData([]);
      return;
    }

    let isMounted = true;

    const loadComparisonData = async () => {
      try {
        const response = await fetch(
          `/api/statsbomb/season-points?teamId=${selectedTeamId}&seasonId=${comparisonSeasonId}&competitionId=84`,
          { cache: "no-store" },
        );

        if (response.ok) {
          const json = (await response.json()) as {
            data?: IncomingSeasonPointsData[];
          };
          const rows = json.data ?? (json as unknown as IncomingSeasonPointsData[]);
          if (isMounted) setComparisonPointsData(normalizePointsData(rows));
        } else {
          console.error("Failed to load comparison season points");
          if (isMounted) setComparisonPointsData([]);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error loading comparison season data:", error);
        if (isMounted) setComparisonPointsData([]);
      }
    };

    loadComparisonData();
    return () => {
      isMounted = false;
    };
  }, [comparisonMode, selectedTeamId, comparisonSeasonId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarRange className="size-6 text-primary" />
        <h1 className="text-2xl font-semibold">Season Overview</h1>
      </div>

      {filtersLoading ? (
        <div className="w-full rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-row gap-4">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
        </div>
      ) : (
        <SeasonFiltersBar
          teams={teams}
          seasons={seasons}
          selectedTeamId={selectedTeamId}
          selectedSeasonId={selectedSeasonId}
          onTeamChange={setSelectedTeamId}
          onSeasonChange={setSelectedSeasonId}
        />
      )}

      {pointsLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="rounded-xl border bg-card p-4">
                <Skeleton className="mb-2 h-4 w-2/3" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-card p-6">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      ) : pointsError ? (
        <div className="rounded-xl border bg-card p-6 text-center text-destructive">
          <p>{pointsError}</p>
          <button
            type="button"
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setPointsError(null);
              setPointsLoading(true);
              // Trigger re-fetch by toggling season
              const currentSeason = selectedSeasonId;
              setSelectedSeasonId(null);
              setTimeout(() => setSelectedSeasonId(currentSeason), 0);
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <SummaryCards data={pointsData} />
          <SeasonInsightsPanels data={pointsData} />
          <PointsChart
            data={pointsData}
            comparisonMode={comparisonMode}
            comparisonData={comparisonPointsData}
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            comparisonSeasonId={comparisonSeasonId}
            onComparisonModeChange={(mode) => {
              setComparisonMode(mode);
              if (mode !== "season") {
                setComparisonSeasonId(null);
              }
            }}
            onComparisonSeasonChange={setComparisonSeasonId}
          />
          <PhaseStrengthsAndProjection
            pointsData={pointsData}
            phaseAverages={teamPhaseAverages}
          />
          <PossessionRadars data={possessionData} loading={possessionLoading} />
        </div>
      )}
    </div>
  );
}
