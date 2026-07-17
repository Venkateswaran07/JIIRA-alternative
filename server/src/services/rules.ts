import { Notification } from "../models/Operational.js";
import { WorkspaceResource } from "../models/WorkspaceResource.js";

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
  await Promise.all([...new Set(users)].map((user) => Notification.create({
    organization,
    user,
    type: "automation",
    title: ruleName,
    body: `${ticket.ticketId}: ${ticket.title}`,
    entityType: "ticket",
    entityId: String(ticket._id),
    metadata: { event },
  })));
}

export async function applyWorkspaceRules(organization: string, event: string, ticket: any) {
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
