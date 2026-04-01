/**
 * Converts a snake_case string to camelCase.
 *
 * @example snakeToCamel("starting_at") // "startingAt"
 * @example snakeToCamel("goal_difference") // "goalDifference"
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Converts all keys of a flat object from snake_case to camelCase.
 * Returns a new object — the original is not mutated.
 */
export function rowToCamel<T extends Record<string, unknown>>(
  row: T,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    result[snakeToCamel(key)] = row[key];
  }
  return result;
}

/**
 * Converts all keys in every row from snake_case to camelCase.
 */
export function rowsToCamel<T extends Record<string, unknown>>(
  rows: T[],
): Record<string, unknown>[] {
  return rows.map(rowToCamel);
}
