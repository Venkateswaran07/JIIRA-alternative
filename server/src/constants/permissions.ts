export const permissionKeys = [
  "workspace.view",
  "organization.manage",
  "organization.delete",
  "roles.manage",
  "team.view",
  "team.manage",
  "notifications.view",
  "projects.view",
  "projects.manage",
  "tickets.view",
  "tickets.create",
  "tickets.edit",
  "tickets.manage",
  "planning.view",
  "planning.manage",
  "resources.view",
  "resources.manage",
  "reports.view",
  "settings.manage",
  "sla.view",
  "sla.manage",
  "audit.view",
  "integrations.manage",
  "data.export",
  "data.import",
  "ai.use",
] as const;

export type Permission = typeof permissionKeys[number];

export type BuiltInRole = "admin" | "manager" | "engineer" | "designer";

export type RoleSeed = {
  name: string;
  slug: BuiltInRole;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  rank: number;
};

const contributorPermissions: Permission[] = [
  "workspace.view",
  "team.view",
  "notifications.view",
  "projects.view",
  "tickets.view",
  "tickets.create",
  "tickets.edit",
  "planning.view",
  "resources.view",
  "sla.view",
  "ai.use",
];

export const builtInRoleSeeds: RoleSeed[] = [
  {
    name: "Administrator",
    slug: "admin",
    description: "Full control of the workspace, users, roles, and data.",
    permissions: [...permissionKeys],
    isSystem: true,
    rank: 100,
  },
  {
    name: "Manager",
    slug: "manager",
    description: "Manage delivery work without workspace administration.",
    permissions: [
      ...contributorPermissions,
      "projects.manage",
      "tickets.manage",
      "planning.manage",
      "resources.manage",
      "reports.view",
      "sla.manage",
    ],
    isSystem: true,
    rank: 70,
  },
  {
    name: "Engineer",
    slug: "engineer",
    description: "Create and update assigned delivery work.",
    permissions: [...contributorPermissions],
    isSystem: true,
    rank: 40,
  },
  {
    name: "Designer",
    slug: "designer",
    description: "Create and update assigned delivery work.",
    permissions: [...contributorPermissions],
    isSystem: true,
    rank: 30,
  },
];

export const builtInRoleSlugs = builtInRoleSeeds.map((role) => role.slug);

export function isPermission(value: string): value is Permission {
  return (permissionKeys as readonly string[]).includes(value);
}

export function roleSeedFor(slug: string) {
  return builtInRoleSeeds.find((role) => role.slug === slug);
}

