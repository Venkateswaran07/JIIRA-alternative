import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { connectDb } from "./config/db.js";
import { openApiDocument } from "./openapi.js";
import { env } from "./config/env.js";
import aiRoutes from "./routes/ai.js";
import analysisRoutes from "./routes/analysis.js";
import authRoutes from "./routes/auth.js";
import dataRoutes from "./routes/data.js";
import extendedRoutes from "./routes/extended.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "itrack-api" }));
app.get("/api/v1/health", (_req, res) => res.json({ ok: true, service: "itrack-api", version: "v1" }));
app.get("/api/v1/openapi.json", (_req, res) => res.json(openApiDocument));
app.get("/api/v1/openapi", (_req, res) => res.redirect(308, "/api/v1/openapi.json"));
app.get("/api/docs", (_req, res) => res.type("html").send(`<!doctype html>
<html>
<head>
  <title>I-TRACK API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; background: #fff; }
    .auth-helper { box-sizing: border-box; padding: 14px 24px; border-bottom: 1px solid #d9e2ec; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f7fafc; }
    .auth-helper strong { display: block; margin-bottom: 4px; }
    .auth-helper code { padding: 2px 5px; border-radius: 4px; background: #edf2f7; }
  </style>
</head>
<body>
  <div class="auth-helper">
    <strong>Most endpoints require an I-TRACK JWT bearer token.</strong>
    Run <code>POST /auth/login</code> first, then copy the returned <code>token</code> into Swagger's Authorize dialog. The OpenAI-compatible API key stays in <code>server/.env</code>; do not paste it here as the bearer token.
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/api/v1/openapi.json",
      dom_id: "#swagger-ui",
      persistAuthorization: true,
      requestInterceptor: function(request) {
        if (request.url.endsWith("/auth/login")) {
          request._isLoginRequest = true;
        }
        return request;
      },
      responseInterceptor: function(response) {
        if (response.url.endsWith("/auth/login") && response.status === 200 && response.text) {
          try {
            var body = JSON.parse(response.text);
            if (body.token) {
              window.ui.preauthorizeApiKey("bearerAuth", body.token);
            }
          } catch (_) {}
        }
        return response;
      }
    });
  </script>
</body>
</html>`));
app.use("/api/auth", authRoutes);
app.use("/api", dataRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", extendedRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/analysis", analysisRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1", dataRoutes);
app.use("/api/v1", extendedRoutes);

app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } }));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
});

await connectDb();
app.listen(env.port, () => {
  console.log(`I-TRACK API listening on http://localhost:${env.port}`);
});
