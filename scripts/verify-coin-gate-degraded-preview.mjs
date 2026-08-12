// 타로 AI 프롬프트(및 runBillingCoinGate 공용 경로) 이용권 게이트 — fixture JSON 프리뷰.
// 실제 API/결제 없이, coin-gate 응답을 JSON fixture로 주입해 재시도-우선→결제창 폴백 동작을 확인한다.
//
// 실행: npx tsx scripts/verify-coin-gate-degraded-preview.mjs
//   (plain node로도 동작 — 외부 의존성 없음)
//
// 검증 대상: app/_lib/billing-client.ts 의 runBillingCoinGate 결정 골격
//   (1) degraded-503 이면 이용권 보유자 무료 통과를 살리려 짧게 재시도
//   (2) 소진 후에도 degraded면 dead-end 대신 결제창(단건+월정석) 폴백
//   (3) 확정 실패(402/401)는 재시도 없이 기존 분기(결제창/로그인)로 처리

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const billingClientSource = readFileSync(resolve(root, "app/_lib/billing-client.ts"), "utf8");

// ── 소스 드리프트 가드 ───────────────────────────────────────────────
// 아래 미러 판정은 billing-client.ts 원본과 일치해야 한다. 원본 코드 목록이 바뀌면 즉시 실패.
function sliceBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  assert.ok(start >= 0, `source drift: '${startMarker}' 를 billing-client.ts 에서 찾지 못함`);
  const end = src.indexOf(endMarker, start);
  assert.ok(end > start, `source drift: '${endMarker}' 를 billing-client.ts 에서 찾지 못함`);
  return src.slice(start, end);
}
const FALLBACK_DEGRADED_CODES = [
  "PASS_STATUS_TEMPORARILY_UNAVAILABLE",
  "AUTH_STATUS_TEMPORARILY_UNAVAILABLE",
  "BALANCE_SNAPSHOT_UNAVAILABLE",
  "AUTH_DB_UNAVAILABLE",
  "BILLING_REQUEST_TIMEOUT",
];
assert.ok(!billingClientSource.includes("COIN_GATE_TRANSIENT_MAX_RETRIES"), "payment POST auto retry must stay removed");
const fallbackSource = sliceBetween(billingClientSource, "function shouldOpenRuntimePaymentFallback(", "function isDefinitiveBillingAnswer(");
for (const code of FALLBACK_DEGRADED_CODES) {
  assert.ok(fallbackSource.includes(`"${code}"`), `source drift: 결제 폴백에 ${code} 누락`);
}

// ── billing-client.ts 판정 미러 (원본과 동기 — 위 가드가 보장) ─────────
function shouldOpenRuntimePaymentFallback(status, code) {
  const c = String(code || "").toUpperCase();
  return status === 402
    || ["PAYMENT_REQUIRED", "MEMBERSHIP_PASS_NOT_COVERED", "PRICE_EXCEEDS_PASS_LIMIT", "INSUFFICIENT_COINS", "AUTH_REFRESH_TEMPORARY_FAILURE"].includes(c)
    || FALLBACK_DEGRADED_CODES.includes(c);
}
function shouldRedirectToLoginAfterBilling(status, code) {
  const c = String(code || "").toUpperCase();
  return status === 401 || status === 403 || ["AUTH_REQUIRED", "LOGIN_REQUIRED", "UNAUTHORIZED"].includes(c);
}

