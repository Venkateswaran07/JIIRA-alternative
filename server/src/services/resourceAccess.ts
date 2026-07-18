import type { Response } from "express";
import { Project } from "../models/Project.js";
import type { AuthRequest } from "../middleware/auth.js";

export function organizationId(req: AuthRequest) {
  return req.user?.organizationId;
}

export function currentUserId(req: AuthRequest) {
  return req.user?.userId;
}

export function hasWorkspaceWideAccess(req: AuthRequest) {
  return req.user?.role === "admin"
    || req.user?.workspaceAccessSource === "group"
    || req.user?.workspaceAccessSource === "organization";
}

export function canAccessProject(req: AuthRequest, project: any) {
  if (!project || String(project.organization ?? "") !== String(organizationId(req) ?? "")) return false;
  if (hasWorkspaceWideAccess(req)) return true;
  return Array.isArray(project.members)
    && project.members.map((member: any) => String(member?._id ?? member?.id ?? member)).includes(String(currentUserId(req)));
}

export function projectScope(req: AuthRequest) {
  return hasWorkspaceWideAccess(req) ? {} : { members: currentUserId(req) };
}

export async function accessibleProjectIds(req: AuthRequest) {
  if (hasWorkspaceWideAccess(req)) return null;
  return (await Project.find({ organization: organizationId(req), ...projectScope(req) }).select("_id"))
    .map((project: any) => project._id);
}

export async function canAccessTicket(req: AuthRequest, ticket: any) {
  if (!ticket || String(ticket.organization ?? "") !== String(organizationId(req) ?? "")) return false;
  const project = await Project.findOne({ _id: ticket.project, organization: organizationId(req) });
  return canAccessProject(req, project);
}

export async function requireTicketAccess(req: AuthRequest, res: Response, ticket: any) {
  if (!ticket) {
    res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found" } });
    return false;
  }
  if (!await canAccessTicket(req, ticket)) {
    res.status(403).json({ error: { code: "RESOURCE_FORBIDDEN", message: "You do not have access to this project" } });
    return false;
  }
  return true;
}

export function canManageProject(req: AuthRequest, project: any) {
  return hasWorkspaceWideAccess(req)
    || Boolean(req.user?.permissions?.includes("projects.manage") && canAccessProject(req, project));
}
