import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

/**
 * Returns true when mock data mode is enabled.
 * Set USE_MOCK_DATA=true in .env.local to activate.
 */
export function useMockData(): boolean {
  return process.env.USE_MOCK_DATA === "true";
}

// Cache loaded mock data in memory (disabled in dev for hot-reload of JSON files)
const cache =
  process.env.NODE_ENV === "production"
    ? new Map<string, unknown>()
    : null;

/**
 * Returns a NextResponse with mock data if available and mock mode is enabled.
 * Returns null otherwise (fall through to real query).
 *
 * Uses fs.readFileSync to load JSON files — this runs in API routes (server-side Node.js).
 */
export function getMockResponse(
  service: "statsbomb" | "sportmonks" | "wyscout",
  endpoint: string,
): NextResponse | null {
  if (!useMockData()) return null;

  const cacheKey = `${service}/${endpoint}`;

  if (cache?.has(cacheKey)) {
    return NextResponse.json(cache.get(cacheKey));
  }

  // Resolve the JSON file path relative to this module
  const filePath = path.join(
    process.cwd(),
    "src",
    "lib",
    "mock-data",
    service,
    `${endpoint}.json`,
  );

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    cache?.set(cacheKey, data);
    return NextResponse.json(data);
  } catch {
    console.warn(
      `[Mock] No mock data for ${service}/${endpoint} (looked at ${filePath}), falling through to real query`,
    );
    return null;
  }
}