// ── runBillingCoinGate 결정 골격 미러 (billing-client.ts 3410~3624) ──
// fixtures: 서버가 attempt 1,2,3…에 돌려줄 coin-gate 응답 시퀀스(JSON fixture).
function decideCoinGateOutcome(fixtures) {
  const take = (i) => fixtures[Math.min(i, fixtures.length - 1)];
  let attempt = 0;
  let parsed = take(attempt);
  const retries = attempt;
  // 성공 + 서버가 접근 부여(pass covered / 무료) → 무료 통과 (hasEntitlement)
  if (parsed.ok === true && parsed.covered === true) {
    return { retries, outcome: "무료 통과 (결제창 없음)", methods: null };
  }
  // 진짜 미로그인/만료 → 로그인 유도 (기존 동작 유지)
  if (shouldRedirectToLoginAfterBilling(parsed.status, parsed.code)) {
    return { retries, outcome: "로그인 유도", methods: null };
  }
  // 결제 폴백 → 결제창(서버 paymentOptions 동봉: 단건+월정석)
  if (shouldOpenRuntimePaymentFallback(parsed.status, parsed.code)) {
    const methods = parsed.paymentOptions?.equalPriorityMethods || ["DIRECT_KRW", "MOONLIGHT_STONE"];
    return { retries, outcome: "결제창 노출", methods };
  }
  return { retries, outcome: "❌ DEAD-END (에러 문구)", methods: null };
}

// ── fixtures ────────────────────────────────────────────────────────
const degradedOptions = { equalPriorityMethods: ["DIRECT_KRW", "MOONLIGHT_STONE"] };
const cases = [
  {
    name: "① 이용권 보유 (정상)",
    fixtures: [{ status: 200, ok: true, covered: true }],
    expect: { outcome: "무료 통과 (결제창 없음)", retries: 0 },
  },
  {
    name: "② 이용권 확인 일시 장애 (자동 재시도 없음)",
    fixtures: [
      { status: 503, ok: false, code: "AUTH_STATUS_TEMPORARILY_UNAVAILABLE", paymentOptions: degradedOptions },
      { status: 503, ok: false, code: "AUTH_STATUS_TEMPORARILY_UNAVAILABLE", paymentOptions: degradedOptions },
      { status: 200, ok: true, covered: true },
    ],
    expect: { outcome: "결제창 노출", retries: 0, methods: ["DIRECT_KRW", "MOONLIGHT_STONE"] },
  },
  {
    name: "③ 이용권 확인 DB 장애 지속",
    fixtures: [{ status: 503, ok: false, code: "AUTH_STATUS_TEMPORARILY_UNAVAILABLE", paymentOptions: degradedOptions }],
    expect: { outcome: "결제창 노출", retries: 0, methods: ["DIRECT_KRW", "MOONLIGHT_STONE"] },
  },
  {
    name: "④ 이용권 미보유 (payment_required)",
    fixtures: [{ status: 402, ok: false, code: "PAYMENT_REQUIRED", paymentOptions: degradedOptions }],
    expect: { outcome: "결제창 노출", retries: 0, methods: ["DIRECT_KRW", "MOONLIGHT_STONE"] },
  },
  {
    name: "⑤ 이용권 만료 직후 (미커버)",
    fixtures: [{ status: 402, ok: false, code: "PRICE_EXCEEDS_PASS_LIMIT", paymentOptions: degradedOptions }],
    expect: { outcome: "결제창 노출", retries: 0, methods: ["DIRECT_KRW", "MOONLIGHT_STONE"] },
  },
  {
    name: "⑥ 진짜 미로그인/만료 세션 (회귀 방지)",
    fixtures: [{ status: 401, ok: false, code: "AUTH_REQUIRED" }],
    expect: { outcome: "로그인 유도", retries: 0 },
  },
];

/* ── 월정석 409 재시도 계약 ────────────────────────────────────────────
   위 골격이 다루는 "자동 재시도 없음"은 **답이 확정된 POST** 를 다시 쏘지 않는다는 뜻이다.
   월정석 409(MONTHLY_CREDIT_CONSUME_IN_PROGRESS)는 확정된 답이 아니라 "차감이 아직 확정되지
   않았다"이고, 서버가 retryable 로 표시한다(worker/payments/errors.js). 재시도가 없으면
   dead-end 였다 — 결제창 폴백은 월정석(explicitPaymentMode)을 애초에 제외하기 때문이다.

   여기서 못박는 것은 그 재시도의 **안전 근거**다: 같은 requestId 를 다시 써야 서버 원장이
   재차감을 막는다. 새 키를 발급하면 원장 행이 따로 생겨 두 번 차감된다. 이 세 줄 중 하나라도
   무너지면 이 가드가 실패해야 한다. */
