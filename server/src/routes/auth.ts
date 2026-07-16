import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { ActionToken, Session } from "../models/Operational.js";
import { User } from "../models/User.js";
import { OrganizationMembership } from "../models/WorkspaceAccess.js";
import { hashToken, issueTokens, membershipsFor, pendingInvitationsFor, publicOrganization, publicUser, sessionResponse } from "../services/sessionAuth.js";

const router = Router();
const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });
const registerSchema = credentials.extend({ name: z.string().min(2) });
const notificationPreferencesSchema = z.object({ ticketAssignments: z.boolean(), mentionsAndComments: z.boolean(), sprintRiskAlerts: z.boolean(), weeklySummary: z.boolean() });

async function preferredMembership(user: any, organizationId?: unknown) {
  if (organizationId) {
    const selected = await OrganizationMembership.findOne({ user: user._id, organization: organizationId, status: "active" });
    if (selected) return selected;
  }
  if (user.lastActiveOrganization) {
    const recent = await OrganizationMembership.findOne({ user: user._id, organization: user.lastActiveOrganization, status: "active" });
    if (recent) return recent;
  }
  const first = await OrganizationMembership.findOne({ user: user._id, status: "active" }).sort("createdAt");
  if (first || !user.organization) return first;
  return OrganizationMembership.findOneAndUpdate(
    { user: user._id, organization: user.organization },
    { $setOnInsert: { role: user.role || "engineer", status: user.inviteStatus === "disabled" ? "disabled" : "active", skills: user.skills || [], availability: user.availability ?? 1, capacity: user.capacity ?? 32 } },
    { upsert: true, new: true },
  );
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Name, valid email, and password are required", issues: parsed.error.issues });
  const email = parsed.data.email.toLowerCase();
  if (await User.exists({ email })) return res.status(409).json({ message: "An account with this email already exists" });
  const user = await User.create({ name: parsed.data.name, email, passwordHash: await bcrypt.hash(parsed.data.password, 10), avatarColor: "#00AEEF" });
  return res.status(201).json(await sessionResponse(user, undefined, req.get("user-agent")));
});

router.post("/login", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Valid email and password are required" });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ message: "Invalid credentials" });
  const membership = await preferredMembership(user, req.body?.organizationId);
  return res.json(await sessionResponse(user, membership, req.get("user-agent")));
});

router.post("/refresh", async (req, res) => {
  const parsed = z.object({ refreshToken: z.string().min(20) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Refresh token is required" });
  const session = await Session.findOne({ tokenHash: hashToken(parsed.data.refreshToken), revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
  if (!session) return res.status(401).json({ message: "Invalid or expired refresh token" });
  const user = await User.findById(session.user);
  if (!user) return res.status(401).json({ message: "Account is unavailable" });
  const membership = session.organization ? await preferredMembership(user, session.organization) : undefined;
  if (session.organization && !membership) return res.status(401).json({ message: "Workspace membership is unavailable" });
  session.revokedAt = new Date(); await session.save();
  return res.json(await issueTokens(user, membership, req.get("user-agent")));
});

router.post("/logout", async (req, res) => { const token = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : ""; if (token) await Session.updateOne({ tokenHash: hashToken(token) }, { revokedAt: new Date() }); return res.status(204).send(); });

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  const membership = req.user!.organizationId ? await preferredMembership(user, req.user!.organizationId) : undefined;
  const organization = membership ? await (await import("../models/Organization.js")).Organization.findById(membership.organization) : null;
  return res.json({ user: { ...publicUser(user), role: membership?.role }, organization: publicOrganization(organization), activeMembership: membership ? { id: membership.id, role: membership.role, status: membership.status } : null, memberships: await membershipsFor(user.id), pendingInvitations: await pendingInvitationsFor(user.email), next: membership ? (membership.role !== "admin" || organization?.onboardingCompletedAt ? "/dashboard" : "/onboarding/project") : "/onboarding/workspace" });
});

router.post("/forgot-password", async (req, res) => { const parsed = z.object({ email: z.string().email() }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ message: "Valid email is required" }); const user = await User.findOne({ email: parsed.data.email.toLowerCase() }); let resetToken: string | undefined; if (user) { resetToken = crypto.randomBytes(32).toString("base64url"); await ActionToken.create({ user: user._id, kind: "password-reset", tokenHash: hashToken(resetToken), expiresAt: new Date(Date.now() + 3600_000) }); } return res.json({ message: "If the account exists, a reset token was created", ...(process.env.NODE_ENV !== "production" && resetToken ? { resetToken } : {}) }); });
router.post("/reset-password", async (req, res) => { const parsed = z.object({ token: z.string().min(20), password: z.string().min(8) }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ message: "Token and a valid password are required" }); const action = await ActionToken.findOne({ tokenHash: hashToken(parsed.data.token), kind: "password-reset", usedAt: { $exists: false }, expiresAt: { $gt: new Date() } }); if (!action) return res.status(400).json({ message: "Invalid or expired reset token" }); await User.updateOne({ _id: action.user }, { passwordHash: await bcrypt.hash(parsed.data.password, 10) }); action.usedAt = new Date(); await action.save(); await Session.updateMany({ user: action.user, revokedAt: { $exists: false } }, { revokedAt: new Date() }); return res.json({ ok: true }); });
router.post("/change-password", requireAuth, async (req: AuthRequest, res) => { const parsed = z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ message: "Current and new passwords are required" }); const user = await User.findById(req.user!.userId); if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) return res.status(401).json({ message: "Current password is incorrect" }); user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10); await user.save(); await Session.updateMany({ user: user._id, revokedAt: { $exists: false } }, { revokedAt: new Date() }); return res.json({ ok: true }); });
router.patch("/preferences", requireAuth, async (req: AuthRequest, res) => { const parsed = z.object({ notificationPreferences: notificationPreferencesSchema }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ message: "Notification preferences are invalid" }); const user = await User.findByIdAndUpdate(req.user!.userId, { notificationPreferences: parsed.data.notificationPreferences }, { new: true }); return user ? res.json({ user: publicUser(user) }) : res.status(404).json({ message: "User not found" }); });
router.get("/sessions", requireAuth, async (req: AuthRequest, res) => res.json({ sessions: await Session.find({ user: req.user!.userId, revokedAt: { $exists: false } }).select("-tokenHash") }));
router.delete("/sessions/:id", requireAuth, async (req: AuthRequest, res) => { const result = await Session.updateOne({ _id: req.params.id, user: req.user!.userId }, { revokedAt: new Date() }); return result.matchedCount ? res.status(204).send() : res.status(404).json({ message: "Session not found" }); });

export default router;
