import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth.js";
import { Organization } from "../models/Organization.js";
import { Project } from "../models/Project.js";
import { Sprint } from "../models/Sprint.js";
import { Ticket, type TicketStatus } from "../models/Ticket.js";
import { User } from "../models/User.js";

const router = Router();
router.use(requireAuth);

const statuses = ["Backlog", "To Do", "In Progress", "In Review", "Done"] as const;
const priorities = ["low", "medium", "high", "critical"] as const;
const projectStatuses = ["planning", "active", "paused", "done"] as const;
const sprintStatuses = ["planned", "active", "completed"] as const;
const roles = ["admin", "manager", "engineer", "designer"] as const;

const populateTicket = [
  { path: "assignee", select: "name email role skills availability capacity avatarColor inviteStatus organization" },
  { path: "reporter", select: "name email role avatarColor organization" },
  { path: "project", select: "key name organization" },
  { path: "sprint", select: "name status startDate endDate organization" },
];

const orgId = (req: AuthRequest) => req.user!.organizationId;
const userId = (req: AuthRequest) => req.user!.userId;
const orgFilter = (req: AuthRequest) => ({ organization: orgId(req) });

const projectSchema = z.object({
  key: z.string().min(2).max(12).transform((value) => value.toUpperCase()),
  name: z.string().min(2),
  description: z.string().min(5),
  status: z.enum(projectStatuses).default("active"),
  progress: z.number().min(0).max(100).default(0),
  riskLevel: z.enum(priorities).default("medium"),
  activeSprint: z.string().default("Planning"),
  members: z.array(z.string()).default([]),
});

const sprintSchema = z.object({
  name: z.string().min(2),
  project: z.string(),
  status: z.enum(sprintStatuses).default("planned"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  capacity: z.number().min(0),
  plannedPoints: z.number().min(0),
  completedPoints: z.number().min(0).default(0),
  velocityHistory: z.array(z.number()).default([]),
  riskScore: z.number().min(0).max(100).default(0),
});

const ticketSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  acceptanceCriteria: z.array(z.string()).default([]),
  status: z.enum(statuses).default("Backlog"),
  priority: z.enum(priorities).default("medium"),
  storyPoints: z.number().int().min(1).max(21),
  assignee: z.string(),
  project: z.string(),
  sprint: z.string(),
  epic: z.string().min(2).default("Product backlog"),
  labels: z.array(z.string()).default([]),
  dueDate: z.coerce.date(),
  blocked: z.boolean().default(false),
  dependencies: z.array(z.string()).default([]),
});

const teamSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(roles).default("engineer"),
  skills: z.array(z.string()).default(["Planning"]),
  availability: z.number().min(0).max(1).default(1),
  capacity: z.number().min(0).default(30),
  avatarColor: z.string().default("#00AEEF"),
});

const settingsSchema = z.object({
  riskThreshold: z.number().min(0).max(100),
  sprintLengthDays: z.number().min(1).max(60),
  timezone: z.string().min(2),
  aiEnabled: z.boolean(),
});

async function nextTicketId(req: AuthRequest, projectId: string) {
  const project = await Project.findOne({ _id: projectId, organization: orgId(req) });
  if (!project) throw new Error("Project not found");
  const count = await Ticket.countDocuments({ organization: orgId(req), project: project._id });
  return `${project.key}-${String(count + 101).padStart(3, "0")}`;
}

function parseOr400<T extends z.ZodTypeAny>(schema: T, body: unknown, res: Response) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body", issues: parsed.error.issues });
    return null;
  }
  return parsed.data as z.infer<T>;
}

router.get("/me", async (req: AuthRequest, res) => {
  const [user, organization] = await Promise.all([
    User.findById(userId(req)).select("-passwordHash"),
    Organization.findById(orgId(req)),
  ]);
  return res.json({ user, organization });
});

