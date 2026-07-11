import assert from "node:assert/strict";
import test from "node:test";
import { aiEndpointsForRole, canRoleAccessAiEndpoint, isConfirmationRequired, normalizeAiPath } from "./aiAccess.js";
import { openApiDocument } from "./openapi.js";

test("AI endpoint access mirrors existing user RBAC", () => {
  assert.equal(canRoleAccessAiEndpoint("manager", "POST", "/projects").allowed, true);
  assert.equal(canRoleAccessAiEndpoint("engineer", "POST", "/projects").allowed, false);
  assert.equal(canRoleAccessAiEndpoint("designer", "PATCH", "/tickets/example/status").allowed, true);
  assert.equal(canRoleAccessAiEndpoint("manager", "GET", "/api/v1/tickets").allowed, true);
});

test("AI endpoint discovery only returns endpoints available to the user role", () => {
  const engineerEndpoints = aiEndpointsForRole("engineer").map((endpoint) => `${endpoint.method} ${endpoint.path}`);
  assert.ok(engineerEndpoints.includes("GET /tickets"));
  assert.ok(engineerEndpoints.includes("PATCH /tickets/:id/status"));
  assert.equal(engineerEndpoints.includes("DELETE /tickets/:id"), false);
});

test("AI execution requires confirmation for delete and destructive actions", () => {
  assert.equal(isConfirmationRequired("DELETE", "/tickets/example"), true);
  assert.equal(isConfirmationRequired("POST", "/projects/example/archive"), true);
  assert.equal(isConfirmationRequired("POST", "/notifications/read-all"), true);
  assert.equal(isConfirmationRequired("PATCH", "/tickets/example/status"), false);
});

test("AI path normalization accepts direct API paths", () => {
  assert.equal(normalizeAiPath("/api/v1/tickets?status=Backlog"), "/tickets?status=Backlog");
  assert.equal(normalizeAiPath("/api/projects"), "/projects");
});

test("OpenAPI marks destructive endpoints as requiring confirmation", () => {
  const deleteTicket = openApiDocument.paths["/tickets/{id}"]?.delete as { "x-requires-confirmation"?: boolean };
  const archiveProject = openApiDocument.paths["/projects/{id}/archive"]?.post as { "x-requires-confirmation"?: boolean };
  const statusUpdate = openApiDocument.paths["/tickets/{id}/status"]?.patch as { "x-requires-confirmation"?: boolean };
  assert.equal(deleteTicket["x-requires-confirmation"], true);
  assert.equal(archiveProject["x-requires-confirmation"], true);
  assert.equal(statusUpdate["x-requires-confirmation"], undefined);
});
