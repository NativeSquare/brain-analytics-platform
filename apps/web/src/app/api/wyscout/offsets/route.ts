import { NextRequest, NextResponse } from "next/server";

import { getMatchOffsets } from "@/lib/wyscout/api";
import { ConfigError } from "@/lib/wyscout/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/wyscout/offsets?wyscout_match_id={id}
 *
 * Story 8.3 — AC4: Returns period offsets (1H, 2H, ET1, ET2)
 * for a given Wyscout match.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wyscoutMatchId = searchParams.get("wyscout_match_id");

    if (!wyscoutMatchId || wyscoutMatchId.trim() === "") {
      return NextResponse.json(
        { error: "Missing or invalid parameter: wyscout_match_id" },
        { status: 400 }
      );
    }

    const offsets = await getMatchOffsets(wyscoutMatchId);

    return NextResponse.json({ offsets });
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error("[Wyscout offsets] Config error:", error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Wyscout offsets] Upstream error:", message);

    return NextResponse.json(
      { error: "Failed to fetch period offsets", upstream: message },
      { status: 502 }
    );
  }
}
