/**
 * Wyscout REST API client: period offsets and video clip URLs.
 *
 * Story 8.3 — AC4, AC5, AC6.
 * Ported from football-dashboard-2/src/lib/hudl.ts.
 */

import { getBasicAuthHeader, ConfigError } from "./auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PeriodOffsets {
  [period: string]: { start: number; end: number };
}

interface WyscoutOffsetsResponse {
  offsets: PeriodOffsets;
}

interface WyscoutVideoResponse {
  matchId: number;
  lq?: { url: string };
  sd?: { url: string };
  hd?: { url: string };
  fullhd?: { url: string };
  offsets?: PeriodOffsets;
}

export type VideoQuality = "LQ" | "SD" | "HD" | "Full-HD";

const QUALITY_FALLBACK_ORDER: VideoQuality[] = ["Full-HD", "HD", "SD", "LQ"];

const QUALITY_KEY_MAP: Record<VideoQuality, keyof WyscoutVideoResponse> = {
  "Full-HD": "fullhd",
  HD: "hd",
  SD: "sd",
  LQ: "lq",
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ConfigError(name);
  }
  return value;
}

// ---------------------------------------------------------------------------
// getMatchOffsets
// ---------------------------------------------------------------------------

/**
 * Fetch period offsets (1H, 2H, ET1, ET2 start/end timestamps)
 * for a given Wyscout match.
 */
export async function getMatchOffsets(
  wyscoutMatchId: string
): Promise<PeriodOffsets> {
  const baseUrl = requireEnv("WYSCOUT_BASE_URL");
  const authHeader = getBasicAuthHeader();

  const url = `${baseUrl}/videos/${wyscoutMatchId}/offsets`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Wyscout offsets request failed (${response.status}): ${text}`
    );
  }

  const data = (await response.json()) as WyscoutOffsetsResponse;
  return data.offsets;
}

// ---------------------------------------------------------------------------
// getVideoUrl
// ---------------------------------------------------------------------------

/**
 * Fetch a video clip URL for a specific time range and quality.
 * Implements quality fallback: Full-HD -> HD -> SD -> LQ.
 *
 * @returns Object with url, actual quality served, and expiry timestamp.
 */
export async function getVideoUrl(
  wyscoutMatchId: string,
  startTs: number,
  endTs: number,
  quality: VideoQuality = "HD"
): Promise<{ url: string; quality: VideoQuality; expiresAt: number }> {
  const baseUrl = requireEnv("WYSCOUT_BASE_URL");
  const authHeader = getBasicAuthHeader();

  const url = `${baseUrl}/videos/${wyscoutMatchId}?start=${startTs}&end=${endTs}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Wyscout video URL request failed (${response.status}): ${text}`
    );
  }

  const data = (await response.json()) as WyscoutVideoResponse;

  // Determine the starting index in the fallback chain
  const startIdx = QUALITY_FALLBACK_ORDER.indexOf(quality);
  const fallbackChain =
    startIdx >= 0
      ? QUALITY_FALLBACK_ORDER.slice(startIdx)
      : QUALITY_FALLBACK_ORDER;

  for (const q of fallbackChain) {
    const key = QUALITY_KEY_MAP[q];
    const entry = data[key] as { url: string } | undefined;
    if (entry?.url) {
      // Wyscout video URLs typically expire after 24 hours
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      return { url: entry.url, quality: q, expiresAt };
    }
  }

  throw new Error(
    `No video URL available for match ${wyscoutMatchId} at any quality`
  );
}

// ---------------------------------------------------------------------------
// calculateVideoTimestamp — used by the frontend to compute clip bounds
// ---------------------------------------------------------------------------

/**
 * Calculate the absolute video timestamp for an event.
 *
 * Formula: absolute_ts = period_offset_start + event_timestamp_within_period
 *
 * @param eventTimestamp - The event timestamp within the period (seconds)
 * @param periodOffset - The period offset start value (seconds)
 * @param paddingBefore - Seconds of padding before the event (default 5)
 * @param paddingAfter - Seconds of padding after the event (default 5)
 * @returns Start and end timestamps for the video clip
 */
export function calculateVideoTimestamp(
  eventTimestamp: number,
  periodOffset: number,
  paddingBefore: number = 5,
  paddingAfter: number = 5
): { startTimestamp: number; endTimestamp: number } {
  const absoluteTs = eventTimestamp + periodOffset;
  return {
    startTimestamp: Math.max(0, absoluteTs - paddingBefore),
    endTimestamp: absoluteTs + paddingAfter,
  };
}
