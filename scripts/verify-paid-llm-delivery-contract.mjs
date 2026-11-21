#!/usr/bin/env node
// 유료 LLM 전달 계약 검증기 (S5, 2026-11-18, fail-closed).
// 계약 정본: worker/lib/consultation-recovery-registry.js 의 PAID_LLM_DELIVERY_CONTRACT.
// 잡는 것:
//   1. 결제 원시함수(이용권·단건·코인·월정석 차감/검증)와 LLM 호출(직접 또는 import 2단계 안)을
//      함께 쓰는 worker 파일이 계약에도 EXEMPT 에도 없으면 실패 — 새 유료 LLM 서비스의 무등록 출시를 막는다.
//   2. 계약 항목의 파일이 없거나, refunds 의 기호가 그 파일들에서 참조되지 않거나, 공용 환불 경로가
//      하나도 없으면 실패. 공용 경로 기호는 정의 파일에 실제로 있어야 한다.
//   3. CONSULTATION_RECOVERY_ADAPTERS 의 서비스, 카탈로그의 LLM 판매 키(buildPaidDeliveryInventory)가
//      계약에서 빠지면 실패.
//   4. 자동 환불 구멍(gap)은 KNOWN_REFUND_GAPS 와 정확히 같아야 한다 — 새 구멍은 실패, 메운 구멍은 목록에서 지운다.
//   5. 계약 테스트(__tests__/worker/paid-llm-delivery-contract.test.js)가 있고 레지스트리를 import 해야 하며,
//      PAID_LLM_DELIVERY_TESTS 가 계약 서비스 전부를 덮고 그 테스트 파일이 실재해야 한다.
//   6. 정체 감시: 복구 어댑터 중 STUCK_SETTLERS(자동 확정) 밖의 서비스는 KNOWN_STUCK_SETTLE_GAPS 와 정확히 같아야 한다.
//      공용 상태 환불(GENERIC_STUCK_SETTLERS) 밖의 설정자는 계약 파일이 settleStuckDelivery 를 export 해야 한다(S16).
//   7. 자기 변이 검사: 계약 항목을 하나씩 뺀 판정이 매번 실패해야 한다(도는 가드가 아니라 무는 가드).
//   8. 다시 시도 우선(R8, 2026-11-20): 계약 서비스는 RETRY_FIRST_POLICY 또는 KNOWN_RETRY_PENDING 중 하나에 정확히 있어야 하고,
//      대표 상담(사주 카탈로그 saju-signature)은 전부 RETRY_FIRST_POLICY 여야 한다. 그 서비스마다 실패 표지(생성 + 7일)·
//      POST /retry·POST /refund-request·크론에 배선된 7일 정산을 확인하고, 근거를 하나씩 지운 변이가 매번 실패해야 한다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 공용 환불 경로: 기호 → 정의 파일. 라우트 파일이 이 기호를 참조해야 "공용 경로로 환불한다"로 본다.
export const SHARED_REFUND_PATHS = Object.freeze({
  autoRefundSinglePaymentDeliveryFailure: "worker/lib/payment-refund.js",
  refundPaymentAsOperator: "worker/lib/payment-refund.js",
  settleFailedConsultationRefund: "worker/lib/consultation-delivery-refund.js",
  // runPendingConsultationRefunds 가 llmMeta.refundEligibleAt 표식이 붙은 실패 건을 환불한다.
  refundEligibleAt: "worker/lib/consultation-delivery-refund.js",
  failServiceExecution: "worker/lib/service-execution-task.js",
  runPaymentCancel: "worker/lib/service-execution-task.js",
  runCoinRefund: "worker/lib/service-execution-task.js",
  runMonthlyCreditRefund: "worker/lib/service-execution-task.js",
  refundPassUseEvidence: "worker/lib/pass-consumption.js",
  refundPassCoverage: "worker/lib/pass-consumption.js",
  refundYeongnyangiMoonstone: "worker/lib/pass-consumption.js",
  refundYeongnyangiServicePack: "worker/lib/pass-consumption.js",
  // paid-narrative 엔진의 실행 기록(ServiceExecutionTransaction, timeoutAt)은 runServiceExecutionTimeoutTask 가 정산한다.
  runPaidNarrativeDelivery: "worker/lib/paid-narrative-delivery.js",
});

