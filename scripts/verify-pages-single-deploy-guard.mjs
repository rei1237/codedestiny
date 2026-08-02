#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(repoRoot, "scripts", "ensure-pages-single-deploy.mjs");

function runGuard(env, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function startMockCloudflare(initialConfig, { apiFailure = false } = {}) {
  let config = structuredClone(initialConfig);
  let patchBody = null;
  const server = createServer(async (request, response) => {
    if (apiFailure) {
      response.writeHead(403, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ success: false, errors: [{ message: "mock API failure" }] }));
      return;
    }

    if (request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ success: true, result: { source: { config } } }));
      return;
    }

    if (request.method === "PATCH") {
      let body = "";
      for await (const chunk of request) body += chunk;
      patchBody = JSON.parse(body);
      config = patchBody.source.config;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ success: true, result: { source: { config } } }));
      return;
    }

    response.writeHead(404);
    response.end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    getPatch: () => patchBody,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function testPreviewOnlyDrift() {
  const mock = await startMockCloudflare({
    deployments_enabled: false,
    production_deployments_enabled: false,
    preview_deployment_setting: "all",
  });
  try {
    const result = await runGuard(
      {
        CI: "true",
        GITHUB_ACTIONS: "true",
        CLOUDFLARE_API_TOKEN: "mock-token",
        CLOUDFLARE_ACCOUNT_ID: "mock-account",
        CF_PAGES_PROJECT_NAME: "codedestiny",
        CLOUDFLARE_API_BASE_URL: mock.baseUrl,
      },
      ["--check"],
    );
    assert(result.code === 1, "preview-only drift must fail --check");
    assert(result.stderr.includes("preview_deployment_setting=all"), "preview drift must be reported");
  } finally {
    await mock.close();
  }
}

async function testApiFailure() {
  const mock = await startMockCloudflare({}, { apiFailure: true });
  try {
    const result = await runGuard({
      CI: "true",
      GITHUB_ACTIONS: "true",
      CLOUDFLARE_API_TOKEN: "mock-token",
      CLOUDFLARE_ACCOUNT_ID: "mock-account",
      CF_PAGES_PROJECT_NAME: "codedestiny",
      CLOUDFLARE_API_BASE_URL: mock.baseUrl,
    });
    assert(result.code === 1, "Cloudflare API failure must fail in CI");
    assert(result.stderr.includes("mock API failure"), "API failure detail must be preserved");
  } finally {
    await mock.close();
  }
}

async function testRepairPreservesSourceConfig() {
  const mock = await startMockCloudflare({
    deployments_enabled: true,
    production_deployments_enabled: true,
    preview_deployment_setting: "custom",
    preview_branch_includes: ["release/*"],
    preview_branch_excludes: ["wip/*"],
    pr_comments_enabled: true,
  });
  try {
    const result = await runGuard({
      CI: "true",
      GITHUB_ACTIONS: "true",
      CLOUDFLARE_API_TOKEN: "mock-token",
      CLOUDFLARE_ACCOUNT_ID: "mock-account",
      CF_PAGES_PROJECT_NAME: "codedestiny",
      CLOUDFLARE_API_BASE_URL: mock.baseUrl,
    });
    assert(result.code === 0, "repair must succeed");
    const patch = mock.getPatch();
    assert(patch?.source?.config?.deployments_enabled === false, "legacy deployment flag must be disabled");
    assert(patch?.source?.config?.production_deployments_enabled === false, "production deployment flag must be disabled");
    assert(patch?.source?.config?.preview_deployment_setting === "none", "preview deployment setting must be disabled");
    assert(patch?.source?.config?.preview_branch_includes?.[0] === "release/*", "unrelated source config must be preserved");
    assert(patch?.source?.config?.pr_comments_enabled === true, "unrelated source config must be preserved");
  } finally {
    await mock.close();
  }
}

async function testMissingToken() {
  const result = await runGuard(
    {
      CI: "true",
      GITHUB_ACTIONS: "true",
      CLOUDFLARE_API_TOKEN: "",
      CLOUDFLARE_ACCOUNT_ID: "",
      CLOUDFLARE_API_BASE_URL: "",
    },
    ["--check"],
  );
  assert(result.code === 1, "missing Cloudflare credentials must fail in CI");
  assert(result.stderr.includes("CI must fail closed"), "missing credentials must explain CI fail-closed behavior");
}

const source = await readFile(scriptPath, "utf8");
assert(source.includes("preview_deployment_setting"), "guard must inspect preview deployment setting");
const pagesBuildWorkflow = await readFile(new URL("../.github/workflows/pages-build-gate.yml", import.meta.url), "utf8");
assert(pagesBuildWorkflow.includes("pull_request.head.sha"), "Pages build gate must validate the actual PR head");
assert(pagesBuildWorkflow.includes("verify:pages-pr-contract"), "Pages build gate must enforce a fresh PR base");
assert(pagesBuildWorkflow.includes("verify:pages-pr-contract-test"), "Pages build gate must test the fresh-base contract");
assert(pagesBuildWorkflow.includes("verify:sitemap"), "Pages build gate must verify sitemap integrity");
assert(!pagesBuildWorkflow.includes("CLOUDFLARE_API_TOKEN"), "PR Pages workflow must not receive Cloudflare secrets");
const pagesConfigWorkflow = await readFile(new URL("../.github/workflows/pages-config-guard.yml", import.meta.url), "utf8");
assert(pagesConfigWorkflow.includes("schedule:"), "Pages config guard must run on a schedule");
assert(pagesConfigWorkflow.includes("workflow_dispatch:"), "Pages config guard must support manual verification");
assert(pagesConfigWorkflow.includes("ensure-pages-single-deploy.mjs --check"), "Pages config guard must run read-only drift checks");
await testPreviewOnlyDrift();
await testMissingToken();
await testApiFailure();
await testRepairPreservesSourceConfig();
console.log("[verify-pages-single-deploy-guard] all mock tests passed");
