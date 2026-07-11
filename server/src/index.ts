import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import aiRoutes from "./routes/ai.js";
import analysisRoutes from "./routes/analysis.js";
import authRoutes from "./routes/auth.js";
import dataRoutes from "./routes/data.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "itrack-api" }));
app.use("/api/auth", authRoutes);
app.use("/api", dataRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/ai", aiRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  res.status(500).json({ message });
});

await connectDb();
app.listen(env.port, () => {
  console.log(`I-TRACK API listening on http://localhost:${env.port}`);
});
