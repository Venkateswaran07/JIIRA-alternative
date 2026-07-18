import { Notification } from "../models/Operational.js";
import { WorkspaceResource } from "../models/WorkspaceResource.js";
import { User } from "../models/User.js";
import { enqueueOutboxEvent } from "./outbox.js";

const Resources = WorkspaceResource as any;

function ids(values: unknown[]) {
  return values
    .map((value: any) => String(value?._id ?? value?.id ?? value ?? ""))
    .filter(Boolean);
}

export function conditionMatches(condition: unknown, ticket: any) {
  const value = String(condition || "").trim();
  if (!value || value.toLowerCase() === "always") return true;
  const match = value.match(/^(status|priority|blocked)\s*=\s*(.+)$/i);
  return Boolean(match && String(ticket[match[1].toLowerCase()]).toLowerCase() === match[2].trim().toLowerCase());
}

export function applyAction(action: unknown, ticket: any) {
  const value = String(action || "").trim();
  if (/^mark blocked$/i.test(value)) ticket.blocked = true;
  else if (/^clear blocked$/i.test(value)) ticket.blocked = false;
  else {
    const priority = value.match(/^set priority\s*=\s*(low|medium|high|critical)$/i);
    const label = value.match(/^add label\s*=\s*(.+)$/i);
    if (priority) ticket.priority = priority[1].toLowerCase();
    if (label && !ticket.labels.includes(label[1].trim())) ticket.labels.push(label[1].trim());
  }
}

async function notifyUsers(organization: string, users: string[], event: string, ticket: any, ruleName: string) {
  const uniqueUsers = [...new Set(users)];
  const userRecords = await User.find({ _id: { $in: uniqueUsers } }).select("_id notificationPreferences");
  const preference = event.toLowerCase().includes("assigned") ? "ticketAssignments" : event.toLowerCase().includes("comment") || event.toLowerCase().includes("mention") ? "mentionsAndComments" : event.toLowerCase().includes("risk") ? "sprintRiskAlerts" : null;
  await Promise.all(userRecords.filter((user: any) => !preference || user.notificationPreferences?.[preference] !== false).map((user: any) => Notification.create({
    organization,
    user: user._id,
    type: "automation",
    title: ruleName,
    body: `${ticket.ticketId}: ${ticket.title}`,
    entityType: "ticket",
    entityId: String(ticket._id),
    href: `/tickets/${encodeURIComponent(ticket.ticketId)}`,
    metadata: { event },
  })));
}

export async function applyWorkspaceRules(organization: string, event: string, ticket: any) {
  await enqueueOutboxEvent({
    organization,
    eventType: event,
    aggregateType: "ticket",
    aggregateId: String(ticket._id),
    payload: { ticketId: ticket.ticketId, title: ticket.title, status: ticket.status, priority: ticket.priority },
  });
  const defaultRecipients = event.toLowerCase().includes("comment")
    ? [...ids(ticket.watchers || []), ...ids([ticket.assignee])]
    : event.toLowerCase().includes("assigned") || event.toLowerCase().includes("created")
      ? ids([ticket.assignee])
      : event.toLowerCase().includes("status")
        ? [...ids(ticket.watchers || []), ...ids([ticket.assignee])]
        : [];
  if (defaultRecipients.length) {
    await notifyUsers(organization, defaultRecipients, event, ticket, `Ticket ${event.replaceAll(".", " ")}`);
  }
  const [automations, notificationRules] = await Promise.all([
    Resources.find({ organization, kind: "automation-rule", status: "active" }),
    Resources.find({ organization, kind: "notification-rule", status: "active" }),
  ]);

  let changed = false;
  for (const rule of automations) {
    const config = rule.config || {};
    if (String(config.trigger || "").toLowerCase() !== event.toLowerCase() || !conditionMatches(config.condition, ticket)) continue;
    if (/^notify watchers$/i.test(String(config.action || ""))) {
      await notifyUsers(organization, ids(ticket.watchers || []), event, ticket, rule.name);
    } else {
      applyAction(config.action, ticket);
      changed = true;
    }
  }
  if (changed) await ticket.save();

  for (const rule of notificationRules) {
    const config = rule.config || {};
    if (String(config.event || "").toLowerCase() !== event.toLowerCase()) continue;
    if (String(config.channel || "in-app").toLowerCase() !== "in-app") continue;
    const recipients = String(config.recipients || "assignee").toLowerCase();
    const users = recipients === "watchers"
      ? ids(ticket.watchers || [])
      : recipients === "reporter"
        ? ids([ticket.reporter])
        : ids([ticket.assignee]);
    await notifyUsers(organization, users, event, ticket, rule.name);
  }
}
