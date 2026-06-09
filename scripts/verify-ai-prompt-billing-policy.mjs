import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_KEY_PRICE_TABLE } from "../worker/lib/paid-feature-registry.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fortuneSource = readFileSync(resolve(root, "worker/routes/fortune.js"), "utf8");
const coinGateSource = readFileSync(resolve(root, "app/hooks/useCoinGate.ts"), "utf8");
const sajuEngineSource = readFileSync(resolve(root, "js/saju-engine.js"), "utf8");
const sukuyoEngineSource = readFileSync(resolve(root, "js/saju-engine-tarot-sukuyo-quantum.js"), "utf8");

const promptFeatures = [
  "saju_ai_prompt_generator",
  "ziwei_ai_prompt_generator",
  "sukuyo_ai_prompt_generator",
  "astrology_ai_prompt_generator",
  "vedic_ai_prompt_generator",
];

for (const featureKey of promptFeatures) {
  assert.equal(
    FEATURE_KEY_PRICE_TABLE[featureKey]?.cost,
    100,
    `${featureKey} must stay priced by the server registry at 100 coins`,
  );
  assert.match(
    fortuneSource,
    new RegExp(`featureKey:\\s*${featureKey.toUpperCase().replace(/_AI_PROMPT_GENERATOR$/, "_AI_PROMPT_FEATURE_KEY")}`),
    `${featureKey} route must use its canonical feature key`,
  );
}

assert.match(fortuneSource, /const forceDeduct = body\?\.forceDeduct === true/, "coin consume must require explicit forceDeduct");
assert.match(fortuneSource, /findAIPromptPaymentEvidence\(\{[\s\S]*requestId: coinRequestId/, "coin consume must accept verified payment evidence");
assert.match(fortuneSource, /findAIPromptDirectPaymentEvidence/, "AI prompt consume must verify direct single-payment evidence");
assert.match(fortuneSource, /requireExistingPaidAccess/, "AI prompt consume must support existing-paid-access enforcement");
assert.match(fortuneSource, /points: \{ \$gte: cost \}/, "coin consume must check balance before deduction");
assert.match(fortuneSource, /kind: "deduct"/, "coin consume must write deduct history");
assert.match(fortuneSource, /metadata:\s*\{[\s\S]*requestId: coinRequestId/, "deduct history must bind requestId");
assert.match(fortuneSource, /accessGrant: body\?\.accessGrant/, "prompt routes must forward accessGrant evidence");
assert.equal(
  (fortuneSource.match(/requireExistingPaidAccess: true/g) || []).length,
  promptFeatures.length,
  "all AI prompt routes must require pre-verified paid access",
);
assert.match(sajuEngineSource, /window\._cdOpenPaidServiceGate/, "saju/ziwei/astrology prompt clients must use the standard paid service gate");
assert.match(sajuEngineSource, /paymentMode:\s*'MEMBERSHIP_PASS'/, "saju prompt fallback may only probe membership pass access");
assert.match(sajuEngineSource, /ziwei_ai_prompt_generator/, "ziwei prompt must use canonical server feature key");
assert.match(sajuEngineSource, /astrology_ai_prompt_generator/, "astrology prompt must use canonical server feature key");
assert.match(sukuyoEngineSource, /window\._cdOpenPaidServiceGate/, "sukuyo prompt client must use the standard paid service gate");
assert.match(sukuyoEngineSource, /paymentMode:\s*'MEMBERSHIP_PASS'/, "sukuyo prompt fallback may only probe membership pass access");
assert.match(sukuyoEngineSource, /sukuyo_ai_prompt_generator/, "sukuyo prompt must use canonical server feature key");
assert.match(coinGateSource, /consume\.chargedCoins \?\? consume\.cost/, "client must prefer server chargedCoins");

console.log("[verify-ai-prompt-billing-policy] PASS");