router.get("/dashboard", async (req: AuthRequest, res) => {
  const [projects, sprints, tickets, users] = await Promise.all([
    Project.find(orgFilter(req)).populate("members", "name role avatarColor organization"),
    Sprint.find(orgFilter(req)).populate("project", "key name organization"),
    Ticket.find(orgFilter(req)).populate(populateTicket),
    User.find(orgFilter(req)).select("-passwordHash"),
  ]);
  const activeSprint = sprints.find((sprint) => sprint.status === "active") ?? sprints[0];
  const blockedTickets = tickets.filter((ticket) => ticket.blocked);
  return res.json({
    summary: {
      activeProjects: projects.length,
      sprintsInProgress: sprints.filter((sprint) => sprint.status === "active").length,
      atRiskSprints: sprints.filter((sprint) => sprint.riskScore >= 65).length,
      blockedTasks: blockedTickets.length,
      sprintHealth: activeSprint ? 100 - activeSprint.riskScore : 0,
    },
    projects,
    sprints,
    tickets,
    users,
    trends: {
      risk: [
        { name: "Mon", value: 58 },
        { name: "Tue", value: 64 },
        { name: "Wed", value: 69 },
        { name: "Thu", value: activeSprint?.riskScore ?? 0 },
        { name: "Fri", value: Math.max((activeSprint?.riskScore ?? 0) - 2, 0) },
      ],
      velocity: [
        { name: "S20", value: 92 },
        { name: "S21", value: 104 },
        { name: "S22", value: 97 },
        { name: "S23", value: 111 },
        { name: "S24", value: activeSprint?.completedPoints ?? 0 },
      ],
    },
    recommendation: {
      title: blockedTickets.length ? "Resolve blockers before scope grows" : "Keep capacity inside the sprint plan",
      body: blockedTickets.length ? "Blocked work is increasing deterministic sprint risk. Reassign or defer dependency-heavy tickets first." : "Current workspace data is healthy; keep planned points aligned with available capacity.",
      confidence: blockedTickets.length ? 82 : 74,
    },
  });
});

router.route("/projects")
  .get(async (req: AuthRequest, res) => res.json({ projects: await Project.find(orgFilter(req)).populate("members", "name role avatarColor organization") }))
  .post(requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    const body = parseOr400(projectSchema, req.body, res);
    if (!body) return;
    const project = await Project.create({ ...body, organization: orgId(req) });
    return res.status(201).json({ project: await project.populate("members", "name role avatarColor organization") });
  });

router.route("/projects/:id")
  .patch(requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    const body = parseOr400(projectSchema.partial(), req.body, res);
    if (!body) return;
    const project = await Project.findOneAndUpdate({ _id: req.params.id, organization: orgId(req) }, body, { new: true }).populate("members", "name role avatarColor organization");
    if (!project) return res.status(404).json({ message: "Project not found" });
    return res.json({ project });
  })
  .delete(requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    const project = await Project.findOneAndDelete({ _id: req.params.id, organization: orgId(req) });
    if (!project) return res.status(404).json({ message: "Project not found" });
    await Promise.all([Sprint.deleteMany({ project: project._id, organization: orgId(req) }), Ticket.deleteMany({ project: project._id, organization: orgId(req) })]);
    return res.json({ ok: true });
  });

router.route("/sprints")
  .get(async (req: AuthRequest, res) => res.json({ sprints: await Sprint.find(orgFilter(req)).populate("project", "key name organization") }))
  .post(requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    const body = parseOr400(sprintSchema, req.body, res);
    if (!body) return;
    const project = await Project.exists({ _id: body.project, organization: orgId(req) });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const sprint = await Sprint.create({ ...body, organization: orgId(req) });
    return res.status(201).json({ sprint: await sprint.populate("project", "key name organization") });
  });

router.route("/sprints/:id")
  .patch(requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    const body = parseOr400(sprintSchema.partial(), req.body, res);
    if (!body) return;
    const sprint = await Sprint.findOneAndUpdate({ _id: req.params.id, organization: orgId(req) }, body, { new: true }).populate("project", "key name organization");
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    return res.json({ sprint });
  })
  .delete(requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    const sprint = await Sprint.findOneAndDelete({ _id: req.params.id, organization: orgId(req) });
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    await Ticket.updateMany({ sprint: sprint._id, organization: orgId(req) }, { $unset: { sprint: "" } });
    return res.json({ ok: true });
  });

router.route("/tickets")
  .get(async (req: AuthRequest, res) => res.json({ tickets: await Ticket.find(orgFilter(req)).populate(populateTicket) }))
  .post(requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    const body = parseOr400(ticketSchema, req.body, res);
    if (!body) return;
    const [assignee, project, sprint] = await Promise.all([
      User.exists({ _id: body.assignee, organization: orgId(req) }),
      Project.exists({ _id: body.project, organization: orgId(req) }),
      Sprint.exists({ _id: body.sprint, organization: orgId(req) }),
    ]);
    if (!assignee || !project || !sprint) return res.status(404).json({ message: "Assignee, project, or sprint not found" });
    const ticket = await Ticket.create({ ...body, organization: orgId(req), reporter: userId(req), ticketId: await nextTicketId(req, body.project), history: [{ event: "Created", createdAt: new Date() }] });
    return res.status(201).json({ ticket: await ticket.populate(populateTicket) });
  });

