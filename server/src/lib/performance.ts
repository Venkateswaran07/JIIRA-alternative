import { performance } from "node:perf_hooks";

type TimingMetadata = Record<string, string | number | boolean | undefined>;

function performanceLoggingEnabled() {
  const configured = process.env.PERFORMANCE_LOGGING;
  if (configured != null) return configured.toLowerCase() === "true";
  return process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "production";
}

export async function measureAsync<T>(label: string, operation: () => PromiseLike<T>, metadata: TimingMetadata = {}) {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    if (performanceLoggingEnabled()) {
      const durationMs = Number((performance.now() - startedAt).toFixed(1));
      console.log(JSON.stringify({ type: "performance", label, durationMs, ...metadata }));
    }
  }
}