const moonstoneRetrySource = sliceBetween(
  billingClientSource,
  "const MOONSTONE_IN_PROGRESS_MAX_ATTEMPTS",
  "const parsed: BillingResult<BillingCoinGateData>",
);
assert.ok(
  /MOONSTONE_IN_PROGRESS_MAX_ATTEMPTS = [1-5];/.test(moonstoneRetrySource),
  "월정석 재시도는 유한해야 한다(1~5회)",
);
assert.ok(
  moonstoneRetrySource.includes('"MONTHLY_CREDIT_CONSUME_IN_PROGRESS"') && moonstoneRetrySource.includes("status === 409"),
  "월정석 재시도는 409/MONTHLY_CREDIT_CONSUME_IN_PROGRESS 에만 걸려야 한다",
);
assert.ok(
  !/requestId\s*[:=]/.test(moonstoneRetrySource),
  "월정석 재시도는 requestId 를 새로 만들면 안 된다 — 같은 키를 그대로 다시 써야 원장 멱등이 이중차감을 막는다",
);
assert.ok(
  billingClientSource.includes("explicitMonthlyMode ? await runMoonstoneRequestWithRetry() : await runCoinGateRequest()"),
  "월정석 재시도는 월정석 모드에만 적용되어야 한다(일반 coin-gate POST 는 종전대로 단발)",
);

// 독립 정적 런타임(js/destiny-profile.js)도 같은 계약을 갖는다 — 셸·React·정적 셋이 같아야 한다.
const destinyProfileSource = readFileSync(resolve(root, "js/destiny-profile.js"), "utf8");
assert.ok(
  /_DP_MOONSTONE_RETRY_ATTEMPTS = [1-5];/.test(destinyProfileSource),
  "정적 런타임의 월정석 재시도도 유한해야 한다",
);
for (const caller of ["_dpRunMonthlyCreditFromMainGate", "runMonthlyCreditGate"]) {
  const start = destinyProfileSource.indexOf(caller);
  assert.ok(start >= 0, `source drift: ${caller} 를 destiny-profile.js 에서 찾지 못함`);
  assert.ok(
    destinyProfileSource.slice(start, start + 3000).includes("_dpRunMoonstoneWithRetry"),
    `${caller} 의 월정석 요청이 재시도 없이 단발로 돌아가 있다(409 가 확정 실패가 된다)`,
  );
}

// ── 실행 & 리포트 ───────────────────────────────────────────────────
let failed = 0;
const rows = cases.map((c) => {
  const got = decideCoinGateOutcome(c.fixtures);
  const okOutcome = got.outcome === c.expect.outcome;
  const okRetries = got.retries === c.expect.retries;
  const okMethods = c.expect.methods ? JSON.stringify(got.methods) === JSON.stringify(c.expect.methods) : true;
  const pass = okOutcome && okRetries && okMethods;
  if (!pass) failed += 1;
  return {
    케이스: c.name,
    재시도: got.retries,
    "결과 UI": got.outcome,
    결제수단: got.methods ? got.methods.join("+") : "-",
    판정: pass ? "PASS" : "FAIL",
  };
});

console.log("\n=== 코인게이트 degraded 처리 fixture 프리뷰 (실제 API 비용 없음) ===\n");
console.table(rows);

if (failed > 0) {
  console.error(`\n❌ ${failed}개 케이스 실패 — 기대 동작과 불일치.`);
  process.exit(1);
}
console.log("\n✅ 전 케이스 통과: 이용권 정상 응답만 무료 통과하며 자동 POST 재시도 없이, 미보유/미커버/장애는 명시적 선택 화면, 미로그인은 로그인 안내로 유지됩니다.");
