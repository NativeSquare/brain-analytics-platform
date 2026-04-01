import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/statsbomb-db";
import { loadQuery } from "@/lib/load-query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const matchId = searchParams.get("matchId");
  const teamId = searchParams.get("teamId");
  const seasonId = searchParams.get("seasonId");

  try {
    const filters: string[] = ["tm.goals_scored IS NOT NULL"];
    const values: number[] = [];

    if (matchId) {
      values.push(Number(matchId));
      filters.push(`tm.match_id = $${values.length}`);
    }

    if (teamId) {
      values.push(Number(teamId));
      filters.push(`tm.team_id = $${values.length}`);
    }

    if (seasonId) {
      values.push(Number(seasonId));
      filters.push(`tm.season_id = $${values.length}`);
    }

    const sqlTemplate = loadQuery("matches.sql");
    const sql = sqlTemplate.replace("{{FILTERS}}", filters.join(" AND "));

    const rows = await query(sql, values);

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("[StatsBomb API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
