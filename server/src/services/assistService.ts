import { Ticket, ITicket } from "../models/Ticket.js";
import { OrganizationMembership } from "../models/WorkspaceAccess.js";
import { AssistLedger } from "../models/AssistLedger.js";
import { User } from "../models/User.js";

/**
 * Calculates delay probability for a ticket.
 * If >= 70%, automatically flags the ticket for Team Assist,
 * clears the assignee (moving it to triage/public Collaboration Board),
 * and finds suggested teammates with available capacity and matching skills.
 */
export async function runPredictiveRiskDetection(ticket: any): Promise<boolean> {
  // If the ticket is completed or has no assignee, do not perform risk detection
  if (ticket.status === "Done" || !ticket.assignee) {
    return false;
  }

  try {
    // 1. Fetch user's membership capacity in the organization
    const membership = await OrganizationMembership.findOne({
      user: ticket.assignee,
      organization: ticket.organization,
      status: "active",
    });

    if (!membership) return false;

    // 2. Fetch all incomplete tickets assigned to this user
    const userTickets = await Ticket.find({
      assignee: ticket.assignee,
      organization: ticket.organization,
      status: { $ne: "Done" },
    });

    const totalAssignedPoints = userTickets.reduce(
      (sum: number, t: any) => sum + Number(t.storyPoints || 0),
      0
    );

    const capacity = Number(membership.capacity || 32);

    // 3. Compute workload ratio
    const workloadRatio = capacity > 0 ? totalAssignedPoints / capacity : 1;

    // 4. Compute delay probability based on workload, blockers, priority, and size
    let probability = 0;

    // Workload contribution: 100% workload adds 50% risk. >100% workload adds more.
    probability += Math.min(50, workloadRatio * 50);

    // If workload is overloaded, add extra risk
    if (workloadRatio > 1.0) {
      probability += (workloadRatio - 1.0) * 40;
    }

    // Blocker contribution: +30% risk if blocked
    if (ticket.blocked) {
      probability += 30;
    }

    // Priority multiplier
    if (ticket.priority === "critical") {
      probability += 20;
    } else if (ticket.priority === "high") {
      probability += 10;
    }

    // Story point size contribution (larger tickets are more likely to delay)
    if (Number(ticket.storyPoints) > 8) {
      probability += 15;
    } else if (Number(ticket.storyPoints) > 5) {
      probability += 10;
    }

    // Clamp between 0 and 99% (keep realistic)
    probability = Math.min(99, Math.max(0, Math.round(probability)));

    console.log(
      `[AI Listener] Predictive risk detection: Ticket ${ticket.ticketId} assigned to ${ticket.assignee} has workloadRatio ${workloadRatio.toFixed(2)} -> calculated delay probability: ${probability}%`
    );

    // If delay probability is 70% or more, initiate auto-triage
    if (probability >= 70) {
      ticket.isAssisted = true;
      ticket.assistRiskDetected = true;
      ticket.assistRiskProbability = probability;
      ticket.assistOriginalAssignee = ticket.assignee;
      ticket.assistCredits = Math.max(10, Number(ticket.storyPoints || 1) * 15);

      // Save the list of suggested assignees
      const suggestions = await findCapacityBasedMatching(ticket);
      ticket.assistSuggestedAssignees = suggestions;

      // Move task out of the owner's private view to public Collaboration Board by setting assignee to undefined
      ticket.assignee = undefined;

      ticket.history.push({
        event: `Auto-triaged to Collaboration Board by AI (Delay Risk: ${probability}%)`,
        createdAt: new Date(),
      });

      return true;
    }
  } catch (error) {
    console.error("[AI Listener] Error in runPredictiveRiskDetection:", error);
  }

  return false;
}

/**
 * Finds suggested teammates who have available capacity and matching skills.
 */
