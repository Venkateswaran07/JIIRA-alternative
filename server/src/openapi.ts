import { apiCatalog } from "./apiCatalog.js";
import { isConfirmationRequired } from "./aiAccess.js";
import { rolesForEndpoint } from "./middleware/access.js";

const publicAuthPaths = new Set(["/auth/register", "/auth/login", "/auth/refresh", "/auth/logout", "/auth/forgot-password", "/auth/reset-password", "/auth/accept-invite"]);

function operation(method: string, path: string, group: string) {
  const isPublic = publicAuthPaths.has(path);
  const roles = isPublic ? [] : rolesForEndpoint(method, path);
  const parameters = [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => ({ name: match[1], in: "path", required: true, schema: { type: "string" } }));
  return {
    tags: [group],
    summary: `${method[0]}${method.slice(1).toLowerCase()} ${path}`,
    operationId: `${method.toLowerCase()}_${path.replace(/[:/\-]+/g, "_").replace(/^_|_$/g, "")}`,
    ...(parameters.length ? { parameters } : {}),
    ...(isPublic ? { security: [] } : { security: [{ bearerAuth: [] }], "x-allowed-roles": roles }),
    ...(isConfirmationRequired(method, path) ? { "x-requires-confirmation": true } : {}),
    ...(method !== "GET" && method !== "DELETE" ? { requestBody: { required: false, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } } } : {}),
    responses: {
      "200": { description: "Successful response", content: { "application/json": { schema: { type: "object" } } } },
      ...(method === "POST" ? { "201": { description: "Created" } } : {}),
      "400": { $ref: "#/components/responses/BadRequest" },
      ...(!isPublic ? { "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" } } : {}),
      "404": { $ref: "#/components/responses/NotFound" },
    },
  };
}

const paths: Record<string, Record<string, unknown>> = {};
for (const [group, endpoints] of Object.entries(apiCatalog.groups)) {
  for (const endpoint of endpoints) {
    const [method, path] = endpoint.split(" ") as [string, string];
    const openApiPath = path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    paths[openApiPath] ??= {};
    paths[openApiPath][method.toLowerCase()] = operation(method, path, group);
  }
}

const errorSchema = { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } }, required: ["code", "message"] } } };
export const openApiDocument = {
  openapi: "3.1.0",
  info: { title: "I-TRACK API", version: apiCatalog.version, description: "Multi-tenant project tracking API. Role requirements are declared on each operation with x-allowed-roles." },
  servers: [{ url: apiCatalog.basePath, description: "Version 1" }],
  tags: Object.keys(apiCatalog.groups).map((name) => ({ name })),
  paths,
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: { Error: errorSchema },
    responses: {
      BadRequest: { description: "Invalid request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Unauthorized: { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Forbidden: { description: "Role is not allowed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      NotFound: { description: "Resource not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
  },
};
