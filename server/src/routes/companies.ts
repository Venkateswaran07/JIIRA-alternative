import { Router } from "express";
import { z } from "zod";
import { parseOr400 } from "../lib/http.js";
import { invalidateWorkspaceMembership, requireAuth, type AuthRequest } from "../middleware/auth.js";
import { Company, CompanyGroup, CompanyGroupMember, CompanyMembership, WorkspaceGroupAccess } from "../models/Company.js";
import { Organization } from "../models/Organization.js";
import { OrganizationMembership } from "../models/WorkspaceAccess.js";
import { WorkspaceRole } from "../models/Role.js";
import { ensureWorkspaceRoles } from "../services/roles.js";

const router = Router();
router.use(requireAuth);

const companyId = (req: AuthRequest) => String(req.params.companyId);
const userId = (req: AuthRequest) => req.user!.userId;

async function companyMembership(req: AuthRequest) {
  return CompanyMembership.findOne({ company: companyId(req), user: userId(req), status: "active" });
}

async function requireCompany(req: AuthRequest, res: any, admin = false) {
  const membership = await companyMembership(req);
  if (!membership) {
    res.status(403).json({ message: "You do not belong to this organization" });
    return null;
  }
  if (admin && membership.role !== "admin") {
    res.status(403).json({ message: "Organization admin access is required" });
    return null;
  }
  return membership;
}

router.get("/companies", async (req: AuthRequest, res) => {
  const memberships = await CompanyMembership.find({ user: userId(req), status: "active" }).populate("company");
  return res.json({
    companies: memberships.map((membership: any) => ({
      ...membership.company?.toObject?.(),
      role: membership.role,
      membershipId: membership.id,
    })),
  });
});

router.get("/companies/:companyId/workspaces", async (req: AuthRequest, res) => {
  const membership = await requireCompany(req, res);
  if (!membership) return;
  const allWorkspaces = await Organization.find({ company: companyId(req) }).sort("name");
  if (membership.role === "admin") return res.json({ workspaces: allWorkspaces });

  const [directMemberships, groupMemberships] = await Promise.all([
    OrganizationMembership.find({ user: userId(req), status: "active" }),
    CompanyGroupMember.find({ user: userId(req) }),
  ]);
  const groupIds = groupMemberships.map((item: any) => String(item.group));
  const groupGrants = groupIds.length ? await WorkspaceGroupAccess.find({ group: { $in: groupIds } }) : [];
  const allowed = new Set([
    ...directMemberships.map((item: any) => String(item.organization)),
    ...groupGrants.map((item: any) => String(item.workspace)),
  ]);
  return res.json({ workspaces: allWorkspaces.filter((workspace: any) => allowed.has(String(workspace._id))) });
});

router.get("/companies/:companyId/members", async (req: AuthRequest, res) => {
  if (!(await requireCompany(req, res))) return;
  const memberships = await CompanyMembership.find({ company: companyId(req), status: "active" }).sort("createdAt").populate("user", "name email avatarColor");
  return res.json({
    members: memberships.map((membership: any) => ({
      ...membership.user?.toObject?.(),
      companyRole: membership.role,
      department: membership.department,
      jobFunction: membership.jobFunction,
    })),
  });
});

router.post("/companies/:companyId/workspaces", async (req: AuthRequest, res) => {
  if (!(await requireCompany(req, res, true))) return;
  const body = parseOr400(z.object({ name: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]+$/).optional() }), req.body, res);
  if (!body) return;
  const base = body.slug || body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let slug = base || "workspace";
  let index = 2;
  while (await Organization.exists({ slug })) slug = `${base}-${index++}`;
  const workspace = await Organization.create({ company: companyId(req), name: body.name, slug, plan: "starter", owner: userId(req), onboardingCompletedAt: new Date() });
  await OrganizationMembership.create({ user: userId(req), organization: workspace._id, role: "admin", status: "active", skills: [], availability: 1, capacity: 32 });
  return res.status(201).json({ workspace });
});

router.get("/companies/:companyId/groups", async (req: AuthRequest, res) => {
  if (!(await requireCompany(req, res))) return;
  const groups = await CompanyGroup.find({ company: companyId(req) }).sort("name");
  const result = await Promise.all(groups.map(async (group: any) => {
    const [members, grants] = await Promise.all([
      CompanyGroupMember.find({ group: group._id }).populate("user", "name email avatarColor"),
      WorkspaceGroupAccess.find({ group: group._id }),
    ]);
    return { ...group.toObject(), members: members.map((item: any) => item.user), workspaceAccess: grants };
  }));
  return res.json({ groups: result });
});

