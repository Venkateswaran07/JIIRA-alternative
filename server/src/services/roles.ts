import { builtInRoleSeeds, isPermission, roleSeedFor, type Permission } from "../constants/permissions.js";
import { WorkspaceRole } from "../models/Role.js";

const slugify = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 48);

export function publicRole(role: any) {
  return {
    id: role.id || role._id,
    _id: role.id || role._id,
    name: role.name,
    slug: role.slug,
    description: role.description || "",
    permissions: role.permissions || [],
    isSystem: Boolean(role.isSystem),
    rank: Number(role.rank || 0),
  };
}

export async function ensureWorkspaceRoles(organizationId: string) {
  for (const seed of builtInRoleSeeds) {
    await WorkspaceRole.findOneAndUpdate(
      { organization: organizationId, slug: seed.slug },
      { $setOnInsert: { ...seed, organization: organizationId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  return WorkspaceRole.find({ organization: organizationId }).sort({ rank: -1, name: 1 });
}

export async function permissionsForRole(organizationId: string | undefined, role: string | undefined): Promise<Permission[]> {
  if (!role) return [];
  if (organizationId) {
    const stored = await WorkspaceRole.findOne({ organization: organizationId, slug: role });
    if (stored) return (stored.permissions || []).filter(isPermission) as Permission[];
  }
  return roleSeedFor(role)?.permissions || [];
}

export async function rolePriority(organizationId: string, role: string | undefined) {
  if (!role) return 0;
  const stored = await WorkspaceRole.findOne({ organization: organizationId, slug: role });
  return Number(stored?.rank ?? roleSeedFor(role)?.rank ?? 0);
}

export function roleSlug(value: string) {
  return slugify(value) || "custom-role";
}

export function uniquePermissions(values: string[]) {
  return [...new Set(values.filter(isPermission))] as Permission[];
}
