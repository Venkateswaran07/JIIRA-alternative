import { connectDb } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { OrganizationMembership } from "../src/models/WorkspaceAccess.js";
import { Organization } from "../src/models/Organization.js";
import { Project } from "../src/models/Project.js";

async function migrate() {
  await connectDb();
  const users = await User.find({ organization: { $exists: true } });
  let created = 0;
  for (const user of users) {
    const result = await OrganizationMembership.updateOne(
      { user: user._id, organization: user.organization },
      { $setOnInsert: { role: user.role || "engineer", status: user.inviteStatus === "disabled" ? "disabled" : "active", skills: user.skills || [], availability: user.availability ?? 1, capacity: user.capacity ?? 32 } },
      { upsert: true },
    );
    if (result.upsertedCount) created += 1;
    if (!user.lastActiveOrganization) { user.lastActiveOrganization = user.organization; await user.save(); }
  }
  const organizationIds = [...new Set(users.map((user) => String(user.organization)).filter(Boolean))];
  for (const organizationId of organizationIds) {
    const organization = await Organization.findById(organizationId);
    if (organization && !organization.onboardingCompletedAt && await Project.exists({ organization: organizationId })) {
      organization.onboardingCompletedAt = new Date();
      await organization.save();
    }
  }
  console.log(`Workspace membership migration complete: ${created} created, ${users.length - created} already present.`);
  process.exit(0);
}

migrate().catch((error) => { console.error(error); process.exit(1); });
