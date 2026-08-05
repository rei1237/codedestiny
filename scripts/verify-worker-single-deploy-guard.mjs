#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalWorkflow = ".github/workflows/cloudflare-worker-deploy.yml";
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

  assert(/(^|\r?\n)\s+workflow_dispatch:\s*(?:#.*)?$/.test(triggers), `${canonicalWorkflow} must support manual dispatch.`);
  assert(/(^|\r?\n)\s+push:\s*\r?\n\s+branches:\s*\r?\n\s+- main\s*(?:\r?\n|$)/m.test(triggers), `${canonicalWorkflow} must deploy on main pushes.`);
  assert(!/^\s+(pull_request|schedule|workflow_call):/m.test(triggers), `${canonicalWorkflow} must not deploy on pull_request, schedule, or workflow_call.`);
  assert(workflow.includes("CF_WORKER_NAME: code-destiny-web"), `${canonicalWorkflow} must target code-destiny-web.`);
  assert(workflow.includes("scripts/verify-worktree-policy.mjs --mode=deploy"), `${canonicalWorkflow} must enforce the deploy worktree policy.`);
  assert(workflow.includes("npm run build:worker"), `${canonicalWorkflow} must run the Worker dry-run build.`);
  assert(workflow.includes("npm run deploy:cf:worker"), `${canonicalWorkflow} must use the canonical Worker deploy command.`);
}

async function verifyPackageAndDeployScript() {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const deployCommand = String(packageJson.scripts?.["deploy:cf:worker"] || "");
  assert(deployCommand.includes("verify:worktree-policy"), "deploy:cf:worker must enforce the deploy worktree policy.");
  assert(deployCommand.includes("scripts/deploy-worker.mjs"), "deploy:cf:worker must call scripts/deploy-worker.mjs.");

  const deployScript = await readRepoFile("scripts/deploy-worker.mjs");
  assert(deployScript.includes('"wrangler", "deploy", "--config", "worker/wrangler.toml"'), "scripts/deploy-worker.mjs must deploy from worker/wrangler.toml.");
  assert(deployScript.includes('"--var", `COMMIT_SHA:${deployCommit}`'), "scripts/deploy-worker.mjs must bind the deployed commit SHA at runtime.");
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
  const valid = `on:\n  push:\n    branches:\n      - main\n  workflow_dispatch:\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n`;
  const invalid = `on:\n  pull_request:\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n`;
  const validTriggers = deploymentTriggerBlock(valid);
  assert(/(^|\r?\n)\s+workflow_dispatch:\s*(?:#.*)?$/.test(validTriggers), "valid manual trigger fixture should pass");
  assert(/(^|\r?\n)\s+push:\s*\r?\n\s+branches:\s*\r?\n\s+- main\s*(?:\r?\n|$)/m.test(validTriggers), "valid main push trigger fixture should pass");
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

  if (process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_EVENT_NAME === "pull_request") {
    await verifyNoExternalWorkerBuildCheck();
  } else {
    console.log("[verify-worker-single-deploy-guard] external check lookup skipped outside pull_request CI.");
  }
}

main().catch((error) => {
  console.error(`[verify-worker-single-deploy-guard] FAIL: ${error.message}`);
  process.exitCode = 1;
});
