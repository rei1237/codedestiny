#!/usr/bin/env node
// pending 주문 재조정 + 관리자 주문/환불 경로의 회귀 가드.
//
// 여기서 막는 사고:
//  1) wrangler.toml 의 크론 문자열과 index.js 의 분기 문자열이 어긋나면 → 재조정이 영영 안 돌거나,
//     반대로 일일 태스크(운세 발송·구독 정산)가 10분마다 돌아 중복 지급이 난다.
//  2) 재조정 태스크에 환불 호출이 들어오면 → 크론이 사람 승인 없이 돈을 돌려주게 된다(정책 위반).
//  3) 관리자 주문 API 가 인증 밖으로 새면 → 결제 정보 노출·무단 환불.
//  4) 환불 로직이 두 벌이 되면 → 한쪽만 고쳐지는 사고(이번 장애의 재발 패턴).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sliceFunction, stripComments } from "./lib/js-source-slice.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const wrangler = read("worker/wrangler.toml");
const workerIndex = read("worker/index.js");
const reconcileTask = read("worker/lib/payment-reconcile-task.js");
const adminOrders = read("worker/routes/admin-orders.js");
const adminRouter = read("worker/routes/admin.js");
const payments = read("worker/routes/payments.js");
const refundCore = read("worker/lib/payment-refund.js");