// 결제 원시함수+LLM 을 함께 쓰지만 서비스 자체가 아닌 파일. 이유 필수.
export const EXEMPT_FILES = Object.freeze({
  "worker/routes/billing.js": "결제 라우터 — LLM 은 fortune.js import 를 거친 거짓 양성, 생성하지 않는다",
  "worker/payments/index.js": "결제 라우터 — LLM 은 찻집 import 를 거친 거짓 양성",
  "worker/routes/prompt-hub.js": "프롬프트 허브 라우터 — 찻집 import 를 거친 거짓 양성",
  "worker/lib/paid-narrative-delivery.js": "공용 paid-narrative 엔진 — 각 서비스 항목이 계약을 진다",
  "worker/lib/paid-narrative-intent.js": "paid-narrative 결제 의도 승격 — 생성은 각 서비스 어댑터",
  "worker/lib/paid-narrative-adapters.js": "paid-narrative 복구 어댑터 목록 — 생성은 각 서비스 파일",
  "worker/lib/expert-follow-up-delivery.js": "전문가 후속 질문 — paid-narrative 엔진, 판매 키는 각 상담 항목에 포함",
});

// 자동 환불 경로가 아직 없는 서비스(정확히 일치해야 한다).
// 2026-11-18 release review: retain the pre-existing fortune-chat card support-review gap; unsafe new auto-refund excluded.
export const KNOWN_REFUND_GAPS = Object.freeze([
  "fortune-chat-question",
  "tarot-oracle", "love-tarot", "mindscan", "dream", "yoga-guru", "saju-compat-basic", "pet-saju-ai",
  "geomancy-oracle", "animal-totem", "guardian-fortune", "palm", "toss-native",
]);

