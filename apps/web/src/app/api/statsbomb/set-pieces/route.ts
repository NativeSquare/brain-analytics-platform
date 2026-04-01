import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/statsbomb-db";
import { loadQuery } from "@/lib/load-query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const matchId = searchParams.get("matchId");
  const teamId = searchParams.get("teamId");
  const seasonId = searchParams.get("seasonId");
  const allSeason = searchParams.get("allSeasonSetPieces") === "true";

  try {
    if (allSeason) {
      if (!teamId || !seasonId) {
        return NextResponse.json(
          {
            error:
              "Missing required parameter: teamId and seasonId are required when allSeasonSetPieces is true",
          },
          { status: 400 },
        );
      }
      const rows = await query(loadQuery("set-pieces-by-season.sql"), [
        Number(teamId),
        Number(seasonId),
      ]);
      return NextResponse.json({ data: rows });
    }

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing required parameter: matchId" },
        { status: 400 },
      );
    }

    const rows = await query(loadQuery("set-pieces-by-match.sql"), [
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
