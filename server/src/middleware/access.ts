import type { NextFunction, Response } from "express";
import { apiCatalog } from "../apiCatalog.js";
import type { UserRole } from "../models/User.js";
import type { AuthRequest } from "./auth.js";

export const allRoles: UserRole[] = ["admin", "manager", "engineer", "designer"];
export const leaders: UserRole[] = ["admin", "manager"];
export const admins: UserRole[] = ["admin"];

const publicEndpoints = new Set([
  "POST /auth/register",
  "POST /auth/login",
  "POST /auth/refresh",
  "POST /auth/logout",
  "POST /auth/forgot-password",
  "POST /auth/reset-password",
  "POST /auth/accept-invite",
  "GET /invitations/preview",
]);

const adminEndpoints = new Set([
  "POST /workspaces/:id/onboarding/complete",
  "POST /team",
  "PATCH /users/:id",
  "POST /users/:id/deactivate",
  "POST /users/:id/reactivate",
  "DELETE /users/:id",
  "POST /invitations",
  "POST /invitations/:id/resend",
  "DELETE /invitations/:id",
  "DELETE /projects/:id",
  "GET /audit-logs",
  "GET /audit-logs/export",
  "GET /integrations/:kind",
  "POST /integrations/:kind",
  "DELETE /integrations/:kind/:id",
  "GET /settings",
  "PATCH /settings",
  "PATCH /organization",
  "DELETE /organization",
  "GET /organization/usage",
  "GET /export",
  "POST /import/resources",
  "POST /companies/:companyId/workspaces",
  "POST /companies/:companyId/groups",
  "PATCH /companies/:companyId/groups/:id",
  "DELETE /companies/:companyId/groups/:id",
  "PUT /companies/:companyId/groups/:id/members",
  "PUT /companies/:companyId/groups/:id/workspaces",
]);

const leaderEndpoints = new Set([
  "GET /users",
  "GET /users/:id",
  "POST /projects",
  "PATCH /projects/:id",
  "PUT /projects/:id/members",
  "POST /projects/:id/archive",
  "POST /projects/:id/restore",
  "POST /sprints",
  "PATCH /sprints/:id",
  "DELETE /sprints/:id",
  "POST /sprints/:id/start",
  "POST /sprints/:id/complete",
  "POST /sprints/:id/reopen",
  "POST /cycles",
  "PATCH /cycles/:id",
  "DELETE /cycles/:id",
  "POST /tickets/bulk",
  "POST /tickets/:id/links",
  "POST /tickets/:id/archive",
  "POST /tickets/:id/restore",
  "POST /tickets/:id/clone",
  "DELETE /tickets/:id",
  "PATCH /tickets/:id/dependencies",
  "POST /resources/:kind",
  "PATCH /resources/:kind/:id",
  "DELETE /resources/:kind/:id",
  "PATCH /sla/policy",
  "GET /reports",
  "GET /reports/cycle-time",
  "POST /analysis/sprint-risk",
  "POST /ai/confirm-ticket-plan",
]);

const memberEndpoints = new Set([
  "GET /auth/me",
  "POST /auth/change-password",
  "PATCH /auth/preferences",
  "GET /auth/sessions",
  "DELETE /auth/sessions/:id",
  "GET /workspaces",
  "GET /companies",
  "GET /companies/:companyId/workspaces",
  "GET /companies/:companyId/members",
  "GET /companies/:companyId/groups",
  "POST /workspaces",
  "POST /workspaces/:id/switch",
  "GET /invitations/pending",
  "GET /me",
  "GET /team",
  "GET /projects",
  "GET /projects/:id",
  "GET /backlog",
  "GET /sprints",
  "GET /cycles",
  "GET /cycles/:id",
  "GET /tickets",
  "POST /tickets",
  "GET /tickets/:ticketId",
  "PATCH /tickets/:id",
  "POST /tickets/:id/assign",
  "PATCH /tickets/:id/status",
  "PATCH /tickets/:id/rank",
  "POST /tickets/:id/watch",
  "DELETE /tickets/:id/watch",
  "GET /tickets/:id/history",
  "POST /tickets/:id/comments",
  "PATCH /tickets/:id/comments/:commentId",
  "DELETE /tickets/:id/comments/:commentId",
  "POST /tickets/:id/work-logs",
  "PATCH /tickets/:id/work-logs/:logId",
  "DELETE /tickets/:id/work-logs/:logId",
  "POST /tickets/:id/attachments",
  "DELETE /tickets/:id/attachments/:attachmentId",
  "GET /resources/:kind",
  "GET /resources/:kind/:id",
  "GET /notifications",
  "PATCH /notifications/:id/read",
  "POST /notifications/read-all",
  "GET /sla",
  "GET /dashboard",
  "GET /my-work",
  "GET /analysis/examples",
  "GET /ai/endpoints",
  "POST /ai/execute",
  "GET /ai/models",
  "GET /ai/conversations",
  "GET /ai/conversations/:id/messages",
  "DELETE /ai/conversations/:id",
  "POST /ai/chat",
  "POST /ai/generate-tickets",
]);

const explicitEndpointRoles = new Map<string, UserRole[]>();
for (const endpoint of publicEndpoints) explicitEndpointRoles.set(endpoint, []);
for (const endpoint of adminEndpoints) explicitEndpointRoles.set(endpoint, admins);
for (const endpoint of leaderEndpoints) explicitEndpointRoles.set(endpoint, leaders);
for (const endpoint of memberEndpoints) explicitEndpointRoles.set(endpoint, allRoles);

function endpointPattern(endpoint: string) {
  const [method, path] = endpoint.split(" ") as [string, string];
  return { method, pattern: new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:[^/]+/g, "[^/]+")}$`) };
}

const endpointMatchers = [...explicitEndpointRoles].map(([endpoint, roles]) => ({ ...endpointPattern(endpoint), roles }));

export function rolesForEndpoint(method: string, path: string): UserRole[] {
  const normalizedPath = `/${path}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  return endpointMatchers.find((rule) => rule.method === method.toUpperCase() && rule.pattern.test(normalizedPath))?.roles ?? [];
}

export function hasExplicitAccessPolicy(method: string, path: string) {
  const normalizedPath = `/${path}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  return endpointMatchers.some((rule) => rule.method === method.toUpperCase() && rule.pattern.test(normalizedPath));
}

export const catalogEndpointsWithoutAccessPolicy = Object.values(apiCatalog.groups).flat().filter((endpoint) => !explicitEndpointRoles.has(endpoint));

export function enforceApiAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } });
  const roles = rolesForEndpoint(req.method, req.path);
  if (!roles.length) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "This endpoint has no authenticated access policy", allowedRoles: [] } });
  }
  if (!req.user.role || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Your role cannot access this endpoint", allowedRoles: roles } });
  }
  return next();
}
