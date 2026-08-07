import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const scanRoots = ["app", "components", "src", "js"];
// 루트 정적 페이지도 배포되는 결제 표면이다. 예전에는 index.html 만 스캔해서
// celestial-harmony.html 의 paymentMode 없는 coin-gate 직접 fetch 가 그대로 통과했다.
const rootFiles = [
  "index.html",
  "celestial-harmony.html",
  "cosmic-soul-meditation.html",
  "geomancy-oracle-v4.html",
  "ifa_oracle_v2_full.html",
  "neville-meditation.html",
  "pet-saju.html",
  "royal-tea-oracle.html",
  "tarot-ijik.html",
  "vedic-astrology.html",
  "yoga-guru.html",
];
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
const directLegacyCoinCallPattern = /(?:fetch|authFetch|_fetchApiJson|fetchJsonWithAuth|_dpFetchJsonWithFallback|_dpPaymentFetchJson)\s*\([^)]*['"]\/api\/fortune\/pig-coin\/(?:balance|consume|unlock|share-reward|charge-simulate|earn)(?:[/?'"\\)]|$)/s;
const activeLegacyCoinFlagPattern = /forceDeduct\s*:\s*true|paymentMode\s*:\s*['"]COIN['"]/;

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
  if (!allowedFiles.has(rel) && directCoinGateCallPattern.test(source)) {
    violations.push(rel);
  }
  if (directLegacyCoinCallPattern.test(source)) {
    violations.push(`${rel} (legacy coin endpoint)`);
  }
  if (activeLegacyCoinFlagPattern.test(source)) {
    violations.push(`${rel} (active COIN flag)`);
  }
}

assert.deepEqual(violations, [], `paid features must use the common billing gate, direct coin-gate calls found in: ${violations.join(", ")}`);

const billingClient = fs.readFileSync(path.join(root, "app/_lib/billing-client.ts"), "utf8");
assert.match(billingClient, /DUPLICATE_CLIENT_FLOW_BLOCKED/, "React billing client keeps duplicate flow guard");
assert.match(billingClient, /equalPriorityMethods/, "React payment choice reads equal-priority methods");
assert.doesNotMatch(billingClient, /code:\s*"PAYMENT_REQUIRED"[\s\S]{0,240}requiredCoins,[\s\S]{0,160}chargedCoins:\s*0/, "useCoinGate must not surface raw PAYMENT_REQUIRED to paid feature UIs");
assert.doesNotMatch(billingClient, /paymentMode\s*:\s*['"]COIN['"]|forceDeduct\s*:\s*true/, "React common billing bridge never sends active legacy COIN flags");

const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(indexSource, /var equalPriorityMethods = normalizeChoiceMethods/, "static payment choice reads equal-priority methods");
assert.match(indexSource, /월정석은 이벤트성 선불 재화입니다\./, "static payment choice clarifies monthly stone as event currency");

assert.match(indexSource, /includeBilling === true/, "static session bootstrap does not warm billing balance by default");

const independentStaticPages = [
  "celestial-harmony.html",
  "cosmic-soul-meditation.html",
  "geomancy-oracle-v4.html",
  "ifa_oracle_v2_full.html",
  "neville-meditation.html",
  "royal-tea-oracle.html",
  "tarot-ijik.html",
  "vedic-astrology.html",
  "yoga-guru.html",
  "pet-saju.html",
];
for (const rel of independentStaticPages) {
  const page = fs.readFileSync(path.join(root, rel), "utf8");
  assert.match(page, /(?:js\/destiny-profile\.js|destiny-profile\.js)/, `${rel} uses the common static paid bridge`);
}

const generatedStaticPages = [
  "public/celestial-harmony.html",
  "public/cosmic-soul-meditation.html",
  "public/geomancy-oracle-v4.html",
  "public/ifa-oracle.html",
  "public/neville-meditation.html",
  "public/royal-tea-oracle.html",
  "public/tarot-ijik.html",
  "public/vedic-astrology.html",
  "public/yoga-guru.html",
  "public/static/geomancy-oracle-v4.html",
];
for (const rel of generatedStaticPages) {
  const page = fs.readFileSync(path.join(root, rel), "utf8");
  assert.match(page, /(?:js\/destiny-profile\.js|destiny-profile\.js)/, `${rel} uses the common static paid bridge`);
  assert.doesNotMatch(page, /forceDeduct\s*:\s*true|paymentMode\s*:\s*["']COIN["']|\/api\/fortune\/pig-coin\/(?:balance|consume|unlock|share-reward|charge-simulate|earn)/, `${rel} has no active legacy COIN path`);
}

console.log("[verify-paid-feature-common-flow] PASS");
