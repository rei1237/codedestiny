import { spawnSync } from "node:child_process";

const PAYMENT_BOUNDARY_FILES = new Set([
  "app/_lib/billing-client.ts",
  "js/core/access-store.js",
  "worker/routes/access.js",
  "worker/routes/billing.js",
  "worker/routes/payments.js",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function needsWorkerParity(files) {
  return files.some((file) => PAYMENT_BOUNDARY_FILES.has(String(file || "").trim()));
}

function changedFilesForCommit(commit) {
  const result = spawnSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", commit], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error("Could not inspect files changed by the Pages deploy commit.");
  return String(result.stdout || "").split(/\r?\n/).map((file) => file.trim()).filter(Boolean);
}

async function verifyRuntimeCommit(expectedCommit, versionUrl) {
  const response = await fetch(versionUrl, {
    headers: { Accept: "application/json", "Cache-Control": "no-store" },
    cache: "no-store",
  });
  assert(response.ok, `Worker version endpoint returned HTTP ${response.status}.`);
  const payload = await response.json();
  const actualCommit = String(payload?.commit || payload?.gitSha || "").trim();
  assert(actualCommit, "Worker version endpoint did not expose a commit SHA.");
  assert(actualCommit === expectedCommit, `Worker commit ${actualCommit.slice(0, 12)} does not match Pages commit ${expectedCommit.slice(0, 12)}.`);
}

async function main() {
  if (process.argv.includes("--self-test")) {
    assert(needsWorkerParity(["app/_lib/billing-client.ts"]), "billing client changes must require Worker parity");
    assert(needsWorkerParity(["worker/routes/access.js"]), "access route changes must require Worker parity");
    assert(!needsWorkerParity(["app/page.tsx"]), "unrelated Pages changes must not require Worker parity");
    console.log("[verify-pages-worker-parity] self-test passed");
    return;
  }

  const expectedCommit = String(process.env.GITHUB_SHA || "").trim();
  assert(/^[0-9a-f]{7,64}$/i.test(expectedCommit), "GITHUB_SHA is required for Pages/Worker parity verification.");
  const files = changedFilesForCommit(expectedCommit);
  if (!needsWorkerParity(files)) {
    console.log("[verify-pages-worker-parity] skipped: no payment boundary files changed.");
    return;
  }

  const versionUrl = String(process.env.CD_WORKER_VERSION_URL || "https://code-destiny.com/api/version").trim();
  assert(/^https:\/\//i.test(versionUrl), "CD_WORKER_VERSION_URL must be an HTTPS URL.");
  await verifyRuntimeCommit(expectedCommit, versionUrl);
  console.log(`[verify-pages-worker-parity] PASS: Worker and Pages commit ${expectedCommit.slice(0, 12)} match.`);
}

main().catch((error) => {
  console.error(`[verify-pages-worker-parity] FAIL: ${error.message}`);
  process.exitCode = 1;
});
