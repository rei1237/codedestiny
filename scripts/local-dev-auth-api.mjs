import http from "node:http";

import { createWorkersAiRunner, loadLocalEnvFiles } from "./lib/workers-ai-rest.mjs";

// 🔴 자격증명 로딩과 Workers AI REST 러너는 `scripts/lib/workers-ai-rest.mjs` 가 정본이다.
//    번역기(`i18n-translate-pending.mjs --provider workers-ai`)가 같은 구현을 쓴다 —
//    한쪽만 고치면 dev 서버와 배치가 서로 다른 계정·토큰 후보를 보게 된다.
loadLocalEnvFiles();

const worker = (await import("../worker/index.js")).default;

const host = process.env.LOCAL_DEV_AUTH_API_HOST || "127.0.0.1";
const port = Number(process.env.LOCAL_DEV_AUTH_API_PORT || process.env.PORT || 8790);
const frontendBase = process.env.LOCAL_DEV_AUTH_FRONTEND_BASE_URL || "http://127.0.0.1:3000";


const workerEnv = {
  ...process.env,
  AI: createWorkersAiRunner(process.env),
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
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
    });
    const setCookies = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
    if (setCookies.length) {
      res.setHeader("Set-Cookie", setCookies);
    } else {
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) res.setHeader("Set-Cookie", setCookie);
    }
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
