import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL || "";
const databaseOptIn = process.env.ENABLE_DATABASE === "true";
const hasDatabase = Boolean(databaseUrl) && databaseOptIn;

const pool = hasDatabase
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined
    })
  : null;

export function isDatabaseEnabled() {
  return Boolean(pool);
}

export async function query(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }
  return pool.query(text, params);
}

export async function withTransaction(callback) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

