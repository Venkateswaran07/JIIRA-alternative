import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { connectFirstAvailablePostgres } from "../src/config/postgresConnection.js";

const migrationsUrl = new URL("../../supabase/migrations/", import.meta.url);
const migrationsPath = fileURLToPath(migrationsUrl);
const migrationFiles = (await readdir(migrationsPath))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const connected = await connectFirstAvailablePostgres();

try {
  for (const migrationFile of migrationFiles) {
    const sql = await readFile(new URL(migrationFile, migrationsUrl), "utf8");
    await connected.pool.query(sql);
    console.log(`Applied ${migrationFile}`);
  }
  console.log(`PostgreSQL schema applied successfully using ${connected.source}`);
} finally {
  await connected.pool.end();
}
