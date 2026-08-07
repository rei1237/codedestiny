#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalWorkflow = ".github/workflows/cloudflare-pages-deploy.yml";
const forbiddenWorkerCommands = /(?:wrangler\s+deploy\b|wrangler\s+versions\s+upload|npm\s+run\s+deploy:cf:worker|npm\s+run\s+deploy:worker)/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deploymentTriggerBlock(workflow) {
  const match = workflow.match(/^on:\s*(?:\r?\n|$)/m);
  assert(match, `${canonicalWorkflow} must define a top-level on block.`);
  const rest = workflow.slice(match.index + match[0].length);
  const nextTopLevelKey = rest.search(/\r?\n[^\s#][^\r\n]*:/);
  return nextTopLevelKey === -1 ? rest : rest.slice(0, nextTopLevelKey);
}

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

async function verifyCanonicalWorkflow() {
  const workflow = await readRepoFile(canonicalWorkflow);
  const triggers = deploymentTriggerBlock(workflow);

  assert(/(^|\r?\n)\s+workflow_dispatch:\s*(?:#.*)?(?:\r?\n|$)/m.test(triggers), `${canonicalWorkflow} must support manual dispatch.`);
  // push 자동 배포는 2026-08-08 에 제거했다. 로컬 승격이 주 경로이므로 push 트리거가
  // 살아 있으면 같은 커밋이 로컬과 CI 에서 두 번 나간다.
  assert(!/^\s+push:/m.test(triggers), `${canonicalWorkflow} must not deploy on push; production promotion is an explicit action.`);
  assert(!/^\s+(pull_request|schedule|workflow_call):/m.test(triggers), `${canonicalWorkflow} must not deploy on pull_request, schedule, or workflow_call.`);
  assert(workflow.includes("CF_WORKER_NAME: ${{ vars.CF_WORKER_NAME || 'code-destiny-web' }}"), `${canonicalWorkflow} must target the configured Worker.`);
  assert(workflow.includes("npm run deploy:safe -- --ci --preview-only"), `${canonicalWorkflow} must offer a preview-only run.`);
  assert(workflow.includes("npm run deploy:safe -- --ci --yes"), `${canonicalWorkflow} must use the integrated SHA release command.`);
}

async function verifyPackageAndDeployScript() {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const deployCommand = String(packageJson.scripts?.["deploy:safe"] || "");
  assert(deployCommand.includes("scripts/deploy-safe.mjs"), "deploy:safe must call scripts/deploy-safe.mjs.");
}

async function verifyNoOtherWorkflowDeploys() {
  const workflowDir = path.join(repoRoot, ".github/workflows");
  const workflowFiles = (await readdir(workflowDir)).filter((file) => /\.(yml|yaml)$/i.test(file));
  const duplicatePaths = [];

  for (const file of workflowFiles) {
    const relativePath = `.github/workflows/${file}`;
    if (relativePath === canonicalWorkflow) continue;
    const contents = await readRepoFile(relativePath);
    if (forbiddenWorkerCommands.test(contents)) duplicatePaths.push(relativePath);
  }

  assert(duplicatePaths.length === 0, `Worker deploy commands found outside ${canonicalWorkflow}: ${duplicatePaths.join(", ")}`);
}

function runSelfTest() {
  const valid = `on:\n  workflow_dispatch:\n    inputs:\n      mode:\n        type: choice\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n`;
  const pushTriggered = `on:\n  push:\n    branches: [main]\n  workflow_dispatch:\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n`;
  const invalid = `on:\n  pull_request:\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n`;
  const validTriggers = deploymentTriggerBlock(valid);
  assert(/(^|\r?\n)\s+workflow_dispatch:\s*(?:#.*)?(?:\r?\n|$)/m.test(validTriggers), "valid manual trigger fixture should pass");
  assert(!/^\s+push:/m.test(validTriggers), "dispatch-only fixture must not look push-triggered");
  assert(/^\s+push:/m.test(deploymentTriggerBlock(pushTriggered)), "push trigger fixture should be detected");
  assert(/^\s+(pull_request|schedule|workflow_call):/m.test(deploymentTriggerBlock(invalid)), "pull request trigger fixture should be detected");
  console.log("[verify-worker-single-deploy-guard] self-test passed");
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${url}`);
  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyNoExternalWorkerBuildCheck() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  assert(eventPath && token && repository, "External Worker check guard requires GITHUB_EVENT_PATH, GITHUB_TOKEN, and GITHUB_REPOSITORY.");

  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const shas = [...new Set([
    event.pull_request?.head?.sha,
    process.env.GITHUB_SHA,
  ].filter(Boolean))];
  assert(shas.length > 0, "External Worker check guard could not resolve a commit SHA.");

  const apiBase = `https://api.github.com/repos/${repository}`;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const found = [];
    for (const sha of shas) {
      const [checks, statuses] = await Promise.all([
        fetchJson(`${apiBase}/commits/${sha}/check-runs?per_page=100`, token),
        fetchJson(`${apiBase}/commits/${sha}/status`, token),
      ]);
      for (const check of checks.check_runs || []) {
        if (/^Workers Builds\s*:/i.test(String(check.name || ""))) found.push(`${check.name} (${sha.slice(0, 7)})`);
      }
      for (const status of statuses.statuses || []) {
        if (/^Workers Builds\s*:/i.test(String(status.context || ""))) found.push(`${status.context} (${sha.slice(0, 7)})`);
      }
    }
    if (found.length > 0) {
      throw new Error(`Cloudflare Workers Builds is still creating an external Worker check: ${[...new Set(found)].join(", ")}. Disconnect the Worker Git integration before merging.`);
    }
    if (attempt < 5) await sleep(5000);
  }

  console.log("[verify-worker-single-deploy-guard] PASS: no external Workers Builds check was found.");
}

async function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  await verifyCanonicalWorkflow();
  await verifyPackageAndDeployScript();
  await verifyNoOtherWorkflowDeploys();
  console.log(`[verify-worker-single-deploy-guard] PASS: ${canonicalWorkflow} is the only repository Worker deploy path.`);

  // 예전에는 pull_request 이벤트에서만 돌았다. PR 을 폐기한 뒤 그 조건은 영원히 거짓이 되어
  // Cloudflare Worker Git 연동이 켜져도 아무도 몰랐을 것이다. 이제 push 에서도 확인한다.
  if (process.env.GITHUB_ACTIONS === "true" && ["pull_request", "push"].includes(String(process.env.GITHUB_EVENT_NAME))) {
    await verifyNoExternalWorkerBuildCheck();
  } else {
    console.log("[verify-worker-single-deploy-guard] external check lookup skipped outside CI push/pull_request events.");
  }
}

main().catch((error) => {
  console.error(`[verify-worker-single-deploy-guard] FAIL: ${error.message}`);
  process.exitCode = 1;
});