// 정체 감시가 자동 확정하지 않고 경보(paid_delivery_stuck_unsettled)만 내는 복구 어댑터(정확히 일치해야 한다).
// 이 서비스들은 환불을 핸들러 실패 경로 안에서 인라인으로 하므로 바깥에서 상태만 바꾸면 "차감됐는데 환불 없음"이 생긴다.
export const KNOWN_STUCK_SETTLE_GAPS = Object.freeze([
  "astrology-ai", "ziwei-ai", "sukuyo-compatibility-ai",
  "nakshatra-ai", "human-design-report", "destiny-compass-ai", "relationship-boundary-test", "naming-prompt",
  "celestial-harmony", "fortune", "karma-destiny-ai",
]);
// R8 (2026-11-20) 다시 시도 우선 정책: 실패 → 무료 다시 시도(추가 결제·차감 없음) → 생성 + 7일 또는 고객 요청 때 환불.
// 서비스마다 (1) 실패 표지를 paid-delivery-stuck.js 의 생성+7일 계산(marker)으로 만들고 (2) POST /retry (3) POST /refund-request
// 라우트가 있고 (4) 창이 지난 보류를 환불로 넘기는 정산(settle)이 크론에 배선돼 있어야 한다.
//   settle.symbol: 라우트 파일이 export 하고(generic 이면 paid-delivery-stuck.js 가 export) settle.cron 파일이 참조해야 하는 기호.
//   generic: 공용 정체 설정자(GENERIC_STUCK_SETTLERS) — 복구 크론이 expireRetryableConsultations 로 refundEligibleAt 을 붙이고
//            consultation-delivery-refund.js 의 SERVICES 가 환불한다.
const REFUND_CRON = "worker/lib/consultation-delivery-refund.js";
const RECOVERY_CRON = "worker/lib/consultation-recovery-task.js";
const CODEX_RECOVERY_CRON = "worker/lib/master-love-codex-recovery-task.js";
export const RETRY_FIRST_POLICY = Object.freeze({
  "neo-operation-room": { marker: "retryableFailureMeta", settle: { symbol: "settleDueNeoRetryRefunds", cron: REFUND_CRON } },
  "life-book-ai": { marker: "retryableFailureMeta", settle: { symbol: "expireRetryableConsultations", cron: RECOVERY_CRON, generic: true } },
  "new-year-ai": { marker: "retryableFailureMeta", settle: { symbol: "expireRetryableConsultations", cron: RECOVERY_CRON, generic: true } },
  "saju-compat-premium": { marker: "retryableFailureMeta", settle: { symbol: "expireRetryableConsultations", cron: RECOVERY_CRON, generic: true } },
  "love-secret-ai": { marker: "retryableFailureMeta", settle: { symbol: "settleDueLoveSecretRetryRefunds", cron: REFUND_CRON } },
  "heukwol": { marker: "retryRefundAt", settle: { symbol: "settleDueHeukwolRetryRefunds", cron: REFUND_CRON } },
  "fortune-tea-house": { marker: "retryRefundAt", settle: { symbol: "settleDueTeaHouseRetryRefunds", cron: REFUND_CRON } },
  "master-love-codex": { marker: "retryRefundAt", settle: { symbol: "codexRetryDue", cron: CODEX_RECOVERY_CRON } },
  // R10 전문가 상담(2026-11-20)
  "vedic-ai": { marker: "retryableFailureMeta", settle: { symbol: "settleDueVedicRetryRefunds", cron: REFUND_CRON } },
  "astrology-ai": { marker: "retryableFailureMeta", settle: { symbol: "settleDueAstrologyRetryRefunds", cron: REFUND_CRON } },
  "ziwei-ai": { marker: "retryableFailureMeta", settle: { symbol: "settleDueZiweiRetryRefunds", cron: REFUND_CRON } },
  "sukuyo-compatibility-ai": { marker: "retryableFailureMeta", settle: { symbol: "settleDueSukuyoRetryRefunds", cron: REFUND_CRON } },
  "karma-destiny-ai": { marker: "retryableFailureMeta", settle: { symbol: "settleDueKarmaRetryRefunds", cron: REFUND_CRON } },
  "naming-prompt": { marker: "retryableFailureMeta", settle: { symbol: "settleDueNamingRetryRefunds", cron: REFUND_CRON } },
  "fusion-fortune": { marker: "retryableFailureMeta", settle: { symbol: "settleDueFusionRetryRefunds", cron: REFUND_CRON } },
  // 2026-11-21 C2: 서술형 엔진 10종은 공용 엔드포인트(worker/routes/paid-narrative-retry.js)의 /retry·/refund-request 와 7일 정산을 쓴다.
  "tarot-oracle": { marker: "retryRefundAt", settle: { symbol: "settleDuePaidNarrativeRetryRefunds", cron: REFUND_CRON } },
  "love-tarot": { marker: "retryRefundAt", settle: { symbol: "settleDuePaidNarrativeRetryRefunds", cron: REFUND_CRON } },
  "mindscan": { marker: "retryRefundAt", settle: { symbol: "settleDuePaidNarrativeRetryRefunds", cron: REFUND_CRON } },
  "dream": { marker: "retryRefundAt", settle: { symbol: "settleDuePaidNarrativeRetryRefunds", cron: REFUND_CRON } },
  "yoga-guru": { marker: "retryRefundAt", settle: { symbol: "settleDuePaidNarrativeRetryRefunds", cron: REFUND_CRON } },
  "saju-compat-basic": { marker: "retryRefundAt", settle: { symbol: "settleDuePaidNarrativeRetryRefunds", cron: REFUND_CRON } },
  "pet-saju-ai": { marker: "retryRefundAt", settle: { symbol: "settleDuePaidNarrativeRetryRefunds", cron: REFUND_CRON } },
  "geomancy-oracle": { marker: "retryRefundAt", settle: { symbol: "settleDuePaidNarrativeRetryRefunds", cron: REFUND_CRON } },
  "animal-totem": { marker: "retryRefundAt", settle: { symbol: "settleDuePaidNarrativeRetryRefunds", cron: REFUND_CRON } },
  "guardian-fortune": { marker: "retryRefundAt", settle: { symbol: "settleDuePaidNarrativeRetryRefunds", cron: REFUND_CRON } },
});
// 크론 파일이 실제로 스케줄러에서 도는지: 파일 → [호출하는 파일, 그 파일이 참조해야 하는 진입 기호].
export const RETRY_CRON_CHAIN = Object.freeze({
  [REFUND_CRON]: [RECOVERY_CRON, "runPendingConsultationRefunds"],
  [RECOVERY_CRON]: ["worker/index.js", "runConsultationRecovery"],
  [CODEX_RECOVERY_CRON]: ["worker/index.js", "runMasterLoveCodexRecovery"],
});
const STUCK_LIB = "worker/lib/paid-delivery-stuck.js";
// 아직 즉시 환불(다시 시도 우선 전) 서비스 — 정확히 일치해야 한다. R10 에서 서비스별로 RETRY_FIRST_POLICY 로 옮긴다.
export const KNOWN_RETRY_PENDING = Object.freeze([
  "nakshatra-ai", "human-design-report", "destiny-compass-ai",
  "relationship-boundary-test", "celestial-harmony", "fortune", "feature-question", "ziwei-deep-report",
  "yeongnyangi", "fortune-chat-question", "toss-native", "palm",
]);
const RETRY_ROUTE_RE = /path\s*===\s*["'](?:\/api\/[a-z0-9-]+)?\/retry["']/;
const REFUND_REQUEST_ROUTE_RE = /path\s*===\s*["'](?:\/api\/[a-z0-9-]+)?\/refund-request["']/;
const importsFrom = (symbol, lib) => new RegExp(`import\\s*\\{[^}]*\\b${escapeRe(symbol)}\\b[^}]*\\}\\s*from\\s*["'][^"']*${escapeRe(path.posix.basename(lib, ".js"))}(?:\\.js)?["']`);
const exportsFn = symbol => new RegExp(`export\\s+(?:async\\s+)?function\\s+${escapeRe(symbol)}\\b|export\\s+const\\s+${escapeRe(symbol)}\\b`);
const countWord = (symbol, text) => (text.match(new RegExp(`\\b${escapeRe(symbol)}\\b`, "g")) || []).length;

export function checkRetryFirst({ contract, src, genericStuckSettlers, signatureFeatureKeys, policy = RETRY_FIRST_POLICY, pending = KNOWN_RETRY_PENDING, cronChain = RETRY_CRON_CHAIN }) {
  const errors = [];
  if (!Array.isArray(signatureFeatureKeys) || !signatureFeatureKeys.length) errors.push("대표 상담(saju-signature) 판매 키를 읽지 못했다 — lib/saju/saju-service-catalog.mjs");
  const byId = new Map((contract || []).map(e => [e?.service, e]));
  // 분류: 계약 서비스는 다시 시도 우선 또는 알려진 대기 목록 중 하나에 정확히 있어야 한다(미분류·이중 분류는 실패).
  for (const id of byId.keys()) {
    const first = Object.hasOwn(policy, id), wait = pending.includes(id);
    if (!first && !wait) errors.push(`${id}: 다시 시도 정책 미분류 — RETRY_FIRST_POLICY 에 근거를 붙이거나 KNOWN_RETRY_PENDING 에 올린다`);
    if (first && wait) errors.push(`${id}: RETRY_FIRST_POLICY 와 KNOWN_RETRY_PENDING 에 동시에 있다 — 다시 시도 우선으로 옮겼다면 대기 목록에서 지운다`);
  }
  for (const id of pending) if (!byId.has(id)) errors.push(`KNOWN_RETRY_PENDING 의 '${id}' 가 전달 계약에 없다(낡은 항목)`);
  // 대표 상담은 전부 다시 시도 우선이어야 한다.
  for (const key of signatureFeatureKeys || []) {
    const owner = (contract || []).find(e => e?.featureKeys?.some(p => keyMatches(p, key)));
    if (!owner) errors.push(`대표 상담 판매 키 '${key}' 가 전달 계약에 없다`);
    else if (!Object.hasOwn(policy, owner.service)) errors.push(`대표 상담 '${owner.service}'(${key}) 가 다시 시도 우선(RETRY_FIRST_POLICY) 이 아니다`);
  }
  for (const [id, rule] of Object.entries(policy)) {
    const entry = byId.get(id);
    if (!entry) { errors.push(`RETRY_FIRST_POLICY 의 '${id}' 가 전달 계약에 없다`); continue; }
    const files = entry.files || [];
    const body = files.map(f => src[f] || "").join("\n");
    // (1) 실패 표지: 생성 + 7일을 공용 계산으로 만든다(import + 실제 사용).
    if (!rule.marker || !files.some(f => importsFrom(rule.marker, STUCK_LIB).test(src[f] || "")) || countWord(rule.marker, body) < 2) {
      errors.push(`${id}: 실패 시 다시 시도 표지 근거가 없다 — ${STUCK_LIB} 의 '${rule.marker}' 를 import 해 써야 한다(생성 + 7일)`);
    }
    // (2)(3) 다시 시도·환불 요청 라우트.
    if (!RETRY_ROUTE_RE.test(body)) errors.push(`${id}: POST /retry 라우트가 없다 — 실패 건을 무료로 다시 시도할 길이 없다`);
    if (!REFUND_REQUEST_ROUTE_RE.test(body)) errors.push(`${id}: POST /refund-request 라우트가 없다 — 다시 시도 대신 환불을 고를 길이 없다`);
    // (4) 7일 정산이 크론에 배선.
    const settle = rule.settle || {};
    const definer = settle.generic ? STUCK_LIB : null;
    if (!settle.symbol || !settle.cron) { errors.push(`${id}: 7일 정산 기호·크론 파일이 비었다`); continue; }
    if (definer ? !exportsFn(settle.symbol).test(src[definer] || "") : !files.some(f => exportsFn(settle.symbol).test(src[f] || ""))) {
      errors.push(`${id}: 7일 정산 '${settle.symbol}' 을 ${definer || "계약 파일"} 이 export 하지 않는다`);
    }
    if (!wordRe(settle.symbol).test(src[settle.cron] || "")) errors.push(`${id}: 7일 정산 '${settle.symbol}' 이 크론 ${settle.cron} 에 배선되지 않았다 — 창이 지나도 환불되지 않는다`);
    if (settle.generic) {
      if (!Array.isArray(genericStuckSettlers) || !genericStuckSettlers.includes(id)) errors.push(`${id}: 공용 정산(generic)인데 GENERIC_STUCK_SETTLERS 에 없다 — 복구 크론이 창 경과 건을 환불로 넘기지 않는다`);
      if (!new RegExp(`["']${escapeRe(id)}["']\\s*:`).test(src[REFUND_CRON] || "")) errors.push(`${id}: 공용 정산(generic)인데 ${REFUND_CRON} SERVICES 에 없다 — refundEligibleAt 건을 환불하지 않는다`);
    }
    for (let file = settle.cron, hops = 0; cronChain[file] && hops < 4; hops += 1) {
      const [caller, entrySymbol] = cronChain[file];
      if (!wordRe(entrySymbol).test(src[caller] || "")) { errors.push(`${id}: 크론 ${file} 의 진입 '${entrySymbol}' 을 ${caller} 가 부르지 않는다`); break; }
      file = caller;
    }
    if (!cronChain[settle.cron]) errors.push(`${id}: 크론 파일 ${settle.cron} 이 RETRY_CRON_CHAIN 에 없다 — 스케줄러 배선을 확인할 수 없다`);
  }
  return errors;
}

// 다시 시도 우선 근거를 하나씩 지운 소스로 다시 판정해 매번 실패해야 한다(무는 가드).
export function retryFirstMutationCheck(input, policy = RETRY_FIRST_POLICY) {
  const survivors = [];
  const strip = (srcMap, files, re) => {
    const out = { ...srcMap };
    for (const f of files) if (out[f] !== undefined) out[f] = out[f].replace(new RegExp(re.source, "g"), "__r8_mutated__");
    return out;
  };
  for (const [id, rule] of Object.entries(policy)) {
    const files = input.contract.find(e => e?.service === id)?.files || [];
    const mutants = {
      marker: strip(input.src, files, wordRe(rule.marker)),
      retry: strip(input.src, files, RETRY_ROUTE_RE),
      "refund-request": strip(input.src, files, REFUND_REQUEST_ROUTE_RE),
      settle: strip(input.src, [rule.settle.cron], wordRe(rule.settle.symbol)),
    };
    for (const [kind, src] of Object.entries(mutants)) {
      if (!checkRetryFirst({ ...input, src }).some(e => e.startsWith(`${id}:`))) survivors.push(`${id}/${kind}`);
    }
  }
  return survivors;
}

export const CONTRACT_TEST_FILE = "__tests__/worker/paid-llm-delivery-contract.test.js";
const TEST_FILE_RE = /^__tests__\/(worker|ui)\/.+\.test\.m?js$/;

const PAY_RE = /\b(applyUsageOnce|consumePassForFeature|hasConsumedPassFeature|verifyPerUsePayment|startServiceExecution|claimRequestBillingEvidence|claimBillingEvidence|findVerifiedDeferredBillingEvidence|findDeferredBillingEvidenceWithSettleWindow|requirePremiumReportAccess|runPaidNarrativeDelivery|settlePerUseAccessDecision|loadPerUsePaidAccess|proveChatAccess|grantVerifiedOrder)\b/;
const LLM_RE = /\b(callGemini[A-Za-z]*|callCloudflareWorkersAI|callRealGeminiText|callMindscanGemini|generateWithGemini|generate(?:Guardian|Fusion)FortuneWith[A-Za-z]*LLM)\b|env\.AI\.run|generativelanguage\.googleapis/;
// LLM 클라이언트 자체·로캘·프롬프트 저장소는 "LLM 을 부르는 서비스"가 아니다.
const LLM_PROVIDER_FILE = /(^|\/)(gemini(-client)?|llm-client|llm-text|ai-locale-context|cms-prompts|structured-consultation)\.(m?js|ts)$|staging/;

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = word => new RegExp(`\\b${escapeRe(word)}\\b`);

function listSources(root) {
  const out = execFileSync("git", ["ls-files", "worker", "lib"], { cwd: root, encoding: "utf8" });
  return out.split(/\r?\n/).filter(f => /\.(m?js|ts)$/.test(f) && !/(__tests__|\.test\.|\.d\.ts$)/.test(f));
}

export function loadSources(root = ROOT) {
  const files = listSources(root);
  return Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(root, f), "utf8")]));
}

