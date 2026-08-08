#!/usr/bin/env node
// 관리자 버그 제보 확인 보상(월정석) 라우트 회귀 검증 — DB/실호출 없이 모듈 배선과
// DB 이전 분기(킬스위치·라우팅 형태)만 검증한다.
//
// 지급 회계 자체(멱등 지급·FIFO 차감)는 scripts/verify-monthly-credit-lots.mjs 가 이미 검증하는
// grantMonthlyCreditLotDetailed → restoreMonthlyCreditLot → applyGrantLot 을 이 라우트가 손대지 않고
// 그대로 재사용한다 — 이 스크립트에서 다시 재현하지 않는다. handleReward/handleStatusUpdate 의
// DB 이후 로직(중복 지급 방지·탈퇴 계정 차단)은 admin-monthly-credits.js 의 이미 검증 없이 운영 중인
// 동일 패턴을 그대로 따른 것이라, 실제 Mongo 없이는 정직하게 검증할 수 없는 부분이다(코딩 원칙 8번 —
// 실 DB/실호출은 사용자 허락 없이 임의 실행하지 않는다).
//
// 실행: node scripts/verify-admin-feedback-bug-reward.mjs

import assert from "node:assert/strict";
import {
  BUG_REPORT_REWARD_AMOUNT,
  buildBugRewardSourceId,
  handleAdminFeedbackRoutes,
} from "../worker/routes/admin-feedback.js";

let passed = 0;
function it(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function itAsync(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function fakeRequest(method) {
  return {
    method,
    url: "https://admin.example.com/api/admin/feedback/507f1f77bcf86cd799439011/reward",
    headers: new Headers(),
    text: async () => "",
  };
}

const FAKE_ID = "507f1f77bcf86cd799439011";

console.log("관리자 버그 제보 보상 라우트 검증");

it("지급액은 300으로 고정된다", () => {
  assert.equal(BUG_REPORT_REWARD_AMOUNT, 300);
});

it("sourceId는 feedbackId별로 결정적이고 서로 다르다", () => {
  const a1 = buildBugRewardSourceId("aaa");
  const a2 = buildBugRewardSourceId("aaa");
  const b = buildBugRewardSourceId("bbb");
  assert.equal(a1, a2); // 같은 제보를 두 번 확정해도 같은 lotId → grantMonthlyCreditLotDetailed 가 멱등 처리
  assert.notEqual(a1, b); // 다른 제보는 서로 독립적으로 지급 가능
  assert.match(a1, /^feedback-bug-reward:aaa$/);
});

await itAsync("월정석 지급 킬스위치가 꺼져 있으면 DB를 건드리지 않고 503으로 막는다", async () => {
  const env = { NODE_ENV: "production", ADMIN_MONTHLY_CREDIT_GRANT_ENABLED: "false" };
  const response = await handleAdminFeedbackRoutes(`/${FAKE_ID}/reward`, fakeRequest("POST"), env, { userId: "admin-1" });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, "ADMIN_MONTHLY_CREDIT_GRANT_DISABLED");
});

await itAsync("지급 엔드포인트는 POST만 허용한다(GET은 DB 접근 전에 405)", async () => {
  const env = { NODE_ENV: "production", ADMIN_MONTHLY_CREDIT_GRANT_ENABLED: "false" };
  const response = await handleAdminFeedbackRoutes(`/${FAKE_ID}/reward`, fakeRequest("GET"), env, { userId: "admin-1" });
  assert.equal(response.status, 405);
});

await itAsync("상태 변경 엔드포인트는 POST만 허용한다", async () => {
  const response = await handleAdminFeedbackRoutes(`/${FAKE_ID}/status`, fakeRequest("DELETE"), {}, { userId: "admin-1" });
  assert.equal(response.status, 405);
});

await itAsync("목록 엔드포인트는 GET만 허용한다", async () => {
  const response = await handleAdminFeedbackRoutes("/", fakeRequest("DELETE"), {}, { userId: "admin-1" });
  assert.equal(response.status, 405);
});

await itAsync("정의되지 않은 경로는 404", async () => {
  const response = await handleAdminFeedbackRoutes("/unknown-sub-route", fakeRequest("GET"), {}, { userId: "admin-1" });
  assert.equal(response.status, 404);
});

console.log(`\n관리자 버그 제보 보상 라우트: ${passed}개 통과`);
console.log("※ DB 연결이 필요한 지급/중복방지/탈퇴계정 차단 로직은 이 스크립트가 커버하지 않습니다 —");
console.log("  grantMonthlyCreditLotDetailed 의 멱등성은 verify:monthly-credit-lots 가 이미 검증합니다.");
