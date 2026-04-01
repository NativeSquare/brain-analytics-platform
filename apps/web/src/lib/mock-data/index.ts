import { NextResponse } from "next/server";

/**
 * Returns true when mock data mode is enabled.
 * Set USE_MOCK_DATA=true in .env to activate.
 */
export function useMockData(): boolean {
  return process.env.USE_MOCK_DATA === "true";
}

/**
 * Loads a mock JSON file for the given service/endpoint.
 * Returns a NextResponse if mock data exists, null otherwise.
 */
export function getMockResponse(
  service: "statsbomb" | "sportmonks" | "wyscout",
  endpoint: string,
): NextResponse | null {
  if (!useMockData()) return null;

  try {
    // Dynamic require for JSON files — works at build time in Next.js
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require(`./${service}/${endpoint}.json`);
    return NextResponse.json(data);
  } catch {
    // No mock file for this endpoint — fall through to real query
    console.warn(
      `[Mock] No mock data for ${service}/${endpoint}, falling through to real query`,
    );
    return null;
  }
}
