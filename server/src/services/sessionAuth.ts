import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, setSessionCookies } from "../lib/authCookies.js";
import { Organization } from "../models/Organization.js";
import { Session } from "../models/Operational.js";
import type { IUser } from "../models/User.js";
import { Invitation, OrganizationMembership } from "../models/WorkspaceAccess.js";
import { Company, CompanyGroupMember, CompanyMembership, WorkspaceGroupAccess } from "../models/Company.js";

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export function publicUser(user: any) {
  if (!user) return null;
  return { id: user.id, _id: user.id, name: user.name, email: user.email, avatarColor: user.avatarColor, notificationPreferences: user.notificationPreferences };
}

export function publicOrganization(org: any) {
  if (!org) return null;
  return { id: org.id, _id: org.id, companyId: org.company, name: org.name, slug: org.slug, plan: org.plan, settings: org.settings, owner: org.owner, onboardingCompletedAt: org.onboardingCompletedAt };
}

export function publicCompany(company: any) {
  if (!company) return null;
  return { id: company.id, _id: company.id, name: company.name, slug: company.slug, owner: company.owner, settings: company.settings };
}

export async function membershipsFor(userId: string) {
  const [direct, companyMemberships, groupMemberships] = await Promise.all([
    OrganizationMembership.find({ user: userId, status: "active" }).populate("organization"),
    CompanyMembership.find({ user: userId, status: "active" }),
    CompanyGroupMember.find({ user: userId }),
  ]);
  const results = new Map<string, any>();
  for (const membership of direct as any[]) {
    results.set(String(membership.organization?._id || membership.organization), { id: membership.id, organization: publicOrganization(membership.organization), role: membership.role, status: membership.status, accessSource: "direct", skills: membership.skills, availability: membership.availability, capacity: membership.capacity });
  }
  for (const membership of companyMemberships as any[]) {
    if (membership.role !== "admin") continue;
    const workspaces = await Organization.find({ company: membership.company });
    for (const workspace of workspaces as any[]) if (!results.has(String(workspace._id))) {
      results.set(String(workspace._id), { id: `company:${membership.id}`, organization: publicOrganization(workspace), role: "admin", status: "active", accessSource: "organization" });
    }
  }
  const groupIds = (groupMemberships as any[]).map((item) => String(item.group));
  const grants = groupIds.length ? await WorkspaceGroupAccess.find({ group: { $in: groupIds } }) : [];
  for (const grant of grants as any[]) {
    const key = String(grant.workspace);
    const existing = results.get(key);
    const rank: Record<string, number> = { designer: 1, engineer: 2, manager: 3, admin: 4 };
    if (existing && (rank[existing.role] || 0) >= (rank[grant.role] || 0)) continue;
    const workspace = await Organization.findById(grant.workspace);
    if (workspace) results.set(key, { id: `group:${grant.id}`, organization: publicOrganization(workspace), role: grant.role, status: "active", accessSource: "group" });
  }
  return [...results.values()];
}

export async function pendingInvitationsFor(email: string) {
  const invitations = await Invitation.find({ email: email.toLowerCase(), status: "pending", expiresAt: { $gt: new Date() } }).populate("organization", "name slug plan").populate("invitedBy", "name email");
  return invitations.map((i: any) => ({ id: i.id, organization: publicOrganization(i.organization), invitedBy: publicUser(i.invitedBy), email: i.email, name: i.name, role: i.role, capacity: i.capacity, expiresAt: i.expiresAt }));
}

export async function issueTokens(user: any, membership?: any, userAgent?: string) {
  const organizationId = membership ? String(membership.organization?._id || membership.organization) : undefined;
  const workspace = organizationId ? await Organization.findById(organizationId) : null;
  const companyId = workspace ? String(workspace.company) : undefined;
  const claims = { userId: user.id, email: user.email, ...(organizationId ? { organizationId, workspaceId: organizationId, companyId, membershipId: membership.id, role: membership.role } : {}) };
  const token = jwt.sign(claims, env.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  await Session.create({ user: user.id, ...(organizationId ? { organization: organizationId } : {}), tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000), userAgent });
  return { token, refreshToken };
}

export async function sessionResponse(user: any, membership?: any, userAgent?: string, response?: import("express").Response) {
  const [tokens, memberships, pendingInvitations] = await Promise.all([issueTokens(user, membership, userAgent), membershipsFor(user.id), pendingInvitationsFor(user.email)]);
  const organization = membership ? await Organization.findById(membership.organization) : null;
  const company = organization ? await Company.findById(organization.company) : null;
  const companyMembership = company ? await CompanyMembership.findOne({ company: company._id, user: user.id, status: "active" }) : null;
  if (response) setSessionCookies(response, tokens.token, tokens.refreshToken);
  return { ...tokens, user: publicUser(user), company: publicCompany(company), companyRole: companyMembership?.role || null, organization: publicOrganization(organization), workspace: publicOrganization(organization), activeMembership: membership ? { id: membership.id, role: membership.role, status: membership.status || "active" } : null, memberships, pendingInvitations, next: membership ? (membership.role !== "admin" || organization?.onboardingCompletedAt ? "/dashboard" : "/onboarding/project") : "/onboarding/workspace" };
}
