import { NextRequest, NextResponse } from "next/server";

import { api } from "@packages/backend/convex/_generated/api";
import { getAuthenticatedConvexClient } from "@/lib/wyscout/convex-client";
import { getVideoUrl, type VideoQuality } from "@/lib/wyscout/api";
import { ConfigError } from "@/lib/wyscout/auth";
import { uploadToMux, isMuxConfigured } from "@/lib/mux";

export const dynamic = "force-dynamic";

const VALID_QUALITIES = new Set<VideoQuality>(["LQ", "SD", "HD", "Full-HD"]);

/**
 * GET /api/wyscout/urls?wyscout_match_id={id}&start_timestamp={ts}&end_timestamp={ts}&quality={q}
 *
 * Story 8.3 — AC5, AC6, AC7: Returns a video clip URL for a given
 * Wyscout match and timestamp range. Checks Convex cache first.
 *
 * Story 9.6 — MUX Video Cache Integration:
 * - If cached with muxPlaybackId → return MUX stream URL
 * - If cached without muxPlaybackId → return cached URL, upload to MUX in background
 * - If not cached → fetch from Wyscout, try MUX upload, save all to cache
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Validate required params
    const wyscoutMatchId = searchParams.get("wyscout_match_id");
    if (!wyscoutMatchId || wyscoutMatchId.trim() === "") {
      return NextResponse.json(
        { error: "Missing or invalid parameter: wyscout_match_id" },
        { status: 400 },
      );
    }

    const startRaw = searchParams.get("start_timestamp");
    if (!startRaw || isNaN(Number(startRaw))) {
      return NextResponse.json(
        { error: "Missing or invalid parameter: start_timestamp" },
        { status: 400 },
      );
    }
    const startTimestamp = Number(startRaw);

    const endRaw = searchParams.get("end_timestamp");
    if (!endRaw || isNaN(Number(endRaw))) {
      return NextResponse.json(
        { error: "Missing or invalid parameter: end_timestamp" },
        { status: 400 },
      );
    }
    const endTimestamp = Number(endRaw);

    // Optional quality param
    const qualityRaw = searchParams.get("quality");
    const quality: VideoQuality =
      qualityRaw && VALID_QUALITIES.has(qualityRaw as VideoQuality)
        ? (qualityRaw as VideoQuality)
        : "HD";

    // Check Convex cache first
    const convex = await getAuthenticatedConvexClient();
    const passthrough = `${wyscoutMatchId}:${startTimestamp}:${endTimestamp}`;

    try {
      const cached = await convex.query(api.wyscoutCache.getCachedVideo, {
        wyscoutMatchId,
        startTimestamp,
        endTimestamp,
        quality,
      });

      if (cached) {
        // If cached with MUX playback ID → return MUX stream URL
        if (cached.muxPlaybackId) {
          return NextResponse.json({
            url: `https://stream.mux.com/${cached.muxPlaybackId}.m3u8`,
            quality,
            expiresAt: cached.expiresAt,
            cached: true,
            muxPlaybackId: cached.muxPlaybackId,
          });
        }

        // Cached but no MUX → return cached Wyscout URL, try MUX upload in background
        if (isMuxConfigured()) {
          uploadToMux(cached.videoUrl, passthrough)
            .then((muxResult) => {
              if (muxResult) {
                convex
                  .mutation(api.wyscoutCache.saveVideoCache, {
                    wyscoutMatchId,
                    startTimestamp,
                    endTimestamp,
                    quality,
                    videoUrl: cached.videoUrl,
                    expiresAt: cached.expiresAt,
                    muxAssetId: muxResult.assetId,
                    muxPlaybackId: muxResult.playbackId,
                  })
                  .catch((err: unknown) => {
                    console.warn("[Wyscout urls] Failed to update cache with MUX IDs:", err);
                  });
              }
            })
            .catch((err: unknown) => {
              console.warn("[Wyscout urls] Background MUX upload failed:", err);
            });
        }

        return NextResponse.json({
          url: cached.videoUrl,
          quality,
          expiresAt: cached.expiresAt,
          cached: true,
        });
      }
    } catch (cacheError) {
      console.warn("[Wyscout urls] Cache lookup failed:", cacheError);
    }

    // Fetch from Wyscout API
    const result = await getVideoUrl(
      wyscoutMatchId,
      startTimestamp,
      endTimestamp,
      quality,
    );

    // Try MUX upload
    let muxAssetId: string | undefined;
    let muxPlaybackId: string | undefined;

    if (isMuxConfigured()) {
      try {
        const muxResult = await uploadToMux(result.url, passthrough);
        if (muxResult) {
          muxAssetId = muxResult.assetId;
          muxPlaybackId = muxResult.playbackId;
        }
      } catch (muxError) {
        console.warn("[Wyscout urls] MUX upload failed, falling back to Wyscout URL:", muxError);
      }
    }

    // Save to Convex cache (fire-and-forget). Next call for the same clip
    // will return the MUX playback ID from cache, by which time the MUX
    // asset has had time to transcode and is ready to stream.
    convex
      .mutation(api.wyscoutCache.saveVideoCache, {
        wyscoutMatchId,
        startTimestamp,
        endTimestamp,
        quality: result.quality,
        videoUrl: result.url,
        expiresAt: result.expiresAt,
        muxAssetId,
        muxPlaybackId,
      })
      .catch((err: unknown) => {
        console.warn("[Wyscout urls] Failed to save cache:", err);
      });

    // Always return the Wyscout URL on first play — even if the MUX upload
    // completed synchronously, the asset likely isn't transcoded yet, which
    // causes mux-player to throw MediaError / HLS errors until it finishes.
    return NextResponse.json({
      url: result.url,
      quality: result.quality,
      expiresAt: result.expiresAt,
      cached: false,
    });
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error("[Wyscout urls] Config error:", error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Wyscout urls] Upstream error:", message);

    return NextResponse.json(
      { error: "Failed to fetch video URL", upstream: message },
      { status: 502 },
    );
  }
}
