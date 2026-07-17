import { createPgModel } from "../db/pgModel.js";
import { Organization } from "./Organization.js";

export const WorkspaceRole = createPgModel({
  table: "workspace_roles",
  columns: ["organization", "name", "slug", "description", "permissions", "isSystem", "rank"],
  json: ["permissions"],
  defaults: { description: "", permissions: [], isSystem: false, rank: 10 },
  relations: { organization: { model: () => Organization } },
});
