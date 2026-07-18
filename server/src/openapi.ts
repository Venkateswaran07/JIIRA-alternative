import { apiCatalog } from "./apiCatalog.js";
import { isConfirmationRequired } from "./aiAccess.js";
import { rolesForEndpoint } from "./middleware/access.js";

const publicAuthPaths = new Set(["/auth/register", "/auth/login", "/auth/verify-otp", "/auth/resend-otp", "/auth/refresh", "/auth/logout", "/auth/forgot-password", "/auth/reset-password", "/auth/accept-invite", "/invitations/preview"]);

const aiExecuteRequestSchema = {
  type: "object",
  additionalProperties: false,
  required: ["method", "path"],
  properties: {
    method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], example: "GET" },
    path: { type: "string", description: "API path to call as the current authenticated user. /api and /api/v1 prefixes are accepted.", example: "/tickets" },
    body: { type: "object", additionalProperties: true, description: "JSON body for POST, PUT, and PATCH requests." },
    confirmed: { type: "boolean", default: false, description: "Must be true before AI can perform DELETE or other destructive actions." },
  },
};

const aiEndpointSchema = {
  type: "object",
  required: ["method", "path", "group", "roles", "requiresConfirmation"],
  properties: {
    method: { type: "string", example: "DELETE" },
    path: { type: "string", example: "/tickets/:id" },
    group: { type: "string", example: "tickets" },
    roles: { type: "array", items: { type: "string" }, description: "Built-in or custom workspace role slugs allowed for this endpoint." },
    requiresConfirmation: { type: "boolean", description: "True when AI must ask for explicit user confirmation before execution." },
  },
};

function operationOverrides(method: string, path: string) {
  if (method === "GET" && path === "/ai/endpoints") {
    return {
      summary: "List AI-callable endpoints for the current user",
      description: "Returns only the API endpoints the authenticated user's role can access. Destructive endpoints are flagged with requiresConfirmation.",
      responses: {
        "200": {
          description: "AI-callable endpoints for the current user role",
          content: { "application/json": { schema: { type: "object", properties: { catalogVersion: { type: "string", example: apiCatalog.version }, endpoints: { type: "array", items: aiEndpointSchema } }, required: ["catalogVersion", "endpoints"] } } },
        },
      },
    };
  }
  if (method === "POST" && path === "/ai/execute") {
    return {
      summary: "Execute an API endpoint as the current user",
      description: "Runs an API operation through the AI gateway using the same JWT, organization scope, and RBAC rules as a direct user request. DELETE and destructive actions require confirmed=true.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: aiExecuteRequestSchema,
            examples: {
              readTickets: { summary: "Read tickets", value: { method: "GET", path: "/tickets" } },
              confirmedDelete: { summary: "Confirmed delete", value: { method: "DELETE", path: "/tickets/65f000000000000000000001", confirmed: true } },
            },
          },
        },
      },
      responses: {
        "200": { description: "Proxied endpoint response", content: { "application/json": { schema: { type: "object" } } } },
        "201": { description: "Proxied endpoint created a resource" },
        "204": { description: "Proxied endpoint completed with no content" },
        "409": {
          description: "Confirmation required before AI performs a destructive action",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["requiresConfirmation", "action", "message"],
                properties: {
                  requiresConfirmation: { type: "boolean", const: true },
                  action: { type: "string", example: "DELETE /tickets/65f000000000000000000001" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    };
  }
  if (method === "GET" && path === "/tickets") {
    return {
      summary: "List accessible tickets with server-side filtering and cursor pagination",
      parameters: [
        { name: "cursor", in: "query", schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
        { name: "q", in: "query", schema: { type: "string" } },
        { name: "status", in: "query", schema: { type: "string" } },
        { name: "project", in: "query", schema: { type: "string" } },
        { name: "label", in: "query", schema: { type: "string" } },
        { name: "sort", in: "query", schema: { type: "string", default: "-createdAt" } },
      ],
      responses: { "200": { description: "Paginated ticket list", content: { "application/json": { schema: { type: "object", required: ["items", "nextCursor", "total"], properties: { items: { type: "array", items: { type: "object" } }, nextCursor: { type: ["string", "null"] }, total: { type: "integer" } } } } } } },
    };
  }
  if (method === "POST" && path === "/integrations/:kind/:id/test") {
    return { summary: "Test an integration without exposing its secret", requestBody: { required: false, content: { "application/json": { schema: { type: "object", additionalProperties: false } } } }, responses: { "200": { description: "Integration test result", content: { "application/json": { schema: { type: "object", required: ["ok", "status"], properties: { ok: { type: "boolean" }, status: { type: "string" } } } } } }, "502": { description: "Delivery failed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } } };
  }
  return {};
}

function operation(method: string, path: string, group: string) {
  const isPublic = publicAuthPaths.has(path);
  const roles = isPublic ? [] : rolesForEndpoint(method, path);
  const parameters = [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => ({ name: match[1], in: "path", required: true, schema: { type: "string" } }));
  const overrides = operationOverrides(method, path);
  return {
    tags: [group],
    summary: `${method[0]}${method.slice(1).toLowerCase()} ${path}`,
    operationId: `${method.toLowerCase()}_${path.replace(/[:/\-]+/g, "_").replace(/^_|_$/g, "")}`,
    ...(parameters.length ? { parameters } : {}),
    ...(isPublic ? { security: [] } : { security: [{ sessionCookie: [] }, { bearerAuth: [] }], "x-allowed-roles": roles }),
    ...(isConfirmationRequired(method, path) ? { "x-requires-confirmation": true } : {}),
    ...(method !== "GET" && method !== "DELETE" ? { requestBody: { required: false, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } } } : {}),
    responses: {
      "200": { description: "Successful response", content: { "application/json": { schema: { type: "object" } } } },
      ...(method === "POST" ? { "201": { description: "Created" } } : {}),
      "400": { $ref: "#/components/responses/BadRequest" },
      ...(!isPublic ? { "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" } } : {}),
      "404": { $ref: "#/components/responses/NotFound" },
    },
    ...overrides,
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
    securitySchemes: { sessionCookie: { type: "apiKey", in: "cookie", name: "itrack_access" }, bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Legacy compatibility authentication; browser clients use the HttpOnly session cookie." } },
    schemas: { Error: errorSchema, AiExecuteRequest: aiExecuteRequestSchema, AiEndpoint: aiEndpointSchema },
    responses: {
      BadRequest: { description: "Invalid request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Unauthorized: { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Forbidden: { description: "Role is not allowed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      NotFound: { description: "Resource not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
  },
};
