import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_KEY_PRICE_TABLE, normalizePaidFeatureKey } from "../worker/lib/paid-feature-registry.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fortuneSource = readFileSync(resolve(root, "worker/routes/fortune.js"), "utf8");
const billingSource = readFileSync(resolve(root, "worker/routes/billing.js"), "utf8");
const coinGateSource = readFileSync(resolve(root, "app/hooks/useCoinGate.ts"), "utf8");
const indexSource = readFileSync(resolve(root, "index.html"), "utf8");
const sajuEngineSource = readFileSync(resolve(root, "js/saju-engine.js"), "utf8");
const sajuPromptLibSource = readFileSync(resolve(root, "worker/lib/saju-ai-prompt.js"), "utf8");
const sukuyoEngineSource = readFileSync(resolve(root, "js/saju-engine-tarot-sukuyo-quantum.js"), "utf8");
const vedicSource = readFileSync(resolve(root, "vedic-astrology.html"), "utf8");

function extractSourceBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = start >= 0 ? source.indexOf(endMarker, start + startMarker.length) : -1;
  assert.ok(start >= 0 && end > start, `missing source block: ${startMarker}`);
  return source.slice(start, end);
}

const sajuAIGateSource = extractSourceBlock(sajuEngineSource, "function _cdAIPromptGate(input) {", "function _sajuPromptClone(value) {");
const sajuPromptRequestSource = extractSourceBlock(sajuEngineSource, "function _requestSajuQuestionPrompt(question, privacyOptions, domain, options)", "function _buildSajuQuestionPromptHtml() {");
const astrologyPromptRouteSource = extractSourceBlock(fortuneSource, "async function handleAstrologyAIPrompt(request, auth, env) {", "async function handleVedicAIPrompt(request, auth, env) {");
const vedicPromptRouteSource = extractSourceBlock(fortuneSource, "async function handleVedicAIPrompt(request, auth, env) {", "async function handleSajuAIPrompt(request, auth, env, ctx = null) {");
const sajuPromptRouteSource = extractSourceBlock(fortuneSource, "async function handleSajuAIPrompt(request, auth, env, ctx = null) {", "async function handleZiweiAIPrompt(request, auth, env) {");
const ziweiPromptRouteSource = extractSourceBlock(fortuneSource, "async function handleZiweiAIPrompt(request, auth, env) {", "function buildSukuyoAIPromptError(code, message, status = 400, details = {}) {");
const sukuyoPromptRouteSource = extractSourceBlock(fortuneSource, "async function handleSukuyoAIPrompt(request, auth, env) {", "async function handleSubscriptionStatus(request, env, auth) {");
const allPromptRouteSource = [
  astrologyPromptRouteSource,
  vedicPromptRouteSource,
  sajuPromptRouteSource,
  ziweiPromptRouteSource,
  sukuyoPromptRouteSource,
].join("\n");

const promptFeatures = [
  "saju_ai_prompt_generator",
  "ziwei_ai_prompt_generator",
  "astrology_ai_prompt_generator",
  "vedic_ai_prompt_generator",
  "sukuyo_ai_prompt_generator",
];
const freePromptFeatures = [];
const promptFeatureCosts = {
  saju_ai_prompt_generator: 200,
  ziwei_ai_prompt_generator: 100,
  astrology_ai_prompt_generator: 100,
  vedic_ai_prompt_generator: 100,
  sukuyo_ai_prompt_generator: 100,
};

for (const featureKey of promptFeatures) {
  const expectedCost = promptFeatureCosts[featureKey] || 100;
  // 별칭 정규화 후 canonical 가격행을 조회한다(saju_ai_prompt_generator → saju_ai_question_prompt).
  assert.equal(
    FEATURE_KEY_PRICE_TABLE[normalizePaidFeatureKey(featureKey)]?.cost,
    expectedCost,
    `${featureKey} must stay priced by the server registry at ${expectedCost} coins`,
  );
  assert.match(
    fortuneSource,
    new RegExp(`featureKey:\\s*${featureKey.toUpperCase().replace(/_AI_PROMPT_GENERATOR$/, "_AI_PROMPT_FEATURE_KEY")}`),
    `${featureKey} route must use its canonical feature key`,
  );
}

