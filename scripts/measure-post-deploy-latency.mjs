#!/usr/bin/env node

/**
 * Read-only post-deploy latency probe.
 *
 * This script intentionally sends GET requests only. It never creates orders,
 * verifies payments, calls a provider, or writes to the database.
 */

import process from "node:process";
import { performance } from "node:perf_hooks";

const DEFAULT_ENDPOINTS = [
  "/api/health",
  "/api/payments/me",
  "/api/subscription/status",
];

function usage() {
  console.log(`Usage:
  npm run measure:post-deploy-latency -- --base https://example.com [options]

Options:
  --base <url>          Deployment origin. Required unless CD_LATENCY_BASE_URL is set.
  --endpoint <path>     GET endpoint. Repeat to override defaults.
  --iterations <n>      Measured requests per endpoint (default: 10).
  --warmup <n>          Warm-up requests per endpoint (default: 2).
  --timeout-ms <n>      Per-request timeout (default: 15000).
  --help                Show this help.

Environment:
  CD_LATENCY_BASE_URL       Same as --base.
  CD_LATENCY_COOKIE         Test-account Cookie header for protected GET endpoints.
  CD_ROUTE_METRICS_TOKEN    Optional token for /api/health/route-metrics.

The cookie and tokens are never printed.`);
}

function readOption(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function readInteger(args, name, fallback, { min, max }) {
  const raw = readOption(args, name, String(fallback));
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function parseArgs(args) {
  if (args.includes("--help")) {
    usage();
    process.exit(0);
  }

  const known = new Set([
    "--base", "--endpoint", "--iterations", "--warmup", "--timeout-ms", "--help",
  ]);
  for (const arg of args) {
    if (arg.startsWith("--") && !known.has(arg)) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  const base = readOption(args, "--base", process.env.CD_LATENCY_BASE_URL);
  if (!base) throw new Error("--base or CD_LATENCY_BASE_URL is required");

  let baseUrl;
  try {
    baseUrl = new URL(base);
  } catch {
    throw new Error("--base must be an absolute http(s) URL");
  }
  if (!["http:", "https:"].includes(baseUrl.protocol)) {
    throw new Error("--base must use http or https");
  }
  baseUrl.pathname = baseUrl.pathname.replace(/\/$/, "");
  baseUrl.search = "";
  baseUrl.hash = "";

  const endpointArgs = args.flatMap((arg, index) => (
    arg === "--endpoint" ? [args[index + 1]] : []
  )).filter(Boolean);
  const endpoints = endpointArgs.length ? endpointArgs : DEFAULT_ENDPOINTS;
  for (const endpoint of endpoints) {
    if (!endpoint.startsWith("/")) {
      throw new Error(`Endpoint must be a path beginning with '/': ${endpoint}`);
    }
  }

  return {
    baseUrl,
    endpoints,
    iterations: readInteger(args, "--iterations", 10, { min: 1, max: 1000 }),
    warmup: readInteger(args, "--warmup", 2, { min: 0, max: 100 }),
    timeoutMs: readInteger(args, "--timeout-ms", 15000, { min: 100, max: 120000 }),
    cookie: process.env.CD_LATENCY_COOKIE || "",
    routeMetricsToken: process.env.CD_ROUTE_METRICS_TOKEN || "",
  };
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function parseServerTiming(value) {
  if (!value) return null;
  const match = value.match(/(?:^|[,;])\s*[^,;=]+\s*(?:;[^,;]*)?\b(?:dur|duration)=([\d.]+)/i)
    || value.match(/\bdur=([\d.]+)/i);
  return match ? Number(match[1]) : null;
}

function formatMs(value) {
  return value == null ? "-" : `${value.toFixed(1)}ms`;
}

async function fetchOnce(url, headers, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    const durationMs = performance.now() - started;
    return {
      ok: response.ok,
      status: response.status,
      durationMs,
      serverTimingMs: parseServerTiming(response.headers.get("server-timing")),
    };
  } catch (error) {
    return {
      ok: false,
      status: "ERR",
      durationMs: performance.now() - started,
      serverTimingMs: null,
      error: error?.name === "AbortError" ? "timeout" : (error?.message || "request_failed"),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function measureEndpoint(config, endpoint) {
  const isProtected = endpoint === "/api/payments/me" || endpoint === "/api/subscription/status";
  if (isProtected && !config.cookie) {
    return { endpoint, skipped: true, reason: "CD_LATENCY_COOKIE not set" };
  }

  const headers = {
    accept: "application/json",
    "cache-control": "no-store",
    "x-client-source": "post-deploy-latency",
  };
  if (config.cookie) headers.cookie = config.cookie;
  if (endpoint === "/api/health/route-metrics" && config.routeMetricsToken) {
    headers["x-cd-route-metrics-token"] = config.routeMetricsToken;
  }

  const url = new URL(endpoint, config.baseUrl).toString();
  for (let i = 0; i < config.warmup; i += 1) {
    await fetchOnce(url, headers, config.timeoutMs);
  }

  const results = [];
  for (let i = 0; i < config.iterations; i += 1) {
    results.push(await fetchOnce(url, headers, config.timeoutMs));
  }

  const durations = results.map((item) => item.durationMs);
  const serverTimings = results
    .map((item) => item.serverTimingMs)
    .filter((value) => value != null);
  const statusCounts = Object.fromEntries(
    [...new Set(results.map((item) => String(item.status)))].map((status) => [
      status,
      results.filter((item) => String(item.status) === status).length,
    ]),
  );
  const errors = results.filter((item) => !item.ok);

  return {
    endpoint,
    skipped: false,
    iterations: results.length,
    errors: errors.length,
    statusCounts,
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    p99Ms: percentile(durations, 0.99),
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    serverTimingP95Ms: percentile(serverTimings, 0.95),
    errorReasons: [...new Set(errors.map((item) => item.error || `http_${item.status}`))],
  };
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  console.log(`Post-deploy read-only latency probe: ${config.baseUrl.origin}`);
  console.log(`iterations=${config.iterations}, warmup=${config.warmup}, timeout=${config.timeoutMs}ms`);

  const reports = [];
  for (const endpoint of config.endpoints) {
    const report = await measureEndpoint(config, endpoint);
    reports.push(report);
    if (report.skipped) {
      console.log(`${endpoint}: SKIP (${report.reason})`);
      continue;
    }
    console.log([
      `${endpoint}:`,
      `p50=${formatMs(report.p50Ms)}`,
      `p95=${formatMs(report.p95Ms)}`,
      `p99=${formatMs(report.p99Ms)}`,
      `min=${formatMs(report.minMs)}`,
      `max=${formatMs(report.maxMs)}`,
      `errors=${report.errors}/${report.iterations}`,
      `status=${JSON.stringify(report.statusCounts)}`,
      report.serverTimingP95Ms == null ? "" : `server-timing-p95=${formatMs(report.serverTimingP95Ms)}`,
    ].filter(Boolean).join(" "));
  }

  console.log(JSON.stringify({
    base: config.baseUrl.origin,
    generatedAt: new Date().toISOString(),
    reports,
  }, null, 2));

  const failed = reports.some((report) => !report.skipped && report.errors > 0);
  if (failed) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`Latency probe failed: ${error.message}`);
  process.exitCode = 1;
});
