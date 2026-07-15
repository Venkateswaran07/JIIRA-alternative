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
import { Ticket, slaHoursForPriority, computeSlaStatus, predictSlaLikely } from "../models/Ticket.js";
import { User } from "../models/User.js";
import { generatedTicketSchema } from "../schemas/ai.js";

const router = Router();
router.use(requireAuth);
router.use(enforceApiAccess);

function getClient() {
  if (!env.openaiApiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: env.openaiApiKey, baseURL: env.openaiBaseUrl });
}

function parseJsonPayload(raw: string) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]);
    }

    const firstObject = trimmed.indexOf("{");
    const lastObject = trimmed.lastIndexOf("}");
    if (firstObject !== -1 && lastObject > firstObject) {
      return JSON.parse(trimmed.slice(firstObject, lastObject + 1));
    }

    throw new Error("AI response did not contain valid JSON");
  }
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
      messages: [
        {
          role: "system",
          content: "Return only valid JSON matching { epic:{title,description}, stories:[{title,description,acceptanceCriteria,priority,storyPoints,labels,tasks:[{title,description,storyPoints,dependencies}]}] }. Do not create records.",
        },
        { role: "user", content: parsed.data.prompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    const json = raw ? parseJsonPayload(raw) : null;
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

  // Link tasks to their parent story via parentTaskId (hierarchy)
  const ticketIds: string[] = [];
  const storyTicketIdMap = new Map<string, string>(); // storyDoc ticketId -> storyTitle
  const storyMongoIdMap = new Map<string, unknown>(); // storyDoc title -> mongo _id
  let next = 1;

  const tickets: any[] = [];
  for (const story of parsed.data.plan.stories) {
    const storyTicketId = `${project.key}-${String(next++).padStart(3, "0")}`;
    const slaH = slaHoursForPriority(story.priority as any);
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
      requiredSkills: story.labels ?? [],
      slaHours: slaH,
      comments: [],
      workLogs: [],
      history: [{ event: "Created from AI Task Architect", createdAt: new Date() }],
    };
    const [storyTicket] = await Ticket.insertMany([storyDoc]);
    tickets.push(storyTicket);

    for (const task of story.tasks) {
      const taskTicketId = `${project.key}-${String(next++).padStart(3, "0")}`;
      const taskDoc = {
        organization,
        ticketId: taskTicketId,
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
        requiredSkills: story.labels ?? [],
        slaHours: slaH,
        parentTaskId: storyTicket._id, // ← link to parent story
        comments: [],
        workLogs: [],
        history: [{ event: "Created from AI Task Architect", createdAt: new Date() }],
      };
      const [taskTicket] = await Ticket.insertMany([taskDoc]);
      tickets.push(taskTicket);
    }
  }

  return res.status(201).json({ tickets });
});