// ── 1. 크론 문자열 정합성 ────────────────────────────────────────────────
const cronsLine = wrangler.match(/^crons\s*=\s*(\[[^\]]*\])/m);
assert.ok(cronsLine, "wrangler.toml 에 crons 배열이 있어야 한다");
const crons = JSON.parse(cronsLine[1].replace(/'/g, '"'));
assert.ok(crons.includes("0 22 * * *"), "일일 크론(0 22 * * *)이 유지되어야 한다");

const declared = workerIndex.match(/const PAYMENT_RECONCILE_CRON\s*=\s*"([^"]+)"/);
assert.ok(declared, "index.js 에 PAYMENT_RECONCILE_CRON 상수가 있어야 한다");
assert.ok(
  crons.includes(declared[1]),
  `index.js 의 PAYMENT_RECONCILE_CRON("${declared[1]}")가 wrangler.toml crons(${JSON.stringify(crons)})에 없다 — 재조정이 영영 안 돈다`,
);
assert.equal(crons.length, 2, "크론은 일일 1개 + 재조정 1개, 총 2개여야 한다");

// ── 2. scheduled 가 event.cron 으로 분기하는가 ───────────────────────────
const scheduledBody = workerIndex.slice(workerIndex.indexOf("async scheduled("));
assert.ok(scheduledBody.includes("event?.cron"), "scheduled 는 event.cron 을 읽어야 한다");
assert.ok(
  scheduledBody.indexOf("PAYMENT_RECONCILE_CRON") < scheduledBody.indexOf("daily-fortune-task.js"),
  "재조정 분기가 일일 태스크 로드보다 먼저 와야 한다(아니면 10분마다 일일 태스크가 돈다)",
);
assert.ok(scheduledBody.includes("payment-reconcile-task.js"), "재조정 태스크를 로드해야 한다");
assert.ok(
  scheduledBody.includes("Promise.allSettled"),
  "일일 태스크는 allSettled 로 격리해야 한다(하나가 throw 해도 나머지가 죽지 않게)",
);

// 🔴 일일 태스크의 **로드**가 실패 포착 블록 안에 있어야 한다.
// 2026-08-20~08-31 의 12일 침묵을 알림으로 잡으려고 실패 수집을 붙였는데, 그 시점의 동적
// import 6개는 ctx.waitUntil 밖에 있었다 — 하나라도 던지면 scheduled 가 통째로 거절되고
// failures 배열은 만들어지지도 않아, "크론 이벤트가 아예 안 왔다"와 구분이 안 됐다.
// 즉 알림이 있는데도 정확히 그 증상만 못 보는 fail-open 이다. 로드가 수집기보다 뒤에 와야 한다.
{
  // 일일 분기 = 10분 분기의 return; 뒤부터.
  const dailyBranch = scheduledBody.slice(scheduledBody.indexOf("return;"));
  const tasksAt = dailyBranch.indexOf("const tasks = [");
  assert.ok(tasksAt > 0, "일일 분기에 tasks 배열이 있어야 한다");
  assert.ok(
    !dailyBranch.slice(0, tasksAt).includes("await import("),
    "일일 분기는 tasks 배열 앞에서 모듈을 미리 import 하면 안 된다"
      + " — 그 import 가 던지면 scheduled 가 통째로 거절되고 실패 수집기가 만들어지지도 않는다",
  );
  assert.ok(
    /\["daily-fortune", async \(\) =>/.test(dailyBranch),
    "일일 태스크는 실패 포착 안에서 지연 로드해야 한다(태스크마다 async () => await import(...))",
  );
}
assert.ok(
  scheduledBody.includes("notifyCronTaskFailures"),
  "일일 크론의 실패는 사람에게 도달해야 한다(notifyCronTaskFailures 배선)",
);
// V2 자가치유 배선(2026-08-12) — V2 confirm 의 GRANT_PENDING 계약은 크론이 마무리한다는 약속이라,
// 이 배선이 빠지면 약속만 있고 집행자가 없다(컷오버 직후 실제로 그랬다). 두 크론의 이중 처리
// 경계는 status:"paid"(V2 전용 기록값) — regrant 필터가 레거시 상태로 넓어지면 역사적 주문
// 전체가 재지급 스캔에 걸린다.
assert.ok(scheduledBody.includes("runPaymentsV2Reconcile"), "V2 재조정(runPaymentsV2Reconcile)이 10분 크론에 배선돼야 한다");
{
  const v2Reconcile = read("worker/payments/reconcile.js");
  const regrantBody = v2Reconcile.slice(
    v2Reconcile.indexOf("export async function regrantUnfulfilledOrders"),
    v2Reconcile.indexOf("export async function expireStalePendingOrders"),
  );
  assert.ok(regrantBody.includes('status: "paid"'), "V2 regrant 는 status:\"paid\" 정확 일치여야 한다(레거시 주문 이중 처리 금지)");
  assert.ok(!regrantBody.includes("PAID_RAW_STATUSES"), "V2 regrant 가 레거시 상태(success/fulfilled)로 넓어지면 안 된다");
}
// 웹훅 재생(2026-09-05) — 실패·정체된 Transaction.Paid 이벤트의 재생은 V2 replayWebhookEvents 가
// 10분 크론 안에서 맡는다. 구 runWebhookReconcileTask(일일 1회)는 이벤트를 레거시 단건 정산으로 보내
// 이용권 주문에 404 를 내고 lastError 를 덮어썼으므로 되살리면 안 된다.
{
  const v2Index = read("worker/payments/index.js");
  const replayAt = v2Index.indexOf("export async function replayWebhookEvents");
  const reconcileAt = v2Index.indexOf("export async function runPaymentsV2Reconcile");
  assert.ok(replayAt > 0 && reconcileAt > replayAt, "worker/payments/index.js 에 replayWebhookEvents 가 있어야 한다");
  const replayBody = v2Index.slice(replayAt, reconcileAt);
  assert.ok(replayBody.includes("claimReplayableEvents(") && replayBody.includes("confirmOrder("), "웹훅 재생은 claimReplayableEvents → confirmOrder 를 타야 한다(주체별 확정 분기 금지)");
  for (const banned of ["cancelPortOnePayment", "refundPaymentAsOperator", "autoRefund"]) {
    assert.ok(!replayBody.includes(banned), `웹훅 재생에 ${banned} 가 있으면 안 된다 — 크론이 사람 승인 없이 환불하게 된다`);
  }
  const reconcileBody = v2Index.slice(reconcileAt, v2Index.indexOf("export const __paymentsContextTestUtils"));
  assert.ok(reconcileBody.includes("replayWebhookEvents(env)"), "runPaymentsV2Reconcile 이 replayWebhookEvents 를 불러야 한다(10분 주기 재생)");
  assert.ok(!workerIndex.includes("runWebhookReconcileTask"), "구 runWebhookReconcileTask 를 크론에 되살리면 안 된다(이용권 주문 404·lastError 덮어쓰기)");
  assert.ok(!payments.includes("export async function runWebhookReconcileTask"), "routes/payments.js 의 구 runWebhookReconcileTask 는 삭제된 상태여야 한다");
}

// ── 3. 재조정 태스크는 절대 환불하지 않는다 ──────────────────────────────
for (const banned of ["cancelPortOnePayment", "refundPaymentAsOperator", "autoRefund"]) {
  assert.ok(
    !reconcileTask.includes(banned),
    `재조정 태스크에 ${banned} 가 있으면 안 된다 — 크론이 사람 승인 없이 환불하게 된다`,
  );
}
// 🔴 401 을 자격증명 신호로 쓰지 않는다. PortOne 은 '없는 결제 ID' 에도 401 을 주므로 구분이 불가능하고,
// 이걸 근거로 중단/차단하면 오탐이 곧 장애가 된다(재조정이 매 틱 멈추고 신규 결제까지 막힐 뻔했다).
assert.ok(
  !reconcileTask.includes("getPortOneAuthRejection"),
  "401 관측 기반 중단을 되살리면 안 된다(없는 ID 와 구분 불가 — 오탐이 곧 장애)",
);
assert.ok(
  !payments.includes("getPortOneAuthRejection"),
  "401 관측 기반 신규 주문 차단을 되살리면 안 된다(오탐 시 전 사용자 결제 차단)",
);
// 파괴적 조치(만료 처리)는 자격증명이 살아 있다는 양성 증거가 있을 때만 — 아니면 멀쩡한 주문을 덮어쓴다.
assert.ok(
  /if \(sawSuccessfulLookup\)/.test(reconcileTask),
  "만료 처리는 이번 실행에서 조회 성공이 확인됐을 때만 해야 한다",
);
assert.ok(reconcileTask.includes("credentialSuspect"), "조회가 전부 실패하면 자격증명 의심 신호를 남겨야 한다");
assert.ok(/limit\s*=\s*clampInt/.test(reconcileTask), "배치 상한(limit)이 있어야 한다");
assert.ok(/maxAttempts\s*=\s*clampInt/.test(reconcileTask), "시도 상한(maxAttempts)이 있어야 한다");
assert.ok(reconcileTask.includes("metadata.reconcile.lastAt"), "동시 실행 클레임(CAS)이 있어야 한다");
// 🔴 벽시계 상한. 후보 1건당 PortOne 조회(기본 8000ms)를 직렬로 돌므로 limit 만으로는
// 한 틱의 길이가 안 묶인다(limit=50 이면 최악 400초 — scheduled 예산 초과).
assert.ok(/timeBudgetMs\s*=\s*clampInt/.test(reconcileTask), "한 틱의 시간 예산(timeBudgetMs)이 있어야 한다");
assert.ok(
  reconcileTask.includes('summary.abortedReason = "time_budget"'),
  "예산 소진을 요약에 남겨야 한다 — 조용한 절단은 '다 처리했다'로 읽힌다",
);
{
  // 🔴 예산 확인은 클레임보다 앞이어야 한다. 클레임은 attempts 를 올리므로, 잡아 놓고 처리하지
  // 못하면 손대지도 않은 주문이 maxAttempts 에 먼저 닿아 재조정 대상에서 조용히 빠진다.
  //
  // 🔴 파일 끝까지 자른 구간에서 문자열을 indexOf 로 비교하면 안 된다 — 클레임 위에 주석 한 줄만
  // 남겨도 순서 단언이 통과한다. 루프 본문을 중괄호 균형으로 자르고 주석을 걷어낸 뒤 코드만 본다.
  const loopBody = stripComments(
    sliceFunction(reconcileTask, "for (const candidate of candidates) {", "재조정 후보 루프"),
  );
  const budgetAt = loopBody.indexOf("summary.abortedReason");
  const claimAt = loopBody.indexOf("Payment.findOneAndUpdate");
  assert.ok(budgetAt !== -1, "루프 본문 안에서 예산 소진 처리를 찾지 못했다");
  assert.ok(claimAt !== -1, "루프 본문 안에서 클레임(findOneAndUpdate)을 찾지 못했다");
  assert.ok(
    budgetAt < claimAt,
    "시간 예산 확인이 클레임(findOneAndUpdate)보다 먼저 와야 한다 — 아니면 처리 못 한 주문의 attempts 만 올라간다",
  );
}
// 🔴 예산 기준점이 후보 쿼리 뒤에서 시작해야 한다. `now`(후보 나이 계산용)로 재면 Payment.find 의
// 지연(withMongoRetry 시도 상한 8000ms × 재시도)이 예산에서 차감돼, 콜드 아이솔레이트에서 한 건도
// 처리하지 않고 정상 종료하는 틱이 나온다.
assert.ok(
  /loopStartedAt\s*=\s*Date\.now\(\)/.test(reconcileTask),
  "루프 예산의 기준점(loopStartedAt)이 후보 쿼리 뒤에 따로 있어야 한다",
);
assert.ok(
  reconcileTask.includes("Date.now() - loopStartedAt >= timeBudgetMs"),
  "예산 판정이 loopStartedAt 기준이어야 한다 — now 로 재면 쿼리 지연이 예산을 먹는다",
);
// 🔴 최신 주문 우선. 오름차순으로 되돌리면 방금 결제된 건이 오래된 이탈 주문들 뒤로 밀려,
// 한 틱이 상한까지 못 돌 때 영영 정산되지 않는다(운영에서 실제로 발생).
assert.ok(
  /\.sort\(\{ createdAt: -1 \}\)/.test(reconcileTask),
  "재조정 후보는 최신 주문부터 처리해야 한다(sort createdAt:-1)",
);
assert.ok(
  reconcileTask.includes("export async function runPaymentReconcileTask"),
  "크론 진입점 runPaymentReconcileTask 를 export 해야 한다",
);
// 크론 진입점은 throw 하면 안 된다 — 전체 try/catch 로 감싸야 한다.
const runTaskBody = reconcileTask.slice(reconcileTask.indexOf("export async function runPaymentReconcileTask"));
assert.ok(runTaskBody.includes("try {") && runTaskBody.includes("catch"), "runPaymentReconcileTask 는 절대 throw 하지 않아야 한다");

// ── 3-b. 크론은 간접적으로도 환불하지 않는다 ────────────────────────────
// 파일 안 문자열만 보는 것으로는 부족했다 — 재조정은 handleSinglePaymentComplete 를 재사용하는데
// 그 안에 자동환불이 들어 있어서, 실제로는 크론이 돈을 돌려줄 수 있었다.
assert.ok(
  /settleSinglePaymentForReconcile[\s\S]{0,600}?allowAutoRefund:\s*false/.test(payments),
  "재조정 정산 진입점은 allowAutoRefund:false 로 호출해야 한다(크론이 자동환불하면 안 된다)",
);
assert.ok(
  /const allowAutoRefund = options\.allowAutoRefund !== false/.test(payments),
  "handleSinglePaymentComplete 는 allowAutoRefund 옵션을 지원해야 한다",
);

// ── 3-c. 프로필 스코프 게이트 (결제했는데 서비스가 사라지는 사고의 원인) ──
// upsertSinglePaymentUnlockRecord 는 코드베이스에서 유일하게 이 게이트가 빠져 있었고, 그 결과
// profileId 가 없는 결제(음악 트랙 등 계정 스코프 키 전부 + 프로필 카드가 0개인 계정의 모든 결제)가
// 웹훅 정산에서 throw → 자동환불 → 권한 회수로 이어졌다. 게이트를 지우면 같은 사고가 재발한다.
const upsertBody = payments.slice(
  payments.indexOf("async function upsertSinglePaymentUnlockRecord"),
  payments.indexOf("async function upsertSinglePaymentUnlockRecord") + 3000,
);
assert.ok(
  /const requiresProfile = Boolean\(resolveProfileUnlockContentKey\(/.test(upsertBody),
  "upsertSinglePaymentUnlockRecord 는 resolveProfileUnlockContentKey 로 프로필 스코프 여부를 판정해야 한다",
);
// 계정 스코프는 건너뛰는 게 아니라 USER 스코프로 기록한다 — 기록이 없으면 잠금 상품의 전달 증거가
// 사라져 resolvePaidResultDelivery 의 "소비 후 환불" 차단이 무력화된다.
assert.ok(
  /entitlementScope = requiresProfile \? CONTENT_ENTITLEMENT_SCOPES\.PROFILE : CONTENT_ENTITLEMENT_SCOPES\.USER/.test(upsertBody),
  "계정 스코프 결제는 USER 스코프 엔타이틀먼트로 기록해야 한다(전달 증거 보존)",
);
// 🔴 계정 스코프는 주문에 profileId 가 실려 있어도 무시해야 한다. 셸이 모든 단건 결제에 현재
// 프로필을 자동 주입하므로, 그대로 쓰면 계정 단위 상품이 프로필 단위로 잠겨 프로필 전환 시 재잠김된다.
assert.ok(
  /entitlementProfileId = requiresProfile \? profileId : USER_SCOPE_PROFILE_ID/.test(upsertBody),
  "계정 스코프 결제는 주문 profileId 를 무시하고 USER_SCOPE_PROFILE_ID 로 고정해야 한다",
);
assert.ok(
  upsertBody.includes('error.code = "INVALID_UNLOCK_TARGET"'),
  "INVALID_UNLOCK_TARGET throw 가 남아 있어야 한다(프로필 키의 진짜 결손은 계속 잡아야 함)",
);

// ── 3-d. 지급 대상 식별 실패는 환불하지 않는다 ──────────────────────────
// profileId 결손은 "콘텐츠 미전달"이 아니라 "귀속 대상 미상"이다. 이걸 자동환불로 처리하면
// 정상 결제가 웹훅 한 번에 취소된다. 권한은 이미 recordUserPaidFeature 가 줬으므로 보류가 맞다.
assert.ok(
  /function isUnlockTargetIdentityError[\s\S]{0,300}?INVALID_UNLOCK_TARGET[\s\S]{0,120}?MISSING_PROFILE_ID/.test(payments),
  "식별 실패 판정 헬퍼(isUnlockTargetIdentityError)가 있어야 한다",
);
assert.ok(
  /refundOrDefer = async \(payment, reasonCode, reasonMessage, failureStage, \{ forceDefer = false \} = \{\}\)/.test(payments),
  "refundOrDefer 는 forceDefer 로 PG 취소를 건너뛸 수 있어야 한다",
);
assert.ok(
  (payments.match(/forceDefer: isUnlockTargetIdentityError\(error\)/g) || []).length >= 2,
  "해금 기록 실패 catch 두 곳 모두 식별 실패를 forceDefer 로 넘겨야 한다",
);
// 🔴 권한 지급이 해금 기록보다 먼저여야 "환불 없이 보류"가 사용자에게 성립한다.
// 순서가 뒤집히면 upsert throw 시 권한이 아예 안 나가 결제만 남는다.
assert.ok(
  (payments.match(/await recordUserPaidFeature\([\s\S]{0,220}?entitlement = await upsertSinglePaymentUnlockRecord\(/g) || []).length >= 2,
  "recordUserPaidFeature 는 upsertSinglePaymentUnlockRecord 보다 먼저 호출해야 한다",
);

// ── 4. 관리자 주문 API 인증 ──────────────────────────────────────────────
assert.ok(
  /if \(path === "\/orders" \|\| path\.startsWith\("\/orders\/"\)\) \{[\s\S]{0,200}?authorizeAdminRequest/.test(adminRouter),
  "/orders 디스패치는 authorizeAdminRequest 를 먼저 호출해야 한다",
);
assert.ok(adminRouter.includes("./admin-orders.js"), "admin-orders.js 를 동적 import 해야 한다");
assert.ok(
  adminOrders.includes("환불 사유는 필수입니다"),
  "환불에는 사유가 필수여야 한다(감사 추적)",
);
assert.ok(
  adminOrders.includes("stage: \"admin_order_refund\""),
  "환불 실행은 성공/실패 모두 감사 로그를 남겨야 한다",
);
assert.ok(adminOrders.includes("MAX_PAGE_SIZE"), "페이지 크기 상한이 있어야 한다");
assert.ok(adminOrders.includes("DEFAULT_WINDOW_DAYS"), "기본 조회창이 있어야 한다(풀스캔 방지)");
assert.ok(adminOrders.includes("escapeRegex"), "검색어 정규식은 이스케이프해야 한다");

// ── 5. 환불 로직 단일화 ──────────────────────────────────────────────────
assert.ok(
  payments.includes("refundPaymentAsOperator"),
  "handleSinglePaymentCancel 은 공용 환불 코어에 위임해야 한다",
);
assert.ok(
  !/const partial = isPartialSingleCancel\(/.test(payments),
  "payments.js 에 환불 로직 사본이 남아 있으면 안 된다(코어와 두 벌이 된다)",
);
for (const type of ["membership_pass", "point_charge"]) {
  assert.ok(refundCore.includes(type), `환불 코어가 ${type} 유형을 다뤄야 한다`);
}
assert.ok(
  refundCore.includes("adminReviewRequired"),
  "되돌리지 못한 권한은 adminReviewRequired 로 표면화해야 한다(조용히 뭉개기 금지)",
);

console.log(`[verify-payment-reconcile] PASS (crons=${JSON.stringify(crons)}, reconcile="${declared[1]}")`);
