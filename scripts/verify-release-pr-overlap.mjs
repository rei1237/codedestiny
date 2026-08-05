#!/usr/bin/env node

import fs from "node:fs";

const RELEASE_CRITICAL_PATHS = new Set([
  ".github/workflows/cloudflare-pages-deploy.yml",
  ".github/workflows/cloudflare-worker-deploy.yml",
  ".github/workflows/cloudflare-safe-auto-release.yml",
  "scripts/deploy-safe.mjs",
  "scripts/verify-worktree-policy.mjs",
  "scripts/verify-pages-single-deploy-guard.mjs",
  "scripts/verify-worker-single-deploy-guard.mjs",
]);

const args = new Set(process.argv.slice(2));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalisePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function overlappingPaths(paths) {
  return [...new Set(paths.map(normalisePath))]
    .filter((file) => RELEASE_CRITICAL_PATHS.has(file))
    .sort();
}

function eventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return {};
  try {
    return JSON.parse(fs.readFileSync(eventPath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read GITHUB_EVENT_PATH: ${error.message}`);
  }
}

async function githubJson(url) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required in CI.");
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

async function listOpenPullRequests(repository) {
  const rows = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await githubJson(`https://api.github.com/repos/${repository}/pulls?state=open&base=main&per_page=100&page=${page}`);
    rows.push(...batch);
    if (batch.length < 100) break;
  }
  return rows;
}

async function changedFiles(repository, number) {
  const rows = await githubJson(`https://api.github.com/repos/${repository}/pulls/${number}/files?per_page=100`);
  return rows.map((row) => row.filename);
}

async function main() {
  if (args.has("--self-test")) {
    assert(overlappingPaths(["scripts/deploy-safe.mjs", "app/page.tsx"]).join(",") === "scripts/deploy-safe.mjs", "critical path filtering failed");
    assert(overlappingPaths(["app/page.tsx"]).length === 0, "non-critical path filtering failed");
    console.log("[verify-release-pr-overlap] self-test passed");
    return;
  }

  const event = eventPayload();
  const currentNumber = Number(event.pull_request?.number || process.env.GITHUB_PR_NUMBER || 0);
  const repository = process.env.GITHUB_REPOSITORY;
  if (!currentNumber || !repository) {
    console.log("[verify-release-pr-overlap] skipped: not running for a pull request event");
    return;
  }

  const currentFiles = overlappingPaths(await changedFiles(repository, currentNumber));
  if (currentFiles.length === 0) {
    console.log("[verify-release-pr-overlap] PASS: current PR does not touch release-critical paths");
    return;
  }

  const conflicts = [];
  for (const pullRequest of await listOpenPullRequests(repository)) {
    if (pullRequest.number === currentNumber) continue;
    const otherFiles = overlappingPaths(await changedFiles(repository, pullRequest.number));
    const shared = currentFiles.filter((file) => otherFiles.includes(file));
    if (shared.length) conflicts.push({ number: pullRequest.number, title: pullRequest.title, files: shared });
  }

  if (conflicts.length) {
    console.error("[verify-release-pr-overlap] BLOCKED: release-critical files are modified by another open PR.");
    for (const conflict of conflicts) {
      console.error(`- #${conflict.number} ${conflict.title}`);
      console.error(`  shared files: ${conflict.files.join(", ")}`);
    }
    console.error("Rebase or close the overlapping PR, then rerun this check.");
    process.exitCode = 1;
    return;
  }

  console.log(`[verify-release-pr-overlap] PASS: no overlapping open PR for ${currentFiles.join(", ")}`);
}

main().catch((error) => {
  console.error(`[verify-release-pr-overlap] FAILED: ${error.message}`);
  process.exitCode = 1;
});

export { RELEASE_CRITICAL_PATHS, overlappingPaths };
