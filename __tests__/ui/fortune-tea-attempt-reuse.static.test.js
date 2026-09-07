const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

/* 운명 찻집 인페이지 재제출이 재과금하지 않는다는 계약을 소스에 고정한다.

   🔴 createFortuneTeaAttemptId 는 Date.now()+Math.random() 이라 비결정적이다. 결제가 끝난 뒤
   상담 생성이 실패해 사용자가 다시 제출하면, 새 attemptId 로는 서버가 결제 기록을 못 찾아
   결제창이 다시 뜬다 — 같은 상담에 두 번 청구된다. 그래서 결제 증빙이 생긴 시도는 성공할
   때까지 붙들어 두고 재제출이 그대로 이어받는다.
   재개(리다이렉트 복귀) 갈래는 서술자가 attemptId 를 나르므로 원래 안전했다. */

const ROOT = path.join(__dirname, "..", "..");
const PAGE = fs.readFileSync(
  path.join(ROOT, "src", "features", "fortune-tea-house", "FortuneTeaHousePage.tsx"),
  "utf8",
);

test("결제까지 끝난 시도를 보관하는 ref 가 있다", () => {
  assert.ok(
    PAGE.includes("const unusedPaidAttemptRef = useRef<FortuneTeaSettledAttempt | null>(null);"),
    "unusedPaidAttemptRef 가 사라졌다 — 재제출이 새 attemptId 를 뽑아 재과금된다",
  );
});

test("재제출은 보관된 attemptId 를 먼저 쓰고, 없을 때만 새로 뽑는다", () => {
  assert.ok(PAGE.includes("? carriedPaid.attemptId"), "이어받기 갈래가 사라졌다");
  assert.match(
    PAGE,
    /carriedPaid\s*\r?\n\s*\? carriedPaid\.attemptId\s*\r?\n\s*: createFortuneTeaAttemptId\(requestPayload\)/,
    "createFortuneTeaAttemptId 가 이어받기보다 먼저 불린다 — 순서가 뒤집히면 재과금이다",
  );
});

test("가격이 다른 상담(featureKey 불일치)은 이어받지 않는다", () => {
  assert.ok(
    PAGE.includes("reusablePaidAttempt.featureKey === resolveFortuneTeaFeatureKey(nextQuestionInput)"),
    "featureKey 일치 조건이 사라졌다 — 싼 상담의 결제로 비싼 상담이 열린다",
  );
});

test("이어받은 시도는 결제창도 이용권 재검사도 다시 타지 않는다", () => {
  assert.ok(
    PAGE.includes("} else if (carriedPaid) {"),
    "이어받기 갈래가 ensure-access/결제창 갈래와 합쳐졌다",
  );
  assert.ok(
    PAGE.includes("const settledPayment = Boolean(prepaid || carriedPaid);")
      && PAGE.includes("if (!settledPayment) {"),
    "결제가 끝난 시도에서 '이용권 확인' 게이트가 다시 열린다",
  );
});

test("결제 증빙이 생기면 보관하고, 상담문이 도착하면 비운다", () => {
  assert.ok(
    PAGE.includes("      if (billingEvidenceBody) {\r\n        unusedPaidAttemptRef.current = {")
      || PAGE.includes("      if (billingEvidenceBody) {\n        unusedPaidAttemptRef.current = {"),
    "증빙이 생긴 시도를 보관하지 않는다",
  );
  assert.ok(
    PAGE.includes("if (unusedPaidAttemptRef.current?.attemptId === attemptId) unusedPaidAttemptRef.current = null;"),
    "성공 후 보관분을 비우지 않는다 — 회당 결제가 영구 무료가 된다",
  );
});
