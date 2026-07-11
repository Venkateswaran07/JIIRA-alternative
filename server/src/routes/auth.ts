import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { Organization } from "../models/Organization.js";
import { User } from "../models/User.js";

const router = Router();
const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });
const registerSchema = credentials.extend({ name: z.string().min(2), organizationName: z.string().min(2) });

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "workspace";
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let index = 2;
  while (await Organization.exists({ slug })) {
    slug = `${base}-${index}`;
    index += 1;
  }
  return slug;
}

function publicUser(user: Awaited<ReturnType<typeof User.findOne>>) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    organization: user.organization,
    role: user.role,
    inviteStatus: user.inviteStatus,
    skills: user.skills,
    availability: user.availability,
    capacity: user.capacity,
    avatarColor: user.avatarColor,
  };
}

function publicOrganization(org: Awaited<ReturnType<typeof Organization.findOne>>) {
  if (!org) return null;
  return { id: org.id, _id: org.id, name: org.name, slug: org.slug, plan: org.plan, settings: org.settings };
}

function signToken(user: { id: string; email: string; role: string; organization: unknown }) {
  return jwt.sign({ userId: user.id, organizationId: String(user.organization), email: user.email, role: user.role }, env.jwtSecret, { expiresIn: "8h" });
}

router.post("/login", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Valid email and password are required" });

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const organization = await Organization.findById(user.organization);
  const token = signToken(user);
  return res.json({ token, user: publicUser(user), organization: publicOrganization(organization) });
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Organization, name, valid email, and password are required", issues: parsed.error.issues });
  const existing = await User.exists({ email: parsed.data.email.toLowerCase() });
  if (existing) return res.status(409).json({ message: "An account with this email already exists" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const organization = await Organization.create({
    name: parsed.data.organizationName,
    slug: await uniqueSlug(parsed.data.organizationName),
    plan: "starter",
  });
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash,
    organization: organization._id,
    role: "admin",
    inviteStatus: "active",
    skills: ["Planning"],
    availability: 1,
    capacity: 30,
    avatarColor: "#00AEEF",
  });
  organization.owner = user._id;
  await organization.save();
  const token = signToken(user);
  return res.status(201).json({ token, user: publicUser(user), organization: publicOrganization(organization) });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const [user, organization] = await Promise.all([User.findById(req.user?.userId), Organization.findById(req.user?.organizationId)]);
  return res.json({ user: publicUser(user), organization: publicOrganization(organization) });
});

export default router;