for (const featureKey of freePromptFeatures) {
  assert.equal(
    FEATURE_KEY_PRICE_TABLE[featureKey],
    undefined,
    `${featureKey} must stay outside the paid server registry`,
  );
  assert.match(
    fortuneSource,
    new RegExp(`featureKey:\\s*${featureKey.toUpperCase().replace(/_AI_PROMPT_GENERATOR$/, "_AI_PROMPT_FEATURE_KEY")}`),
    `${featureKey} route must use its canonical feature key`,
  );
}

const allPromptFeatures = [...promptFeatures, ...freePromptFeatures];
const delegatedPaidAccessPromptFeatureCount = allPromptFeatures.length;

assert.match(fortuneSource, /const forceDeduct = body\?\.forceDeduct === true/, "coin consume must require explicit forceDeduct");
assert.match(fortuneSource, /findAIPromptPaymentEvidence\(\{[\s\S]*requestId: coinRequestId/, "coin consume must accept verified payment evidence");
assert.match(fortuneSource, /findAIPromptDirectPaymentEvidence/, "AI prompt consume must verify direct single-payment evidence");
assert.match(fortuneSource, /if \(isAIPromptPassAccessPayload\(body\)\) \{[\s\S]*canUseByPass\(passEntitlement, cost\)[\s\S]*source: "pass_payload"/, "AI prompt consume must verify server-side pass entitlement evidence");
assert.match(fortuneSource, /findAIPromptMonthlyCreditEvidence/, "AI prompt consume must verify monthly-credit payment evidence");
assert.match(fortuneSource, /hasAIPromptDirectPaymentEvidenceToken/, "AI prompt direct evidence must fall back to direct payment tokens");
assert.match(fortuneSource, /isAIPromptDirectAccessPayload\(body\) \|\| hasAIPromptDirectPaymentEvidenceToken\(body\)/, "AI prompt direct evidence lookup must not require paymentMode when payment ids are present");
assert.match(fortuneSource, /hasAIPromptMonthlyCreditEvidenceToken/, "AI prompt monthly-credit evidence must fall back to ledger tokens");
assert.match(fortuneSource, /!isAIPromptMonthlyCreditAccessPayload\(body\) && !hasAIPromptMonthlyCreditEvidenceToken\(body\)/, "AI prompt monthly-credit evidence lookup must not require paymentMode when ledger ids are present");
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
  (allPromptRouteSource.match(/requireExistingPaidAccess: true/g) || []).length,
  delegatedPaidAccessPromptFeatureCount,
  "all AI prompt routes must require pre-verified paid access",
);
assert.match(sajuEngineSource, /window\._cdOpenPaidServiceGate/, "saju/ziwei/astrology prompt clients must use the standard paid service gate");
assert.match(sajuAIGateSource, /window\._cdOpenPaidServiceGate/, "saju prompt gate must use the standard paid service gate");
assert.match(sajuAIGateSource, /amountKrw:\s*amountKrw/, "saju prompt gate must pass KRW amount into the standard paid gate");
assert.match(sajuAIGateSource, /paymentAmount:\s*amountKrw/, "saju prompt gate must keep KRW payment amount aligned");
assert.match(sajuAIGateSource, /allowedPaymentModes:\s*allowedPaymentModes/, "saju prompt gate must pass allowed payment modes");
assert.match(sajuAIGateSource, /disablePassChoice:\s*opts\.disablePassChoice === true/, "saju prompt gate must support direct-only pass choice disabling");
assert.match(sajuAIGateSource, /code:\s*'PAYMENT_GATE_UNAVAILABLE'/, "saju prompt gate fallback must fail safe (surface gate-unavailable, never silently charge) when the standard paid service gate module is missing");
assert.match(sajuPromptRequestSource, /featureKey:\s*'saju_ai_prompt_generator'/, "saju question prompt must use the 1514371 feature key");
assert.match(sajuPromptRequestSource, /cost:\s*200/, "saju prompt must charge 200 coins for the 20,000 KRW result");
assert.match(sajuPromptRequestSource, /amountKrw:\s*20000/, "saju prompt must pass the 20,000 KRW amount");
// 🔴 셸의 결제 성공 검증(_cdHasVerifiedServerAccess / _cdHasVerifiedMonthlyConsumption)은 클라이언트가
// 들고 있는 featureKey 와 서버가 정규화해 돌려준 featureKey 를 _cdServerAccessFeatureMatches 로 비교한다.
// 서버 alias 표(PAID_FEATURE_KEY_ALIASES)에 있는 AI 프롬프트 쌍이 셸 alias 맵에 없으면, 차감이 끝난 뒤
// 그 비교가 false 를 내고 MONTHLY_ACCESS_UNVERIFIED 가 재제안 루프에 걸려 결제창이 문구 없이 다시 열린다
// (2026-08-13 사주 AI 상담 실사고 — 월정석이 빠져나간 뒤 첫 시도부터 항상 재현됐다).
const shellAccessAliasSource = extractSourceBlock(
  indexSource,
  "function _cdNormalizeServerAccessFeatureKey(featureKey) {",
  "function _cdServerAccessFeatureMatches(expectedFeature, actualFeature) {",
);
for (const promptFeatureKey of promptFeatures) {
  const canonicalFeatureKey = normalizePaidFeatureKey(promptFeatureKey);
  if (canonicalFeatureKey === promptFeatureKey) continue;
  assert.match(
    shellAccessAliasSource,
    new RegExp(`${promptFeatureKey}:\\s*'${canonicalFeatureKey}'`),
    `shell access-feature alias map must map ${promptFeatureKey} -> ${canonicalFeatureKey} (the server normalizes it, so the client must too)`,
  );
}
assert.doesNotMatch(sajuPromptRequestSource, /allowedPaymentModes:\s*\['direct'\]/, "saju prompt must not be restricted to direct-only payment");
assert.doesNotMatch(sajuPromptRequestSource, /disablePassChoice|forceDirectPayment|disablePassFirst/, "saju prompt must keep pass and monthly choices available");
assert.match(sajuPromptRequestSource, /_sajuPromptPostWithPaidEvidence\(requestNonce,\s*question,\s*privacyOptions,\s*domain,\s*savedEvidence,\s*options\)/, "saju prompt must post with reusable paid evidence");
assert.match(sajuEngineSource, /sajuResult:\s*_buildSajuAIPromptPayload\(privacyOptions\)/, "saju prompt must forward the current saju engine context payload");
assert.doesNotMatch(sajuPromptRequestSource, /MISSING_PROFILE_ID|profileId/, "saju prompt request must not block generation on profile execution state");
assert.match(sajuPromptRouteSource, /findAIPromptPaidAccessEvidence/, "saju prompt route must verify standard paid access evidence");
assert.doesNotMatch(sajuPromptRouteSource, /findAIPromptDirectPaymentEvidence/, "saju prompt route must not be direct-only");
assert.match(sajuPromptRouteSource, /requireExistingPaidAccess:\s*true/, "saju prompt route must delegate paid access confirmation to consume");
assert.match(sajuPromptRouteSource, /freeBySubscription:\s*body\?\.freeBySubscription === true/, "saju prompt route must forward pass evidence into paid-access verification");
assert.match(sajuPromptRouteSource, /refundSajuAIPromptMonthlyCredit/, "saju prompt route must restore monthly credit on generation failure");
assert.match(fortuneSource, /metadata\.monthlyCreditRefundedForServiceExecution/, "saju prompt monthly-credit recovery must mark service-execution refunds");
assert.match(sajuPromptRouteSource, /callGeminiText/, "saju prompt route must generate the result through the LLM");
assert.match(sajuPromptRouteSource, /resultText/, "saju prompt route must return resultText");
assert.doesNotMatch(sajuPromptRouteSource, /prompt:\s*builtPrompt\.prompt|generatedPrompt:\s*builtPrompt/, "saju prompt route must not return the internal prompt");
assert.match(sajuPromptRouteSource, /featureKey:\s*SAJU_AI_PROMPT_FEATURE_KEY/, "saju prompt route must use the canonical feature key constant");
// 프로필이 없어도(MISSING_PROFILE_ID로) 생성을 막지 않아야 한다는 것이 이 가드의 본래 의도다.
// PaidExecutionRecord/readSajuAIPromptProfileId는 이후 비동기 생성(결제 후 상태 폴링·결과 전달 보장)
// 아키텍처의 정상 인프라이며 profileId는 "default"로 폴백하므로 생성을 차단하지 않는다 — 토큰 존재 금지는 폐기.
assert.doesNotMatch(sajuPromptRouteSource, /MISSING_PROFILE_ID/, "saju prompt route must not block generation on a missing profile id");
assert.match(sajuPromptLibSource, /export const SAJU_AI_PROMPT_FEATURE_KEY = "saju_ai_prompt_generator";/, "saju prompt library must expose the 1514371 feature key");
assert.match(sajuPromptLibSource, /buildSajuAdvancedFactors/, "saju prompt library must retain advanced factor assembly");
assert.match(sajuPromptLibSource, /hiddenStemExposures/, "saju prompt library must retain hidden-stem exposure updates");
assert.match(sajuPromptLibSource, /earthStorageOpenings/, "saju prompt library must retain earth storage opening updates");
assert.match(sajuEngineSource, /engineContext:\s*_sajuPromptBuildEngineContext\(\)/, "saju prompt payload must retain the current hidden-stem engine context");
assert.match(sajuEngineSource, /freeBySubscription:\s*evidence\.freeBySubscription/, "saju prompt generation must forward pass evidence");
assert.match(fortuneSource, /accessDecision\.requestId/, "AI prompt token collection must include accessDecision request evidence");
assert.match(fortuneSource, /accessDecision\.accessGranted === true/, "AI prompt pass payload must honor granted accessDecision evidence");
assert.match(fortuneSource, /function readAIPromptRequestId/, "AI prompt routes must share request-id resolution");
assert.match(fortuneSource, /body\?\.idempotencyKey[\s\S]*paymentContext\.idempotencyKey[\s\S]*body\?\.requestId[\s\S]*paymentContext\.requestId[\s\S]*fallbackRequestId/, "AI prompt request-id resolution must prefer client payment flow ids");
assert.equal(
  (allPromptRouteSource.match(/const requestId = readAIPromptRequestId\(body, fallbackRequestId\);/g) || []).length,
  allPromptFeatures.length,
  "all AI prompt routes must use payment-flow request ids",
);
assert.equal(
  (allPromptRouteSource.match(/accessGrant: body\?\.accessGrant,\s*\n\s*accessDecision: body\?\.accessDecision,\s*\n\s*freeBySubscription: body\?\.freeBySubscription === true/g) || []).length,
  delegatedPaidAccessPromptFeatureCount,
  "AI prompt generation routes must forward accessDecision into paid-access verification",
);
assert.equal(
  (allPromptRouteSource.match(/freeBySubscription: body\?\.freeBySubscription === true/g) || []).length,
  delegatedPaidAccessPromptFeatureCount,
  "AI prompt generation routes must forward subscription pass evidence into paid-access verification",
);
assert.doesNotMatch(
  sajuEngineSource,
  /if \(code === 'PAYMENT_REQUIRED' \|\| code === 'INSUFFICIENT_COINS' \|\| result\.status === 402\) \{[\s\S]*?_openSajuPaidPaymentMode\(200, '사주 AI 상담 결과 생성', 'saju_ai_prompt_generator'\)/,
  "saju prompt must not reopen the payment modal after a paid gate attempt fails verification",
);
assert.doesNotMatch(sajuEngineSource, /_openSajuPaidPaymentMode\(ASTROLOGY_AI_PROMPT_COST,[\s\S]*?astrology_ai_prompt_generator/, "astrology prompt must not reopen legacy payment after the standard paid gate");
assert.doesNotMatch(sajuEngineSource, /_openSajuPaidPaymentMode\(_ZW_AI_PROMPT_COST,[\s\S]*?_ZW_AI_PROMPT_FEATURE_KEY/, "ziwei prompt must not reopen legacy payment after the standard paid gate");
assert.match(sajuEngineSource, /ziwei_ai_prompt_generator/, "ziwei prompt must use canonical server feature key");
assert.match(sajuEngineSource, /astrology_ai_prompt_generator/, "astrology prompt must use canonical server feature key");
assert.match(sajuEngineSource, /headers:\s*Object\.assign\(_astroBuildPromptHeaders\(\),\s*finalBody && finalBody\.requestId/, "astrology prompt must send payment-flow idempotency header");
assert.match(sajuEngineSource, /headers:\s*Object\.assign\(buildHeaders\(\),\s*\{\s*'idempotency-key':\s*evidence\.requestId/, "ziwei prompt must send payment-flow idempotency header");
assert.match(sajuEngineSource, /accessDecision:\s*evidence\.accessDecision/, "ziwei prompt generation must forward accessDecision evidence");
assert.match(sajuEngineSource, /freeBySubscription:\s*evidence\.freeBySubscription/, "ziwei prompt generation must forward pass evidence");
assert.match(sukuyoEngineSource, /window\._cdOpenPaidServiceGate/, "sukuyo prompt client must use the standard paid service gate");
assert.match(sukuyoEngineSource, /code:\s*'PAYMENT_GATE_UNAVAILABLE'/, "sukuyo prompt gate fallback must fail safe (surface gate-unavailable, never silently charge) when the standard paid service gate module is missing");
assert.match(sukuyoEngineSource, /sukuyo_ai_prompt_generator/, "sukuyo prompt must use canonical server feature key");
assert.match(sukuyoEngineSource, /amountKrw:\s*Math\.max\(0,\s*Math\.floor\(Number\(opts\.amountKrw \|\| opts\.amountKRW \|\| opts\.paymentAmount \|\| \(cost \* 100\)\)\)\)/, "sukuyo prompt gate must pass KRW amount into the standard paid gate");
assert.match(sukuyoEngineSource, /membershipCreditCost:\s*Math\.max\(0,\s*Math\.floor\(Number\(opts\.membershipCreditCost \|\| \(cost \* 10\)\)\)\)/, "sukuyo prompt gate must pass monthly credit cost");
assert.match(sukuyoEngineSource, /forcePassFirst:\s*true/, "sukuyo prompt gate must force a server pass-first entitlement check");
assert.doesNotMatch(sukuyoEngineSource, /window\.openChargeModal\(\)/, "sukuyo prompt must not reopen the charge modal after the standard paid gate");
assert.match(sukuyoEngineSource, /'idempotency-key':\s*evidence\.requestId/, "sukuyo prompt must send payment-flow idempotency header");
assert.match(sukuyoEngineSource, /accessDecision:\s*evidence\.accessDecision/, "sukuyo prompt generation must forward accessDecision evidence");
assert.match(sukuyoEngineSource, /freeBySubscription:\s*evidence\.freeBySubscription/, "sukuyo prompt generation must forward pass evidence");
assert.match(vedicSource, /function vedicAiGeneratePrompt/, "vedic prompt client must expose the AI prompt generator handler");
assert.match(vedicSource, /vedic_ai_prompt_generator/, "vedic prompt must use canonical server feature key");
assert.match(vedicSource, /window\._cdOpenPaidServiceGate/, "vedic prompt client must use the standard paid service gate");
assert.match(vedicSource, /forcePassFirst:\s*true/, "vedic prompt gate must check membership pass before payment choices");
assert.match(vedicSource, /membershipCreditCost:\s*VEDIC_AI_PROMPT_COST\s*\*\s*10/, "vedic prompt gate must pass monthly credit cost");
assert.match(vedicSource, /amountKrw:\s*VEDIC_AI_PROMPT_AMOUNT_KRW/, "vedic prompt gate must pass KRW amount into the standard paid gate");
assert.match(vedicSource, /paymentAmount:\s*VEDIC_AI_PROMPT_AMOUNT_KRW/, "vedic prompt gate must keep KRW payment amount aligned");
assert.match(vedicSource, /headers\['idempotency-key'\]\s*=\s*gate\.requestId\|\|requestId/, "vedic prompt generation must send an idempotency header");
assert.match(vedicSource, /accessGrant:\s*gate\.accessGrant/, "vedic prompt generation must forward accessGrant evidence");
assert.match(vedicSource, /accessDecision:\s*gate\.accessDecision/, "vedic prompt generation must forward accessDecision evidence");
assert.match(vedicSource, /freeBySubscription:\s*gate\.freeBySubscription===true/, "vedic prompt generation must forward pass evidence");
assert.match(vedicSource, /_paymentContext:\s*gate\._paymentContext/, "vedic prompt generation must forward payment context evidence");
assert.doesNotMatch(vedicSource, /window\.location\.href='\/points'/, "vedic prompt must not reopen the legacy points page after the paid gate");
assert.match(coinGateSource, /consume\.chargedCoins \?\? consume\.cost/, "client must prefer server chargedCoins");
assert.doesNotMatch(indexSource, /status:\s*'cancelled',\s*reason:\s*'pass_applied_in_modal'/, "paid service gate must not convert applied membership pass into cancellation");

console.log("[verify-ai-prompt-billing-policy] PASS");
