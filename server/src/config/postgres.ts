import type pg from "pg";
import { connectFirstAvailablePostgres } from "./postgresConnection.js";

export let postgres: pg.Pool;

export async function connectPostgres() {
  const connected = await connectFirstAvailablePostgres();
  postgres = connected.pool;
  console.log(`PostgreSQL connected using ${connected.source}`);
}