const permissionRules: Array<{ permission: Permission; endpoints: string[] }> = [
  { permission: "workspace.view", endpoints: [
    "GET /workspaces", "GET /companies", "GET /companies/:companyId/workspaces", "GET /companies/:companyId/members",
    "GET /me", "GET /team", "GET /dashboard", "GET /my-work", "GET /notifications", "GET /notifications/:id",
  ] },
  { permission: "team.view", endpoints: ["GET /users", "GET /users/:id", "GET /roles"] },
  { permission: "team.manage", endpoints: [
    "POST /team", "POST /invitations", "POST /invitations/:id/resend", "DELETE /invitations/:id",
    "POST /users/:id/deactivate", "POST /users/:id/reactivate", "DELETE /users/:id",
  ] },
  { permission: "roles.manage", endpoints: ["POST /roles", "PATCH /roles/:id", "DELETE /roles/:id"] },
  { permission: "projects.view", endpoints: ["GET /projects", "GET /projects/:id"] },
  { permission: "projects.manage", endpoints: [
    "POST /projects", "PATCH /projects/:id", "DELETE /projects/:id", "PUT /projects/:id/members",
    "POST /projects/:id/archive", "POST /projects/:id/restore",
  ] },
  { permission: "planning.view", endpoints: ["GET /backlog", "GET /sprints", "GET /cycles", "GET /cycles/:id"] },
  { permission: "planning.manage", endpoints: [
    "POST /sprints", "PATCH /sprints/:id", "DELETE /sprints/:id", "POST /sprints/:id/start",
    "POST /sprints/:id/complete", "POST /sprints/:id/reopen", "POST /cycles", "PATCH /cycles/:id", "DELETE /cycles/:id",
  ] },
  { permission: "tickets.view", endpoints: ["GET /tickets", "GET /tickets/:ticketId", "GET /tickets/:id/history"] },
  { permission: "tickets.create", endpoints: ["POST /tickets"] },
  { permission: "tickets.edit", endpoints: [
    "PATCH /tickets/:id", "POST /tickets/:id/assign", "PATCH /tickets/:id/status", "PATCH /tickets/:id/rank",
    "POST /tickets/:id/watch", "DELETE /tickets/:id/watch", "POST /tickets/:id/comments", "PATCH /tickets/:id/comments/:commentId",
    "DELETE /tickets/:id/comments/:commentId", "POST /tickets/:id/work-logs", "PATCH /tickets/:id/work-logs/:logId",
    "DELETE /tickets/:id/work-logs/:logId", "POST /tickets/:id/attachments", "DELETE /tickets/:id/attachments/:attachmentId",
  ] },
  { permission: "tickets.manage", endpoints: [
    "POST /tickets/bulk", "POST /tickets/:id/links", "POST /tickets/:id/archive", "POST /tickets/:id/restore",
    "POST /tickets/:id/clone", "DELETE /tickets/:id", "PATCH /tickets/:id/dependencies",
  ] },
  { permission: "resources.view", endpoints: ["GET /resources/:kind", "GET /resources/:kind/:id"] },
  { permission: "resources.manage", endpoints: ["POST /resources/:kind", "PATCH /resources/:kind/:id", "DELETE /resources/:kind/:id"] },
  { permission: "reports.view", endpoints: ["GET /reports", "GET /reports/cycle-time", "POST /analysis/sprint-risk"] },
  { permission: "sla.view", endpoints: ["GET /sla"] },
  { permission: "sla.manage", endpoints: ["PATCH /sla/policy"] },
  { permission: "settings.manage", endpoints: ["GET /settings", "PATCH /settings"] },
  { permission: "audit.view", endpoints: ["GET /audit-logs", "GET /audit-logs/export"] },
  { permission: "integrations.manage", endpoints: ["GET /integrations/:kind", "POST /integrations/:kind", "DELETE /integrations/:kind/:id"] },
  { permission: "data.export", endpoints: ["GET /export"] },
  { permission: "data.import", endpoints: ["POST /import/resources"] },
  { permission: "organization.manage", endpoints: ["GET /organization/usage", "PATCH /organization"] },
  { permission: "organization.delete", endpoints: ["DELETE /organization"] },
  { permission: "ai.use", endpoints: [
    "GET /ai/endpoints", "POST /ai/execute", "GET /ai/models", "GET /ai/conversations", "GET /ai/conversations/:id/messages",
    "DELETE /ai/conversations/:id", "POST /ai/chat", "POST /ai/generate-tickets", "POST /ai/confirm-ticket-plan", "GET /analysis/examples",
  ] },
  { permission: "notifications.view", endpoints: ["PATCH /notifications/:id/read", "POST /notifications/read-all"] },
];

function endpointMatches(method: string, path: string, endpoint: string) {
  const [endpointMethod, endpointPath] = endpoint.split(" ") as [string, string];
  return endpointMethod === method.toUpperCase()
    && new RegExp(`^${endpointPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:[^/]+/g, "[^/]+")}$`).test(path);
}

export function permissionForEndpoint(method: string, path: string): Permission | undefined {
  const clean = `/${path}`.replace(/\/+/g, "/");
  const normalized = clean
    .replace(/^\/api\/v1(?=\/|$)/, "")
    .replace(/^\/api(?=\/|$)/, "")
    .replace(/\/$/, "") || "/";
  return permissionRules.find((rule) => rule.endpoints.some((endpoint) => endpointMatches(method, normalized, endpoint)))?.permission;
}
