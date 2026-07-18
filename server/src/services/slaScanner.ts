import { env } from "../config/env.js";
import { ticketPopulation } from "../constants/workflow.js";
import { Notification } from "../models/Operational.js";
import { Organization } from "../models/Organization.js";
import { Ticket } from "../models/Ticket.js";
import { User } from "../models/User.js";
import { applySlaState } from "./sla.js";
import { enqueueOutboxEvent } from "./outbox.js";

function id(value: any) {
  return String(value?._id || value?.id || value || "");
}

function activeDeadline(ticket: any) {
  const deadlines = [
    ...(!ticket.firstRespondedAt && ticket.firstResponseDueAt ? [new Date(ticket.firstResponseDueAt)] : []),
    ...(ticket.resolutionDueAt ? [new Date(ticket.resolutionDueAt)] : []),
  ];
  return deadlines.sort((left, right) => left.getTime() - right.getTime())[0];
}

export async function scanSlaTransitions(now = new Date()) {
  const tickets = await Ticket.find({
    archivedAt: { $exists: false },
    deletedAt: { $exists: false },
    status: { $ne: "Done" },
  }).populate(ticketPopulation);
  let changed = 0, queued = 0;

  for (const ticket of tickets) {
    const previous = ticket.slaStatus;
    applySlaState(ticket, now);
    if (ticket.slaStatus === previous) continue;
    await ticket.save();
    changed += 1;
    if (!["due_soon", "breached"].includes(ticket.slaStatus)) continue;

    const organization = await Organization.findById(ticket.organization);
    const recipientIds = [...new Set([id(ticket.assignee), id(ticket.reporter), ...(ticket.watchers || []).map(id)].filter(Boolean))];
    const users = await User.find({ _id: { $in: recipientIds } });
    const recipients = users.filter((user: any) => user.notificationPreferences?.slaAlerts !== false);
    const href = `/${organization?.slug || "workspace"}/tickets/${ticket._id}`;
    const deadline = activeDeadline(ticket);
    if (!deadline) continue;

    for (const user of recipients) {
      await Notification.create({
        organization: ticket.organization,
        user: user._id,
        type: `ticket.sla.${ticket.slaStatus}`,
        title: `${ticket.ticketId} SLA ${ticket.slaStatus === "breached" ? "breached" : "due soon"}`,
        body: ticket.title,
        entityType: "ticket",
        entityId: ticket._id,
        href,
        metadata: { deadline },
      });
    }

    await enqueueOutboxEvent({
      organization: id(ticket.organization),
      eventType: `ticket.sla.${ticket.slaStatus}`,
      aggregateType: "ticket",
      aggregateId: id(ticket._id),
      dedupeKey: `sla:${id(ticket._id)}:${ticket.slaStatus}:${deadline.toISOString()}`,
      payload: {
        ticketKey: ticket.ticketId,
        ticketTitle: ticket.title,
        state: ticket.slaStatus,
        deadline: deadline.toISOString(),
        href,
        emailRecipients: env.slaEmailEnabled ? recipients.map((user: any) => ({ userId: id(user._id) })) : [],
      },
    });
    queued += 1;
  }
  return { inspected: tickets.length, changed, queued, emailEnabled: env.slaEmailEnabled };
}
