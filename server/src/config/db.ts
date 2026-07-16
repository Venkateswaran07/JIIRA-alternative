import { connectPostgres } from "./postgres.js";

export async function connectDb() {
  await connectPostgres();
}
