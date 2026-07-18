import { Router } from "express";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { processOutbox } from "../services/outbox.js";
import { scanSlaTransitions } from "../services/slaScanner.js";
import { Ticket } from "../models/Ticket.js";

const router = Router();

function workerAuthorized(req: any) {
  const supplied = String(req.headers["x-outbox-worker-secret"] || "");
  return Boolean(env.outboxWorkerSecret && supplied.length === env.outboxWorkerSecret.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(env.outboxWorkerSecret)));
}

router.post("/process", async (req, res) => {
  if (!workerAuthorized(req)) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Worker authentication is required" } });
  return res.json(await processOutbox(Math.min(Number(req.body?.limit || 25), 100)));
});
router.post("/sla/scan", async (req, res) => {
  if (!workerAuthorized(req)) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Worker authentication is required" } });
  return res.json(await scanSlaTransitions());
});
router.post("/tickets/purge", async (req, res) => {
  if (!workerAuthorized(req)) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Worker authentication is required" } });
  const result = await Ticket.deleteMany({ deletedAt: { $exists: true }, purgeAfter: { $lte: new Date() } });
  return res.json({ purged: result.deletedCount });
});

export default router;
