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
// profileId 가 없는 UNLOCK 키(음악 트랙 등 50여 종)가 웹훅 정산에서 throw → 자동환불 → 권한 회수로
// 이어졌다. 게이트를 지우면 같은 사고가 그대로 재발한다.
const upsertBody = payments.slice(
  payments.indexOf("async function upsertSinglePaymentUnlockRecord"),
  payments.indexOf("async function upsertSinglePaymentUnlockRecord") + 3000,
);
assert.ok(
  /if \(!resolveProfileUnlockContentKey\([\s\S]{0,200}?\)\) \{\s*return null;/.test(upsertBody),
  "upsertSinglePaymentUnlockRecord 는 프로필 스코프가 아니면 null 을 돌려주고 빠져야 한다",
);
// 주석에도 같은 단어가 나오므로 실제 throw 문(error.code 대입)을 기준으로 순서를 본다.
const throwAt = upsertBody.indexOf('error.code = "INVALID_UNLOCK_TARGET"');
assert.ok(throwAt > 0, "INVALID_UNLOCK_TARGET throw 가 남아 있어야 한다(프로필 키의 진짜 결손은 계속 잡아야 함)");
assert.ok(
  upsertBody.indexOf("return null;") < throwAt,
  "프로필 스코프 게이트가 INVALID_UNLOCK_TARGET throw 보다 앞에 와야 한다",
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
