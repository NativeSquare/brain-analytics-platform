import { readFileSync } from "node:fs";
import { join } from "node:path";

const queryCache = new Map<string, string>();

/**
 * Loads a SQL query file from `queries/<directory>/` and caches it in memory.
 * Subsequent calls for the same filename return the cached string.
 *
 * @param filename - The .sql filename (e.g. "fixtures.sql")
 * @param directory - The subdirectory under `queries/` (defaults to "statsbomb")
 */
export function loadQuery(
  filename: string,
  directory: string = "statsbomb",
): string {
  const cacheKey = `${directory}/${filename}`;
  const cached = queryCache.get(cacheKey);
  if (cached) return cached;

  const filePath = join(process.cwd(), "queries", directory, filename);
  const sql = readFileSync(filePath, "utf-8").trim();
  queryCache.set(cacheKey, sql);
  return sql;
}

/** Visible for testing only -- clears the internal cache. */
export function _clearQueryCache(): void {
  queryCache.clear();
}