function importsOf(file, src) {
  const out = [];
  for (const m of src[file].matchAll(/(?:from|import\()\s*['"](\.[^'"]+)['"]/g)) {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1]));
    for (const c of [base, `${base}.js`, `${base}.ts`, `${base}.mjs`]) if (src[c] !== undefined) { out.push(c); break; }
  }
  return out;
}

// 결제 원시함수와 LLM 호출(직접 또는 import 2단계 안)을 함께 가진 worker 파일.
export function discoverPaidLlmFiles(src) {
  const direct = new Set(Object.keys(src).filter(f => LLM_RE.test(src[f]) && !LLM_PROVIDER_FILE.test(f)));
  const reachesLlm = file => {
    if (direct.has(file)) return true;
    const seen = new Set([file]);
    let frontier = [file];
    for (let depth = 0; depth < 2; depth += 1) {
      const next = [];
      for (const f of frontier) for (const i of importsOf(f, src)) {
        if (seen.has(i)) continue;
        seen.add(i);
        if (direct.has(i)) return true;
        next.push(i);
      }
      frontier = next;
    }
    return false;
  };
  return Object.keys(src).filter(f => f.startsWith("worker/") && PAY_RE.test(src[f]) && reachesLlm(f)).sort();
}

const keyMatches = (pattern, key) => pattern.endsWith("*") ? key.startsWith(pattern.slice(0, -1)) : pattern === key;

