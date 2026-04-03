import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/statsbomb-db";
import { loadQuery } from "@/lib/load-query";
import { getMockResponse } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Return mock data when enabled
  const mock = getMockResponse("statsbomb", "season-possession-details");
  if (mock) return mock;

  const searchParams = request.nextUrl.searchParams;
  const seasonId = searchParams.get("seasonId");
  const teamId = searchParams.get("teamId");
  const competitionId = searchParams.get("competitionId");

  if (!seasonId) {
    return NextResponse.json(
      { error: "Missing required parameter: seasonId" },
      { status: 400 },
    );
  }
  if (!teamId) {
    return NextResponse.json(
      { error: "Missing required parameter: teamId" },
      { status: 400 },
    );
  }
  if (!competitionId) {
    return NextResponse.json(
      { error: "Missing required parameter: competitionId" },
      { status: 400 },
    );
  }

  try {
    const params = [
      Number(seasonId),
      Number(teamId),
      Number(competitionId),
    ];

    const [buildUpRows, transitionsRows] = await Promise.all([
      query(loadQuery("season_build_up_metrics.sql"), params),
      query(loadQuery("season_transitions_metrics.sql"), params),
    ]);

    return NextResponse.json({
      data: {
        buildUp: buildUpRows[0] ?? null,
        transitions: transitionsRows[0] ?? null,
      },
    });
  } catch (error) {
    console.error("[StatsBomb API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
