import { NextRequest, NextResponse } from "next/server";

import {
  query,
  isSportMonksConfigured,
  SportMonksNotConfiguredError,
} from "./sportmonks-db";
import { loadQuery } from "./load-query";
import { rowsToCamel } from "./case-utils";
import { getMockResponse } from "./mock-data";

export interface SportMonksRouteConfig {
  /** The .sql filename under queries/sportmonks/ */
  queryFile: string;
  /** Human-readable resource name for error messages (e.g. "fixtures") */
  resource: string;
  /** Parameter names that are optional */
  optionalParams?: string[];
  /** Maps the collected string params to an ordered array for the SQL $1, $2 ... placeholders */
  buildParams: (params: Record<string, string>) => unknown[];
  /**
   * Optional post-processing of the SQL string before execution.
   * Used for queries with template placeholders like {{FILTERS}}.
   */
  transformSql?: (sql: string, params: Record<string, string>) => string;
  /**
   * Optional transform applied to the rows before returning.
   * When omitted, rows are converted to camelCase and wrapped as `{ data: rows }`.
   */
  transformResult?: (
    rows: Record<string, unknown>[],
    params: Record<string, string>,
  ) => unknown;
  /** Mock data endpoint name. When USE_MOCK_DATA=true, returns mock JSON instead of querying DB. */
  mockEndpoint?: string;
}

/**
 * Factory that produces a Next.js GET handler for SportMonks routes.
 *
 * Handles:
 * - Mock data when USE_MOCK_DATA=true
 * - 503 when `SPORTMONKS_DATABASE_URL` is not configured
 * - 500 on database errors (logs details server-side)
 * - snake_case -> camelCase transformation by default
 */
export function createSportMonksHandler(config: SportMonksRouteConfig) {
  return async function GET(request: NextRequest) {
    // Return mock data when enabled (uses mockEndpoint or derives from queryFile)
    {
      const endpoint = config.mockEndpoint ?? config.queryFile.replace(".sql", "").replace(/.*\//, "");
      const mock = getMockResponse("sportmonks", endpoint);
      if (mock) return mock;
    }

    if (!isSportMonksConfigured()) {
      return NextResponse.json(
        { error: "SportMonks database is not configured" },
        { status: 503 },
      );
    }

    try {
      const searchParams = request.nextUrl.searchParams;
      const params: Record<string, string> = {};

      // Collect optional params
      for (const name of config.optionalParams ?? []) {
        const value = searchParams.get(name);
        if (value) params[name] = value;
      }

      let sql = loadQuery(config.queryFile, "sportmonks");
      if (config.transformSql) {
        sql = config.transformSql(sql, params);
      }

      const rows = await query(sql, config.buildParams(params));

      if (config.transformResult) {
        return NextResponse.json(config.transformResult(rows, params));
      }

      return NextResponse.json({ data: rowsToCamel(rows) });
    } catch (error) {
      if (error instanceof SportMonksNotConfiguredError) {
        return NextResponse.json(
          { error: "SportMonks database is not configured" },
          { status: 503 },
        );
      }

      console.error(`[SportMonks API Error] Failed to fetch ${config.resource}:`, error);
      return NextResponse.json(
        { error: `Failed to fetch ${config.resource}` },
        { status: 500 },
      );
    }
  };
}
