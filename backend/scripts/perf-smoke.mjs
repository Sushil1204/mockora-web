#!/usr/bin/env node

const baseUrl = (
  process.env.PERF_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");
const requestCount = positiveInteger("PERF_REQUESTS", 100);
const concurrency = positiveInteger("PERF_CONCURRENCY", 10);
const paths = (
  process.env.PERF_PATHS ?? "/health/ready,/experts,/experts/filters"
)
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);
const cookie = process.env.PERF_COOKIE;
const p95Threshold = optionalPositiveNumber("PERF_P95_MS");

if (paths.length === 0) {
  throw new Error("PERF_PATHS must contain at least one API path.");
}

const latencies = [];
const failures = [];
let nextRequest = 0;

async function worker() {
  while (true) {
    const index = nextRequest;
    nextRequest += 1;

    if (index >= requestCount) {
      return;
    }

    const path = paths[index % paths.length];
    const startedAt = performance.now();

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: cookie ? { cookie } : undefined,
      });
      await response.arrayBuffer();

      if (!response.ok) {
        failures.push({ path, status: response.status });
      }
    } catch (error) {
      failures.push({
        path,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      latencies.push(performance.now() - startedAt);
    }
  }
}

const startedAt = performance.now();
await Promise.all(
  Array.from({ length: Math.min(concurrency, requestCount) }, () => worker()),
);
const elapsedMs = performance.now() - startedAt;
const sorted = latencies.toSorted((left, right) => left - right);

const summary = {
  baseUrl,
  requests: requestCount,
  concurrency,
  paths,
  failures: failures.length,
  durationMs: Math.round(elapsedMs),
  requestsPerSecond: Math.round((requestCount / elapsedMs) * 10_000) / 10,
  latencyMs: {
    min: round(sorted[0] ?? 0),
    p50: round(percentile(sorted, 0.5)),
    p95: round(percentile(sorted, 0.95)),
    p99: round(percentile(sorted, 0.99)),
    max: round(sorted.at(-1) ?? 0),
  },
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
  console.error(JSON.stringify({ failures: failures.slice(0, 10) }, null, 2));
  process.exitCode = 1;
}

if (p95Threshold !== undefined && summary.latencyMs.p95 > p95Threshold) {
  console.error(
    `p95 ${summary.latencyMs.p95}ms exceeded PERF_P95_MS=${p95Threshold}ms.`,
  );
  process.exitCode = 1;
}

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return 0;
  }

  const index = Math.min(
    values.length - 1,
    Math.ceil(percentileValue * values.length) - 1,
  );
  return values[index];
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function positiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

function optionalPositiveNumber(name) {
  const raw = process.env[name];
  if (raw === undefined) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return value;
}