const OWN_STUCK_SETTLER_RE = /export\s+(?:async\s+)?function\s+settleStuckDelivery\b|export\s+const\s+settleStuckDelivery\b/;

export function checkContract({ contract, adapters, llmFeatureKeys, src, discovered, tests, testFiles, stuckSettlers, genericStuckSettlers, knownGaps = KNOWN_REFUND_GAPS, knownStuckGaps = KNOWN_STUCK_SETTLE_GAPS, exempt = EXEMPT_FILES, shared = SHARED_REFUND_PATHS }) {
  const errors = [];
  // 필수 입력이 비면 통과가 아니라 실패(fail-closed).
  if (!tests || typeof tests !== "object") errors.push("PAID_LLM_DELIVERY_TESTS 를 읽지 못했다 — 레지스트리에 서비스→전달 테스트 표가 있어야 한다");
  if (!testFiles || typeof testFiles !== "object") errors.push("테스트 파일 목록을 읽지 못했다");
  if (!Array.isArray(stuckSettlers) || !stuckSettlers.length) errors.push("STUCK_SETTLERS 를 읽지 못했다 — worker/lib/paid-delivery-stuck.js");
  const contractTest = testFiles?.[CONTRACT_TEST_FILE];
  if (contractTest === undefined) errors.push(`계약 테스트가 없다: ${CONTRACT_TEST_FILE}`);
  else if (!/consultation-recovery-registry/.test(contractTest)) errors.push(`계약 테스트가 레지스트리(consultation-recovery-registry)를 import 하지 않는다: ${CONTRACT_TEST_FILE}`);
  const services = new Set();
  const covered = new Set();
  for (const entry of contract) {
    const id = entry?.service;
    if (!id || services.has(id)) { errors.push(`계약 항목 service 가 비었거나 중복: ${id}`); continue; }
    services.add(id);
    if (!entry.files?.length || !entry.featureKeys?.length || !Array.isArray(entry.refunds)) {
      errors.push(`${id}: files·featureKeys·refunds 가 모두 있어야 한다`);
      continue;
    }
    for (const f of entry.files) {
      if (src[f] === undefined) errors.push(`${id}: 계약 파일이 없다 — ${f}`);
      else covered.add(f);
    }
    const body = entry.files.map(f => src[f] || "").join("\n");
    for (const symbol of entry.refunds) {
      if (!shared[symbol]) errors.push(`${id}: '${symbol}' 은 공용 환불 경로(SHARED_REFUND_PATHS)가 아니다`);
      else if (!wordRe(symbol).test(src[shared[symbol]] || "")) errors.push(`${id}: 공용 경로 '${symbol}' 이 정의 파일 ${shared[symbol]} 에 없다`);
      if (!wordRe(symbol).test(body)) errors.push(`${id}: 환불 경로 '${symbol}' 을 계약 파일들이 참조하지 않는다`);
    }
    if (!entry.refunds.length && !entry.gap) errors.push(`${id}: 공용 환불 경로가 없다 — refunds 를 채우거나(권장) gap 사유를 적는다`);
  }
  const gaps = contract.filter(e => e?.gap).map(e => e.service).sort();
  const expectedGaps = [...knownGaps].sort();
  for (const g of gaps) if (!expectedGaps.includes(g)) errors.push(`${g}: 새 자동 환불 구멍(gap) — KNOWN_REFUND_GAPS 밖이다. 환불 경로를 붙여라`);
  for (const g of expectedGaps) if (!gaps.includes(g)) errors.push(`${g}: KNOWN_REFUND_GAPS 에 있지만 계약 gap 이 없다 — 메웠다면 목록에서 지운다`);
  for (const [route] of adapters) if (!services.has(route)) errors.push(`복구 어댑터 '${route}' 가 전달 계약에 없다`);
  if (tests && typeof tests === "object") {
    for (const id of services) {
      const file = tests[id];
      if (!file) errors.push(`${id}: PAID_LLM_DELIVERY_TESTS 에 전달 테스트가 없다`);
      else if (!TEST_FILE_RE.test(file)) errors.push(`${id}: 전달 테스트 경로가 __tests__/(worker|ui)/*.test.(m)js 가 아니다 — ${file}`);
      else if (testFiles?.[file] === undefined) errors.push(`${id}: 전달 테스트 파일이 없다 — ${file}`);
    }
    for (const id of Object.keys(tests)) if (!services.has(id)) errors.push(`PAID_LLM_DELIVERY_TESTS 의 '${id}' 가 전달 계약에 없다(낡은 항목)`);
  }
  if (Array.isArray(stuckSettlers) && stuckSettlers.length) {
    const adapterIds = adapters.map(([route]) => route);
    for (const s of stuckSettlers) if (!adapterIds.includes(s)) errors.push(`STUCK_SETTLERS '${s}' 가 복구 어댑터가 아니다`);
    if (!Array.isArray(genericStuckSettlers)) errors.push("GENERIC_STUCK_SETTLERS 를 읽지 못했다 — worker/lib/paid-delivery-stuck.js");
    for (const s of stuckSettlers) {
      if (Array.isArray(genericStuckSettlers) && genericStuckSettlers.includes(s)) {
        if (!contract.find(e => e?.service === s)?.refunds?.includes("settleFailedConsultationRefund")) errors.push(`${s}: 공용 정체 설정자인데 settleFailedConsultationRefund 를 계약 환불 경로로 갖지 않는다`);
        continue;
      }
      const files = contract.find(e => e?.service === s)?.files || [];
      if (!files.some(f => OWN_STUCK_SETTLER_RE.test(src[f] || ""))) errors.push(`${s}: STUCK_SETTLERS 인데 계약 파일이 settleStuckDelivery 를 export 하지 않는다 — 정체를 자기 실패·환불 경로로 확정할 설정자가 없다`);
    }
    const stuckGaps = adapterIds.filter(r => !stuckSettlers.includes(r)).sort();
    const expected = [...knownStuckGaps].sort();
    for (const g of stuckGaps) if (!expected.includes(g)) errors.push(`${g}: 정체 자동 확정이 없는 새 복구 어댑터 — STUCK_SETTLERS 에 설정자를 붙이거나 KNOWN_STUCK_SETTLE_GAPS 에 사유와 함께 올린다`);
    for (const g of expected) if (!stuckGaps.includes(g)) errors.push(`${g}: KNOWN_STUCK_SETTLE_GAPS 에 있지만 정체 확정 구멍이 아니다 — 메웠다면 목록에서 지운다`);
  }
  for (const key of llmFeatureKeys) {
    if (!contract.some(e => e?.featureKeys?.some(p => keyMatches(p, key)))) errors.push(`LLM 판매 키 '${key}' 가 전달 계약에 없다`);
  }
  for (const f of discovered) {
    if (!covered.has(f) && !exempt[f]) errors.push(`미분류 유료 LLM 파일: ${f} — 결제 원시함수와 LLM 호출을 함께 쓴다. PAID_LLM_DELIVERY_CONTRACT 에 등록하라`);
  }
  for (const f of Object.keys(exempt)) if (!discovered.includes(f)) errors.push(`EXEMPT 파일이 더 이상 결제+LLM 으로 탐지되지 않는다(낡은 예외): ${f}`);
  return errors;
}

