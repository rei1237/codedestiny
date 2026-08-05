#!/usr/bin/env node

const requiredChecks = String(process.env.CI_GATE_CHECKS || "Secret Scan,Paid Flow Gates,Docs Freshness Gate,Pages Config Guard")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const timeoutMs = Number(process.env.CI_GATE_TIMEOUT_MS || 30 * 60 * 1000);
const intervalMs = Number(process.env.CI_GATE_INTERVAL_MS || 10 * 1000);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkState(checks) {
  const byName = new Map();
  for (const check of checks) byName.set(String(check.name || ""), check);
  const missing = requiredChecks.filter((name) => !byName.has(name));
  const failed = requiredChecks
    .map((name) => byName.get(name))
    .filter((check) => check && check.status === "completed" && check.conclusion !== "success");
  const pending = requiredChecks
    .map((name) => byName.get(name))
    .filter((check) => check && check.status !== "completed");
  return { missing, failed, pending, ready: missing.length === 0 && failed.length === 0 && pending.length === 0 };
}

async function fetchChecks() {
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  const token = process.env.GITHUB_TOKEN;
  assert(repository && sha && token, "CI gate wait requires GITHUB_REPOSITORY, GITHUB_SHA, and GITHUB_TOKEN.");
  const response = await fetch(`https://api.github.com/repos/${repository}/commits/${sha}/check-runs?per_page=100`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  assert(response.ok, `GitHub check-runs API returned ${response.status}.`);
  const payload = await response.json();
  return payload.check_runs || [];
}

async function main() {
  if (process.argv.includes("--self-test")) {
    const state = checkState([
      ...requiredChecks.map((name) => ({ name, status: "completed", conclusion: "success" })),
    ]);
    assert(state.ready, "self-test expected all required checks to be ready.");
    console.log("[wait-for-ci-gates] self-test passed");
    return;
  }

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = checkState(await fetchChecks());
    if (state.failed.length > 0) {
      throw new Error(`Required CI gate failed: ${state.failed.map((check) => `${check.name}=${check.conclusion}`).join(", ")}`);
    }
    if (state.ready) {
      console.log(`[wait-for-ci-gates] PASS: ${requiredChecks.join(", ")}`);
      return;
    }
    console.log(`[wait-for-ci-gates] waiting: missing=${state.missing.join("|") || "none"}, pending=${state.pending.map((check) => check.name).join("|") || "none"}`);
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for required CI gates after ${Math.round(timeoutMs / 1000)}s.`);
}

main().catch((error) => {
  console.error(`[wait-for-ci-gates] FAIL: ${error.message}`);
  process.exitCode = 1;
});
