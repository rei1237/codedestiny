import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slash = (value) => value.split(path.sep).join("/");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

function walk(relative, extensions) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  const entries = fs.statSync(absolute).isDirectory()
    ? fs.readdirSync(absolute, { withFileTypes: true })
    : [{ name: path.basename(absolute), isDirectory: () => false }];
  const base = fs.statSync(absolute).isDirectory() ? absolute : path.dirname(absolute);
  const files = [];
  for (const entry of entries) {
    const target = path.join(base, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "public"].includes(entry.name)) continue;
      files.push(...walk(slash(path.relative(root, target)), extensions));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(slash(path.relative(root, target)));
    }
  }
  return files;
}

const clientAdapters = new Set([
  "app/_lib/billing-client.ts",
  "index.html",
  "js/destiny-profile.js",
  "js/core/index-inline-runtime.js",
  "js/core/payment-service.js",
]);
const clientFiles = [
  ...walk("app", new Set([".js", ".jsx", ".ts", ".tsx"])),
  ...walk("components", new Set([".js", ".jsx", ".ts", ".tsx"])),
  ...walk("js", new Set([".js", ".ts"])),
  "index.html",
];
const directClientCalls = clientFiles.filter((file) => {
  if (clientAdapters.has(file)) return false;
  const source = read(file);
  return /(?:fetch|authFetch|fetchJson|FetchJson)[\s\S]{0,160}["']\/api\/billing\/coin-gate(?:[/?"'])/.test(source);
});
assert.deepEqual(directClientCalls, [], `UI must call CodeDestinyPaymentService, not coin-gate directly:\n${directClientCalls.join("\n")}`);

const serverAdapters = new Set([
  "worker/routes/billing.js",
  "worker/routes/payments.js",
  "worker/routes/admin-monthly-credits.js",
]);
const routeFiles = walk("worker/routes", new Set([".js"]));
const directMonthlyStores = [];
const directSpendLedgers = [];
for (const file of routeFiles) {
  if (serverAdapters.has(file)) continue;
  const source = read(file);
  if (/\bconsumeMonthlyCreditLots\b/.test(source)) directMonthlyStores.push(file);
  if (/MonthlyCreditLedger\.create\([\s\S]{0,900}?type\s*:\s*["']MONTHLY_CREDIT_SPEND["']/.test(source)) {
    directSpendLedgers.push(file);
  }
}
assert.deepEqual(directMonthlyStores, [], `Feature routes must consume a Payment Service access grant:\n${directMonthlyStores.join("\n")}`);
assert.deepEqual(directSpendLedgers, [], `Feature routes must not create monthly spend ledgers:\n${directSpendLedgers.join("\n")}`);

for (const file of [
  "worker/routes/astrology-ai.js",
  "worker/routes/life-book-ai.js",
  "worker/routes/nakshatra-ai.js",
  "worker/routes/neo-operation-room.js",
  "worker/routes/ziwei-ai.js",
  "worker/routes/ziwei-island-ai.js",
]) {
  assert.match(read(file), /PAYMENT_ACCESS_GRANT_REQUIRED/, `${file} must fail closed without a Payment Service grant`);
}

console.log(`[verify-payment-service-boundary] PASS (${clientFiles.length} client files, ${routeFiles.length} Worker routes)`);
