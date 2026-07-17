import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { measureAsync } from "../lib/performance.js";
import type { UserRole } from "../models/User.js";
import { OrganizationMembership } from "../models/WorkspaceAccess.js";

export type AuthUser = { userId: string; organizationId?: string; membershipId?: string; role?: UserRole; email: string };
export type AuthRequest = Request & { user?: AuthUser };

type CachedMembership = { id: string; role: UserRole; expiresAt: number };
const workspaceMembershipCache = new Map<string, CachedMembership>();
const workspaceMembershipLoads = new Map<string, Promise<{ id: string; role: UserRole } | null>>();

function membershipCacheTtlMs() {
  const configured = Number(process.env.WORKSPACE_MEMBERSHIP_CACHE_TTL_MS ?? 5000);
  return Number.isFinite(configured) && configured >= 0 ? configured : 5000;
}

function membershipCacheKey(userId: string, organizationId: string) {
  return `${userId}:${organizationId}`;
}

export function invalidateWorkspaceMembership(userId: string, organizationId: string) {
  const key = membershipCacheKey(userId, organizationId);
  workspaceMembershipCache.delete(key);
  workspaceMembershipLoads.delete(key);
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
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
    return next();
  }
  if (cached) workspaceMembershipCache.delete(cacheKey);
  let membershipLoad = workspaceMembershipLoads.get(cacheKey);
  if (!membershipLoad) {
    membershipLoad = Promise.resolve(OrganizationMembership.findOne({ user: req.user.userId, organization: req.user.organizationId, status: "active" }))
      .then((membership) => membership ? { id: membership.id, role: membership.role as UserRole } : null);
    workspaceMembershipLoads.set(cacheKey, membershipLoad);
  }
  let membership: { id: string; role: UserRole } | null;
  try {
    membership = await measureAsync("auth.workspace_membership", () => membershipLoad!, { method: req.method });
  } finally {
    if (workspaceMembershipLoads.get(cacheKey) === membershipLoad) workspaceMembershipLoads.delete(cacheKey);
  }
  if (!membership) return res.status(403).json({ message: "This workspace membership is unavailable" });
  req.user.membershipId = membership.id;
  req.user.role = membership.role;
  const ttlMs = membershipCacheTtlMs();
  if (ttlMs > 0) workspaceMembershipCache.set(cacheKey, { id: membership.id, role: membership.role, expiresAt: Date.now() + ttlMs });
  return next();
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Missing authenticated user" });
    if (!req.user.role || !roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission to perform this action" });
    return next();
  };
}
