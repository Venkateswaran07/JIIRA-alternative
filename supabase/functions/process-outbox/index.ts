const workerUrl = Deno.env.get("OUTBOX_WORKER_URL");
const workerSecret = Deno.env.get("OUTBOX_WORKER_SECRET");

Deno.serve(async () => {
  if (!workerUrl || !workerSecret) return new Response(JSON.stringify({ error: "Outbox worker is not configured" }), { status: 503, headers: { "content-type": "application/json" } });
  const response = await fetch(workerUrl, { method: "POST", headers: { "content-type": "application/json", "x-outbox-worker-secret": workerSecret }, body: JSON.stringify({ limit: 100 }) });
  return new Response(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") || "application/json" } });
});
