import { createPgModel } from "../db/pgModel.js";
import { User } from "./User.js";

export const Company = createPgModel({
  table: "companies",
  columns: ["name", "slug", "owner", "settings"],
  json: ["settings"],
  defaults: { settings: {} },
  relations: { owner: { model: () => User } },
});

export const CompanyMembership = createPgModel({
  table: "company_memberships",
  columns: ["company", "user", "role", "status", "department", "jobFunction"],
  columnMap: { user: "user_id" },
  defaults: { role: "member", status: "active" },
  relations: { company: { model: () => Company }, user: { model: () => User } },
});

export const CompanyGroup = createPgModel({
  table: "company_groups",
  columns: ["company", "name", "description"],
  defaults: { description: "" },
  relations: { company: { model: () => Company } },
});

export const CompanyGroupMember = createPgModel({
  table: "company_group_members",
  columns: ["group", "user"],
  columnMap: { group: "group_id", user: "user_id" },
  relations: { group: { model: () => CompanyGroup }, user: { model: () => User } },
});

export const WorkspaceGroupAccess = createPgModel({
  table: "workspace_group_access",
  columns: ["workspace", "group", "role"],
  columnMap: { group: "group_id" },
  defaults: { role: "engineer" },
  relations: { group: { model: () => CompanyGroup } },
});
