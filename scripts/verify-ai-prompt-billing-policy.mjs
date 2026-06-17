import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_KEY_PRICE_TABLE } from "../worker/lib/paid-feature-registry.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fortuneSource = readFileSync(resolve(root, "worker/routes/fortune.js"), "utf8");
const billingSource = readFileSync(resolve(root, "worker/routes/billing.js"), "utf8");
const coinGateSource = readFileSync(resolve(root, "app/hooks/useCoinGate.ts"), "utf8");
const indexSource = readFileSync(resolve(root, "index.html"), "utf8");
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
assert.match(fortuneSource, /findAIPromptMonthlyCreditEvidence/, "AI prompt consume must verify monthly-credit payment evidence");
assert.match(fortuneSource, /MonthlyCreditLedger\.findOne/, "AI prompt monthly-credit evidence must use the monthly credit ledger");
assert.match(fortuneSource, /body\?\.ledgerId/, "AI prompt token collection must preserve monthly-credit ledger id");
assert.match(fortuneSource, /metadata\.monthlyCreditLedgerId/, "AI prompt monthly-credit lookup must search ledger metadata ids");
assert.match(billingSource, /ledgerId:\s*membershipConsume\.ledgerId \|\| ""/, "monthly-credit coin-gate success must return ledger id evidence");
assert.match(billingSource, /transactionId:\s*membershipConsume\.transactionId \|\| ""/, "monthly-credit coin-gate success must return transaction id evidence");
assert.match(billingSource, /purchaseId:\s*membershipConsume\.purchaseId \|\| requestId/, "monthly-credit coin-gate success must return purchase evidence");
assert.match(fortuneSource, /requireExistingPaidAccess/, "AI prompt consume must support existing-paid-access enforcement");
assert.match(fortuneSource, /PAID_ACCESS_VERIFY_RETRYABLE/, "saju prompt must expose retryable paid-access DB verification failures");
assert.match(fortuneSource, /isSajuAIPromptDbUnavailableError/, "saju prompt must classify DB verification failures inside the prompt route");
assert.doesNotMatch(
  fortuneSource,
  /path === "\/saju\/ai-prompt"[\s\S]{0,520}await connectDb\(env\);[\s\S]{0,180}handleSajuAIPrompt/,
  "saju prompt route must not fail on a pre-generation connectDb before paid evidence handling",
);
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
assert.match(sajuEngineSource, /membershipCreditCost:\s*Math\.max\(0,\s*Math\.floor\(Number\(opts\.membershipCreditCost \|\| \(cost \* 10\)\)\)\)/, "saju prompt gate must pass monthly credit cost into the standard paid gate");
assert.match(sajuEngineSource, /forcePassFirst:\s*true/, "saju prompt gate must force a server pass-first entitlement check");
assert.match(indexSource, /forceRefreshMembershipCoverage:\s*opts\.forcePassFirst === true/, "standard paid gate must server-check membership pass before opening payment choices");
assert.match(indexSource, /var fastPassOnly = !forceRefreshMembershipCoverage/, "standard paid gate must not skip network pass checks when forcePassFirst is set");
assert.match(sajuEngineSource, /function _cdAIPromptRecordedMembershipPass/, "saju prompt pass gate must create server-recorded pass evidence");
assert.match(sajuEngineSource, /_cdAIPromptRecordedMembershipPass\(opts,\s*requestId,\s*openResult\.payload \|\| \{\}\)/, "saju prompt pass grant must be converted into recorded coin-gate evidence");
assert.match(sajuEngineSource, /message:\s*openMessage \|\|/, "saju prompt gate must preserve the standard paid gate failure reason");
assert.match(sajuEngineSource, /paymentMode:\s*'MEMBERSHIP_PASS'/, "saju prompt fallback may only probe membership pass access");
assert.match(sajuEngineSource, /function _sajuPromptPostWithPaidEvidence/, "saju prompt must separate paid gate from generation request");
assert.match(sajuEngineSource, /accessDecision:\s*evidence\.accessDecision/, "saju prompt generation must forward accessDecision evidence");
assert.match(sajuEngineSource, /freeBySubscription:\s*evidence\.freeBySubscription/, "saju prompt generation must forward subscription pass evidence");
assert.match(sajuEngineSource, /_cdAIPromptPayloadLayers/, "saju prompt gate evidence must flatten nested paid-gate payload layers");
assert.match(sajuEngineSource, /ledgerId:\s*evidence\._paymentContext && evidence\._paymentContext\.ledgerId/, "saju prompt generation must forward monthly-credit ledger id");
assert.match(fortuneSource, /accessDecision\.requestId/, "AI prompt token collection must include accessDecision request evidence");
assert.match(fortuneSource, /accessDecision\.accessGranted === true/, "AI prompt pass payload must honor granted accessDecision evidence");
assert.equal(
  (fortuneSource.match(/accessGrant: body\?\.accessGrant,\s*\n\s*accessDecision: body\?\.accessDecision,\s*\n\s*freeBySubscription: body\?\.freeBySubscription === true/g) || []).length,
  promptFeatures.length,
  "all AI prompt generation routes must forward accessDecision into paid-access verification",
);
assert.match(sajuEngineSource, /featureKey:\s*'saju_ai_question_prompt'/, "saju question prompt must use the per-use feature id");
assert.match(fortuneSource, /SAJU_AI_PROMPT_ACCESS_MODE = "per_use"/, "saju question prompt must be handled as per-use access");
assert.match(fortuneSource, /PaidExecutionRecord\.findOne\(\{[\s\S]*featureId: SAJU_AI_PROMPT_FEATURE_KEY,[\s\S]*profileId,[\s\S]*requestId/, "saju question prompt must check request-scoped paid execution records");
assert.match(fortuneSource, /PaidExecutionRecord\.create\(executionDocument\)/, "saju question prompt must claim a request-scoped paid execution record");
assert.match(fortuneSource, /status: "generating"/, "saju question prompt must mark the claimed execution as generating before returning a result");
assert.match(sajuEngineSource, /code === 'MISSING_PROFILE_ID'[\s\S]{0,180}_sajuPromptSetStatus/, "saju prompt profile errors must not open the login flow");
assert.match(fortuneSource, /buildSajuAIPromptError\("MISSING_PROFILE_ID",[\s\S]*?, 400\)/, "saju prompt missing profile errors must not be returned as auth failures");
assert.equal(
  (fortuneSource.match(/freeBySubscription: body\?\.freeBySubscription === true/g) || []).length,
  promptFeatures.length,
  "all AI prompt generation routes must forward subscription pass evidence into paid-access verification",
);
assert.match(sajuEngineSource, /_sajuPromptShouldRetryPaidGeneration/, "saju prompt must retry generation with the same paid evidence after transient DB verification failure");
assert.match(sajuEngineSource, /onRetry:\s*function/, "saju prompt must surface paid generation retry state to the user");
assert.match(sajuEngineSource, /getFortuneApiBaseUrl/, "saju prompt generation must support the worker API base fallback");
assert.doesNotMatch(
  sajuEngineSource,
  /if \(code === 'PAYMENT_REQUIRED' \|\| code === 'INSUFFICIENT_COINS' \|\| result\.status === 402\) \{[\s\S]*?_openSajuPaidPaymentMode\(100, '사주 AI 질문문 생성', 'saju_ai_prompt_generator'\)/,
  "saju prompt must not reopen the payment modal after a paid gate attempt fails verification",
);
assert.match(sajuEngineSource, /ziwei_ai_prompt_generator/, "ziwei prompt must use canonical server feature key");
assert.match(sajuEngineSource, /astrology_ai_prompt_generator/, "astrology prompt must use canonical server feature key");
assert.match(sukuyoEngineSource, /window\._cdOpenPaidServiceGate/, "sukuyo prompt client must use the standard paid service gate");
assert.match(sukuyoEngineSource, /paymentMode:\s*'MEMBERSHIP_PASS'/, "sukuyo prompt fallback may only probe membership pass access");
assert.match(sukuyoEngineSource, /sukuyo_ai_prompt_generator/, "sukuyo prompt must use canonical server feature key");
assert.match(coinGateSource, /consume\.chargedCoins \?\? consume\.cost/, "client must prefer server chargedCoins");
assert.doesNotMatch(indexSource, /status:\s*'cancelled',\s*reason:\s*'pass_applied_in_modal'/, "paid service gate must not convert applied membership pass into cancellation");

console.log("[verify-ai-prompt-billing-policy] PASS");
