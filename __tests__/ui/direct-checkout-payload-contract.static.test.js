/**
 * 정적 셸이 서버로 보내는 결제 본문의 **필드 계약**을 고정한다.
 *
 * 실사고(2026-08-13): `_cdBuildDirectCheckoutPayload` 는 호출부가 넘긴 옵션을 그대로 쓰지 않고
 * 화이트리스트로 본문을 **재조립**한다. 그 목록에 `contentKey` 가 없어서, 호출부(_cdOpenPaidServiceGate)
 * 는 넘기는데 단건 카드 경로에서만 조용히 사라졌다. 그러면 /api/payments/prepare 가 빈 contentKey 로
 * 주문을 만들고, 확정 시 지급되는 권한이 featureKey 로 접혀 연도별 상품(숙요 1년운)이 영영 잠긴다.
 *
 * 🔴 '조용한 누락'이라 런타임 에러도, 콘솔 경고도, 실패한 결제도 남지 않는다 — 결제는 성공하고
 * 콘텐츠만 안 열린다. 그래서 이 계약은 정적으로 못 박아야 한다.
 *
 * 이름 grep 이 아니라 중괄호 균형으로 함수 본문을 잘라 내서 본다(CLAUDE.md 원칙 6).
 */
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const SHELL = path.join(__dirname, "..", "..", "index.html");

// 셸의 결제 본문 빌더 3종. 이 중 어느 하나라도 contentKey 를 흘리면 그 결제수단으로 산 사용자만
// 잠긴 채 남는다 — 결제수단마다 다른 버그가 되어 재현이 극도로 어려워진다.
const PAYLOAD_BUILDERS = [
  ["  function _cdBuildDirectCheckoutPayload(options) {", "단건 카드(/api/payments/prepare)"],
  ["  async function _cdRunMonthlyCreditGate(options) {", "월정석(/api/billing/coin-gate)"],
  ["  async function _cdResolvePaidContentAccess(content) {", "이용권 커버 확인(/api/billing/coin-gate)"],
];

async function slicer() {
  const { sliceFunction } = await import("../../scripts/lib/js-source-slice.mjs");
  return sliceFunction;
}

test("세 결제 경로 모두 contentKey 를 서버로 실어 보낸다", async () => {
  const sliceFunction = await slicer();
  const source = fs.readFileSync(SHELL, "utf8");
  for (const [marker, label] of PAYLOAD_BUILDERS) {
    const body = sliceFunction(source, marker, label);
    assert.match(
      body,
      /contentKey:\s*(opts|item)\.contentKey/,
      `${label}: 본문에 contentKey 전달이 없다. 화이트리스트에서 빠지면 조용히 사라진다.`,
    );
  }
});

test("🔴 단건 결제 본문은 scope 를 클라이언트에서 받지 않는다", async () => {
  // scope 를 흘려보내면 클라이언트가 프로필 스코프 상품을 계정 스코프로 뒤집을 수 있다.
  // 서버(resolveEntitlementIdentity)가 profileId 유무로 판정하는 것이 정본이다.
  // "빠진 필드는 다 채워 넣자"는 변경이 오면 여기서 먼저 멈추고 이 이유를 읽게 된다.
  const sliceFunction = await slicer();
  const source = fs.readFileSync(SHELL, "utf8");
  const body = sliceFunction(source, PAYLOAD_BUILDERS[0][0], "단건 카드");
  assert.ok(!/\bscope\b/.test(body), "단건 결제 본문에 scope 가 들어갔다 — 서버 판정을 클라이언트가 덮게 된다.");
});

test("단건 결제 본문은 주문 스냅샷이 필요로 하는 프로필 식별자를 함께 보낸다", async () => {
  // worker/payments/orders.js createOrder 의 pricingSnapshot 은 {profileId, contentKey} 로
  // 권한 신원을 만든다. 둘 중 하나만 있으면 프로필 스코프 해금이 성립하지 않는다.
  const sliceFunction = await slicer();
  const source = fs.readFileSync(SHELL, "utf8");
  const body = sliceFunction(source, PAYLOAD_BUILDERS[0][0], "단건 카드");
  assert.match(body, /checkoutPayload\.profileId\s*=/, "profileId 전달이 없다.");
  assert.match(body, /checkoutPayload\.selectedProfileId\s*=/, "selectedProfileId 전달이 없다.");
});