// 계약 항목을 하나씩 빼도 통과하면 그 항목은 아무것도 지키지 않는다.
export function mutationCheck(input) {
  const survivors = [];
  input.contract.forEach((entry, index) => {
    const contract = input.contract.filter((_, i) => i !== index);
    // 테스트 표 행도 같이 빼야 "표에 남은 낡은 행" 오류가 아니라 판매 키·파일 근거로 잡히는지 본다.
    const tests = input.tests && Object.fromEntries(Object.entries(input.tests).filter(([id]) => id !== entry.service));
    if (checkContract({ ...input, contract, tests }).length === 0) survivors.push(entry.service);
  });
  return survivors;
}

export async function loadInputs(root = ROOT) {
  const registry = await import(pathToFileURL(path.join(root, "worker/lib/consultation-recovery-registry.js")).href);
  const { buildPaidDeliveryInventory, LLM_DELIVERY_KINDS } = await import(pathToFileURL(path.join(root, "scripts/lib/paid-delivery-inventory.mjs")).href);
  const inventory = buildPaidDeliveryInventory();
  const rows = inventory.rows || inventory.products || inventory;
  const llmFeatureKeys = rows.filter(r => LLM_DELIVERY_KINDS.includes(r.deliveryKind)).map(r => r.featureKey);
  const src = loadSources(root);
  const { STUCK_SETTLERS, GENERIC_STUCK_SETTLERS } = await import(pathToFileURL(path.join(root, "worker/lib/paid-delivery-stuck.js")).href);
  // 테스트 파일은 작업 트리 실재로 판정한다(미추적 새 테스트도 존재로 본다; 지우면 실패).
  const tests = registry.PAID_LLM_DELIVERY_TESTS;
  const wanted = new Set([CONTRACT_TEST_FILE, ...Object.values(tests || {})]);
  const testFiles = {};
  for (const f of wanted) {
    const abs = path.join(root, f);
    if (typeof f === "string" && fs.existsSync(abs)) testFiles[f] = fs.readFileSync(abs, "utf8");
  }
  // 대표 상담 = 사주 카탈로그 saju-signature 그룹(다시 시도 우선 정책 대상, R8).
  const { SAJU_SERVICE_GROUPS } = await import(pathToFileURL(path.join(root, "lib/saju/saju-service-catalog.mjs")).href);
  const signatureFeatureKeys = (SAJU_SERVICE_GROUPS || []).find(g => g.id === "saju-signature")?.items?.map(i => i.featureKey).filter(Boolean) || [];
  return { contract: registry.PAID_LLM_DELIVERY_CONTRACT, adapters: registry.CONSULTATION_RECOVERY_ADAPTERS, llmFeatureKeys, src, discovered: discoverPaidLlmFiles(src), tests, testFiles, stuckSettlers: STUCK_SETTLERS, genericStuckSettlers: GENERIC_STUCK_SETTLERS, signatureFeatureKeys };
}

