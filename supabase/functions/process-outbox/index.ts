const workerUrl = Deno.env.get("OUTBOX_WORKER_URL");
const slaScanUrl = Deno.env.get("SLA_SCAN_URL");
const workerSecret = Deno.env.get("OUTBOX_WORKER_SECRET");

Deno.serve(async () => {
  if (!workerUrl || !workerSecret) return new Response(JSON.stringify({ error: "Outbox worker is not configured" }), { status: 503, headers: { "content-type": "application/json" } });
  const headers = { "content-type": "application/json", "x-outbox-worker-secret": workerSecret };
  const scan = slaScanUrl ? await fetch(slaScanUrl, { method: "POST", headers, body: "{}" }) : null;
  const response = await fetch(workerUrl, { method: "POST", headers, body: JSON.stringify({ limit: 100 }) });
  return new Response(JSON.stringify({
    sla: scan ? { status: scan.status, body: await scan.json().catch(() => null) } : { skipped: true },
    outbox: { status: response.status, body: await response.json().catch(() => null) },
  }), { status: response.ok && (!scan || scan.ok) ? 200 : 502, headers: { "content-type": "application/json" } });
});
