import http from "node:http";
import { existsSync, readFileSync } from "node:fs";

function clean(value) {
  return String(value || "").trim();
}

function cleanBearerToken(value) {
  return clean(value).replace(/^Bearer\s+/i, "");
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    if (process.env[key]) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.replace(/\\n/g, "\n");
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile(".env.cloudflare.local");
loadEnvFile(".dev.vars");

const worker = (await import("../worker/index.js")).default;

const host = process.env.LOCAL_DEV_AUTH_API_HOST || "127.0.0.1";
const port = Number(process.env.LOCAL_DEV_AUTH_API_PORT || process.env.PORT || 4000);
const frontendBase = process.env.LOCAL_DEV_AUTH_FRONTEND_BASE_URL || "http://127.0.0.1:3000";

function createLocalWorkersAiBinding(env) {
  const accountIds = [
    clean(env.CLOUDFLARE_WORKERS_AI_ACCOUNT_ID),
    clean(env.WORKERS_AI_ACCOUNT_ID),
    clean(env.CLOUDFLARE_ACCOUNT_ID),
    clean(env.Account_ID),
    clean(env.ACCOUNT_ID),
  ].filter(Boolean);
  const tokens = [
    cleanBearerToken(env.WorkerAi),
    cleanBearerToken(env.WORKERAI),
    cleanBearerToken(env.WORKER_AI_KEY),
    cleanBearerToken(env.WORKER_AI_TOKEN),
    cleanBearerToken(env.WORKERS_AI_API_TOKEN),
    cleanBearerToken(env.WORKERS_AI_TOKEN),
    cleanBearerToken(env.CLOUDFLARE_WORKERS_AI_API_TOKEN),
    cleanBearerToken(env.CLOUDFLARE_WORKERS_AI_TOKEN),
    cleanBearerToken(env.CLOUDFLARE_API_TOKEN),
    cleanBearerToken(env.CF_API_TOKEN),
    cleanBearerToken(env.CLOUDFLARE_APITOKEN),
  ].filter(Boolean);
  if (!accountIds.length || !tokens.length) return undefined;

  return {
    async run(model, input) {
      let lastError = "";
      const modelPath = String(model || "")
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      for (const accountId of accountIds) {
        for (const token of tokens) {
          const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelPath}`;
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(input || {}),
          });

          const payload = await response.json().catch(() => ({}));
          if (response.ok && payload?.success !== false) {
            return payload?.result || payload;
          }
          const message = clean(payload?.errors?.[0]?.message || payload?.message || response.statusText);
          lastError = message;
          if (response.status === 429 || /daily free allocation|quota|rate/i.test(message)) {
            throw Object.assign(new Error(`local_workers_ai_failed:${message || "Workers AI quota exceeded"}`), {
              status: response.status,
            });
          }
        }
      }
      throw new Error(`local_workers_ai_failed:${lastError || "Workers AI authentication failed"}`);
    },
  };
}

const workerEnv = {
  ...process.env,
  AI: createLocalWorkersAiBinding(process.env),
  LOCAL_DEV_AUTH_ENABLED: process.env.LOCAL_DEV_AUTH_ENABLED || "true",
  JWT_SECRET: process.env.JWT_SECRET || process.env.AUTH_SECRET || "local-dev-auth-secret",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || process.env.AUTH_SECRET || "local-dev-auth-secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || process.env.AUTH_SECRET || "local-dev-refresh-secret",
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || "30m",
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE || "false",
  AUTH_OPERATION_TIMEOUT_MS: process.env.AUTH_OPERATION_TIMEOUT_MS || "1500",
  NODE_ENV: process.env.NODE_ENV || "development",
  AUTH_FRONTEND_BASE_URL: process.env.AUTH_FRONTEND_BASE_URL || frontendBase,
  SITE_BASE_URL: process.env.SITE_BASE_URL || frontendBase,
  AUTH_API_BASE_URL: process.env.AUTH_API_BASE_URL || `http://${host}:${port}`,
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  PREMIUM_GEMINI_MODEL: process.env.PREMIUM_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash",
  SUKYO_PREMIUM_GEMINI_MODEL: process.env.SUKYO_PREMIUM_GEMINI_MODEL || process.env.PREMIUM_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash",
  SUKYO_PREMIUM_WORKERS_AI_MODEL: process.env.SUKYO_PREMIUM_WORKERS_AI_MODEL || process.env.WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct",
  ZIWEI_PREMIUM_GEMINI_MODEL: process.env.ZIWEI_PREMIUM_GEMINI_MODEL || process.env.PREMIUM_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash",
  ZIWEI_PREMIUM_WORKERS_AI_MODEL: process.env.ZIWEI_PREMIUM_WORKERS_AI_MODEL || process.env.WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct",
  ZIWEI_PREMIUM_LLM_PROVIDERS: process.env.ZIWEI_PREMIUM_LLM_PROVIDERS || "workers-ai,gemini",
  CORS_ORIGIN: process.env.CORS_ORIGIN || [
    frontendBase,
    "http://localhost:3000",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
  ].join(","),
};

const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const method = String(req.method || "GET").toUpperCase();
    const request = new Request(`http://${host}:${port}${req.url || "/"}`, {
      method,
      headers: req.headers,
      body: body && method !== "GET" && method !== "HEAD" ? body : undefined,
    });

    const waitUntilTasks = new Set();
    const ctx = {
      waitUntil(task) {
        const wrapped = Promise.resolve(task)
          .catch((error) => {
            console.error("[local-dev-auth-api] waitUntil failed:", error);
          })
          .finally(() => {
            waitUntilTasks.delete(wrapped);
          });
        waitUntilTasks.add(wrapped);
      },
    };

    const response = await worker.fetch(request, workerEnv, ctx);
    const responseBody = Buffer.from(await response.arrayBuffer());
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.statusCode = response.status;
    res.end(responseBody);
  } catch (error) {
    console.error("[local-dev-auth-api] request failed:", error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "local_dev_auth_api_failed" }));
  }
});

server.listen(port, host, () => {
  console.log(`[local-dev-auth-api] listening on http://${host}:${port}`);
  console.log("[local-dev-auth-api] login: local-login-test@example.com / LocalTest!2026");
});
