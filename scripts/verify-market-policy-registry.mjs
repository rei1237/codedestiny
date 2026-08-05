#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

function read(relPath) {
  return readFileSync(resolve(root, relPath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function extractArrayLiteral(source, name) {
  const match = source.match(new RegExp(`${name}\\s*=\\s*(?:Object\\.freeze\\()?\\[([^\\]]+)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

const aiLocaleSource = read("lib/i18n/ai-locale.js");
const marketSource = read("lib/market-policy/market-policy-registry.js");
const legalPackSource = read("lib/market-policy/legal-packs/legal-market-packs.js");

const aiLocales = extractArrayLiteral(aiLocaleSource, "AI_OUTPUT_LOCALES");
assert(
  JSON.stringify(aiLocales) === JSON.stringify(["ko", "en", "ja", "zh-CN", "zh-TW"]),
  `AI output locales must stay exactly ko,en,ja,zh-CN,zh-TW; got ${aiLocales.join(",")}`,
);

const policyAiLocales = extractArrayLiteral(marketSource, "AI_OUTPUT_MARKET_LOCALES");
assert(
  JSON.stringify(policyAiLocales) === JSON.stringify(aiLocales),
  "Market policy AI locale allowlist must match lib/i18n/ai-locale.js",
);

const expectedMarkets = ["KR", "JP", "US", "EU", "GB", "CA", "AU", "NZ", "SG", "TW", "HK", "CN"];
for (const market of expectedMarkets) {
  assert(marketSource.includes(`${market}:`), `missing market policy: ${market}`);
  assert(legalPackSource.includes(`pack("${market}"`), `missing legal market pack: ${market}`);
}

for (const market of expectedMarkets.filter((market) => market !== "KR")) {
  assert(
    marketSource.includes(`${market}: draftDisabledMarket(`),
    `${market} must remain disabled until local legal, tax, payment, and native review complete`,
  );
}

assert(
  !/autoRenewalEnabled:\s*true/.test(marketSource),
  "Current service has no approved auto-renewal subscription; do not enable autoRenewalEnabled",
);
assert(
  !/recurringPaymentEnabled:\s*true/.test(marketSource),
  "Current service has no approved recurring overseas subscription; do not enable recurringPaymentEnabled",
);
assert(
  /currentServiceHasSubscriptionCancellationRight:\s*false/.test(marketSource),
  "The registry must explicitly avoid inventing a subscription cancellation right",
);
assert(
  /subscription_cancellation_right/.test(marketSource),
  "The registry must keep subscription cancellation wording in prohibitedClaims",
);

assert(
  !/LEGAL_APPROVED/.test(legalPackSource.replace(/LEGAL_REVIEW_STATUS\.LEGAL_REVIEW_REQUIRED/g, "")),
  "Draft legal packs must not be marked LEGAL_APPROVED",
);
assert(
  !/publicationAllowed:\s*true/.test(legalPackSource),
  "Draft legal packs must not be publicationAllowed",
);
assert(
  !/livePaymentAllowed:\s*true/.test(legalPackSource),
  "Draft legal packs must not be livePaymentAllowed",
);

const forbiddenPhrases = [
  /click\s*to\s*cancel/i,
  /right\s+to\s+cancel\s+(?:your\s+)?subscription/i,
  /cancel\s+(?:your\s+)?subscription\s+at\s+any\s+time/i,
  /free\s+trial/i,
  /automatic\s+renewal\s+right/i,
  /auto[-\s]?renewing\s+subscription/i,
];

const addedLegalText = legalPackSource;
for (const pattern of forbiddenPhrases) {
  assert(
    !pattern.test(addedLegalText),
    `Do not add user-facing subscription/free-trial/auto-renewal rights that the current service does not provide: ${pattern}`,
  );
}

const sourceUrlCount = (legalPackSource.match(/https:\/\//g) || []).length;
assert(sourceUrlCount >= expectedMarkets.length * 2, "Each legal market pack should retain multiple official source URLs");

if (failures.length) {
  console.error("[verify:market-policy-registry] FAILED");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("[verify:market-policy-registry] ok");
