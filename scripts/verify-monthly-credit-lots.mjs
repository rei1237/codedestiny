#!/usr/bin/env node
// 월정석 lot 회계 헬퍼 회귀 검증 — 지급/FIFO 차감/부분 만료/멱등/백필/경계값.
// 실행: node scripts/verify-monthly-credit-lots.mjs

import assert from "node:assert/strict";
import {
  MONTHLY_CREDIT_TTL_MS,
  normalizeLots,
  sumActiveBalance,
  applyGrantLot,
  deductLotsFIFO,
  ensureLotsForBalance,
  resolveNextExpiry,
} from "../worker/lib/monthly-credit-lots.js";

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000; // 고정 기준 시각(테스트 결정성)
let passed = 0;
function it(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("월정석 lot 회계 헬퍼 검증");

it("TTL은 30일 고정", () => {
  assert.equal(MONTHLY_CREDIT_TTL_MS, 30 * DAY);
});

it("지급: 신규 lot이 grantedAt+30일 만료로 추가된다", () => {
  const { lots, balance, added, lot } = applyGrantLot([], {
    lotId: "signup:u1",
    amount: 500,
    grantedAt: new Date(T0),
    now: T0,
  });
  assert.equal(added, true);
  assert.equal(balance, 500);
  assert.equal(lots.length, 1);
  assert.equal(lot.remaining, 500);
  assert.equal(lot.expiresAt.getTime(), T0 + 30 * DAY);
});

it("지급 멱등: 동일 lotId는 재지급되지 않는다", () => {
  const first = applyGrantLot([], { lotId: "signup:u1", amount: 500, grantedAt: new Date(T0), now: T0 });
  const second = applyGrantLot(first.lots, { lotId: "signup:u1", amount: 500, grantedAt: new Date(T0 + DAY), now: T0 + DAY });
  assert.equal(second.added, false);
  assert.equal(second.balance, 500);
  assert.equal(second.lots.length, 1);
});

it("FIFO 차감: 오래된 지급분부터 소진된다", () => {
  let lots = applyGrantLot([], { lotId: "a", amount: 300, grantedAt: new Date(T0), now: T0 }).lots;
  lots = applyGrantLot(lots, { lotId: "b", amount: 200, grantedAt: new Date(T0 + DAY), now: T0 + DAY }).lots;
  const res = deductLotsFIFO(lots, 350, T0 + 2 * DAY);
  assert.equal(res.ok, true);
  assert.equal(res.balance, 150); // 500 - 350
  assert.deepEqual(res.allocation, [{ lotId: "a", taken: 300 }, { lotId: "b", taken: 50 }]);
  // a는 소진되어 사라지고 b만 150 남음
  assert.equal(res.lots.length, 1);
  assert.equal(res.lots[0].lotId, "b");
  assert.equal(res.lots[0].remaining, 150);
});

it("차감: 유효잔액 부족 시 ok:false, lot 불변", () => {
  const lots = applyGrantLot([], { lotId: "a", amount: 100, grantedAt: new Date(T0), now: T0 }).lots;
  const res = deductLotsFIFO(lots, 300, T0 + DAY);
  assert.equal(res.ok, false);
  assert.equal(res.shortfall, 200);
  assert.equal(res.lots.length, 1);
  assert.equal(res.lots[0].remaining, 100);
});

it("부분 만료: 만료 lot은 유효잔액/차감 대상에서 제외되되 보존된다", () => {
  let lots = applyGrantLot([], { lotId: "old", amount: 200, grantedAt: new Date(T0), now: T0 }).lots;
  lots = applyGrantLot(lots, { lotId: "new", amount: 100, grantedAt: new Date(T0 + 20 * DAY), now: T0 + 20 * DAY }).lots;
  // old는 T0+30d 만료, new는 T0+50d 만료. now=T0+35d → old 만료.
  const now = T0 + 35 * DAY;
  const norm = normalizeLots(lots, now);
  assert.equal(norm.activeBalance, 100);
  assert.equal(norm.expiredBalance, 200);
  assert.equal(sumActiveBalance(lots, now), 100);
  // 차감은 활성 100까지만 가능, 만료된 old(200)는 못 씀
  assert.equal(deductLotsFIFO(lots, 150, now).ok, false);
  const ok = deductLotsFIFO(lots, 80, now);
  assert.equal(ok.ok, true);
  assert.equal(ok.balance, 20);
  // 만료 lot(old)은 저장용 배열에 보존됨(크론이 소멸 기록/제거)
  assert.ok(ok.lots.some((l) => l.lotId === "old" && l.remaining === 200));
});

it("경계: 만료 시각과 정확히 같은 순간(expiresAt<=now)은 만료로 본다", () => {
  const lots = applyGrantLot([], { lotId: "a", amount: 100, grantedAt: new Date(T0), now: T0 }).lots;
  const atExpiry = T0 + 30 * DAY;
  assert.equal(sumActiveBalance(lots, atExpiry), 0);
  assert.equal(sumActiveBalance(lots, atExpiry - 1), 100);
});

it("지연 백필: lot 없고 스칼라 잔액만 있으면 신규 30일 lot 합성", () => {
  const { lots, balance, backfilled } = ensureLotsForBalance(
    { membershipCreditBalance: 250, membershipCreditLots: [] },
    T0,
  );
  assert.equal(backfilled, true);
  assert.equal(balance, 250);
  assert.equal(lots.length, 1);
  assert.equal(lots[0].expiresAt.getTime(), T0 + 30 * DAY);
});

it("지연 백필: lot이 이미 있으면 백필하지 않는다", () => {
  const existing = applyGrantLot([], { lotId: "a", amount: 100, grantedAt: new Date(T0), now: T0 }).lots;
  const res = ensureLotsForBalance(
    { membershipCreditBalance: 999, membershipCreditLots: existing },
    T0,
  );
  assert.equal(res.backfilled, false);
  assert.equal(res.balance, 100);
});

it("지연 백필: 스칼라 잔액 0이면 아무 것도 안 함", () => {
  const res = ensureLotsForBalance({ membershipCreditBalance: 0, membershipCreditLots: [] }, T0);
  assert.equal(res.backfilled, false);
  assert.equal(res.balance, 0);
  assert.equal(res.lots.length, 0);
});

it("resolveNextExpiry: 가장 임박한 미만료 lot 만료일 반환", () => {
  let lots = applyGrantLot([], { lotId: "a", amount: 100, grantedAt: new Date(T0), now: T0 }).lots;
  lots = applyGrantLot(lots, { lotId: "b", amount: 100, grantedAt: new Date(T0 + 10 * DAY), now: T0 + 10 * DAY }).lots;
  const iso = resolveNextExpiry(lots, T0 + 11 * DAY);
  assert.equal(iso, new Date(T0 + 30 * DAY).toISOString());
});

it("여러 지급분: 각 지급분이 자기 지급일 기준으로 개별 만료", () => {
  let lots = applyGrantLot([], { lotId: "a", amount: 100, grantedAt: new Date(T0), now: T0 }).lots;
  lots = applyGrantLot(lots, { lotId: "b", amount: 100, grantedAt: new Date(T0 + 15 * DAY), now: T0 + 15 * DAY }).lots;
  // T0+31d: a 만료, b 유효
  assert.equal(sumActiveBalance(lots, T0 + 31 * DAY), 100);
  // T0+46d: b도 만료
  assert.equal(sumActiveBalance(lots, T0 + 46 * DAY), 0);
});

console.log(`\n월정석 lot 회계 헬퍼: ${passed}개 통과`);
