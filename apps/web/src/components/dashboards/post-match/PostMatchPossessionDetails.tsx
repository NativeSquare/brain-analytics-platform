"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import GraphInfoBadge from "./GraphInfoBadge";
import PossessionMetricCard from "./PossessionMetricCard";
import type {
  MetricDefinition,
  Side,
  PossessionDetailsResponse,
} from "./types";

interface PostMatchPossessionDetailsProps {
  matchId: number;
  teamId: number;
  seasonId: number;
}

const TEAM_COLOR = "#1a365d";
const OPP_COLOR = "#991b1b";

// ---------- Metric card configs (ported from SOURCE) ----------

const buildUpCards: Array<{ title: string; side: Side; metrics: MetricDefinition[] }> = [
  {
    title: "Attacking Summary",
    side: "team",
    metrics: [
      { label: "Minutes in BU", key: "bu_minutes", rankKey: "bu_minutes_rank", matchFormat: "minutes", seasonFormat: "minutes" },
      { label: "BU Goals For", key: "bu_goals", rankKey: "bu_goals_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "BU Shots For", key: "bu_shots", rankKey: "bu_shots_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "BU xG For", key: "bu_xg", rankKey: "bu_xg_rank", matchFormat: "dec2" },
      { label: "BU xT For", key: "bu_xt", rankKey: "bu_xt_rank", matchFormat: "dec2" },
    ],
  },
  {
    title: "Defensive Summary",
    side: "opponent",
    metrics: [
      { label: "Opponent Minutes in BU", key: "bu_minutes", rankKey: "bu_minutes_rank", matchFormat: "minutes", seasonFormat: "minutes" },
      { label: "BU Goals Against", key: "bu_goals", rankKey: "bu_goals_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "BU Shots Against", key: "bu_shots", rankKey: "bu_shots_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "BU xG Against", key: "bu_xg", rankKey: "bu_xg_rank", matchFormat: "dec2" },
      { label: "BU xT Against", key: "bu_xt", rankKey: "bu_xt_rank", matchFormat: "dec2" },
    ],
  },
  {
    title: "Playing Through Press",
    side: "team",
    metrics: [
      { label: "Def Third BU Possessions", key: "def_third_possessions", rankKey: "def_third_possessions_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "% of Def Third BU into Mid Third", key: "def_third_into_mid_pct", rankKey: "def_third_into_mid_pct_rank", matchFormat: "pct" },
      { label: "% of Def Third BU into Final Third", key: "def_third_into_final_pct", rankKey: "def_third_into_final_pct_rank", matchFormat: "pct" },
      { label: "Def Third BU xT For", key: "def_third_xt", rankKey: "def_third_xt_rank", matchFormat: "dec2" },
      { label: "% of Def Third BU Lost", key: "def_third_lost_pct", rankKey: "def_third_lost_pct_rank", matchFormat: "pct" },
    ],
  },
  {
    title: "High Press",
    side: "opponent",
    metrics: [
      { label: "Opponent Def Third BU Possessions", key: "def_third_possessions", rankKey: "def_third_possessions_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "% of Opponent Def Third BU into Mid Third", key: "def_third_into_mid_pct", rankKey: "def_third_into_mid_pct_rank", matchFormat: "pct" },
      { label: "% of Opponent Def Third BU into Final Third", key: "def_third_into_final_pct", rankKey: "def_third_into_final_pct_rank", matchFormat: "pct" },
      { label: "Opponent Def Third BU xT", key: "def_third_xt", rankKey: "def_third_xt_rank", matchFormat: "dec2" },
      { label: "% of Opponent Def Third BU Regained", key: "def_third_lost_pct", rankKey: "def_third_lost_pct_rank", matchFormat: "pct" },
    ],
  },
  {
    title: "Attacking Build-up",
    side: "team",
    metrics: [
      { label: "Mid Third BU Possessions", key: "mid_third_possessions", rankKey: "mid_third_possessions_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "% of Mid Third BU into Final Third", key: "mid_third_into_final_pct", rankKey: "mid_third_into_final_pct_rank", matchFormat: "pct" },
      { label: "Mid Third BU xT For", key: "mid_third_xt", rankKey: "mid_third_xt_rank", matchFormat: "dec2" },
      { label: "% of BU Lost in Mid Third", key: "mid_third_lost_pct", rankKey: "mid_third_lost_pct_rank", matchFormat: "pct" },
    ],
  },
  {
    title: "Mid Block",
    side: "opponent",
    metrics: [
      { label: "Opponent Mid Third BU Possessions", key: "mid_third_possessions", rankKey: "mid_third_possessions_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "% of Opponent Mid Third BU into Final Third", key: "mid_third_into_final_pct", rankKey: "mid_third_into_final_pct_rank", matchFormat: "pct" },
      { label: "Opponent Mid Third BU xT", key: "mid_third_xt", rankKey: "mid_third_xt_rank", matchFormat: "dec2" },
      { label: "% of Opponent BU Regained in Atk Half", key: "regained_atk_half_pct", rankKey: "regained_atk_half_pct_rank", matchFormat: "pct" },
    ],
  },
  {
    title: "Attacking Breakthrough",
    side: "team",
    metrics: [
      { label: "BU Final Third Entries", key: "final_third_entries", rankKey: "final_third_entries_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "% of BU Final Third Entries into Box", key: "final_third_into_box_pct", rankKey: "final_third_into_box_pct_rank", matchFormat: "pct" },
      { label: "% of BU Final Third Entries with Shot", key: "final_third_shot_pct", rankKey: "final_third_shot_pct_rank", matchFormat: "pct" },
      { label: "BU xG per Final Third Entry For", key: "xg_per_entry", rankKey: "xg_per_entry_rank", matchFormat: "dec3" },
    ],
  },
  {
    title: "Low Block",
    side: "opponent",
    metrics: [
      { label: "Opponent BU Final Third Entries", key: "final_third_entries", rankKey: "final_third_entries_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "% of Opponent BU Final Third Entries into Box", key: "final_third_into_box_pct", rankKey: "final_third_into_box_pct_rank", matchFormat: "pct" },
      { label: "% of Opponent BU Final Third Entries with Shot", key: "final_third_shot_pct", rankKey: "final_third_shot_pct_rank", matchFormat: "pct" },
      { label: "BU xG per Final Third Entry Against", key: "xg_per_entry", rankKey: "xg_per_entry_rank", matchFormat: "dec3" },
    ],
  },
];

const transitionsCards: Array<{ title: string; side: Side; metrics: MetricDefinition[] }> = [
  {
    title: "Attacking Transitions",
    side: "team",
    metrics: [
      { label: "Regains", key: "regains_count", rankKey: "regains_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Transitions", key: "transitions_count", rankKey: "transitions_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Transition Goals For", key: "transition_goals", rankKey: "transition_goals_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Transition Shots For", key: "transition_shots", rankKey: "transition_shots_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Transition xG For", key: "transition_xg", rankKey: "transition_xg_rank", matchFormat: "dec2" },
      { label: "Transition xT For", key: "transition_xt", rankKey: "transition_xt_rank", matchFormat: "dec2" },
    ],
  },
  {
    title: "Defensive Transitions",
    side: "opponent",
    metrics: [
      { label: "Turnovers", key: "regains_count", rankKey: "regains_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Opponent Transitions", key: "transitions_count", rankKey: "transitions_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Transition Goals Against", key: "transition_goals", rankKey: "transition_goals_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Transition Shots Against", key: "transition_shots", rankKey: "transition_shots_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Transition xG Against", key: "transition_xg", rankKey: "transition_xg_rank", matchFormat: "dec2" },
      { label: "Transition xT Against", key: "transition_xt", rankKey: "transition_xt_rank", matchFormat: "dec2" },
    ],
  },
  {
    title: "Pressing",
    side: "team",
    metrics: [
      { label: "Atk Half Regains", key: "atk_half_regains", rankKey: "atk_half_regains_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "PPDA For", key: "ppda", rankKey: "ppda_rank", matchFormat: "dec2" },
    ],
  },
  {
    title: "Press Resistance",
    side: "opponent",
    metrics: [
      { label: "Def Half Turnovers", key: "def_half_turnovers", rankKey: "def_half_turnovers_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "PPDA Against", key: "ppda", rankKey: "ppda_rank", matchFormat: "dec2" },
    ],
  },
  {
    title: "Counter Attacking",
    side: "team",
    metrics: [
      { label: "% of Transitions into Final Third", key: "transition_entries_pct", rankKey: "transition_entries_pct_rank", matchFormat: "pct" },
      { label: "Transition Turnover %", key: "transition_turnover_pct", rankKey: "transition_turnover_pct_rank", matchFormat: "pct" },
      { label: "Transition xG per Final Third Entry For", key: "transition_xg_per_entry", rankKey: "transition_xg_per_entry_rank", matchFormat: "dec3" },
    ],
  },
  {
    title: "Opponent Counter Attacking",
    side: "opponent",
    metrics: [
      { label: "% of Opponent Transitions into Final Third", key: "transition_entries_pct", rankKey: "transition_entries_pct_rank", matchFormat: "pct" },
      { label: "Transition Regain %", key: "transition_regain_pct", rankKey: "transition_regain_pct_rank", matchFormat: "pct" },
      { label: "Transition xG per Final Third Entry Against", key: "transition_xg_per_entry", rankKey: "transition_xg_per_entry_rank", matchFormat: "dec3" },
    ],
  },
];

const goalkeeperCards: Array<{ title: string; side: Side; metrics: MetricDefinition[] }> = [
  {
    title: "Goal Kicks",
    side: "team",
    metrics: [
      { label: "Long (count)", key: "gk_long_count", rankKey: "gk_long_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Long retained %", key: "gk_long_retained_pct", rankKey: "gk_long_retained_pct_rank", matchFormat: "pct" },
      { label: "Short then long (count)", key: "gk_short_then_long_count", rankKey: "gk_short_then_long_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Short then long retained %", key: "gk_short_then_long_retained_pct", rankKey: "gk_short_then_long_retained_pct_rank", matchFormat: "pct" },
      { label: "Short (count)", key: "gk_short_count", rankKey: "gk_short_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Short retained %", key: "gk_short_retained_pct", rankKey: "gk_short_retained_pct_rank", matchFormat: "pct" },
    ],
  },
  {
    title: "Opponent Goal Kicks",
    side: "opponent",
    metrics: [
      { label: "Long (count)", key: "gk_long_count", rankKey: "gk_long_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Long retained %", key: "gk_long_retained_pct", rankKey: "gk_long_retained_pct_rank", matchFormat: "pct" },
      { label: "Short then long (count)", key: "gk_short_then_long_count", rankKey: "gk_short_then_long_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Short then long retained %", key: "gk_short_then_long_retained_pct", rankKey: "gk_short_then_long_retained_pct_rank", matchFormat: "pct" },
      { label: "Short (count)", key: "gk_short_count", rankKey: "gk_short_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "Short retained %", key: "gk_short_retained_pct", rankKey: "gk_short_retained_pct_rank", matchFormat: "pct" },
    ],
  },
  {
    title: "GK Reset",
    side: "team",
    metrics: [
      { label: "GK Reset possessions", key: "gk_reset_count", rankKey: "gk_reset_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "% into Opp Half", key: "gk_reset_into_opp_half_pct", rankKey: "gk_reset_into_opp_half_pct_rank", matchFormat: "pct" },
    ],
  },
  {
    title: "Opponent GK Reset",
    side: "opponent",
    metrics: [
      { label: "GK Reset possessions", key: "gk_reset_count", rankKey: "gk_reset_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: "% into Opp Half", key: "gk_reset_into_opp_half_pct", rankKey: "gk_reset_into_opp_half_pct_rank", matchFormat: "pct" },
    ],
  },
];

const spTypeLabel: Record<string, string> = {
  all: "Summary",
  corner: "Corners",
  "free kick": "Free Kicks",
  "throw-in": "Throw-ins",
};

function setPieceMetricsFor(labelPrefix: string, against = false): MetricDefinition[] {
  if (against) {
    return [
      { label: `${labelPrefix} Against`, key: "sp_count", rankKey: "sp_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: `${labelPrefix} Goals Against`, key: "goals", rankKey: "goals_rank", matchFormat: "int", seasonFormat: "int_avg" },
      { label: `${labelPrefix} xG Against`, key: "xg", rankKey: "xg_rank", matchFormat: "dec2" },
      { label: `xG Against per ${labelPrefix}`, key: "xg_per_sp", rankKey: "xg_per_sp_rank", matchFormat: "dec3" },
      { label: `% of Opp ${labelPrefix} with Shot`, key: "shot_pct", rankKey: "shot_pct_rank", matchFormat: "pct" },
      { label: `% of First Contacts from Opp ${labelPrefix}`, key: "first_contact_pct", rankKey: "first_contact_pct_rank", matchFormat: "pct" },
    ];
  }
  return [
    { label: `${labelPrefix} For`, key: "sp_count", rankKey: "sp_count_rank", matchFormat: "int", seasonFormat: "int_avg" },
    { label: `${labelPrefix} Goals For`, key: "goals", rankKey: "goals_rank", matchFormat: "int", seasonFormat: "int_avg" },
    { label: `${labelPrefix} xG For`, key: "xg", rankKey: "xg_rank", matchFormat: "dec2" },
    { label: `xG For per ${labelPrefix}`, key: "xg_per_sp", rankKey: "xg_per_sp_rank", matchFormat: "dec3" },
    { label: `% of Atk ${labelPrefix} with Shot`, key: "shot_pct", rankKey: "shot_pct_rank", matchFormat: "pct" },
    { label: `% of First Contacts from Atk ${labelPrefix}`, key: "first_contact_pct", rankKey: "first_contact_pct_rank", matchFormat: "pct" },
  ];
}

// ---------- Component ----------

const PostMatchPossessionDetails = ({
  matchId,
  teamId,
  seasonId,
}: PostMatchPossessionDetailsProps) => {
  const [details, setDetails] = useState<PossessionDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    buildUp: false,
    transition: false,
    goalkeeper: false,
    setPieces: false,
  });

  useEffect(() => {
    let isMounted = true;
    const loadDetails = async () => {
      setDetailsLoading(true);
      setDetailsError(null);
      try {
        const params = new URLSearchParams({
          matchId: String(matchId),
          teamId: String(teamId),
          seasonId: String(seasonId),
        });
        const response = await fetch(`/api/statsbomb/possession-details?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to load possession details");
        const json = (await response.json()) as { data?: PossessionDetailsResponse } | PossessionDetailsResponse;
        if (!isMounted) return;
        const data = (json as { data?: PossessionDetailsResponse }).data ?? (json as PossessionDetailsResponse);
        setDetails(data);
        setDetailsLoading(false);
      } catch {
        if (!isMounted) return;
        setDetailsError("Unable to load possession details");
        setDetailsLoading(false);
      }
    };

    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [matchId, teamId, seasonId]);

  const setPieceGrouped = useMemo(() => {
    const rows = details?.setPieces ?? [];
    const keys = ["all", "corner", "free kick", "throw-in"];
    return keys.map((key) => ({
      key,
      label: spTypeLabel[key] ?? key,
      rows: rows.filter((row) => (key === "all" ? row.sp_type == null : row.sp_type === key)),
    }));
  }, [details?.setPieces]);

  const allExpanded = useMemo(
    () => Object.values(expandedSections).every(Boolean),
    [expandedSections],
  );

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllSections = (expanded: boolean) => {
    setExpandedSections({
      buildUp: expanded,
      transition: expanded,
      goalkeeper: expanded,
      setPieces: expanded,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Possession Details</CardTitle>
        <CardAction>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAllSections(!allExpanded)}>
              {allExpanded ? "Collapse All" : "Expand All"}
            </Button>
            <GraphInfoBadge text="Breakdown of possession details for the selected match. Compares to season average and league season rankings." />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {detailsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : detailsError ? (
          <div className="rounded-xl border bg-card p-4 text-sm text-destructive">
            {detailsError}
          </div>
        ) : details ? (
          <>
            {/* Build-up */}
            <section className="space-y-3 rounded-xl border bg-card p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => toggleSection("buildUp")}
              >
                <h3 className="text-lg font-semibold">Build-up</h3>
                {expandedSections.buildUp ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
              {expandedSections.buildUp && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {buildUpCards.map((card) => (
                    <PossessionMetricCard
                      key={`${card.title}-${card.side}`}
                      title={card.title}
                      side={card.side}
                      rows={details.buildUp}
                      metrics={card.metrics}
                      headerColor={card.side === "team" ? TEAM_COLOR : OPP_COLOR}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Transitions */}
            <section className="space-y-3 rounded-xl border bg-card p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => toggleSection("transition")}
              >
                <h3 className="text-lg font-semibold">Transition</h3>
                {expandedSections.transition ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
              {expandedSections.transition && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {transitionsCards.map((card) => (
                    <PossessionMetricCard
                      key={`${card.title}-${card.side}`}
                      title={card.title}
                      side={card.side}
                      rows={details.transitions}
                      metrics={card.metrics}
                      headerColor={card.side === "team" ? TEAM_COLOR : OPP_COLOR}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Goalkeeper */}
            <section className="space-y-3 rounded-xl border bg-card p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => toggleSection("goalkeeper")}
              >
                <h3 className="text-lg font-semibold">Goal Kicks &amp; GK Resets</h3>
                {expandedSections.goalkeeper ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
              {expandedSections.goalkeeper && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {goalkeeperCards.map((card) => (
                    <PossessionMetricCard
                      key={`${card.title}-${card.side}`}
                      title={card.title}
                      side={card.side}
                      rows={details.goalkeeper}
                      metrics={card.metrics}
                      headerColor={card.side === "team" ? TEAM_COLOR : OPP_COLOR}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Set Pieces */}
            <section className="space-y-3 rounded-xl border bg-card p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => toggleSection("setPieces")}
              >
                <h3 className="text-lg font-semibold">Set Pieces</h3>
                {expandedSections.setPieces ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
              {expandedSections.setPieces && (
                <>
                  {setPieceGrouped.map((group) => (
                    <div key={group.key} className="space-y-2">
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <PossessionMetricCard
                          title={
                            group.key === "all"
                              ? "Attacking Summary"
                              : group.key === "corner"
                                ? "Corners"
                                : group.key === "free kick"
                                  ? "Free Kicks"
                                  : "Throw-ins"
                          }
                          side="team"
                          rows={group.rows}
                          metrics={setPieceMetricsFor(
                            group.key === "all"
                              ? "SP"
                              : group.key === "corner"
                                ? "Corner"
                                : group.key === "free kick"
                                  ? "Free Kick"
                                  : "Throw-in",
                          )}
                          headerColor={TEAM_COLOR}
                        />
                        <PossessionMetricCard
                          title={
                            group.key === "all"
                              ? "Defensive Summary"
                              : group.key === "corner"
                                ? "Opposition Corners"
                                : group.key === "free kick"
                                  ? "Opposition Free Kicks"
                                  : "Opposition Throw-ins"
                          }
                          side="opponent"
                          rows={group.rows}
                          metrics={setPieceMetricsFor(
                            group.key === "all"
                              ? "SP"
                              : group.key === "corner"
                                ? "Corner"
                                : group.key === "free kick"
                                  ? "Free Kick"
                                  : "Throw-in",
                            true,
                          )}
                          headerColor={OPP_COLOR}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </section>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default PostMatchPossessionDetails;
