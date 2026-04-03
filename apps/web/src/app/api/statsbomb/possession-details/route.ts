import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/statsbomb-db";
import { loadQuery } from "@/lib/load-query";
import { getMockResponse } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mock = getMockResponse("statsbomb", "possession-details");
  if (mock) return mock;

  const searchParams = request.nextUrl.searchParams;
  const matchId = searchParams.get("matchId");
  const teamId = searchParams.get("teamId");
  const seasonId = searchParams.get("seasonId");

  if (!matchId) {
    return NextResponse.json(
      { error: "Missing required parameter: matchId" },
      { status: 400 },
    );
  }
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

  try {
    const params = [Number(matchId), Number(teamId), Number(seasonId)];

    const [buildUp, transitions, goalkeeper, setPieces] = await Promise.all([
      query(loadQuery("build_up_metrics.sql"), params),
      query(loadQuery("transitions_metrics.sql"), params),
      query(loadQuery("gk_possessions_metrics.sql"), params),
      query(loadQuery("set_pieces_metrics.sql"), params),
    ]);

    return NextResponse.json({
      data: { buildUp, transitions, goalkeeper, setPieces },
    });
  } catch (error) {
    console.error("[StatsBomb API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
