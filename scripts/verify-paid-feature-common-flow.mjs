import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const scanRoots = ["app", "components", "src", "js"];
const rootFiles = ["index.html"];
const allowedFiles = new Set([
  path.normalize("app/_lib/billing-client.ts"),
  path.normalize("index.html"),
  path.normalize("js/destiny-profile.js"),
]);
const ignoredDirs = new Set([
  ".git",
  ".next",
  "node_modules",
  "public",
  "reports",
  "dist",
  "build",
]);
const sourceExt = /\.(?:[cm]?[jt]sx?|html)$/i;
const directCoinGateCallPattern = /(?:fetch|authFetchBilling|_fetchApiJson|_cdAIPromptRequestJson|syPromptRequestJson|fetchJsonWithAuth|_dpFetchJsonWithFallback|_dpPaymentFetchJson)\s*\([^)]*['"]\/api\/billing\/coin-gate(?:\/[^'"]*)?['"]/s;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (sourceExt.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const candidates = [
  ...rootFiles.map((file) => path.join(root, file)).filter((file) => fs.existsSync(file)),
  ...scanRoots.flatMap((dir) => walk(path.join(root, dir))),
];

const violations = [];

for (const file of candidates) {
  const rel = path.normalize(path.relative(root, file));
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes("/api/billing/coin-gate")) continue;
  if (allowedFiles.has(rel)) continue;
  if (directCoinGateCallPattern.test(source)) {
    violations.push(rel);
  }
}

assert.deepEqual(violations, [], `paid features must use the common billing gate, direct coin-gate calls found in: ${violations.join(", ")}`);

const billingClient = fs.readFileSync(path.join(root, "app/_lib/billing-client.ts"), "utf8");
assert.match(billingClient, /DUPLICATE_CLIENT_FLOW_BLOCKED/, "React billing client keeps duplicate flow guard");
assert.match(billingClient, /equalPriorityMethods/, "React payment choice reads equal-priority methods");
assert.doesNotMatch(billingClient, /code:\s*"PAYMENT_REQUIRED"[\s\S]{0,240}requiredCoins,[\s\S]{0,160}chargedCoins:\s*0/, "useCoinGate must not surface raw PAYMENT_REQUIRED to paid feature UIs");

const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(indexSource, /var equalPriorityMethods = normalizeChoiceMethods/, "static payment choice reads equal-priority methods");
assert.match(indexSource, /월정석은 이벤트성 선불 재화입니다\./, "static payment choice clarifies monthly stone as event currency");

console.log("[verify-paid-feature-common-flow] PASS");
