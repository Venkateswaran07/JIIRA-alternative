export function swaggerPageHtml() {
  return `<!doctype html>
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
    <strong>Browser authentication uses HttpOnly cookies.</strong>
    Run <code>POST /auth/login</code>, then verify the returned challenge with <code>POST /auth/verify-otp</code>; Swagger receives the session cookies automatically. Use the Authorize dialog for an API token or legacy JWT bearer token. The OpenAI-compatible API key stays in <code>server/.env</code>; do not paste it here.
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
      responseInterceptor: function(response) { return response; }
    });
  </script>
</body>
</html>`;
}
