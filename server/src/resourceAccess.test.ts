import test from "node:test";
import assert from "node:assert/strict";
import { canAccessProject, hasWorkspaceWideAccess, projectScope } from "./services/resourceAccess.js";

const request = (user: any) => ({ user }) as any;

test("project-scoped members can only access projects they belong to", () => {
  const req = request({ userId: "user-a", organizationId: "org-a", role: "engineer", workspaceAccessSource: "direct" });
  assert.equal(canAccessProject(req, { organization: "org-a", members: ["user-a"] }), true);
  assert.equal(canAccessProject(req, { organization: "org-a", members: ["user-b"] }), false);
  assert.equal(canAccessProject(req, { organization: "org-b", members: ["user-a"] }), false);
  assert.deepEqual(projectScope(req), { members: "user-a" });
});

test("organization and group access is workspace-wide", () => {
  for (const source of ["group", "organization"]) {
    const req = request({ userId: "user-a", organizationId: "org-a", role: "engineer", workspaceAccessSource: source });
    assert.equal(hasWorkspaceWideAccess(req), true);
    assert.equal(canAccessProject(req, { organization: "org-a", members: ["user-b"] }), true);
    assert.deepEqual(projectScope(req), {});
  }
});
