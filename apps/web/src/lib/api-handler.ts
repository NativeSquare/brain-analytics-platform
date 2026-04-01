import { NextRequest, NextResponse } from "next/server";

import { query } from "./statsbomb-db";
import { loadQuery } from "./load-query";

export interface RouteConfig {
  /** The .sql filename under queries/statsbomb/ */
  queryFile: string;
  /** Parameter names that MUST be present in the URL search params */
  requiredParams: string[];
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
   * When omitted, returns `{ data: rows }`.
   */
  transformResult?: (
    rows: Record<string, unknown>[],
    params: Record<string, string>,
  ) => unknown;
}

/**
 * Factory that produces a Next.js GET handler from a declarative config.
 */
export function createStatsBombHandler(config: RouteConfig) {
  return async function GET(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const params: Record<string, string> = {};

      // Validate required params
      for (const name of config.requiredParams) {
        const value = searchParams.get(name);
        if (!value) {
          return NextResponse.json(
            { error: `Missing required parameter: ${name}` },
            { status: 400 },
          );
        }
        params[name] = value;
      }

      // Collect optional params
      for (const name of config.optionalParams ?? []) {
        const value = searchParams.get(name);
        if (value) params[name] = value;
      }

      let sql = loadQuery(config.queryFile);
      if (config.transformSql) {
        sql = config.transformSql(sql, params);
      }

      const rows = await query(sql, config.buildParams(params));

      if (config.transformResult) {
        return NextResponse.json(config.transformResult(rows, params));
      }

      return NextResponse.json({ data: rows });
    } catch (error) {
      console.error("[StatsBomb API Error]", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

export interface MultiQueryConfig {
  /** Determines which query branch to run based on the provided params */
  selectBranch: (
    params: Record<string, string>,
  ) => { queryFile: string; sqlParams: unknown[]; transformSql?: (sql: string) => string } | null;
  /** All parameter names to extract (required + optional) */
  requiredParams: string[];
  optionalParams?: string[];
  /** Custom validation that can return an error response */
  validate?: (params: Record<string, string>) => string | null;
  /** Optional transform applied to the rows before returning */
  transformResult?: (
    rows: Record<string, unknown>[],
    params: Record<string, string>,
  ) => unknown;
}

/**
 * Factory for routes that choose between multiple SQL files based on params.
 */
export function createMultiQueryHandler(config: MultiQueryConfig) {
  return async function GET(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams;
      const params: Record<string, string> = {};

      for (const name of config.requiredParams) {
        const value = searchParams.get(name);
        if (value) params[name] = value;
      }
      for (const name of config.optionalParams ?? []) {
        const value = searchParams.get(name);
        if (value) params[name] = value;
      }

      if (config.validate) {
        const error = config.validate(params);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }
      }

      const branch = config.selectBranch(params);
      if (!branch) {
        return NextResponse.json(
          { error: "Invalid parameter combination" },
          { status: 400 },
        );
      }

      let sql = loadQuery(branch.queryFile);
      if (branch.transformSql) {
        sql = branch.transformSql(sql);
      }

      const rows = await query(sql, branch.sqlParams);

      if (config.transformResult) {
        return NextResponse.json(config.transformResult(rows, params));
      }

      return NextResponse.json({ data: rows });
    } catch (error) {
      console.error("[StatsBomb API Error]", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
