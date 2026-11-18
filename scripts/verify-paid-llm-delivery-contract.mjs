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
//   5. 자기 변이 검사: 계약 항목을 하나씩 뺀 판정이 매번 실패해야 한다(도는 가드가 아니라 무는 가드).
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

export function checkContract({ contract, adapters, llmFeatureKeys, src, discovered, knownGaps = KNOWN_REFUND_GAPS, exempt = EXEMPT_FILES, shared = SHARED_REFUND_PATHS }) {
  const errors = [];
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
    if (checkContract({ ...input, contract }).length === 0) survivors.push(entry.service);
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
  return { contract: registry.PAID_LLM_DELIVERY_CONTRACT, adapters: registry.CONSULTATION_RECOVERY_ADAPTERS, llmFeatureKeys, src, discovered: discoverPaidLlmFiles(src) };
}

async function main() {
  const input = await loadInputs();
  if (!input.llmFeatureKeys.length) throw new Error("카탈로그 LLM 판매 키를 하나도 못 읽었다 — 인벤토리 형식이 바뀌었는지 확인");
  if (!input.discovered.length) throw new Error("결제+LLM 파일을 하나도 못 찾았다 — 탐지 정규식이 낡았다");
  const errors = checkContract(input);
  const survivors = mutationCheck(input);
  for (const s of survivors) errors.push(`변이 검사: 계약 항목 '${s}' 을 빼도 검증이 통과한다 — 그 항목을 지키는 근거(판매 키·파일)가 없다`);
  if (errors.length) {
    console.error(`verify:paid-llm-delivery FAIL (${errors.length})`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const gaps = input.contract.filter(e => e.gap);
  console.log(`verify:paid-llm-delivery ok — 계약 ${input.contract.length}개, LLM 판매 키 ${input.llmFeatureKeys.length}개, 결제+LLM 파일 ${input.discovered.length}개, 변이 ${input.contract.length}/${input.contract.length} 탐지`);
  if (gaps.length) console.log(`  알려진 자동 환불 구멍 ${gaps.length}개: ${gaps.map(e => e.service).join(", ")}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error?.stack || error); process.exit(1); });
}
