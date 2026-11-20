#!/usr/bin/env node
// 사주 고급 궁합(saju-compat-premium) 프런트 결제·전달 계약 정적 검사.
// 🔴 월정석은 생성이 성공해 전달된 뒤에만 차감한다 — 게이트 입력에 deferUsage + apply_after_success 가 빠지면 실패한다.
// 신년운세(verify-new-year-ai-flow.mjs)와 같은 계약이다.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const LIB = "app/saju/compatibility/premium/_lib/premium-delivery.ts";
const INPUT = "app/saju/compatibility/premium/SajuCompatPremiumClient.tsx";
const RESULT = "app/saju/compatibility/premium/result/SajuCompatPremiumResultClient.tsx";
const INPUT_PAGE = "app/saju/compatibility/premium/page.tsx";
const RESULT_LAYOUT = "app/saju/compatibility/premium/result/layout.tsx";

let failed = 0;
function read(relPath) {
  const file = path.join(root, relPath);
  if (!fs.existsSync(file)) {
    console.error(`[verify-saju-compat-premium-flow] FAIL: missing ${relPath}`);
    failed += 1;
    return "";
  }
  return fs.readFileSync(file, "utf8");
}
function assert(condition, message) {
  if (!condition) {
    console.error(`[verify-saju-compat-premium-flow] FAIL: ${message}`);
    failed += 1;
  }
}

const lib = read(LIB);
const input = read(INPUT);
const result = read(RESULT);

assert(input.includes("deferUsage: true"), "billing gate input must defer usage until generation succeeds");
assert(input.includes('usagePolicy: "apply_after_success"'), "billing gate input must apply monthly moonstone usage only after success");
assert(lib.includes('FEATURE_KEY = "saju-compat-premium"'), "feature key must stay saju-compat-premium");
assert(lib.includes("resumeSessionId"), "generation loop must resume the same session group by group");
assert(lib.includes("/retry") && lib.includes("/refund-request"), "free retry and refund request endpoints must be wired");

assert(input.includes("/prepare"), "input screen must call prepare before the gate");
assert(input.includes("runBillingCoinGate"), "input screen must open the billing gate on PAYMENT_REQUIRED");
assert(input.includes("buildBillingGateInput("), "input screen must build the gate input through the deferred-usage helper");
assert(input.includes("usePaidResume(FEATURE_KEY"), "payment return must resume through usePaidResume");
assert(input.includes("usePaidDeliveryScope"), "input screen must scope paid delivery to the current account");
assert(!/runBillingCoinGate\([^)]*\)\s*;?\s*\n[^\n]*runBillingCoinGate/.test(input), "the gate must not be opened twice in a row");

assert(result.includes("GenerationProgress"), "result screen must show generation progress");
assert(result.includes("RETRY_LABEL") && result.includes("REFUND_LABEL"), "result screen must offer free retry and refund request");
assert(result.includes("usePaidDeliveryScope"), "result screen must scope paid delivery to the current account");
assert(!result.includes("runBillingCoinGate"), "result screen must never charge again");

assert(read(INPUT_PAGE).includes("noindex: true"), "payment input page must stay noindex");
assert(read(RESULT_LAYOUT).includes("noindex: true"), "personal result page must stay noindex");

if (failed) {
  process.exitCode = 1;
} else {
  console.log("[verify-saju-compat-premium-flow] ok");
}