router.get("/tickets/:ticketId", async (req: AuthRequest, res) => {
  const ticket = await Ticket.findOne({ ticketId: req.params.ticketId, organization: orgId(req) }).populate(populateTicket);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  return res.json({ ticket });
});

router.patch("/tickets/:id", requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
  const body = parseOr400(ticketSchema.partial(), req.body, res);
  if (!body) return;
  const ticket = await Ticket.findOneAndUpdate({ _id: req.params.id, organization: orgId(req) }, body, { new: true }).populate(populateTicket);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  return res.json({ ticket });
});

router.patch("/tickets/:id/status", requireRole(["admin", "manager", "engineer", "designer"]), async (req: AuthRequest, res) => {
  const body = parseOr400(z.object({ status: z.enum(statuses) }), req.body, res);
  if (!body) return;
  const ticket = await Ticket.findOneAndUpdate(
    { _id: req.params.id, organization: orgId(req) },
    { status: body.status, $push: { history: { event: `Moved to ${body.status}`, createdAt: new Date() } } },
    { new: true },
  ).populate(populateTicket);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  return res.json({ ticket });
});

router.post("/tickets/:id/comments", requireRole(["admin", "manager", "engineer", "designer"]), async (req: AuthRequest, res) => {
  const body = parseOr400(z.object({ body: z.string().min(1) }), req.body, res);
  if (!body) return;
  const user = await User.findById(userId(req));
  const ticket = await Ticket.findOneAndUpdate(
    { _id: req.params.id, organization: orgId(req) },
    { $push: { comments: { author: user?.name ?? req.user!.email, body: body.body, createdAt: new Date() } } },
    { new: true },
  ).populate(populateTicket);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  return res.status(201).json({ ticket });
});

router.post("/tickets/:id/work-logs", requireRole(["admin", "manager", "engineer", "designer"]), async (req: AuthRequest, res) => {
  const body = parseOr400(z.object({ hours: z.number().min(0.25).max(24), note: z.string().min(1) }), req.body, res);
  if (!body) return;
  const user = await User.findById(userId(req));
  const ticket = await Ticket.findOneAndUpdate(
    { _id: req.params.id, organization: orgId(req) },
    { $push: { workLogs: { author: user?.name ?? req.user!.email, hours: body.hours, note: body.note, createdAt: new Date() } } },
    { new: true },
  ).populate(populateTicket);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  return res.status(201).json({ ticket });
});

router.patch("/tickets/:id/dependencies", requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
  const body = parseOr400(z.object({ dependencies: z.array(z.string()) }), req.body, res);
  if (!body) return;
  const ticket = await Ticket.findOneAndUpdate({ _id: req.params.id, organization: orgId(req) }, { dependencies: body.dependencies, blocked: body.dependencies.length > 0 }, { new: true }).populate(populateTicket);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  return res.json({ ticket });
});

router.route("/team")
  .get(async (req: AuthRequest, res) => res.json({ users: await User.find(orgFilter(req)).select("-passwordHash") }))
  .post(requireRole(["admin"]), async (req: AuthRequest, res) => {
    const body = parseOr400(teamSchema, req.body, res);
    if (!body) return;
    const passwordHash = "invited-user-no-password-yet";
    const user = await User.create({ ...body, organization: orgId(req), passwordHash, inviteStatus: "invited" });
    return res.status(201).json({ user: { ...user.toObject(), passwordHash: undefined } });
  });

router.route("/settings")
  .get(async (req: AuthRequest, res) => {
    const organization = await Organization.findById(orgId(req));
    return res.json({ settings: organization?.settings });
  })
  .patch(requireRole(["admin"]), async (req: AuthRequest, res) => {
    const body = parseOr400(settingsSchema, req.body, res);
    if (!body) return;
    const organization = await Organization.findByIdAndUpdate(orgId(req), { settings: body }, { new: true });
    return res.json({ settings: organization?.settings });
  });

router.get("/reports", async (req: AuthRequest, res) => {
  const [tickets, sprints] = await Promise.all([Ticket.find(orgFilter(req)), Sprint.find(orgFilter(req))]);
  const done = tickets.filter((ticket) => ticket.status === "Done").length;
  return res.json({
    reports: {
      velocity: sprints.flatMap((sprint) => sprint.velocityHistory).slice(-5),
      completion: tickets.length ? Math.round((done / tickets.length) * 100) : 0,
      burnoutTrend: [41, 48, 55, 62, 66],
      riskTrend: sprints.length ? sprints.map((sprint) => sprint.riskScore).slice(-5) : [0],
      cycleTime: 4.8,
      leadTime: 7.2,
      blockedDuration: tickets.filter((ticket) => ticket.blocked).length * 3,
    },
  });
});

export default router;
