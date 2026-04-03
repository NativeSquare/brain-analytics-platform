import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/statsbomb-db";
import { loadQuery } from "@/lib/load-query";
import { getMockResponse } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const METRIC_SQL: Record<string, string> = {
  points: "tm.points::numeric",
  x_points: "COALESCE(mes.expected_points, 0)::numeric",
  goals_for: "tm.goals_scored::numeric",
  goals_against: "tm.goals_conceded::numeric",
  goal_difference: "(tm.goals_scored - tm.goals_conceded)::numeric",
  shots_for: "COALESCE(ps_for.shots, 0)::numeric",
  shots_against: "COALESCE(ps_against.shots, 0)::numeric",
  xt_for: "COALESCE(ps_for.xt, 0)::numeric",
  xt_against: "COALESCE(ps_against.xt, 0)::numeric",
  xt_difference:
    "(COALESCE(ps_for.xt, 0) - COALESCE(ps_against.xt, 0))::numeric",
  total_xg_for: "COALESCE(ps_for.total_xg, 0)::numeric",
  total_xg_against: "COALESCE(ps_against.total_xg, 0)::numeric",
  xg_difference:
    "(COALESCE(ps_for.total_xg, 0) - COALESCE(ps_against.total_xg, 0))::numeric",
  build_up_goals_for: "COALESCE(ps_for.build_up_goals, 0)::numeric",
  build_up_goals_against: "COALESCE(ps_against.build_up_goals, 0)::numeric",
  build_up_shots_for: "COALESCE(ps_for.build_up_shots, 0)::numeric",
  build_up_shots_against: "COALESCE(ps_against.build_up_shots, 0)::numeric",
  build_up_xt_for: "COALESCE(ps_for.build_up_xt, 0)::numeric",
  build_up_xt_against: "COALESCE(ps_against.build_up_xt, 0)::numeric",
  build_up_xg_for: "COALESCE(ps_for.build_up_xg, 0)::numeric",
  build_up_xg_against: "COALESCE(ps_against.build_up_xg, 0)::numeric",
  transition_goals_for: "COALESCE(ps_for.transition_goals, 0)::numeric",
  transition_goals_against:
    "COALESCE(ps_against.transition_goals, 0)::numeric",
  transition_shots_for: "COALESCE(ps_for.transition_shots, 0)::numeric",
  transition_shots_against:
    "COALESCE(ps_against.transition_shots, 0)::numeric",
  transition_xt_for: "COALESCE(ps_for.transition_xt, 0)::numeric",
  transition_xt_against: "COALESCE(ps_against.transition_xt, 0)::numeric",
  transition_xg_for: "COALESCE(ps_for.transition_xg, 0)::numeric",
  transition_xg_against: "COALESCE(ps_against.transition_xg, 0)::numeric",
  set_piece_goals_for: "COALESCE(ps_for.set_piece_goals, 0)::numeric",
  set_piece_goals_against:
    "COALESCE(ps_against.set_piece_goals, 0)::numeric",
  set_piece_shots_for: "COALESCE(ps_for.set_piece_shots, 0)::numeric",
  set_piece_shots_against:
    "COALESCE(ps_against.set_piece_shots, 0)::numeric",
  set_piece_xt_for: "COALESCE(ps_for.set_piece_xt, 0)::numeric",
  set_piece_xt_against: "COALESCE(ps_against.set_piece_xt, 0)::numeric",
  set_piece_xg_for: "COALESCE(ps_for.set_piece_xg, 0)::numeric",
  set_piece_xg_against: "COALESCE(ps_against.set_piece_xg, 0)::numeric",
  possession_for:
    "COALESCE(tms_for.team_match_possession, 0)::numeric * 100",
  possession_against:
    "COALESCE(tms_against.team_match_possession, 0)::numeric * 100",
  passes_for: "COALESCE(tms_for.team_match_successful_passes, 0)::numeric",
  passes_against:
    "COALESCE(tms_against.team_match_successful_passes, 0)::numeric",
  ppda_for: "COALESCE(tms_for.team_match_ppda, 0)::numeric",
  ppda_against: "COALESCE(tms_against.team_match_ppda, 0)::numeric",
};

const AGAINST_METRICS = new Set([
  "goals_against",
  "shots_against",
  "xt_against",
  "total_xg_against",
  "build_up_goals_against",
  "build_up_shots_against",
  "build_up_xt_against",
  "build_up_xg_against",
  "transition_goals_against",
  "transition_shots_against",
  "transition_xt_against",
  "transition_xg_against",
  "set_piece_goals_against",
  "set_piece_shots_against",
  "set_piece_xt_against",
  "set_piece_xg_against",
  "possession_against",
  "passes_against",
  "ppda_against",
]);

export async function GET(request: NextRequest) {
  const mock = getMockResponse("statsbomb", "league-ranking-averages");
  if (mock) return mock;

  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get("teamId");
  const seasonId = searchParams.get("seasonId");
  const metricKey = searchParams.get("metricKey") ?? "points";

  if (!teamId) {
    return NextResponse.json(
      { error: "Missing required parameter: teamId" },
      { status: 400 },
    );
  }
  if (!seasonId) {
    return NextResponse.json(
      { error: "Missing required parameter: seasonId" },
      { status: 400 },
    );
  }
  if (!(metricKey in METRIC_SQL)) {
    return NextResponse.json(
      { error: "Invalid metricKey value" },
      { status: 400 },
    );
  }

  try {
    const sqlTemplate = loadQuery("league-ranking-averages.sql");
    const metricSql = METRIC_SQL[metricKey];
    const sortDirection = AGAINST_METRICS.has(metricKey) ? "ASC" : "DESC";
    const sql = sqlTemplate
      .replace("{{METRIC_SQL}}", metricSql)
      .replace("{{SORT_DIRECTION}}", sortDirection);

    const rows = await query(sql, [Number(teamId), Number(seasonId)]);

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("[StatsBomb API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
