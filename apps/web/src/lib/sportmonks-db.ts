import "server-only";

import { Pool, types, type QueryResultRow } from "pg";
import type { ConnectionOptions } from "tls";

// Return Postgres bigint (int8, OID 20) as JS number instead of string.
// Idempotent: same call in statsbomb-db.ts — pg type parsers are global.
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const connectionString = process.env.SPORTMONKS_DATABASE_URL;

function getSslConfig(): ConnectionOptions | boolean | undefined {
  const caRaw = process.env.SPORTMONKS_DATABASE_SSL_CA;
  const ca = caRaw?.replaceAll("\\n", "\n");
  if (ca) {
    return { rejectUnauthorized: true, ca };
  }
  // Accept provider cert when custom CA is not provided
  return { rejectUnauthorized: false };
}

/* ------------------------------------------------------------------ */
/*  Pool singleton                                                     */
/* ------------------------------------------------------------------ */

declare global {
  var __sportmonksPool__: Pool | undefined;
}

function getPool(): Pool {
  const existing = globalThis.__sportmonksPool__;
  if (existing) return existing;

  if (!connectionString) {
    throw new SportMonksNotConfiguredError();
  }

  const pool = new Pool({
    connectionString,
    ssl: getSslConfig(),
    max: 5,
    min: 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

  globalThis.__sportmonksPool__ = pool;

  return pool;
}

/* ------------------------------------------------------------------ */
/*  Error class                                                        */
/* ------------------------------------------------------------------ */

export class SportMonksNotConfiguredError extends Error {
  constructor() {
    super("SportMonks database is not configured");
    this.name = "SportMonksNotConfiguredError";
  }
}

/* ------------------------------------------------------------------ */
/*  Public helpers                                                     */
/* ------------------------------------------------------------------ */

/** Returns `false` when `SPORTMONKS_DATABASE_URL` is not set. */
export function isSportMonksConfigured(): boolean {
  return Boolean(connectionString);
}

const READ_ONLY_QUERY = /^\s*(select|with)\b/i;

/**
 * Runs a read-only query against the SportMonks PostgreSQL database.
 * Throws `SportMonksNotConfiguredError` when the env var is missing.
 */
export async function query<T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  if (!READ_ONLY_QUERY.test(sql)) {
    throw new Error(
      "External database query rejected. Only SELECT/CTE queries are allowed.",
    );
  }

  const start = Date.now();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin read only");
    const result = await client.query<T>(sql, params);
    await client.query("commit");

    if (process.env.NODE_ENV === "development") {
      console.log(`[SportMonks] Query executed in ${Date.now() - start}ms`);
    }

    return result.rows;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
