import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ACCESS_COOKIE, readCookie } from "../lib/authCookies.js";
import { measureAsync } from "../lib/performance.js";
import type { UserRole } from "../models/User.js";
import { OrganizationMembership } from "../models/WorkspaceAccess.js";
import { CompanyGroupMember, CompanyMembership, WorkspaceGroupAccess } from "../models/Company.js";
import { Organization } from "../models/Organization.js";
import { permissionsForRole, rolePriority } from "../services/roles.js";
import { permissionForEndpoint, type Permission } from "../constants/permissions.js";

export type AuthUser = { userId: string; companyId?: string; workspaceId?: string; organizationId?: string; membershipId?: string; workspaceAccessSource?: "direct" | "group" | "organization"; role?: UserRole; permissions?: Permission[]; email: string };
export type AuthRequest = Request & { user?: AuthUser };

type CachedMembership = { id: string; role: UserRole; accessSource: "direct" | "group" | "organization"; expiresAt: number };
const workspaceMembershipCache = new Map<string, CachedMembership>();
const workspaceMembershipLoads = new Map<string, Promise<{ id: string; role: UserRole; accessSource: "direct" | "group" | "organization" } | null>>();

function membershipCacheTtlMs() {
  const configured = Number(process.env.WORKSPACE_MEMBERSHIP_CACHE_TTL_MS ?? 5000);
  return Number.isFinite(configured) && configured >= 0 ? configured : 5000;
}

function membershipCacheKey(userId: string, organizationId: string) {
  return `${userId}:${organizationId}`;
}

export async function effectiveWorkspaceMembership(userId: string, workspaceId: string) {
  const direct = await OrganizationMembership.findOne({ user: userId, organization: workspaceId, status: "active" });
  if (direct) return { id: direct.id, role: direct.role as UserRole, organization: workspaceId, accessSource: "direct" as const };
  const workspace = await Organization.findById(workspaceId);
  if (!workspace) return null;
  const companyMembership = await CompanyMembership.findOne({ company: workspace.company, user: userId, status: "active" });
  if (!companyMembership) return null;
  if (companyMembership.role === "admin") return { id: `company:${companyMembership.id}`, role: "admin" as UserRole, organization: workspaceId, accessSource: "organization" as const };
  const groupMemberships = await CompanyGroupMember.find({ user: userId });
  const groupIds = groupMemberships.map((item: any) => String(item.group));
  if (!groupIds.length) return null;
  const grants = await WorkspaceGroupAccess.find({ workspace: workspaceId, group: { $in: groupIds } });
  const ranked = await Promise.all(grants.map(async (grant: any) => ({ grant, rank: await rolePriority(workspaceId, grant.role) })));
  const best = ranked.sort((left, right) => right.rank - left.rank)[0]?.grant;
  return best ? { id: `group:${best.id}`, role: best.role as UserRole, organization: workspaceId, accessSource: "group" as const } : null;
}

export function invalidateWorkspaceMembership(userId: string, organizationId: string) {
  const key = membershipCacheKey(userId, organizationId);
  workspaceMembershipCache.delete(key);
  workspaceMembershipLoads.delete(key);
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : readCookie(req.headers.cookie, ACCESS_COOKIE);
  if (!token) {
    return res.status(401).json({ message: "Missing bearer token" });
  }
  try {
    req.user = jwt.verify(token, env.jwtSecret) as AuthRequest["user"];
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export async function requireWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.organizationId) return res.status(409).json({ message: "Choose or create a workspace to continue", code: "WORKSPACE_REQUIRED" });
  const cacheKey = membershipCacheKey(req.user.userId, req.user.organizationId);
  const cached = workspaceMembershipCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    req.user.membershipId = cached.id;
    req.user.role = cached.role;
    req.user.workspaceAccessSource = cached.accessSource;
    req.user.permissions = await permissionsForRole(req.user.organizationId, cached.role);
    return next();
  }
  if (cached) workspaceMembershipCache.delete(cacheKey);
  let membershipLoad = workspaceMembershipLoads.get(cacheKey);
  if (!membershipLoad) {
    membershipLoad = effectiveWorkspaceMembership(req.user.userId, req.user.organizationId)
      .then((membership) => membership ? { id: membership.id, role: membership.role, accessSource: membership.accessSource } : null);
    workspaceMembershipLoads.set(cacheKey, membershipLoad);
  }
  let membership: { id: string; role: UserRole; accessSource: "direct" | "group" | "organization" } | null;
  try {
    membership = await measureAsync("auth.workspace_membership", () => membershipLoad!, { method: req.method });
  } finally {
    if (workspaceMembershipLoads.get(cacheKey) === membershipLoad) workspaceMembershipLoads.delete(cacheKey);
  }
  if (!membership) return res.status(403).json({ message: "This workspace membership is unavailable" });
  req.user.membershipId = membership.id;
  req.user.role = membership.role;
  req.user.workspaceAccessSource = membership.accessSource;
  req.user.permissions = await permissionsForRole(req.user.organizationId, membership.role);
  const ttlMs = membershipCacheTtlMs();
  if (ttlMs > 0) workspaceMembershipCache.set(cacheKey, { id: membership.id, role: membership.role, accessSource: membership.accessSource, expiresAt: Date.now() + ttlMs });
  return next();
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Missing authenticated user" });
    const fullPath = req.originalUrl ? req.originalUrl.split("?")[0] : `${req.baseUrl || ""}${req.path || ""}`;
    const permission = permissionForEndpoint(req.method, fullPath);
    if (permission) {
      if (!req.user.permissions?.includes(permission)) return res.status(403).json({ message: "You do not have permission to perform this action", permission });
      return next();
    }
    if (!req.user.role || !roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission to perform this action" });
    return next();
  };
}

export function hasPermission(user: AuthUser | undefined, permission: Permission) {
  return Boolean(user?.permissions?.includes(permission));
}

export function requirePermission(permission: Permission) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Missing authenticated user" });
    if (!hasPermission(req.user, permission)) return res.status(403).json({ message: "You do not have permission to perform this action", permission });
    return next();
  };
}
