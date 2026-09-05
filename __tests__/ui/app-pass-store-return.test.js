/**
 * 앱 이용권 상점(/app/store/)이 구매 성공 뒤 원래 콘텐츠로 돌려보내는가 — 소스 마커 검사.
 *
 * 복귀 계약은 두 조각이다: 티켓 쓰기는 scripts/app-payment-guard.js openAppStore(가드 실행 검사는
 * scripts/verify-app-no-portone.mjs), 티켓 소비·이동은 AppPassStoreClient.scheduleCheckoutReturn.
 * 이 계열에 렌더 테스트가 없어 verify-checkout-pass-card.mjs 가 PointsClient 에 쓰는 마커 방식을
 * 따른다 — 마커가 빠지면 "구매는 되는데 상점에 남는" 종전 회귀가 조용히 돌아온다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const client = fs.readFileSync(path.join(root, "app/app/store/AppPassStoreClient.tsx"), "utf8");
const copy = fs.readFileSync(path.join(root, "app/app/_lib/copy.ts"), "utf8");

test("구매 성공 꼬리가 복귀 티켓을 소비하고 원래 화면으로 이동한다", () => {
  assert.match(client, /checkoutEntry\.consumeCheckoutReturn\(\)/, "consumeCheckoutReturn 호출이 없다");
  assert.match(client, /window\.location\.assign\(returnUrl\)/, "복귀 이동(location.assign)이 없다");
  assert.match(client, /copy\.purchaseReturningMessage\(/, "복귀 안내 문구가 없다");
  // 티켓이 없으면(탭바로 들어온 구매) 종전 안내가 남아야 한다.
  assert.match(client, /if \(!scheduleCheckoutReturn\(plan\.title\)\) \{\s*setMessage\(copy\.purchaseAppliedMessage\(plan\.title\)\);/);
});

test("구매 성공 뒤 access 스냅샷을 강제 갱신하고 떠나기 전 이용권 스냅샷을 예열한다", () => {
  assert.match(client, /refreshUserAccessAfterPayment\(\)\.catch\(/, "refreshUserAccessAfterPayment 호출이 없다");
  assert.match(client, /\/api\/subscription\/status/, "이용권 스냅샷 예열 요청이 없다");
  assert.match(client, /saveSubscriptionSnapshotForUser\(undefined, payload, "app-store-return"\)/);
  assert.match(client, /clearSubscriptionSnapshotForUser\(\)/, "예열 실패 폴백(스냅샷 삭제)이 없다");
});

test("복귀 안내 문구가 인터페이스·영어 기본·11개 로케일 전부에 있다", () => {
  const occurrences = copy.match(/^\s*purchaseReturningMessage:/gm) || [];
  // 인터페이스 1 + APP_SHELL_COPY_EN 1 + ko/ja/zh-CN/zh-TW/vi/hi/es/fr/de/nl/ms 11
  assert.equal(occurrences.length, 13, `purchaseReturningMessage 정의 ${occurrences.length}곳(기대 13)`);
  const applied = copy.match(/^\s*purchaseAppliedMessage:/gm) || [];
  assert.equal(occurrences.length, applied.length, "purchaseAppliedMessage 와 같은 표에 모두 있어야 한다");
});
