import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/statsbomb-db";
import { loadQuery } from "@/lib/load-query";
import { getMockResponse } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mock = getMockResponse("statsbomb", "shots");
  if (mock) return mock;

  const searchParams = request.nextUrl.searchParams;
  const matchId = searchParams.get("matchId");
  const teamId = searchParams.get("teamId");
  const seasonId = searchParams.get("seasonId");
  const allTeamShots = searchParams.get("allTeamShots") === "true";

  try {
    if (allTeamShots) {
      if (!teamId) {
        return NextResponse.json(
          { error: "Missing required parameter: teamId" },
          { status: 400 },
        );
      }

      const sqlTemplate = loadQuery("shots-by-team.sql");
      const seasonFilter =
        seasonId ? "AND m.season_id = $2" : "";
      const sql = sqlTemplate.replace("{{SEASON_FILTER}}", seasonFilter);
      const params: number[] = [Number(teamId)];
      if (seasonId) params.push(Number(seasonId));

      const rows = await query(sql, params);
      return NextResponse.json({ data: rows });
    }

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing required parameter: matchId" },
        { status: 400 },
      );
    }

    const rows = await query(loadQuery("shots-by-match.sql"), [
      Number(matchId),
    ]);
    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("[StatsBomb API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
