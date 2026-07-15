import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { enforceApiAccess } from "../middleware/access.js";
import { burnoutScore, compatibilityScore, dependencyRisk, hierarchyProgress, historicalVelocityDeviation, slaHealthRisk, skillGapRisk, sprintRiskScore, sprintUtilisation, teamCapacity, whatIfSimulation, workloadScore } from "../services/analysis.js";
import { Ticket, computeSlaStatus, predictSlaLikely } from "../models/Ticket.js";
import { User } from "../models/User.js";
import { Sprint } from "../models/Sprint.js";
import { type AuthRequest, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.use(enforceApiAccess);

const oid = (req: AuthRequest) => req.user!.organizationId;

const sprintRiskInput = z.object({
  plannedPoints: z.number(),
  capacity: z.number(),
  blockedTickets: z.number(),
  totalTickets: z.number(),
  workload: z.number(),
  focusLoad: z.number(),
  requiredSkills: z.number(),
  coveredSkills: z.number(),
  velocityHistory: z.array(z.number()),
  // SLA inputs (optional — computed from DB if not supplied)
  breachedCount: z.number().default(0),
  nearBreachCount: z.number().default(0),
  likelyBreachCount: z.number().default(0),
});

router.post("/sprint-risk", async (req: AuthRequest, res) => {
  const parsed = sprintRiskInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid sprint risk input", issues: parsed.error.issues });
  const input = parsed.data;
  const utilisation = sprintUtilisation(input.plannedPoints, input.capacity);
  const dependency = dependencyRisk(input.blockedTickets, input.totalTickets);
  const burnout = burnoutScore(input.workload, input.blockedTickets, input.focusLoad);
  const skillGap = skillGapRisk(input.requiredSkills, input.coveredSkills);
  const velocity = historicalVelocityDeviation(input.plannedPoints, input.velocityHistory);
  const slaHealth = slaHealthRisk({
    breachedCount: input.breachedCount,
    nearBreachCount: input.nearBreachCount,
    likelyBreachCount: input.likelyBreachCount,
    totalTickets: input.totalTickets,
  });
  const risk = sprintRiskScore({
    utilisation: utilisation.finalScore,
    dependencyRisk: dependency.finalScore,
    burnoutRisk: burnout.finalScore,
    skillGapRisk: skillGap.finalScore,
    velocityDeviation: velocity.finalScore,
    slaHealth: slaHealth.finalScore,
  });
  return res.json({ utilisation, dependency, burnout, skillGap, velocity, slaHealth, risk });
});

/** POST /analysis/simulate — What-if simulation */
router.post("/simulate", async (req: AuthRequest, res) => {
  const parsed = z.object({
    sprintId: z.string().optional(),
    scenario: z.object({
      removeMembers: z.array(z.string()).optional(),
      reassignTickets: z.array(z.object({ ticketId: z.string(), toAssigneeName: z.string() })).optional(),
      addExtraPoints: z.number().optional(),
      removeDays: z.number().optional(),
    }),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid simulation input", issues: parsed.error.issues });

  const { sprintId, scenario } = parsed.data;
  const org = oid(req);

  const [sprints, tickets, users] = await Promise.all([
    Sprint.find({ organization: org }),
    Ticket.find({ organization: org }),
    User.find({ organization: org }).select("-passwordHash"),
  ]);

  const activeSprint = sprintId
    ? sprints.find(s => s._id.toString() === sprintId)
    : sprints.find(s => s.status === "active") ?? sprints[0];

  if (!activeSprint) return res.status(404).json({ message: "Sprint not found" });

  const members = users.map(u => ({ name: u.name, capacity: u.capacity, availability: u.availability }));
  const totalCapacity = teamCapacity(members).finalScore;
  const plannedPoints = activeSprint.plannedPoints;
  const velocityHistory = activeSprint.velocityHistory;

  const sprintTickets = tickets.filter(t => t.sprint?.toString() === activeSprint._id.toString());
  const blockedCount = sprintTickets.filter(t => t.blocked).length;
  const workload = sprintTickets.reduce((s, t) => s + (t.storyPoints || 0), 0);
  const focusLoad = 0;
  const reqSkills = new Set<string>(); sprintTickets.forEach(t => t.requiredSkills?.forEach(s => reqSkills.add(s)));
  const covSkills = new Set<string>(); users.forEach(u => u.skills?.forEach(s => covSkills.add(s)));

  const utilisation = sprintUtilisation(plannedPoints, totalCapacity).finalScore;
  const dependency = dependencyRisk(blockedCount, sprintTickets.length).finalScore;
  const burnout = burnoutScore(Math.round((workload / Math.max(totalCapacity, 1)) * 100), blockedCount, focusLoad).finalScore;
  const skillGap = skillGapRisk(reqSkills.size, covSkills.size).finalScore;
  const velocity = historicalVelocityDeviation(plannedPoints, velocityHistory).finalScore;
  const slaHealth = 0; // simplified — full SLA compute is expensive in simulation

  const currentRisk = sprintRiskScore({ utilisation, dependencyRisk: dependency, burnoutRisk: burnout, skillGapRisk: skillGap, velocityDeviation: velocity, slaHealth });

  const result = whatIfSimulation({
    current: { utilisation, dependencyRisk: dependency, burnoutRisk: burnout, skillGapRisk: skillGap, velocityDeviation: velocity, slaHealth, finalScore: currentRisk.finalScore },
    scenario,
    totalCapacity,
    plannedPoints,
    velocityHistory,
    members,
  });

  return res.json({ sprint: activeSprint.name, ...result, currentBreakdown: { utilisation, dependency, burnout, skillGap, velocity, slaHealth } });
});

/** GET /analysis/sla — SLA analytics for active sprint */
router.get("/sla", async (req: AuthRequest, res) => {
  const org = oid(req);
  const [tickets, sprints] = await Promise.all([
    Ticket.find({ organization: org }).lean(),
    Sprint.find({ organization: org }).lean(),
  ]);
  const activeSprint = sprints.find(s => s.status === "active") ?? sprints[0];
  const avgVelocity = activeSprint?.velocityHistory?.length
    ? activeSprint.velocityHistory.reduce((a: number, b: number) => a + b, 0) / activeSprint.velocityHistory.length
    : 0;
  const dailyVelocityPoints = avgVelocity / (activeSprint ? Math.max(1, Math.round((new Date(activeSprint.endDate).getTime() - new Date(activeSprint.startDate).getTime()) / 86_400_000)) : 14);

  const enriched = tickets.map(t => {
    const slaHours = t.slaHours ?? 72;
    const createdAt = (t as any).createdAt as Date ?? new Date();
    const status = computeSlaStatus(createdAt, slaHours, t.completedTime);
    const elapsed = (new Date().getTime() - createdAt.getTime()) / 3_600_000;
    const remaining = Math.max(0, slaHours - elapsed);
    const likelyBreach = status === "on_track" && predictSlaLikely({ createdAt, slaHours, remainingPoints: t.storyPoints, dailyVelocityPoints, completedTime: t.completedTime });
    return { ticketId: t.ticketId, title: t.title, priority: t.priority, slaStatus: likelyBreach ? "likely_breach" : status, slaHours, remainingHours: remaining, elapsedPercent: Math.round((elapsed / slaHours) * 100) };
  });

  const onTrack = enriched.filter(t => t.slaStatus === "on_track").length;
  const nearBreach = enriched.filter(t => t.slaStatus === "near_breach").length;
  const likelyBreach = enriched.filter(t => t.slaStatus === "likely_breach").length;
  const breached = enriched.filter(t => t.slaStatus === "breached").length;
  const criticalBreaches = enriched.filter(t => t.slaStatus === "breached" && t.priority === "critical").length;
  const avgResolutionHours = (() => {
    const done = tickets.filter(t => t.completedTime && (t as any).createdAt);
    if (!done.length) return 0;
    return Math.round(done.reduce((s, t) => s + (t.completedTime!.getTime() - ((t as any).createdAt as Date).getTime()) / 3_600_000, 0) / done.length);
  })();

  return res.json({ summary: { onTrack, nearBreach, likelyBreach, breached, criticalBreaches, avgResolutionHours }, tickets: enriched });
});

/** GET /analysis/compatibility — Skill + Capacity compatibility scores for all devs vs sprint tickets */
router.get("/compatibility", async (req: AuthRequest, res) => {
  const org = oid(req);
  const [users, tickets, sprints] = await Promise.all([
    User.find({ organization: org }).select("-passwordHash"),
    Ticket.find({ organization: org }),
    Sprint.find({ organization: org }),
  ]);
  const activeSprint = sprints.find(s => s.status === "active") ?? sprints[0];
  const sprintTickets = activeSprint ? tickets.filter(t => t.sprint?.toString() === activeSprint._id.toString()) : tickets;

  const compatibility = users.map(user => {
    const assigned = sprintTickets.filter(t => t.assignee?.toString() === user._id.toString());
    const workloadPct = user.capacity > 0 ? Math.round((assigned.reduce((s, t) => s + t.storyPoints, 0) / user.capacity) * 100) : 0;

    const incompatibleAssignments = assigned.map(ticket => {
      const c = compatibilityScore({ requiredSkills: ticket.requiredSkills ?? [], developerSkills: user.skills ?? [], developerWorkloadPercent: workloadPct });
      return { ticketId: ticket.ticketId, title: ticket.title, ...c };
    }).filter(a => a.label !== "Excellent");

    const avgScore = assigned.length
      ? Math.round(assigned.reduce((s, t) => {
          const c = compatibilityScore({ requiredSkills: t.requiredSkills ?? [], developerSkills: user.skills ?? [], developerWorkloadPercent: workloadPct });
          return s + c.score;
        }, 0) / assigned.length)
      : 100;

    return { userId: user._id, name: user.name, skills: user.skills, workloadPercent: workloadPct, avgCompatibility: avgScore, incompatibleAssignments };
  });

  return res.json({ sprint: activeSprint?.name, compatibility });
});

/** GET /analysis/recommend-assignee/:ticketId — best developer for a ticket */
router.get("/recommend-assignee/:ticketId", async (req: AuthRequest, res) => {
  const org = oid(req);
  const [ticket, users, sprintTickets] = await Promise.all([
    Ticket.findOne({ ticketId: req.params.ticketId, organization: org }),
    User.find({ organization: org }).select("-passwordHash"),
    Ticket.find({ organization: org }),
  ]);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  const recommendations = users.map(user => {
    const assigned = sprintTickets.filter(t => t.assignee?.toString() === user._id.toString() && t._id.toString() !== ticket._id.toString());
    const workloadPct = user.capacity > 0 ? Math.round((assigned.reduce((s, t) => s + t.storyPoints, 0) / user.capacity) * 100) : 0;
    const c = compatibilityScore({ requiredSkills: ticket.requiredSkills ?? [], developerSkills: user.skills ?? [], developerWorkloadPercent: workloadPct });
    return { userId: user._id, name: user.name, skills: user.skills, workloadPercent: workloadPct, ...c };
  }).sort((a, b) => b.score - a.score);

  const best = recommendations[0];
  const reasons: string[] = [];
  if (best) {
    if (best.skillScore >= 80) reasons.push("Highest skill match");
    if (best.workloadPercent < 80) reasons.push("Available capacity");
    if (best.capacityScore >= 70) reasons.push("Low current workload");
  }

  return res.json({ ticketId: ticket.ticketId, requiredSkills: ticket.requiredSkills, recommendations, bestRecommendation: best ? { ...best, reasons } : null });
});

router.get("/examples", (_req, res) => {
  return res.json({
    teamCapacity: teamCapacity([{ capacity: 34, availability: 1 }, { capacity: 32, availability: 0.9 }]),
    workloadScore: workloadScore(38, 32),
    compatibilityExample: compatibilityScore({ requiredSkills: ["React", "Node", "TypeScript"], developerSkills: ["React", "Node"], developerWorkloadPercent: 60 }),
    hierarchyProgressExample: hierarchyProgress([{ storyPoints: 5, status: "Done" }, { storyPoints: 8, status: "In Progress" }, { storyPoints: 3, status: "To Do" }]),
  });
});

export default router;
