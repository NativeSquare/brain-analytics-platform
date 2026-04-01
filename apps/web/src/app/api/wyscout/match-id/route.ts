import { NextRequest, NextResponse } from "next/server";

import { api } from "@packages/backend/convex/_generated/api";
import { getAuthenticatedConvexClient } from "@/lib/wyscout/convex-client";
import { getWyscoutMatchId } from "@/lib/wyscout/hudl-mapping";
import { ConfigError } from "@/lib/wyscout/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/wyscout/match-id?statsbomb_match_id={id}
 *
 * Story 8.3 — AC1, AC2: Resolves a StatsBomb match ID to a Wyscout match ID.
 * Checks Convex cache first; falls back to Hudl GraphQL API.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statsbombMatchId = searchParams.get("statsbomb_match_id");

    if (!statsbombMatchId || statsbombMatchId.trim() === "") {
      return NextResponse.json(
        { error: "Missing or invalid parameter: statsbomb_match_id" },
        { status: 400 }
      );
    }

    // Check Convex cache first
    const convex = await getAuthenticatedConvexClient();

    try {
      const cached = await convex.query(api.wyscoutCache.getMatchMapping, {
        statsbombMatchId,
      });

      if (cached) {
        return NextResponse.json({
          wyscoutMatchId: cached.wyscoutMatchId,
          cached: true,
        });
      }
    } catch (cacheError) {
      // Cache miss or error — proceed to Hudl API
      console.warn("[Wyscout match-id] Cache lookup failed:", cacheError);
    }

    // Call Hudl GraphQL API
    const wyscoutMatchId = await getWyscoutMatchId(statsbombMatchId);

    if (!wyscoutMatchId) {
      return NextResponse.json(
        { error: "No Wyscout match mapping found for the given StatsBomb match ID" },
        { status: 404 }
      );
    }

    // Save to Convex cache (fire-and-forget, don't block the response)
    convex
      .mutation(api.wyscoutCache.saveMatchMapping, {
        statsbombMatchId,
        wyscoutMatchId,
      })
      .catch((err: unknown) => {
        console.warn("[Wyscout match-id] Failed to save cache:", err);
      });

    return NextResponse.json({
      wyscoutMatchId,
      cached: false,
    });
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error("[Wyscout match-id] Config error:", error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Wyscout match-id] Upstream error:", message);

    return NextResponse.json(
      { error: "Failed to resolve match ID", upstream: message },
      { status: 502 }
    );
  }
}
