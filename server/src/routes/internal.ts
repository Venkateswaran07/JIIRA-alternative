import { Router } from "express";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { processOutbox } from "../services/outbox.js";

const router = Router();

router.post("/process", async (req, res) => {
  const supplied = String(req.headers["x-outbox-worker-secret"] || "");
  if (!env.outboxWorkerSecret || supplied.length !== env.outboxWorkerSecret.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(env.outboxWorkerSecret))) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Worker authentication is required" } });
  }
  return res.json(await processOutbox(Math.min(Number(req.body?.limit || 25), 100)));
});

export default router;
