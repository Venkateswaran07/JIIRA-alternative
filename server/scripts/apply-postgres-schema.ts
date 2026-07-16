import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { connectFirstAvailablePostgres } from "../src/config/postgresConnection.js";

const migrationUrl = new URL("../../supabase/migrations/20260716000000_initial_jira_schema.sql", import.meta.url);
const sql = await readFile(fileURLToPath(migrationUrl), "utf8");
const connected = await connectFirstAvailablePostgres();

try {
  await connected.pool.query(sql);
  console.log(`PostgreSQL schema applied successfully using ${connected.source}`);
} finally {
  await connected.pool.end();
}