export async function findCapacityBasedMatching(ticket: any): Promise<any[]> {
  try {
    const originalAssignee = ticket.assistOriginalAssignee || ticket.assignee;

    // Fetch other active members in the same organization
    const members = await OrganizationMembership.find({
      organization: ticket.organization,
      status: "active",
    }).populate("user");

    const suggestions: any[] = [];

    for (const member of members) {
      // Skip the original assignee
      if (member.user && String(member.user._id) === String(originalAssignee)) {
        continue;
      }

      if (!member.user) continue;

      // Fetch incomplete tickets assigned to this member
      const memberTickets = await Ticket.find({
        assignee: member.user._id,
        organization: ticket.organization,
        status: { $ne: "Done" },
      });

      const assignedPoints = memberTickets.reduce(
        (sum: number, t: any) => sum + Number(t.storyPoints || 0),
        0
      );

      const availableCapacity = Number(member.capacity || 32) - assignedPoints;

      // Match skills against ticket labels
      const ticketLabels = (ticket.labels || []).map((l: string) => l.toLowerCase());
      const memberSkills = (member.skills || []).map((s: string) => s.toLowerCase());

      const matchingSkills = memberSkills.filter((skill: string) =>
        ticketLabels.some((label: string) => label.includes(skill) || skill.includes(label))
      );

      suggestions.push({
        userId: member.user._id,
        name: member.user.name,
        email: member.user.email,
        avatarColor: member.user.avatarColor,
        availableCapacity: Math.max(0, availableCapacity),
        matchingSkills,
      });
    }

    // Sort by matching skills count descending, then by available capacity descending
    suggestions.sort((a, b) => {
      if (b.matchingSkills.length !== a.matchingSkills.length) {
        return b.matchingSkills.length - a.matchingSkills.length;
      }
      return b.availableCapacity - a.availableCapacity;
    });

    // Return top 3 candidates
    return suggestions.slice(0, 3);
  } catch (error) {
    console.error("[AI Listener] Error in findCapacityBasedMatching:", error);
    return [];
  }
}

/**
 * Autonomously logs Team Assist Credits if a peer completes an assisted task.
 */
export async function checkAndLogAssistCredits(
  ticket: any,
  completingUserId: string
): Promise<boolean> {
  // Must be an assisted ticket, have an original assignee, and be completed by a different user
  if (
    ticket.isAssisted &&
    ticket.status === "Done" &&
    ticket.assistOriginalAssignee &&
    String(ticket.assistOriginalAssignee) !== String(completingUserId)
  ) {
    try {
      // Check if already logged to avoid duplicates
      const existingLedger = await AssistLedger.findOne({
        ticketId: ticket._id,
        completedBy: completingUserId,
      });

      if (existingLedger) {
        return false;
      }

      const credits = ticket.assistCredits || Math.max(10, Number(ticket.storyPoints || 1) * 15);

      await AssistLedger.create({
        organization: ticket.organization,
        ticketId: ticket._id,
        ticketKey: ticket.ticketId,
        title: ticket.title,
        originalAssignee: ticket.assistOriginalAssignee,
        completedBy: completingUserId,
        storyPoints: Number(ticket.storyPoints || 0),
        credits: credits,
        completedAt: new Date(),
      });

      console.log(
        `[Velocity Shield] Autonomously logged ${credits} Team Assist Credits to User ${completingUserId} for completing ${ticket.ticketId}`
      );

      ticket.history.push({
        event: `Team Assist Credits logged: +${credits} credits to peer completing the task`,
        createdAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error("[Velocity Shield] Error in checkAndLogAssistCredits:", error);
    }
  }
  return false;
}

/**
 * Aggregates all assists into a Performance Intelligence Report for the organization.
 */
export async function generatePerformanceIntelligenceReport(organizationId: string) {
  try {
    const ledgerEntries = await AssistLedger.find({ organization: organizationId })
      .populate("originalAssignee")
      .populate("completedBy");

    // Aggregate by completing user
    const summaryMap = new Map<string, { user: any; assists: number; totalCredits: number; details: any[] }>();

    for (const entry of ledgerEntries) {
      const completedByUser = entry.completedBy;
      if (!completedByUser) continue;

      const userId = String(completedByUser._id);
      if (!summaryMap.has(userId)) {
        summaryMap.set(userId, {
          user: completedByUser,
          assists: 0,
          totalCredits: 0,
          details: [],
        });
      }

      const stats = summaryMap.get(userId)!;
      stats.assists += 1;
      stats.totalCredits += entry.credits;
      stats.details.push({
        ticketId: entry.ticketId,
        ticketKey: entry.ticketKey,
        title: entry.title,
        storyPoints: entry.storyPoints,
        credits: entry.credits,
        originalAssigneeName: entry.originalAssignee?.name || "Unassigned",
        completedAt: entry.completedAt,
      });
    }

    return Array.from(summaryMap.values());
  } catch (error) {
    console.error("[Velocity Shield] Error generating report:", error);
    return [];
  }
}
