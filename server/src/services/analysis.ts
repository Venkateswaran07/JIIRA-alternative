export type CalculationResult = {
  inputValues: Record<string, number>;
  formula: string;
  weights: Record<string, number>;
  intermediate: Record<string, number>;
  finalScore: number;
  explanation: string;
  detail?: Record<string, unknown>;
  calculationVersion: "2026.07";
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function teamCapacity(members: { capacity: number; availability: number }[]): CalculationResult {
  const rawCapacity = members.reduce((sum, member) => sum + member.capacity * member.availability, 0);
  return {
    inputValues: { members: members.length, rawCapacity },
    formula: "sum(member.capacity * member.availability)",
    weights: {},
    intermediate: { rawCapacity },
    finalScore: Math.round(rawCapacity),
    explanation: "Team capacity is the sum of each member's available sprint capacity.",
    calculationVersion: "2026.07",
  };
}

export function sprintUtilisation(plannedPoints: number, capacity: number): CalculationResult {
  const utilisation = capacity === 0 ? 100 : (plannedPoints / capacity) * 100;
  return {
    inputValues: { plannedPoints, capacity },
    formula: "(plannedPoints / capacity) * 100",
    weights: {},
    intermediate: { utilisation },
    finalScore: clamp(utilisation),
    explanation: "Utilisation shows how much planned sprint work consumes available capacity.",
    calculationVersion: "2026.07",
  };
}

export function workloadScore(assignedPoints: number, memberCapacity: number): CalculationResult {
  const score = memberCapacity === 0 ? 100 : (assignedPoints / memberCapacity) * 100;
  return {
    inputValues: { assignedPoints, memberCapacity },
    formula: "(assignedPoints / memberCapacity) * 100",
    weights: {},
    intermediate: { score },
    finalScore: clamp(score),
    explanation: "Workload score compares assigned story points with individual sprint capacity.",
    calculationVersion: "2026.07",
  };
}

export function burnoutScore(workload: number, blockedTasks: number, focusLoad: number): CalculationResult {
  const weights = { workload: 0.55, blockedTasks: 0.3, focusLoad: 0.15 };
  const blockedImpact = Math.min(blockedTasks * 18, 100);
  const score = workload * weights.workload + blockedImpact * weights.blockedTasks + focusLoad * weights.focusLoad;
  return {
    inputValues: { workload, blockedTasks, focusLoad },
    formula: "workload*.55 + min(blockedTasks*18,100)*.30 + focusLoad*.15",
    weights,
    intermediate: { blockedImpact, score },
    finalScore: clamp(score),
    explanation: "Burnout risk rises with overload, unresolved blockers, and context switching.",
    calculationVersion: "2026.07",
  };
}

export function dependencyRisk(blockedTickets: number, totalTickets: number): CalculationResult {
  const ratio = totalTickets === 0 ? 0 : blockedTickets / totalTickets;
  return {
    inputValues: { blockedTickets, totalTickets },
    formula: "(blockedTickets / totalTickets) * 100",
    weights: {},
    intermediate: { ratio },
    finalScore: clamp(ratio * 100),
    explanation: "Dependency risk is based on the share of tickets currently blocked.",
    calculationVersion: "2026.07",
  };
}

export function skillGapRisk(requiredSkills: number, coveredSkills: number): CalculationResult {
  const gap = Math.max(requiredSkills - coveredSkills, 0);
  const score = requiredSkills === 0 ? 0 : (gap / requiredSkills) * 100;
  return {
    inputValues: { requiredSkills, coveredSkills },
    formula: "max(requiredSkills-coveredSkills,0)/requiredSkills*100",
    weights: {},
    intermediate: { gap, score },
    finalScore: clamp(score),
    explanation: "Skill-gap risk measures uncovered required skills for sprint work.",
    calculationVersion: "2026.07",
  };
}

export function historicalVelocityDeviation(plannedPoints: number, velocityHistory: number[]): CalculationResult {
  const averageVelocity = velocityHistory.length ? velocityHistory.reduce((sum, value) => sum + value, 0) / velocityHistory.length : plannedPoints;
  const deviation = averageVelocity === 0 ? 0 : ((plannedPoints - averageVelocity) / averageVelocity) * 100;
  return {
    inputValues: { plannedPoints, averageVelocity },
    formula: "((plannedPoints - averageVelocity) / averageVelocity) * 100",
    weights: {},
    intermediate: { deviation },
    finalScore: clamp(Math.max(deviation, 0)),
    explanation: "Velocity deviation flags plans that exceed recent delivery pace.",
    calculationVersion: "2026.07",
  };
}

/** SLA Health Risk — includes predicted likely-breach tickets based on velocity */
export function slaHealthRisk(params: {
  breachedCount: number;
  nearBreachCount: number;
  likelyBreachCount: number;
  totalTickets: number;
  breachedDetail?: { ticketId: string; priority: string; hoursOver: number }[];
  nearBreachDetail?: { ticketId: string; priority: string; hoursLeft: number }[];
  likelyBreachDetail?: { ticketId: string; priority: string }[];
}): CalculationResult {
  const { breachedCount, nearBreachCount, likelyBreachCount, totalTickets } = params;
  if (totalTickets === 0) {
    return { inputValues: { breachedCount: 0, nearBreachCount: 0, likelyBreachCount: 0, totalTickets: 0 }, formula: "0", weights: {}, intermediate: {}, finalScore: 0, explanation: "No tickets in sprint.", calculationVersion: "2026.07" };
  }
  const score = ((breachedCount + nearBreachCount * 0.5 + likelyBreachCount * 0.25) / totalTickets) * 100;
  return {
    inputValues: { breachedCount, nearBreachCount, likelyBreachCount, totalTickets },
    formula: "(breached + nearBreach*0.5 + likelyBreach*0.25) / total * 100",
    weights: { breached: 1.0, nearBreach: 0.5, likelyBreach: 0.25 },
    intermediate: { score },
    finalScore: clamp(score),
    explanation: `SLA risk combines breached (×1.0), near-breach (×0.5), and likely-breach predicted tickets (×0.25).`,
    detail: {
      breachedDetail: params.breachedDetail ?? [],
      nearBreachDetail: params.nearBreachDetail ?? [],
      likelyBreachDetail: params.likelyBreachDetail ?? [],
    },
    calculationVersion: "2026.07",
  };
}

/**
 * Compatibility score for a developer against a task.
 * Combines Skill Match (60%) + Available Capacity (40%).
 * A developer with capacity > 100% is always Poor regardless of skill.
 */
export function compatibilityScore(params: {
  requiredSkills: string[];
  developerSkills: string[];
  developerWorkloadPercent: number; // 0-100+ (current assigned points / capacity * 100)
}): { score: number; skillScore: number; capacityScore: number; label: "Excellent" | "Moderate" | "Poor"; missingSkills: string[] } {
  const { requiredSkills, developerSkills, developerWorkloadPercent } = params;
  const matched = requiredSkills.filter(s => developerSkills.map(x => x.toLowerCase()).includes(s.toLowerCase()));
  const missingSkills = requiredSkills.filter(s => !developerSkills.map(x => x.toLowerCase()).includes(s.toLowerCase()));
  const skillScore = requiredSkills.length === 0 ? 100 : Math.round((matched.length / requiredSkills.length) * 100);
  const capacityScore = Math.max(0, Math.min(100, Math.round(100 - developerWorkloadPercent)));
  // Overloaded dev is always Poor
  const score = developerWorkloadPercent > 100 ? Math.min(59, Math.round(skillScore * 0.6)) : Math.round(skillScore * 0.6 + capacityScore * 0.4);
  const label: "Excellent" | "Moderate" | "Poor" = score >= 90 ? "Excellent" : score >= 60 ? "Moderate" : "Poor";
  return { score, skillScore, capacityScore, label, missingSkills };
}

/**
 * Weighted hierarchy progress — uses story points, not task count.
 * Returns 100 if no children exist.
 */
export function hierarchyProgress(children: { storyPoints: number; status: string }[]): {
  progressPercent: number;
  totalPoints: number;
  completedPoints: number;
} {
  if (children.length === 0) return { progressPercent: 100, totalPoints: 0, completedPoints: 0 };
  const totalPoints = children.reduce((s, c) => s + (c.storyPoints || 0), 0);
  const completedPoints = children.filter(c => c.status === "Done").reduce((s, c) => s + (c.storyPoints || 0), 0);
  const progressPercent = totalPoints === 0 ? 0 : Math.round((completedPoints / totalPoints) * 100);
  return { progressPercent, totalPoints, completedPoints };
}

/**
 * Predict if a ticket is "likely to breach" SLA based on current team velocity.
 * If daily velocity is 0 or unknown, defaults to flagging the ticket if >60% SLA elapsed.
 */
export function predictSlaLikely(params: {
  createdAt: Date;
  slaHours: number;
  remainingPoints: number;
  dailyVelocityPoints: number; // average team story points per day
  completedTime?: Date;
}): boolean {
  if (params.completedTime) return false; // already done
  const now = new Date();
  const elapsed = (now.getTime() - params.createdAt.getTime()) / 3_600_000;
  if (elapsed >= params.slaHours) return false; // already breached — handled separately
  const remainingHours = params.slaHours - elapsed;
  if (params.dailyVelocityPoints <= 0) return (elapsed / params.slaHours) > 0.6;
  const dailyVelocityHours = 8; // assume 8h workday
  const estimatedHoursToComplete = (params.remainingPoints / params.dailyVelocityPoints) * dailyVelocityHours;
  return estimatedHoursToComplete > remainingHours;
}

export function sprintRiskScore(params: {
  utilisation: number;
  dependencyRisk: number;
  burnoutRisk: number;
  skillGapRisk: number;
  velocityDeviation: number;
  slaHealth: number;
}): CalculationResult {
  // Updated weights per plan: utilization 20%, dependency 20%, burnout 20%, velocity 15%, skill gap 10%, SLA 15%
  const weights = { utilisation: 0.20, dependencyRisk: 0.20, burnoutRisk: 0.20, skillGapRisk: 0.10, velocityDeviation: 0.15, slaHealth: 0.15 };
  const score =
    params.utilisation * weights.utilisation +
    params.dependencyRisk * weights.dependencyRisk +
    params.burnoutRisk * weights.burnoutRisk +
    params.skillGapRisk * weights.skillGapRisk +
    params.velocityDeviation * weights.velocityDeviation +
    params.slaHealth * weights.slaHealth;
  const reasons: string[] = [];
  if (params.utilisation > 80) reasons.push("capacity exceeded");
  if (params.burnoutRisk > 70) reasons.push("burnout risk high");
  if (params.slaHealth > 50) reasons.push("SLA breaches detected");
  if (params.dependencyRisk > 50) reasons.push("high dependency blockages");
  return {
    inputValues: params,
    formula: "utilization*0.20 + dependency*0.20 + burnout*0.20 + skillGap*0.10 + velocity*0.15 + slaHealth*0.15",
    weights,
    intermediate: { score },
    finalScore: clamp(score),
    explanation: reasons.length
      ? `Sprint risk elevated due to: ${reasons.join(", ")}.`
      : "Sprint risk is deterministic and combines capacity pressure, blockers, team strain, skills, SLA health, and historical delivery variance.",
    calculationVersion: "2026.07",
  };
}

export type SimulationScenario = {
  removeMembers?: string[]; // developer names to exclude
  reassignTickets?: { ticketId: string; toAssigneeName: string }[];
  addExtraPoints?: number; // scope creep
  removeDays?: number; // sprint shortened by N days
};

export function whatIfSimulation(params: {
  current: { utilisation: number; dependencyRisk: number; burnoutRisk: number; skillGapRisk: number; velocityDeviation: number; slaHealth: number; finalScore: number };
  scenario: SimulationScenario;
  totalCapacity: number;
  plannedPoints: number;
  velocityHistory: number[];
  members: { name: string; capacity: number; availability: number }[];
}): { before: number; after: number; delta: number; explanation: string } {
  const { current, scenario, members, plannedPoints, totalCapacity, velocityHistory } = params;

  const remainingMembers = scenario.removeMembers?.length
    ? members.filter(m => !scenario.removeMembers!.includes(m.name))
    : members;

  const adjustedCapacity = scenario.removeMembers?.length
    ? teamCapacity(remainingMembers).finalScore
    : totalCapacity;

  const extraPoints = scenario.addExtraPoints ?? 0;
  const adjustedPlanned = plannedPoints + extraPoints;
  const dayLoss = scenario.removeDays ?? 0;

  const adjustedUtil = sprintUtilisation(adjustedPlanned, Math.max(adjustedCapacity - dayLoss * 6, 1)).finalScore;
  const adjustedVelocity = historicalVelocityDeviation(adjustedPlanned, velocityHistory).finalScore;
  const adjustedBurnout = Math.min(100, current.burnoutRisk + (scenario.removeMembers?.length ?? 0) * 12);
  const adjustedSla = Math.min(100, current.slaHealth + (dayLoss > 0 ? 15 : 0));

  const afterRisk = sprintRiskScore({
    utilisation: adjustedUtil,
    dependencyRisk: current.dependencyRisk,
    burnoutRisk: adjustedBurnout,
    skillGapRisk: current.skillGapRisk,
    velocityDeviation: adjustedVelocity,
    slaHealth: adjustedSla,
  }).finalScore;

  const parts: string[] = [];
  if (scenario.removeMembers?.length) parts.push(`removing ${scenario.removeMembers.join(", ")} reduces capacity by ${totalCapacity - adjustedCapacity} points`);
  if (extraPoints > 0) parts.push(`adding ${extraPoints} story points increases scope`);
  if (dayLoss > 0) parts.push(`shortening sprint by ${dayLoss} days reduces effective capacity`);
  if (scenario.reassignTickets?.length) parts.push(`${scenario.reassignTickets.length} ticket(s) reassigned`);

  return {
    before: current.finalScore,
    after: afterRisk,
    delta: afterRisk - current.finalScore,
    explanation: parts.length ? `Simulation: ${parts.join("; ")}.` : "No changes applied to simulation.",
  };
}
