import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export const postgres = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl?.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
});

export async function connectPostgres() {
  if (!env.databaseUrl) throw new Error("DATABASE_URL is required for PostgreSQL");
  await postgres.query("select 1");
}
