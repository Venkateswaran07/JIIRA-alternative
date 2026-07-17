import assert from "node:assert/strict";
import test from "node:test";
import { builtInRoleSeeds, permissionForEndpoint } from "./constants/permissions.js";

test("custom-role permission mapping covers role management and core mutations", () => {
  assert.equal(permissionForEndpoint("GET", "/roles"), "team.view");
  assert.equal(permissionForEndpoint("POST", "/roles"), "roles.manage");
  assert.equal(permissionForEndpoint("POST", "/projects"), "projects.manage");
  assert.equal(permissionForEndpoint("PATCH", "/tickets/example"), "tickets.edit");
  assert.equal(permissionForEndpoint("POST", "/tickets/bulk"), "tickets.manage");
  assert.equal(permissionForEndpoint("GET", "/reports/cycle-time"), "reports.view");
});

test("built-in role seeds preserve administrator access and contributor boundaries", () => {
  const administrator = builtInRoleSeeds.find((role) => role.slug === "admin");
  const engineer = builtInRoleSeeds.find((role) => role.slug === "engineer");

  assert.ok(administrator);
  assert.equal(administrator.permissions.length, 26);
  assert.ok(administrator.permissions.includes("roles.manage"));
  assert.ok(engineer);
  assert.ok(engineer.permissions.includes("tickets.create"));
  assert.equal(engineer.permissions.includes("projects.manage"), false);
});
