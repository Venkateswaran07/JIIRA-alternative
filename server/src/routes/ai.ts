import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { aiEndpointsForRole, canRoleAccessAiEndpoint, isConfirmationRequired, normalizeAiPath } from "../aiAccess.js";
import { env } from "../config/env.js";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth.js";
import { enforceApiAccess } from "../middleware/access.js";
import { AuditEvent } from "../models/Operational.js";
import { Project } from "../models/Project.js";
import { Sprint } from "../models/Sprint.js";
import { Ticket } from "../models/Ticket.js";
import { User } from "../models/User.js";
import { generatedTicketSchema } from "../schemas/ai.js";

const router = Router();
router.use(requireAuth);
router.use(enforceApiAccess);

function getClient() {
  if (!env.openaiApiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: env.openaiApiKey, baseURL: env.openaiBaseUrl });
}

router.get("/endpoints", (req: AuthRequest, res) => {
  return res.json({ endpoints: aiEndpointsForRole(req.user!.role) });
});

router.post("/execute", async (req: AuthRequest, res) => {
  const parsed = z.object({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z.string().min(1),
    body: z.unknown().optional(),
    confirmed: z.boolean().default(false),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid AI endpoint execution request", issues: parsed.error.issues });

  const method = parsed.data.method;
  const path = normalizeAiPath(parsed.data.path);
  if (path.startsWith("/ai/execute")) return res.status(400).json({ message: "AI execution cannot call itself" });

  const access = canRoleAccessAiEndpoint(req.user!.role, method, path);
  if (!access.allowed) {
    return res.status(403).json({
      message: "Your role cannot access this endpoint through AI",
      allowedRoles: access.roles,
    });
  }

  if (isConfirmationRequired(method, path) && !parsed.data.confirmed) {
    return res.status(409).json({
      requiresConfirmation: true,
      action: `${method} ${path}`,
      message: "Confirm this destructive action before AI performs it.",
    });
  }

  const url = new URL(`/api/v1${path}`, `http://127.0.0.1:${env.port}`);
  const response = await fetch(url, {
    method,
    headers: {
      authorization: req.headers.authorization ?? "",
      ...(method === "GET" || method === "DELETE" ? {} : { "content-type": "application/json" }),
    },
    body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(parsed.data.body ?? {}),
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "application/json";
  const payload = contentType.includes("application/json") && text ? JSON.parse(text) : text;

  if (method !== "GET") {
    await AuditEvent.create({
      organization: req.user!.organizationId,
      actor: req.user!.userId,
      action: "ai.endpoint_executed",
      metadata: {
        method,
        path,
        endpoint: access.endpoint,
        confirmed: parsed.data.confirmed,
        status: response.status,
      },
    });
  }

  return res.status(response.status).json(payload);
});

router.get("/models", async (_req, res) => {
  try {
    const client = getClient();
    const models = await client.models.list();
    return res.json({ models: models.data.map((model) => model.id) });
  } catch (error) {
    return res.status(503).json({ message: "Unable to inspect provider models", detail: error instanceof Error ? error.message : "Unknown error" });
  }
});

router.post("/generate-tickets", async (req, res) => {
  const parsed = z.object({ prompt: z.string().min(20), model: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "A detailed feature prompt is required" });
  const model = parsed.data.model ?? env.openaiModel;
  if (!model || model === "ask-me-before-selecting-a-model") {
    return res.status(400).json({ message: "Select a provider model before generating tickets" });
  }

  try {
    const completion = await getClient().chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return only valid JSON matching { epic:{title,description}, stories:[{title,description,acceptanceCriteria,priority,storyPoints,labels,tasks:[{title,description,storyPoints,dependencies}]}] }. Do not create records.",
        },
        { role: "user", content: parsed.data.prompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    const json = raw ? JSON.parse(raw) : null;
    const validation = generatedTicketSchema.safeParse(json);
    if (!validation.success) {
      return res.status(422).json({ message: "AI output did not match the ticket schema", issues: validation.error.issues });
    }
    return res.json({ plan: validation.data });
  } catch (error) {
    return res.status(500).json({ message: "AI ticket generation failed", detail: error instanceof Error ? error.message : "Unknown error" });
  }
});

router.post("/confirm-ticket-plan", requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
  const parsed = z.object({
    plan: generatedTicketSchema,
    projectId: z.string(),
    sprintId: z.string(),
    assigneeId: z.string(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid ticket plan confirmation", issues: parsed.error.issues });

  const organization = req.user!.organizationId;
  const [project, sprint, assignee, reporter] = await Promise.all([
    Project.findOne({ _id: parsed.data.projectId, organization }),
    Sprint.findOne({ _id: parsed.data.sprintId, organization }),
    User.findOne({ _id: parsed.data.assigneeId, organization }),
    User.findOne({ _id: req.user!.userId, organization }),
  ]);
  if (!project || !sprint || !assignee || !reporter) return res.status(404).json({ message: "Project, sprint, assignee, or reporter not found" });

  const existingCount = await Ticket.countDocuments({ organization, project: project._id });
  let next = existingCount + 101;
  const docs = parsed.data.plan.stories.flatMap((story) => {
    const storyTicketId = `${project.key}-${String(next++).padStart(3, "0")}`;
    const storyDoc = {
      organization,
      ticketId: storyTicketId,
      title: story.title,
      description: story.description,
      acceptanceCriteria: story.acceptanceCriteria,
      status: "Backlog",
      priority: story.priority,
      storyPoints: story.storyPoints,
      assignee: assignee._id,
      reporter: reporter._id,
      project: project._id,
      sprint: sprint._id,
      epic: parsed.data.plan.epic.title,
      labels: story.labels,
      dueDate: sprint.endDate,
      blocked: false,
      dependencies: [],
      comments: [],
      workLogs: [],
      history: [{ event: "Created from AI Task Architect", createdAt: new Date() }],
    };
    const taskDocs = story.tasks.map((task) => ({
      organization,
      ticketId: `${project.key}-${String(next++).padStart(3, "0")}`,
      title: task.title,
      description: task.description,
      acceptanceCriteria: [],
      status: "Backlog",
      priority: story.priority,
      storyPoints: task.storyPoints,
      assignee: assignee._id,
      reporter: reporter._id,
      project: project._id,
      sprint: sprint._id,
      epic: parsed.data.plan.epic.title,
      labels: story.labels,
      dueDate: sprint.endDate,
      blocked: task.dependencies.length > 0,
      dependencies: task.dependencies,
      comments: [],
      workLogs: [],
      history: [{ event: "Created from AI Task Architect", createdAt: new Date() }],
    }));
    return [storyDoc, ...taskDocs];
  });

  const tickets = await Ticket.insertMany(docs);
  return res.status(201).json({ tickets });
});

export default router;
