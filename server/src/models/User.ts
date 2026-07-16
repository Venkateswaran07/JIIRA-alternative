import mongoose, { Schema } from "mongoose";

export type UserRole = "admin" | "manager" | "engineer" | "designer";
export type InviteStatus = "active" | "invited" | "disabled";
export type NotificationPreferences = {
  ticketAssignments: boolean;
  mentionsAndComments: boolean;
  sprintRiskAlerts: boolean;
  weeklySummary: boolean;
};

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  organization?: mongoose.Types.ObjectId;
  role?: UserRole;
  inviteStatus?: InviteStatus;
  lastActiveOrganization?: mongoose.Types.ObjectId;
  skills: string[];
  availability: number;
  capacity: number;
  avatarColor: string;
  notificationPreferences: NotificationPreferences;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    organization: { type: Schema.Types.ObjectId, ref: "Organization" },
    role: { type: String },
    inviteStatus: { type: String, default: "active" },
    lastActiveOrganization: { type: Schema.Types.ObjectId, ref: "Organization" },
    skills: [{ type: String }],
    availability: { type: Number, default: 1 },
    capacity: { type: Number, default: 32 },
    avatarColor: { type: String, default: "#00AEEF" },
    notificationPreferences: {
      ticketAssignments: { type: Boolean, default: true },
      mentionsAndComments: { type: Boolean, default: true },
      sprintRiskAlerts: { type: Boolean, default: true },
      weeklySummary: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", userSchema);
