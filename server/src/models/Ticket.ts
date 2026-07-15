import mongoose, { Schema } from "mongoose";

export type TicketStatus = "Backlog" | "To Do" | "In Progress" | "In Review" | "Done";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type SlaStatus = "on_track" | "near_breach" | "likely_breach" | "breached";

export interface ITicket {
  organization: mongoose.Types.ObjectId;
  ticketId: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: TicketStatus;
  priority: TicketPriority;
  storyPoints: number;
  assignee?: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  sprint: mongoose.Types.ObjectId;
  epic: string;
  labels: string[];
  dueDate: Date;
  blocked: boolean;
  dependencies: string[];
  comments: { author: string; body: string; createdAt: Date }[];
  workLogs: { author: string; hours: number; note: string; createdAt: Date }[];
  history: { event: string; createdAt: Date }[];
  watchers: mongoose.Types.ObjectId[];
  attachments: { name: string; url: string; mimeType?: string; size?: number; uploadedBy: mongoose.Types.ObjectId; createdAt: Date }[];
  rank: number;
  archivedAt?: Date;
  // Hierarchy — children are NEVER stored; always fetched via find({ parentTaskId: id })
  parentTaskId?: mongoose.Types.ObjectId;
  // SLA & Skills
  requiredSkills: string[];
  slaHours?: number;
  completedTime?: Date;
  slaBreachedAuditLogged?: boolean;
}

/** Returns SLA hours based on ticket priority */
export function slaHoursForPriority(priority: TicketPriority): number {
  const map: Record<TicketPriority, number> = { critical: 4, high: 24, medium: 72, low: 120 };
  return map[priority] ?? 72;
}

/** Compute SLA status given creation time and SLA hours */
export function computeSlaStatus(createdAt: Date, slaHours: number, completedTime?: Date): SlaStatus {
  const now = completedTime ?? new Date();
  const elapsed = (now.getTime() - createdAt.getTime()) / 3_600_000;
  const elapsed_pct = elapsed / slaHours;
  if (elapsed_pct >= 1) return "breached";
  if (elapsed_pct >= 0.8) return "near_breach";
  return "on_track";
}

/**
 * Predict if a ticket is "likely to breach" SLA based on current team velocity.
 * If daily velocity is 0 or unknown, defaults to flagging the ticket if >60% SLA elapsed.
 */
export function predictSlaLikely(params: {
  createdAt: Date;
  slaHours: number;
  remainingPoints: number;
  dailyVelocityPoints: number;
  completedTime?: Date;
}): boolean {
  if (params.completedTime) return false;
  const now = new Date();
  const elapsed = (now.getTime() - params.createdAt.getTime()) / 3_600_000;
  if (elapsed >= params.slaHours) return false;
  const remainingHours = params.slaHours - elapsed;
  if (params.dailyVelocityPoints <= 0) return (elapsed / params.slaHours) > 0.6;
  const estimatedHoursToComplete = (params.remainingPoints / params.dailyVelocityPoints) * 8;
  return estimatedHoursToComplete > remainingHours;
}

const ticketSchema = new Schema<ITicket>(
  {
    organization: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    ticketId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    acceptanceCriteria: [{ type: String }],
    status: { type: String, required: true },
    priority: { type: String, required: true },
    storyPoints: { type: Number, required: true },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    sprint: { type: Schema.Types.ObjectId, ref: "Sprint", required: true },
    epic: { type: String, required: true },
    labels: [{ type: String }],
    dueDate: { type: Date, required: true },
    blocked: { type: Boolean, default: false },
    dependencies: [{ type: String }],
    comments: [{ author: String, body: String, createdAt: Date }],
    workLogs: [{ author: String, hours: Number, note: String, createdAt: Date }],
    history: [{ event: String, createdAt: Date }],
    watchers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    attachments: [{ name: String, url: String, mimeType: String, size: Number, uploadedBy: { type: Schema.Types.ObjectId, ref: "User" }, createdAt: Date }],
    rank: { type: Number, default: 0 },
    archivedAt: Date,
    // Hierarchy
    parentTaskId: { type: Schema.Types.ObjectId, ref: "Ticket" },
    // SLA & Skills
    requiredSkills: [{ type: String }],
    slaHours: { type: Number },
    completedTime: { type: Date },
    slaBreachedAuditLogged: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ticketSchema.index({ organization: 1, ticketId: 1 }, { unique: true });
ticketSchema.index({ organization: 1, parentTaskId: 1 });

export const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);
