import crypto from "node:crypto";
import { Integration, OutboxEvent } from "../models/Operational.js";
import { decryptSecret } from "../lib/crypto.js";

type DomainEvent = {
  id?: string;
  organization: string;
  eventType: string;
  aggregateType?: string;
  aggregateId?: string;
  payload: Record<string, unknown>;
};

function eventBody(event: any) {
  return {
    id: String(event._id || event.id),
    type: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload || {},
    occurredAt: event.createdAt || new Date().toISOString(),
  };
}

function subscribes(integration: any, eventType: string) {
  const events = Array.isArray(integration.events) ? integration.events.map(String) : [];
  return events.length === 0 || events.includes("*") || events.includes(eventType);
}

async function deliverWebhook(integration: any, event: any) {
  if (!integration.url) throw new Error("Webhook URL is missing");
  const body = JSON.stringify(eventBody(event));
  const secret = integration.secretCiphertext ? decryptSecret(integration.secretCiphertext) : integration.secretHash || "";
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(integration.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "I-TRACK-Webhook/1.0", "X-ITrack-Event": event.eventType, "X-ITrack-Signature": `sha256=${signature}` },
      body,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function enqueueOutboxEvent(event: DomainEvent) {
  return OutboxEvent.create({
    organization: event.organization,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload,
    status: "pending",
    attempts: 0,
    nextAttemptAt: new Date(),
  });
}

export async function processOutbox(limit = 25) {
  const pending = await OutboxEvent.find({ status: "pending", nextAttemptAt: { $lte: new Date() } }).sort("createdAt").limit(limit);
  let processed = 0;
  let failed = 0;
  for (const event of pending) {
    const claimed = await OutboxEvent.findOneAndUpdate({ _id: event._id, status: "pending" }, { status: "processing", attempts: Number(event.attempts || 0) + 1 }, { new: true });
    if (!claimed) continue;
    try {
      const integrations = await Integration.find({ organization: event.organization, kind: "webhook", active: true });
      for (const integration of integrations.filter((item: any) => subscribes(item, event.eventType))) {
        try {
          await deliverWebhook(integration, claimed);
          await Integration.findOneAndUpdate({ _id: integration._id }, { lastUsedAt: new Date(), lastDeliveryAt: new Date(), failureCount: 0, lastError: null });
        } catch (error) {
          await Integration.findOneAndUpdate({ _id: integration._id }, { failureCount: Number(integration.failureCount || 0) + 1, lastError: error instanceof Error ? error.message : "Webhook delivery failed", lastDeliveryAt: new Date() });
          throw error;
        }
      }
      await OutboxEvent.findOneAndUpdate({ _id: event._id }, { status: "processed", processedAt: new Date(), lastError: null });
      processed += 1;
    } catch (error) {
      const attempts = Number(claimed.attempts || 1);
      const terminal = attempts >= 8;
      await OutboxEvent.findOneAndUpdate({ _id: event._id }, { status: terminal ? "failed" : "pending", nextAttemptAt: new Date(Date.now() + Math.min(60 * 60_000, 2 ** attempts * 1000)), lastError: error instanceof Error ? error.message : "Webhook delivery failed" });
      failed += 1;
    }
  }
  return { processed, failed, inspected: pending.length };
}

export async function testIntegration(integration: any) {
  if (integration.kind !== "webhook") return { ok: Boolean(integration.active), status: integration.active ? "active" : "inactive" };
  const event = { _id: `test-${Date.now()}`, eventType: "integration.test", aggregateType: "integration", aggregateId: String(integration._id), payload: { test: true }, createdAt: new Date().toISOString() };
  await deliverWebhook(integration, event);
  await Integration.findOneAndUpdate({ _id: integration._id }, { lastUsedAt: new Date(), lastDeliveryAt: new Date(), failureCount: 0, lastError: null });
  return { ok: true, status: "delivered" };
}
