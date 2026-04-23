import "server-only";

import { Pool, types, type QueryResultRow } from "pg";
import type { ConnectionOptions } from "tls";

// Return Postgres bigint (int8, OID 20) as JS number instead of string.
// IDs in StatsBomb / SportMonks fit well under Number.MAX_SAFE_INTEGER (2^53).
// Without this, strict equality checks like `m.match_id === selectedMatchId`
// break as soon as one side is coerced to a number.
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

// Return Postgres numeric/decimal (OID 1700) as JS number instead of string.
// Stats like fouls_per_match, xg, possession% fit comfortably in f64; without
// this, UI code calling `.toFixed()` on the value crashes.
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

function getSslConfig(): ConnectionOptions | boolean | undefined {
  const caRaw = process.env.STATSBOMB_DATABASE_SSL_CA;
  const ca = caRaw?.replaceAll("\\n", "\n");
  if (ca) {
    return { rejectUnauthorized: true, ca };
  }
  return { rejectUnauthorized: false };
}

declare global {
  // eslint-disable-next-line no-var
  var __statsbombPool__: Pool | undefined;
}

function getPool(): Pool {
  const existing = globalThis.__statsbombPool__;
  if (existing) return existing;

  const connectionString = process.env.STATSBOMB_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Missing required environment variable: STATSBOMB_DATABASE_URL",
    );
  }

  const pool = new Pool({
    connectionString,
    ssl: getSslConfig(),
    max: 10,
    min: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

  globalThis.__statsbombPool__ = pool;
  return pool;
}

const READ_ONLY_QUERY = /^\s*(select|with)\b/i;

export async function query<T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  if (!READ_ONLY_QUERY.test(sql)) {
    throw new Error(
      "External database query rejected. Only SELECT/CTE queries are allowed.",
    );
  }

  const pool = getPool();
  const start = Date.now();
  const client = await pool.connect();

  try {
    await client.query("begin read only");
    const result = await client.query<T>(sql, params);
    await client.query("commit");

    if (process.env.NODE_ENV === "development") {
      console.log(`[StatsBomb] Query executed in ${Date.now() - start}ms`);
    }

    return result.rows;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
