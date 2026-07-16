import mongoose, { Schema } from "mongoose";
import type { UserRole } from "./User.js";

export type MembershipStatus = "active" | "disabled";

export interface IOrganizationMembership {
  user: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  role: UserRole;
  status: MembershipStatus;
  skills: string[];
  availability: number;
  capacity: number;
}

const membershipSchema = new Schema<IOrganizationMembership>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  organization: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  role: { type: String, enum: ["admin", "manager", "engineer", "designer"], required: true },
  status: { type: String, enum: ["active", "disabled"], default: "active" },
  skills: [{ type: String }],
  availability: { type: Number, default: 1 },
  capacity: { type: Number, default: 32 },
}, { timestamps: true });
membershipSchema.index({ user: 1, organization: 1 }, { unique: true });
membershipSchema.index({ organization: 1, status: 1 });
export const OrganizationMembership = mongoose.model<IOrganizationMembership>("OrganizationMembership", membershipSchema);

export interface IInvitation {
  organization: mongoose.Types.ObjectId;
  email: string;
  name: string;
  role: UserRole;
  capacity: number;
  invitedBy: mongoose.Types.ObjectId;
  tokenHash: string;
  status: "pending" | "accepted" | "cancelled";
  expiresAt: Date;
  acceptedBy?: mongoose.Types.ObjectId;
  acceptedAt?: Date;
}

const invitationSchema = new Schema<IInvitation>({
  organization: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  email: { type: String, required: true, lowercase: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["admin", "manager", "engineer", "designer"], required: true },
  capacity: { type: Number, default: 32 },
  invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true, unique: true },
  status: { type: String, enum: ["pending", "accepted", "cancelled"], default: "pending" },
  expiresAt: { type: Date, required: true },
  acceptedBy: { type: Schema.Types.ObjectId, ref: "User" },
  acceptedAt: Date,
}, { timestamps: true });
invitationSchema.index({ organization: 1, email: 1, status: 1 });
invitationSchema.index({ email: 1, status: 1, expiresAt: 1 });
export const Invitation = mongoose.model<IInvitation>("Invitation", invitationSchema);
