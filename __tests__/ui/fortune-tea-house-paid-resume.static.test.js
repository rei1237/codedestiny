const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.join(__dirname, "..", "..");
const PAGE = fs.readFileSync(
  path.join(ROOT, "src", "features", "fortune-tea-house", "FortuneTeaHousePage.tsx"),
  "utf8",
);

test("운명 찻집 결제 직전 resume 서술자에 요청 원문과 찻잔 상태를 함께 싣는다", () => {
  assert.ok(PAGE.includes("usePaidResume(FORTUNE_TEA_RESUME_KIND"), "resume 핸들러가 사라졌다");
  assert.ok(
    PAGE.includes("requestPayload: packPaidResumeArg(requestPayloadWithAttempt),"),
    "결제 직전 requestPayloadWithAttempt 를 resume 에 싣지 않는다",
  );
  assert.ok(
    PAGE.includes("selectedCup: packPaidResumeArg(activeCup),"),
    "결제 직전 selectedCup 을 resume 에 싣지 않는다",
  );
});

test("복귀 핸들러는 결제 증빙이 있을 때만 게이트 없는 상담 생성을 이어 간다", () => {
  assert.ok(
    PAGE.includes("const restoredPayload = unpackPaidResumeArg<FortuneTeaConsultPostBody>(args.requestPayload);"),
    "복귀 payload 를 복원하지 않는다",
  );
  assert.ok(
    PAGE.includes("if (!restoredInput || !attemptId || !cup || !grant?.payload) return false;"),
    "결제 증빙 없는 복귀가 생성으로 들어갈 수 있다",
  );
  assert.ok(
    PAGE.includes("await submitQuestion(restoredInput, { attemptId, cup, grant, requestPayload: restoredPayload });"),
    "복귀 핸들러가 결제 완료 payload 를 게이트 없는 생성 갈래로 전달하지 않는다",
  );
});

test("복귀 결제 증빙은 /consult 가 읽는 슬롯에 맞춰 조립된다", () => {
  assert.ok(PAGE.includes("const payment = asRecord(billingGate.payment);"), "payment 증빙을 버리고 있다");
  assert.ok(PAGE.includes("billingGate,"), "billingGate 슬롯이 사라졌다");
  assert.ok(PAGE.includes("accessGrant,"), "accessGrant 슬롯이 사라졌다");
  assert.ok(PAGE.includes("consume,"), "consume 슬롯이 사라졌다");
  assert.match(
    PAGE,
    /_paymentContext:\s*\{[\s\S]*billingGate,[\s\S]*accessGrant,[\s\S]*consume,[\s\S]*payment,[\s\S]*\}/,
    "_paymentContext 에 결제 증빙 4종이 함께 실리지 않는다",
  );
});
