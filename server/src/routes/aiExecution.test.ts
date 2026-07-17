import assert from "node:assert/strict";
import test from "node:test";
import type { AuthRequest } from "../middleware/auth.js";
import { executeAiRequest } from "./ai.js";

function requestFor(role: "admin" | "manager" | "engineer" | "designer") {
  return {
    user: { userId: "user", organizationId: "organization", email: "user@example.com", role },
    headers: {},
  } as AuthRequest;
}

test("AI executor validates its input before dispatching", async () => {
  const result = await executeAiRequest(requestFor("admin"), { method: "TRACE", path: "/projects" });
  assert.equal(result.status, 400);
});

test("AI executor cannot recursively dispatch itself", async () => {
  const result = await executeAiRequest(requestFor("admin"), { method: "POST", path: "/ai/execute" });
  assert.equal(result.status, 400);
  assert.deepEqual(result.payload, { message: "AI execution cannot call itself" });
});

test("AI executor preserves role access checks before dispatching", async () => {
  const result = await executeAiRequest(requestFor("engineer"), { method: "POST", path: "/projects", body: {} });
  assert.equal(result.status, 403);
});
