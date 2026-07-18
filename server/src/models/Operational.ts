import { createPgModel } from "../db/pgModel.js";
import { Organization } from "./Organization.js";
import { User } from "./User.js";

export const Session = createPgModel({ table: "sessions", columns: ["user", "organization", "tokenHash", "expiresAt", "revokedAt", "userAgent"], columnMap: { user: "user_id" }, relations: { user: { model: () => User }, organization: { model: () => Organization } } });
export const ActionToken = createPgModel({ table: "action_tokens", columns: ["user", "organization", "kind", "tokenHash", "expiresAt", "usedAt"], columnMap: { user: "user_id" }, relations: { user: { model: () => User }, organization: { model: () => Organization } } });
export const Notification = createPgModel({ table: "notifications", columns: ["organization", "user", "type", "title", "body", "entityType", "entityId", "href", "metadata", "readAt"], columnMap: { user: "user_id" }, json: ["metadata"], defaults: { metadata: {} }, relations: { user: { model: () => User } } });
export const AuditEvent = createPgModel({ table: "audit_events", columns: ["organization", "actor", "action", "entityType", "entityId", "metadata"], json: ["metadata"], defaults: { metadata: {} }, relations: { actor: { model: () => User } } });
export const Integration = createPgModel({ table: "integrations", columns: ["organization", "kind", "name", "secretHash", "secretCiphertext", "createdBy", "url", "events", "active", "failureCount", "lastError", "lastDeliveryAt", "lastUsedAt"], json: ["events"] , defaults: { events: [], active: true, failureCount: 0 } });
export const OutboxEvent = createPgModel({ table: "outbox_events", columns: ["organization", "eventType", "aggregateType", "aggregateId", "payload", "status", "attempts", "nextAttemptAt", "lastError", "processedAt"], json: ["payload"], defaults: { payload: {}, status: "pending", attempts: 0 } });