router.post("/companies/:companyId/groups", async (req: AuthRequest, res) => {
  if (!(await requireCompany(req, res, true))) return;
  const body = parseOr400(z.object({ name: z.string().min(2), description: z.string().default("") }), req.body, res);
  if (!body) return;
  const group = await CompanyGroup.create({ ...body, company: companyId(req) });
  return res.status(201).json({ group });
});

router.patch("/companies/:companyId/groups/:id", async (req: AuthRequest, res) => {
  if (!(await requireCompany(req, res, true))) return;
  const body = parseOr400(z.object({ name: z.string().min(2).optional(), description: z.string().optional() }), req.body, res);
  if (!body) return;
  const group = await CompanyGroup.findOneAndUpdate({ _id: req.params.id, company: companyId(req) }, body, { new: true });
  return group ? res.json({ group }) : res.status(404).json({ message: "Group not found" });
});

router.delete("/companies/:companyId/groups/:id", async (req: AuthRequest, res) => {
  if (!(await requireCompany(req, res, true))) return;
  const group = await CompanyGroup.findOneAndDelete({ _id: req.params.id, company: companyId(req) });
  if (!group) return res.status(404).json({ message: "Group not found" });
  const [members, grants] = await Promise.all([CompanyGroupMember.find({ group: group._id }), WorkspaceGroupAccess.find({ group: group._id })]);
  await Promise.all([CompanyGroupMember.deleteMany({ group: group._id }), WorkspaceGroupAccess.deleteMany({ group: group._id })]);
  for (const member of members as any[]) for (const grant of grants as any[]) invalidateWorkspaceMembership(String(member.user), String(grant.workspace));
  return res.status(204).send();
});

router.put("/companies/:companyId/groups/:id/members", async (req: AuthRequest, res) => {
  if (!(await requireCompany(req, res, true))) return;
  const body = parseOr400(z.object({ userIds: z.array(z.string()) }), req.body, res);
  if (!body) return;
  const group = await CompanyGroup.findOne({ _id: req.params.id, company: companyId(req) });
  if (!group) return res.status(404).json({ message: "Group not found" });
  const valid = await CompanyMembership.countDocuments({ company: companyId(req), user: { $in: body.userIds }, status: "active" });
  if (valid !== new Set(body.userIds).size) return res.status(400).json({ message: "Every group member must belong to the organization" });
  const [previousMembers, grants] = await Promise.all([CompanyGroupMember.find({ group: group._id }), WorkspaceGroupAccess.find({ group: group._id })]);
  await CompanyGroupMember.deleteMany({ group: group._id });
  if (body.userIds.length) await CompanyGroupMember.insertMany(body.userIds.map((user) => ({ group: group._id, user })));
  const affectedUsers = new Set([...previousMembers.map((item: any) => String(item.user)), ...body.userIds]);
  for (const affectedUser of affectedUsers) for (const grant of grants as any[]) invalidateWorkspaceMembership(affectedUser, String(grant.workspace));
  return res.json({ members: body.userIds });
});

router.put("/companies/:companyId/groups/:id/workspaces", async (req: AuthRequest, res) => {
  if (!(await requireCompany(req, res, true))) return;
  const body = parseOr400(z.object({ grants: z.array(z.object({ workspace: z.string(), role: z.string().min(1) })) }), req.body, res);
  if (!body) return;
  const [group, workspaceCount] = await Promise.all([
    CompanyGroup.findOne({ _id: req.params.id, company: companyId(req) }),
    Organization.countDocuments({ _id: { $in: body.grants.map((grant) => grant.workspace) }, company: companyId(req) }),
  ]);
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (workspaceCount !== new Set(body.grants.map((grant) => grant.workspace)).size) return res.status(400).json({ message: "Every workspace must belong to the organization" });
  await Promise.all([...new Set(body.grants.map((grant) => grant.workspace))].map((workspace) => ensureWorkspaceRoles(workspace)));
  const validRoles = await Promise.all(body.grants.map((grant) => WorkspaceRole.exists({ organization: grant.workspace, slug: grant.role })));
  if (validRoles.some((valid) => !valid)) return res.status(400).json({ message: "Every workspace access grant must use a role defined in that workspace" });
  const [previousGrants, members] = await Promise.all([WorkspaceGroupAccess.find({ group: group._id }), CompanyGroupMember.find({ group: group._id })]);
  await WorkspaceGroupAccess.deleteMany({ group: group._id });
  if (body.grants.length) await WorkspaceGroupAccess.insertMany(body.grants.map((grant) => ({ ...grant, group: group._id })));
  const affectedWorkspaces = new Set([...previousGrants.map((item: any) => String(item.workspace)), ...body.grants.map((grant) => grant.workspace)]);
  for (const member of members as any[]) for (const workspace of affectedWorkspaces) invalidateWorkspaceMembership(String(member.user), workspace);
  return res.json({ grants: body.grants });
});

export default router;
