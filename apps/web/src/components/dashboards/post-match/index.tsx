"use client";

import { useMemo, useState } from "react";
import { Swords } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

import MatchFilterBar from "./MatchFilterBar";
import MatchStats from "./MatchStats";
import MomentumGraph from "./MomentumGraph";
import XgRaceChart from "./XgRaceChart";
import WinProbabilityBar from "./WinProbabilityBar";
import LineupTable from "./LineupTable";
import SubstitutesTable from "./SubstitutesTable";
import PostMatchPossessionDetails from "./PostMatchPossessionDetails";
import {
  useTeams,
  useSeasons,
  useDefaultSeason,
  useMatches,
  useMatchStats,
  useLineups,
  useWinProbabilities,
  useEvents,
} from "./hooks";
import type {
  MatchOption,
  PlayerData,
  EventDetail,
  LineupPlayerRow,
} from "./types";

// ---------- Helpers ----------

const parseEventDetails = (value: unknown): EventDetail[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value as EventDetail[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as EventDetail[]) : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const mapLineupPlayer = (p: LineupPlayerRow, matchId: number): PlayerData => ({
  MatchId: p.match_id ?? matchId,
  Pos: p.pos,
  Player: p.player,
  Mins: p.mins,
  Goals: p.goals?.length ? p.goals : undefined,
  GoalEvents: parseEventDetails(p.goal_events),
  Assists: p.assists?.length ? p.assists : undefined,
  AssistEvents: parseEventDetails(p.assist_events),
  OwnGoals: p.own_goals?.length ? p.own_goals : undefined,
  OwnGoalEvents: parseEventDetails(p.own_goal_events),
  YellowCards: p.yellow_cards?.length ? p.yellow_cards : undefined,
  YellowCardEvents: parseEventDetails(p.yellow_card_events),
  RedCards: p.red_cards?.length ? p.red_cards : undefined,
  RedCardEvents: parseEventDetails(p.red_card_events),
  SubOffTime: p.sub_off_time ?? undefined,
  SubOnTime: p.sub_on_time ?? undefined,
});

const calculateFormation = (starters: PlayerData[]): string => {
  if (!starters || starters.length === 0) return "";
  const defenders = ["LB", "LWB", "LCB", "CB", "RCB", "RB", "RWB"];
  const midfielders = ["LDM", "CDM", "RDM", "LCM", "CM", "RCM", "LM", "RM", "LAM", "CAM", "RAM"];
  const forwards = ["LW", "RW", "SS", "CF", "ST", "LCF", "RCF"];
  const defCount = starters.filter((s) => defenders.includes(s.Pos)).length;
  const midCount = starters.filter((s) => midfielders.includes(s.Pos)).length;
  const fwdCount = starters.filter((s) => forwards.includes(s.Pos)).length;
  if (defCount > 0 && midCount > 0 && fwdCount > 0) return `${defCount}-${midCount}-${fwdCount}`;
  if (defCount > 0 && midCount > 0) return `${defCount}-${midCount}`;
  if (defCount > 0) return `${defCount}`;
  return "";
};

// ---------- Main Component ----------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function PostMatchDashboard({ slug }: { slug: string }) {
  // ---- Filter state ----
  // User-selected values. null means "use the default".
  const [selectedTeamId, setSelectedTeamId] = useState<number>(234);
  const [userSeasonId, setUserSeasonId] = useState<number | null>(null);
  const [userMatchId, setUserMatchId] = useState<number | null>(null);

  // ---- Data hooks ----
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: seasons, isLoading: seasonsLoading } = useSeasons();
  const { data: defaultSeason } = useDefaultSeason(selectedTeamId);

  // Derive effective season: user override, or default from API
  const selectedSeasonId = userSeasonId ?? defaultSeason?.season_id ?? null;

  const { data: matchRows, isLoading: matchesLoading } = useMatches(selectedTeamId, selectedSeasonId);

  // Derive effective match: user override, or first available match
  const selectedMatchId = userMatchId ?? matchRows?.[0]?.match_id ?? null;

  const { data: matchStatsData, isLoading: matchStatsLoading } = useMatchStats(selectedMatchId);
  const { data: lineupData, isLoading: lineupsLoading } = useLineups(selectedMatchId);
  const { data: winProbData, isLoading: winProbLoading } = useWinProbabilities(selectedMatchId);
  const { data: eventsData, isLoading: eventsLoading } = useEvents(selectedMatchId);

  // ---- Build match options ----
  const matchOptions: MatchOption[] = useMemo(
    () => (matchRows ?? []).map((m) => ({ ...m, label: m.match_label })),
    [matchRows],
  );

  // ---- Derive selected match ----
  const selectedMatch = useMemo(
    () => matchOptions.find((m) => m.match_id === selectedMatchId) ?? null,
    [matchOptions, selectedMatchId],
  );

  // ---- Derive team names ----
  const selectedTeamName = selectedMatch?.team_name ?? "";
  const oppositionTeamName = selectedMatch?.opponent_team_name ?? "";

  // ---- Process lineup data ----
  const { selectedTeamLineup, oppositionTeamLineup, selectedFormation, oppositionFormation } =
    useMemo(() => {
      if (!lineupData || !selectedMatch) {
        return {
          selectedTeamLineup: { starters: [] as PlayerData[], subs: [] as PlayerData[] },
          oppositionTeamLineup: { starters: [] as PlayerData[], subs: [] as PlayerData[] },
          selectedFormation: "",
          oppositionFormation: "",
        };
      }

      const matchId = selectedMatch.match_id;

      const selectedStarters = lineupData
        .filter((p) => p.team_name === selectedTeamName && p.is_starter)
        .map((p) => mapLineupPlayer(p, matchId));

      const selectedSubs = lineupData
        .filter((p) => p.team_name === selectedTeamName && !p.is_starter)
        .map((p) => mapLineupPlayer(p, matchId));

      const oppStarters = lineupData
        .filter((p) => p.team_name === oppositionTeamName && p.is_starter)
        .map((p) => mapLineupPlayer(p, matchId));

      const oppSubs = lineupData
        .filter((p) => p.team_name === oppositionTeamName && !p.is_starter)
        .map((p) => mapLineupPlayer(p, matchId));

      return {
        selectedTeamLineup: { starters: selectedStarters, subs: selectedSubs },
        oppositionTeamLineup: { starters: oppStarters, subs: oppSubs },
        selectedFormation: calculateFormation(selectedStarters),
        oppositionFormation: calculateFormation(oppStarters),
      };
    }, [lineupData, selectedMatch, selectedTeamName, oppositionTeamName]);

  // ---- Match header meta ----
  const headerMetaRow = useMemo(() => {
    if (!selectedMatch) return null;
    const competitionSeason = [selectedMatch.competition_name, selectedMatch.season_name]
      .filter(Boolean)
      .join(" ");
    const competitionSeasonWithMatchweek =
      selectedMatch.match_week != null
        ? `${competitionSeason || "Competition / Season"}, Matchweek ${selectedMatch.match_week}`
        : competitionSeason || "Competition / Season";

    return {
      matchLabel: selectedMatch.match_label || "\u2014",
      competitionSeason: competitionSeasonWithMatchweek,
      stadium: selectedMatch.stadium_name || "\u2014",
      referee: selectedMatch.referee_name ? `Referee: ${selectedMatch.referee_name}` : "Ref: \u2014",
    };
  }, [selectedMatch]);

  // ---- Render ----
  const filtersLoading = teamsLoading || seasonsLoading;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Swords className="size-6 text-primary" />
        <h1 className="text-2xl font-semibold">Post-Match Analysis</h1>
      </div>

      {/* Filter Bar */}
      {filtersLoading ? (
        <div className="w-full rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-row gap-4">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-[2]" />
          </div>
        </div>
      ) : (
        <MatchFilterBar
          teams={teams ?? []}
          seasons={seasons ?? []}
          matches={matchOptions}
          selectedTeamId={selectedTeamId}
          selectedSeasonId={selectedSeasonId}
          selectedMatchId={selectedMatchId}
          matchesLoading={matchesLoading}
          onTeamChange={(teamId) => {
            setSelectedTeamId(teamId);
            setUserSeasonId(null);
            setUserMatchId(null);
          }}
          onSeasonChange={(seasonId) => {
            setUserSeasonId(seasonId);
            setUserMatchId(null);
          }}
          onMatchChange={setUserMatchId}
        />
      )}

      {/* Score header card */}
      {selectedMatch && matchStatsData && matchStatsData.length > 0 && (
        <div className="w-full rounded-xl border bg-card p-4 shadow-sm bg-[radial-gradient(circle_at_top,rgba(61,145,223,0.08)_0,transparent_52%),linear-gradient(to_bottom,transparent_0%,rgba(61,145,223,0.04)_100%)]">
          <div className="flex items-center justify-between gap-4">
            {/* Selected Team */}
            <div className="flex flex-1 flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
              <div className="relative flex size-16 items-center justify-center rounded-2xl bg-background p-3 shadow-xs ring-1 ring-border sm:size-20">
                {selectedMatch.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedMatch.image_url}
                    alt={selectedTeamName}
                    className="size-full object-contain"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground/40">
                    <span className="text-2xl font-bold">{selectedTeamName.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="text-3xl font-black tracking-tight sm:text-4xl">
                {selectedTeamName}
              </div>
            </div>

            {/* Score */}
            <div className="whitespace-nowrap px-4 text-3xl font-black tracking-tight sm:px-8 sm:text-4xl">
              {matchStatsData.find((s) => s.team_id === selectedMatch.team_id)?.goals ?? 0}
              {" - "}
              {matchStatsData.find((s) => s.team_id === selectedMatch.opponent_team_id)?.goals ?? 0}
            </div>

            {/* Opposition Team */}
            <div className="flex flex-1 flex-col items-center gap-2 text-center sm:flex-row-reverse sm:text-right">
              <div className="relative flex size-16 items-center justify-center rounded-2xl bg-background p-3 shadow-xs ring-1 ring-border sm:size-20">
                {selectedMatch.opponent_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedMatch.opponent_image_url}
                    alt={oppositionTeamName}
                    className="size-full object-contain"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground/40">
                    <span className="text-2xl font-bold">{oppositionTeamName.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="text-3xl font-black tracking-tight sm:text-4xl">
                {oppositionTeamName}
              </div>
            </div>
          </div>
          {headerMetaRow && (
            <div className="mt-4 pb-1 pt-6 text-xs text-muted-foreground">
              <div className="flex w-full items-center text-center">
                <span className="flex-1 text-left">{headerMetaRow.matchLabel}</span>
                <span className="flex-1 text-center">{headerMetaRow.competitionSeason}</span>
                <span className="flex-1 text-center">{headerMetaRow.stadium}</span>
                <span className="flex-1 text-right">{headerMetaRow.referee}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      {selectedMatch && (
        <div className="space-y-8">
          {/* Lineups + Match Stats (3-column: lineup | stats | lineup) */}
          {lineupsLoading || matchStatsLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              <div className="space-y-4 md:col-span-1">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="space-y-4 md:col-span-1">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-96 w-full" />
              </div>
              <div className="space-y-4 md:col-span-1">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3 md:gap-6">
              {/* Selected Team Lineup */}
              {selectedTeamLineup.starters.length > 0 && (
                <div className="flex flex-col gap-4 md:col-span-1">
                  <Card className="flex flex-col p-0">
                    <CardContent className="p-0">
                      <LineupTable
                        teamName={selectedTeamName}
                        starters={selectedTeamLineup.starters}
                        formation={selectedFormation}
                        teamColor="#1a365d"
                      />
                    </CardContent>
                  </Card>
                  {selectedTeamLineup.subs.length > 0 && (
                    <Card className="flex flex-col p-0">
                      <CardContent className="p-0">
                        <SubstitutesTable
                          subs={selectedTeamLineup.subs}
                          teamColor="#1a365d"
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Match Stats */}
              {matchStatsData &&
                matchStatsData.length > 0 &&
                selectedMatch.team_id != null &&
                selectedMatch.opponent_team_id != null && (
                  <div className="flex h-full flex-col md:col-span-1">
                    <MatchStats
                      stats={matchStatsData}
                      selectedTeamId={selectedMatch.team_id}
                      oppositionTeamId={selectedMatch.opponent_team_id}
                      isLoading={matchStatsLoading}
                    />
                  </div>
                )}

              {/* Opposition Team Lineup */}
              {oppositionTeamLineup.starters.length > 0 && (
                <div className="flex flex-col gap-4 md:col-span-1">
                  <Card className="flex flex-col p-0">
                    <CardContent className="p-0">
                      <LineupTable
                        teamName={oppositionTeamName}
                        starters={oppositionTeamLineup.starters}
                        formation={oppositionFormation}
                        teamColor="#991b1b"
                      />
                    </CardContent>
                  </Card>
                  {oppositionTeamLineup.subs.length > 0 && (
                    <Card className="flex flex-col p-0">
                      <CardContent className="p-0">
                        <SubstitutesTable
                          subs={oppositionTeamLineup.subs}
                          teamColor="#991b1b"
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Win Probability */}
          {selectedMatch.team_id != null && selectedMatch.opponent_team_id != null && (
            <WinProbabilityBar
              probabilities={winProbData ?? []}
              team1Id={selectedMatch.team_id}
              team2Id={selectedMatch.opponent_team_id}
              team1Color="#1a365d"
              team2Color="#991b1b"
              isLoading={winProbLoading}
            />
          )}

          {/* Charts row: Momentum + xG Race */}
          {eventsLoading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : eventsData && eventsData.length > 0 && selectedTeamName && oppositionTeamName ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <MomentumGraph
                events={eventsData}
                team1={selectedTeamName}
                team2={oppositionTeamName}
                team1Color="#1a365d"
                team2Color="#991b1b"
              />
              <XgRaceChart
                events={eventsData}
                team1={selectedTeamName}
                team2={oppositionTeamName}
                team1Color="#1a365d"
                team2Color="#991b1b"
              />
            </div>
          ) : null}

          {/* Possession Details */}
          {selectedMatch.team_id != null && selectedMatch.season_id != null && (
            <PostMatchPossessionDetails
              matchId={selectedMatch.match_id}
              teamId={selectedMatch.team_id}
              seasonId={selectedMatch.season_id}
            />
          )}
        </div>
      )}

      {/* Empty state when no match is selected */}
      {!selectedMatch && !matchesLoading && !filtersLoading && (
        <div className="flex flex-1 flex-col items-center justify-center p-12">
          <p className="text-muted-foreground">
            Select a match to begin analysis.
          </p>
        </div>
      )}
    </div>
  );
}