async function main() {
  const input = await loadInputs();
  if (!input.llmFeatureKeys.length) throw new Error("카탈로그 LLM 판매 키를 하나도 못 읽었다 — 인벤토리 형식이 바뀌었는지 확인");
  if (!input.discovered.length) throw new Error("결제+LLM 파일을 하나도 못 찾았다 — 탐지 정규식이 낡았다");
  const errors = checkContract(input);
  const survivors = mutationCheck(input);
  for (const s of survivors) errors.push(`변이 검사: 계약 항목 '${s}' 을 빼도 검증이 통과한다 — 그 항목을 지키는 근거(판매 키·파일)가 없다`);
  errors.push(...checkRetryFirst(input));
  for (const s of retryFirstMutationCheck(input)) errors.push(`변이 검사(다시 시도 우선): '${s}' 근거를 지워도 검증이 통과한다 — 그 검사는 아무것도 지키지 않는다`);
  if (errors.length) {
    console.error(`verify:paid-llm-delivery FAIL (${errors.length})`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const gaps = input.contract.filter(e => e.gap);
  console.log(`verify:paid-llm-delivery ok — 계약 ${input.contract.length}개, LLM 판매 키 ${input.llmFeatureKeys.length}개, 결제+LLM 파일 ${input.discovered.length}개, 전달 테스트 ${Object.keys(input.tests).length}개, 정체 자동 확정 ${input.stuckSettlers.length}개(경보만 ${KNOWN_STUCK_SETTLE_GAPS.length}개), 변이 ${input.contract.length}/${input.contract.length} 탐지`);
  const retryFirstCount = Object.keys(RETRY_FIRST_POLICY).length;
  console.log(`  다시 시도 우선 ${retryFirstCount}개(대표 상담 ${input.signatureFeatureKeys.length}종 — 실패 표지·/retry·/refund-request·7일 정산 크론), 대기 ${KNOWN_RETRY_PENDING.length}개, 변이 ${retryFirstCount * 4}/${retryFirstCount * 4} 탐지`);
  if (gaps.length) console.log(`  알려진 자동 환불 구멍 ${gaps.length}개: ${gaps.map(e => e.service).join(", ")}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error?.stack || error); process.exit(1); });
}
