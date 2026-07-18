import crypto from "node:crypto";
import { Integration, OutboxDelivery, OutboxEvent } from "../models/Operational.js";
import { User } from "../models/User.js";
import { decryptSecret } from "../lib/crypto.js";
import { sendSlaAlertEmail } from "./mail.js";

type DomainEvent = {
  id?: string;
  organization: string;
  eventType: string;
  aggregateType?: string;
  aggregateId?: string;
  payload: Record<string, unknown>;
  dedupeKey?: string;
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
  const values = {
    organization: event.organization,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload,
    dedupeKey: event.dedupeKey,
    status: "pending",
    attempts: 0,
    nextAttemptAt: new Date(),
  };
  if (!event.dedupeKey) return OutboxEvent.create(values);
  return OutboxEvent.findOneAndUpdate(
    { organization: event.organization, dedupeKey: event.dedupeKey },
    { $setOnInsert: values },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function materializeDeliveries(event: any) {
  const integrations = await Integration.find({ organization: event.organization, kind: "webhook", active: true });
  for (const integration of integrations.filter((item: any) => subscribes(item, event.eventType))) {
    await OutboxDelivery.findOneAndUpdate(
      { event: event._id, channel: "webhook", destination: String(integration._id) },
      { $setOnInsert: { organization: event.organization, event: event._id, channel: "webhook", destination: String(integration._id), destinationRef: String(integration._id), status: "pending", attempts: 0, nextAttemptAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  const recipients = Array.isArray(event.payload?.emailRecipients) ? event.payload.emailRecipients : [];
  for (const recipient of recipients) {
    const destination = String(recipient?.userId || recipient?.email || "");
    if (!destination) continue;
    await OutboxDelivery.findOneAndUpdate(
      { event: event._id, channel: "email", destination },
      { $setOnInsert: { organization: event.organization, event: event._id, channel: "email", destination, destinationRef: recipient?.userId, payload: recipient, status: "pending", attempts: 0, nextAttemptAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
}

async function deliverOne(delivery: any, event: any) {
  if (delivery.channel === "webhook") {
    const integration = await Integration.findById(delivery.destinationRef || delivery.destination);
    if (!integration?.active) return;
    try {
      await deliverWebhook(integration, event);
      await Integration.findOneAndUpdate({ _id: integration._id }, { lastUsedAt: new Date(), lastDeliveryAt: new Date(), failureCount: 0, lastError: null });
    } catch (error) {
      await Integration.findOneAndUpdate({ _id: integration._id }, { failureCount: Number(integration.failureCount || 0) + 1, lastError: error instanceof Error ? error.message : "Webhook delivery failed", lastDeliveryAt: new Date() });
      throw error;
    }
    return;
  }
  const user = await User.findById(delivery.destinationRef || delivery.destination);
  if (!user || user.notificationPreferences?.slaAlerts === false) return;
  const payload = event.payload || {};
  const sent = await sendSlaAlertEmail({
    recipient: { name: user.name, email: user.email },
    ticketKey: String(payload.ticketKey),
    ticketTitle: String(payload.ticketTitle),
    state: payload.state === "breached" ? "breached" : "due_soon",
    deadline: new Date(String(payload.deadline)),
    href: String(payload.href),
  });
  if (!sent) throw new Error("SLA email delivery failed");
}

export async function processOutbox(limit = 25) {
  const pending = await OutboxEvent.find({ status: "pending", nextAttemptAt: { $lte: new Date() } }).sort("createdAt").limit(limit);
  let processed = 0, failed = 0;
  for (const event of pending) {
    const claimed = await OutboxEvent.findOneAndUpdate({ _id: event._id, status: "pending" }, { status: "processing" }, { new: true });
    if (!claimed) continue;
    try {
      await materializeDeliveries(claimed);
      const deliveries = await OutboxDelivery.find({ event: claimed._id, status: "pending", nextAttemptAt: { $lte: new Date() } });
      for (const delivery of deliveries) {
        const active = await OutboxDelivery.findOneAndUpdate({ _id: delivery._id, status: "pending" }, { status: "processing", attempts: Number(delivery.attempts || 0) + 1 }, { new: true });
        if (!active) continue;
        try {
          await deliverOne(active, claimed);
          await OutboxDelivery.findOneAndUpdate({ _id: active._id }, { status: "processed", processedAt: new Date(), lastError: null, lastErrorAt: null });
        } catch (error) {
          const attempts = Number(active.attempts || 1);
          const terminal = attempts >= 8;
          await OutboxDelivery.findOneAndUpdate({ _id: active._id }, {
            status: terminal ? "failed" : "pending",
            nextAttemptAt: new Date(Date.now() + Math.min(60 * 60_000, 2 ** attempts * 1000)),
            lastError: error instanceof Error ? error.message : "Delivery failed",
            lastErrorAt: new Date(),
          });
          failed += 1;
        }
      }
      const remaining = await OutboxDelivery.countDocuments({ event: claimed._id, status: { $in: ["pending", "processing"] } });
      if (remaining === 0) {
        const terminalFailures = await OutboxDelivery.countDocuments({ event: claimed._id, status: "failed" });
        await OutboxEvent.findOneAndUpdate({ _id: event._id }, { status: terminalFailures ? "failed" : "processed", processedAt: new Date(), lastError: terminalFailures ? `${terminalFailures} delivery destination(s) failed` : null });
        processed += terminalFailures ? 0 : 1;
      } else {
        await OutboxEvent.findOneAndUpdate({ _id: event._id }, { status: "pending", nextAttemptAt: new Date(Date.now() + 2_000) });
      }
    } catch (error) {
      await OutboxEvent.findOneAndUpdate({ _id: event._id }, { status: "pending", nextAttemptAt: new Date(Date.now() + 5_000), lastError: error instanceof Error ? error.message : "Delivery materialization failed" });
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
