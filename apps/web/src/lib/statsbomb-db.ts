import "server-only";

import { Pool, type QueryResultRow } from "pg";
import type { ConnectionOptions } from "tls";

const connectionString = process.env.STATSBOMB_DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Missing required environment variable: STATSBOMB_DATABASE_URL",
  );
}

function getSslConfig(): ConnectionOptions | boolean | undefined {
  const caRaw = process.env.STATSBOMB_DATABASE_SSL_CA;
  const ca = caRaw?.replaceAll("\\n", "\n");
  if (ca) {
    return { rejectUnauthorized: true, ca };
  }
  // Accept provider cert when custom CA is not provided
  return { rejectUnauthorized: false };
}

declare global {
  var __statsbombPool__: Pool | undefined;
}

function getPool(): Pool {
  const existing = globalThis.__statsbombPool__;
  if (existing) return existing;

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

const pool = getPool();

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

export { pool };