router.post("/chat", async (req, res) => {
  const parsed = z.object({
    message: z.string().min(1),
    history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })).optional(),
    confirmed: z.object({ action: z.string() }).optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid chat request", issues: parsed.error.issues });

  const authReq = req as AuthRequest;
  const userRole = authReq.user!.role;
  const endpoints = aiEndpointsForRole(userRole);
  const endpointList = endpoints.map((ep) => `${ep.method} ${ep.path}${ep.requiresConfirmation ? " [requires confirmation]" : ""}`).join("\n");

  const systemPrompt = [
    "You are the I-TRACK project-management assistant. You operate as the authenticated user.",
    "Use ONLY the following endpoints available for the user's role:",
    endpointList,
    "",
    "Rules:",
    "- For destructive or irreversible actions (DELETE, archive, deactivate, etc.), describe what will happen and ask for explicit confirmation before proceeding.",
    "- Never expose credentials, tokens, or internal secrets.",
    "- Report backend errors accurately — include status codes and messages.",
    "- When you need to call an I-TRACK API, use the execute_itrack_api tool.",
  ].join("\n");

  try {
    // Build live workspace context for the system prompt
    const authReq2 = req as AuthRequest;
    const org = authReq2.user!.organizationId;
    const [wsTickets, wsSprints, wsUsers] = await Promise.all([
      Ticket.find({ organization: org }).lean().limit(200),
      Sprint.find({ organization: org }).lean(),
      User.find({ organization: org }).select("name skills capacity").lean(),
    ]);
    const activeSprint = wsSprints.find((s: any) => s.status === "active") ?? wsSprints[0];
    const sprintTickets = activeSprint ? wsTickets.filter((t: any) => String(t.sprint) === String(activeSprint._id)) : wsTickets;

    // SLA context
    const avgV = activeSprint?.velocityHistory?.length
      ? activeSprint.velocityHistory.reduce((a: number, b: number) => a + b, 0) / activeSprint.velocityHistory.length : 0;
    const spDays = activeSprint ? Math.max(1, Math.round((new Date((activeSprint as any).endDate).getTime() - new Date((activeSprint as any).startDate).getTime()) / 86_400_000)) : 14;
    const dvp = avgV / spDays;
    let slaBreached = 0, slaNear = 0, slaLikely = 0;
    const slaTicketDetails: string[] = [];
    sprintTickets.forEach((t: any) => {
      const createdAt = t.createdAt ?? new Date();
      const slaH = t.slaHours ?? 72;
      const st = computeSlaStatus(createdAt, slaH, t.completedTime);
      const lb = st === "on_track" && predictSlaLikely({ createdAt, slaHours: slaH, remainingPoints: t.storyPoints, dailyVelocityPoints: dvp, completedTime: t.completedTime });
      if (st === "breached") { slaBreached++; slaTicketDetails.push(`${t.ticketId}:BREACHED`); }
      else if (st === "near_breach") { slaNear++; slaTicketDetails.push(`${t.ticketId}:NEAR_BREACH`); }
      else if (lb) { slaLikely++; slaTicketDetails.push(`${t.ticketId}:LIKELY_BREACH`); }
    });

    // Developer load context
    const devContext = wsUsers.map((u: any) => {
      const assigned = sprintTickets.filter((t: any) => String(t.assignee) === String(u._id));
      const pts = assigned.reduce((s: number, t: any) => s + (t.storyPoints || 0), 0);
      const pct = u.capacity > 0 ? Math.round((pts / u.capacity) * 100) : 0;
      return `${u.name}: ${pct}% loaded, skills=[${(u.skills ?? []).join(",")}]`;
    }).join("; ");

    const workspaceContext = [
      `Active sprint: ${activeSprint ? (activeSprint as any).name : "none"}, ${sprintTickets.length} tickets`,
      `SLA status — breached:${slaBreached}, near-breach:${slaNear}, likely-breach:${slaLikely}`,
      slaTicketDetails.length ? `SLA tickets: ${slaTicketDetails.slice(0, 10).join(", ")}` : "",
      `Developer load: ${devContext}`,
      `Blocked tickets: ${sprintTickets.filter((t: any) => t.blocked).length}`,
    ].filter(Boolean).join("\n");

    const systemPrompt = [
      "You are the I-TRACK Sprint Intelligence assistant. You have access to live workspace data below.",
      "",
      "=== LIVE WORKSPACE CONTEXT ===",
      workspaceContext,
      "",
      "=== AVAILABLE API ENDPOINTS ===",
      "Use ONLY the following endpoints available for the user's role:",
      endpointList,
      "",
      "=== RULES ===",
      "- For destructive or irreversible actions (DELETE, archive, deactivate, etc.), describe what will happen and ask for explicit confirmation before proceeding.",
      "- Never expose credentials, tokens, or internal secrets.",
      "- Report backend errors accurately — include status codes and messages.",
      "- When you need to call an I-TRACK API, use the execute_itrack_api tool.",
      "- For 'what-if' scenarios (e.g. 'if X leaves', 'if we add Y points'), use the simulate_sprint_what_if tool.",
      "- Answer questions about SLA, developer capacity, skill compatibility, and hierarchy directly from the workspace context.",
    ].join("\n");

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...(parsed.data.history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: parsed.data.message },
    ];

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "execute_itrack_api",
          description: "Execute an allowed I-TRACK backend operation as the signed-in user.",
          parameters: {
            type: "object",
            required: ["method", "path"],
            properties: {
              method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
              path: { type: "string", description: "API path like /tickets or /tickets/:id/status" },
              body: { type: "object", description: "Request body for POST/PUT/PATCH" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "simulate_sprint_what_if",
          description: "Simulate a what-if scenario and return before/after sprint risk scores with explanation.",
          parameters: {
            type: "object",
            required: ["scenario"],
            properties: {
              scenario: {
                type: "object",
                description: "What-if scenario parameters",
                properties: {
                  removeMembers: { type: "array", items: { type: "string" }, description: "Developer names to remove from sprint" },
                  addExtraPoints: { type: "number", description: "Extra story points to add (scope creep)" },
                  removeDays: { type: "number", description: "Days to shorten the sprint by" },
                },
              },
            },
          },
        },
      },
    ];
    // Model selection — no hardcoded fallback
    const model = env.openaiModel;
    if (!model || model === "ask-me-before-selecting-a-model") {
      return res.status(400).json({ requiresModelSelection: true, message: "Select a provider model to enable AI chat.", hint: "Use GET /api/v1/ai/models to list available models." });
    }
    const allToolCalls: { name: string; arguments: unknown; result: unknown }[] = [];
    const MAX_ITERATIONS = 5;

    let response = await getClient().chat.completions.create({
      model,
      temperature: 0.3,
      messages,
      tools,
    });

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const choice = response.choices[0];
      if (!choice) break;

      const assistantMessage = choice.message;
      messages.push(assistantMessage);

      if (choice.finish_reason !== "tool_calls" || !assistantMessage.tool_calls?.length) {
        return res.json({ reply: assistantMessage.content ?? "", ...(allToolCalls.length ? { toolCalls: allToolCalls } : {}) });
      }

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== "function") {
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ error: "Unsupported tool type" }) });
          continue;
        }

        if (toolCall.function.name === "simulate_sprint_what_if") {
          try {
            const simArgs = JSON.parse(toolCall.function.arguments);
            const simUrl = `http://127.0.0.1:${env.port}/api/v1/analysis/simulate`;
            const simRes = await fetch(simUrl, {
              method: "POST",
              headers: { authorization: req.headers.authorization ?? "", "content-type": "application/json" },
              body: JSON.stringify({ scenario: simArgs.scenario }),
            });
            const simResult = await simRes.json();
            allToolCalls.push({ name: toolCall.function.name, arguments: simArgs, result: simResult });
            messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(simResult) });
          } catch (err) {
            const errResult = { error: "Simulation failed", detail: String(err) };
            messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(errResult) });
          }
          continue;
        }

        if (toolCall.function.name !== "execute_itrack_api") {
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ error: "Unknown tool" }) });
          continue;
        }

        let args: { method: string; path: string; body?: Record<string, unknown> };
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          const errResult = { error: "Invalid tool arguments" };
          messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(errResult) });
          allToolCalls.push({ name: toolCall.function.name, arguments: toolCall.function.arguments, result: errResult });
          continue;
        }

        const { method, path, body } = args;
        const actionKey = `${method} ${path}`;

        if (isConfirmationRequired(method, path) && parsed.data.confirmed?.action !== actionKey) {
          return res.json({
            reply: `I need your confirmation to perform a destructive action: **${actionKey}**. Please confirm to proceed.`,
            requiresConfirmation: true,
            pendingAction: {
              method,
              path,
              body: body ?? null,
              description: actionKey,
            },
          });
        }

        const executeUrl = `http://127.0.0.1:${env.port}/api/v1/ai/execute`;
        const executeRes = await fetch(executeUrl, {
          method: "POST",
          headers: {
            authorization: req.headers.authorization ?? "",
            "content-type": "application/json",
          },
          body: JSON.stringify({ method, path, body, confirmed: true }),
        });

        const resultText = await executeRes.text();
        let result: unknown;
        try {
          result = JSON.parse(resultText);
        } catch {
          result = resultText;
        }

        allToolCalls.push({ name: toolCall.function.name, arguments: args, result });
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: typeof result === "string" ? result : JSON.stringify(result) });
      }


      response = await getClient().chat.completions.create({
        model,
        temperature: 0.3,
        messages,
        tools,
      });
    }

    const finalChoice = response.choices[0];
    return res.json({ reply: finalChoice?.message?.content ?? "", ...(allToolCalls.length ? { toolCalls: allToolCalls } : {}) });
  } catch (error) {
    return res.status(500).json({ message: "AI chat failed", detail: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
