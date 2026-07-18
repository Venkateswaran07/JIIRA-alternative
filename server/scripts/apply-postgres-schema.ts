import "dotenv/config";
import crypto from "node:crypto";
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
  await connected.pool.query(`
    create table if not exists schema_migrations (
      version text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
  for (const migrationFile of migrationFiles) {
    const sql = await readFile(new URL(migrationFile, migrationsUrl), "utf8");
    const version = migrationFile.replace(/\.sql$/, "");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    const existing = await connected.pool.query<{ checksum: string }>("select checksum from schema_migrations where version = $1", [version]);
    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) throw new Error(`Migration checksum changed after application: ${migrationFile}`);
      console.log(`Skipped ${migrationFile}`);
      continue;
    }
    const client = await connected.pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (version, checksum) values ($1, $2)", [version, checksum]);
      await client.query("commit");
      console.log(`Applied ${migrationFile}`);
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  console.log(`PostgreSQL schema applied successfully using ${connected.source}`);
} finally {
  await connected.pool.end();
}
