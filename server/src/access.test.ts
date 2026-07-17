import assert from "node:assert/strict";
import test from "node:test";
import { catalogEndpointsWithoutAccessPolicy, hasExplicitAccessPolicy, rolesForEndpoint } from "./middleware/access.js";
import { openApiDocument } from "./openapi.js";

test("RBAC protects administrative and planning endpoints", () => {
  assert.deepEqual(rolesForEndpoint("GET", "/audit-logs"), ["admin"]);
  assert.deepEqual(rolesForEndpoint("POST", "/invitations"), ["admin"]);
  assert.deepEqual(rolesForEndpoint("DELETE", "/organization"), ["admin"]);
  assert.deepEqual(rolesForEndpoint("PATCH", "/settings"), ["admin"]);
  assert.deepEqual(rolesForEndpoint("PATCH", "/sla/policy"), ["admin", "manager"]);
  assert.deepEqual(rolesForEndpoint("POST", "/projects"), ["admin", "manager"]);
  assert.deepEqual(rolesForEndpoint("POST", "/companies/company-1/groups"), ["admin"]);
  assert.deepEqual(rolesForEndpoint("GET", "/companies/company-1/groups"), ["admin", "manager", "engineer", "designer"]);
  assert.deepEqual(rolesForEndpoint("POST", "/cycles"), ["admin", "manager"]);
  assert.deepEqual(rolesForEndpoint("POST", "/sprints/123/start"), ["admin", "manager"]);
  assert.deepEqual(rolesForEndpoint("PATCH", "/tickets/123"), ["admin", "manager", "engineer", "designer"]);
  assert.deepEqual(rolesForEndpoint("DELETE", "/projects/123"), ["admin"]);
  assert.deepEqual(rolesForEndpoint("GET", "/unknown-endpoint"), []);
});

test("RBAC permits contributor ticket collaboration and authenticated reads", () => {
  const everyone = ["admin", "manager", "engineer", "designer"];
  assert.deepEqual(rolesForEndpoint("PATCH", "/tickets/123/status"), everyone);
  assert.deepEqual(rolesForEndpoint("POST", "/tickets/123/comments"), everyone);
  assert.deepEqual(rolesForEndpoint("GET", "/projects"), everyone);
});

test("OpenAPI document covers the catalog and declares bearer security and roles", () => {
  assert.equal(openApiDocument.openapi, "3.1.0");
  assert.ok(Object.keys(openApiDocument.paths).length >= 50);
  const operation = openApiDocument.paths["/projects"]?.post as { security?: unknown; "x-allowed-roles"?: string[] };
  assert.ok(operation.security);
  assert.deepEqual(operation["x-allowed-roles"], ["admin", "manager"]);
  const settings = openApiDocument.paths["/settings"]?.patch as { security?: unknown; "x-allowed-roles"?: string[] };
  assert.ok(settings.security);
  assert.deepEqual(settings["x-allowed-roles"], ["admin"]);
  const cycle = openApiDocument.paths["/cycles"]?.post as { security?: unknown; "x-allowed-roles"?: string[] };
  assert.ok(cycle.security);
  assert.deepEqual(cycle["x-allowed-roles"], ["admin", "manager"]);
  const login = openApiDocument.paths["/auth/login"]?.post as { security?: unknown[] };
  assert.deepEqual(login.security, []);
});

test("every catalog endpoint has an explicit fail-closed RBAC policy", async () => {
  const { apiCatalog } = await import("./apiCatalog.js");
  assert.deepEqual(catalogEndpointsWithoutAccessPolicy, []);
  for (const endpoint of Object.values(apiCatalog.groups).flat()) {
    const [method, path] = endpoint.split(" ");
    assert.equal(hasExplicitAccessPolicy(method, path), true, endpoint);
  }
  assert.deepEqual(rolesForEndpoint("POST", "/team"), ["admin"]);
  assert.deepEqual(rolesForEndpoint("POST", "/tickets"), ["admin", "manager", "engineer", "designer"]);
});

test("RBAC resolves access policy for versioned API paths and sub-routed AI endpoints", async () => {
  const everyone = ["admin", "manager", "engineer", "designer"];
  assert.deepEqual(rolesForEndpoint("GET", "/api/v1/ai/conversations"), everyone);
  assert.deepEqual(rolesForEndpoint("POST", "/api/v1/ai/chat"), everyone);
  assert.deepEqual(rolesForEndpoint("POST", "/api/v1/analysis/sprint-risk"), ["admin", "manager"]);

  const { enforceApiAccess } = await import("./middleware/access.js");
  let nextCalled = false;
  const mockReq = {
    method: "GET",
    originalUrl: "/api/v1/ai/conversations",
    baseUrl: "/api/v1/ai",
    path: "/conversations",
    user: { role: "engineer", permissions: ["ai.use"] },
  } as any;
  const mockRes = {
    status: (code: number) => ({ json: (body: any) => ({ code, body }) }),
  } as any;

  enforceApiAccess(mockReq, mockRes, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

