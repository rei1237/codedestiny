/**
 * @jest-environment node
 *
 * Admission 게이트는 **평상시 진입 팬아웃**을 거절해서는 안 된다.
 *
 * 프로덕션 실측(wrangler tail, 요청 13건)에서 `[db-op-admission] {"limit":3,"active":3,"queued":2}` 가
 * 5회 나왔다 — DB 장애 없이 게이트만으로 포화됐다는 뜻이다. 로그인 사용자 1명의 진입이
 * /api/auth/me + /api/profile(직렬 2 op) + /api/me/access-state 를 동시에 쏘고, rate-limit 의
 * AbuseScore 쓰기까지 같은 슬롯을 먹는다.
 *
 * 이 거절이 특히 나쁜 이유는 재시도되지 않는다는 것이다(MongoOperationOverloadedError 는
 * withMongoRetry 에서 명시적 재시도 제외 → 그대로 503). 그래서 게이트는 최소한 풀 크기(5)만큼은
 * 받아 줘야 하고, 넘치는 대기는 풀의 waitQueue(재시도 대상)로 넘어가야 한다.
 *
 * 🔴 이 테스트는 env 를 **설정하지 않는다** — 프로덕션 기본값을 그대로 검증하기 위해서다.
 * wrangler.toml 에 MONGO_MAX_IN_FLIGHT_OPS 가 없으므로 db.js 의 기본값이 곧 프로덕션 값이다.
 *
 * 🔴 2026-08-09 — 이 가드가 **한 번 뚫렸다.** 당시 팬아웃 상수(5)와 한도 기본값(5)이 같아
 * 여유가 0 이었는데, 테스트는 "5개가 들어간다"만 보고 있어서 통과했다. 그 상태에서 6ab597c0b 가
 * resolveActiveUserAuth 의 요청 간 dedup 을 제거하자(= 같은 라우트 중복이 더 이상 슬롯 1개로
 * 접히지 않음) 실제 팬아웃이 한도를 넘어섰고, 프로덕션 로그인 사용자가 503 과 "로그인이 필요합니다" 를
 * 동시에 받았다. 상수는 손으로 유지하는 값이라 드리프트를 완전히 막을 수 없으므로,
 * **여유가 존재한다는 것 자체**(한도 > 팬아웃)를 아래에서 따로 단언한다. 두 값을 다시 같게 만들지 말 것.
 */

import { jest } from "@jest/globals";

test("default admission limit admits a full entry fan-out without rejecting", async () => {
  const connection = {
    readyState: 0,
    db: { command: jest.fn(async () => ({ ok: 1 })) },
    getClient: () => ({ on: jest.fn() }),
  };
  const mongooseMock = {
    connection,
    connect: jest.fn(async () => {
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => {
      connection.readyState = 0;
    }),
  };

  delete globalThis.__mongoOperationAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const { withMongoRetry } = await import("../../worker/lib/db.js");

  // MONGO_MAX_IN_FLIGHT_OPS 를 일부러 주지 않는다 = 프로덕션과 동일한 기본값 경로.
  const env = { MONGO_URI: "mongodb://fake/test" };

  const releasers = [];
  const inFlight = [];
  // 로그인 사용자 1명(1탭) 진입의 실제 동시 op 수. withMongoRetry 로 감싼 호출만 슬롯을 먹는다:
  //   /api/auth/me 1 · /api/profile 1 · /api/me/access-state 1 · /api/billing/balance 1(내부 직렬 2)
  //   · /api/subscription/status 1 · rate-limit AbuseScore 1(별도 레인이지만 같은 게이트를 통과)
  const ENTRY_FANOUT_OPS = 6;
  // 🔴 팬아웃을 딱 맞게 받는 것으로는 부족하다 — 그게 이번 사고의 형태였다. 한 칸 더 들어가는지까지
  // 확인해 "한도 > 팬아웃"(여유 ≥ 1)을 고정한다. 기본값을 팬아웃과 같게 되돌리면 여기서 실패한다.
  const HEADROOM_PROBE_OPS = 1;
  const TOTAL_OPS = ENTRY_FANOUT_OPS + HEADROOM_PROBE_OPS;

  for (let i = 0; i < TOTAL_OPS; i += 1) {
    inFlight.push(withMongoRetry(
      env,
      () => new Promise((resolve) => { releasers.push(resolve); }),
      { retries: 0, admissionTimeoutMS: 300 },
    ));
  }

  // admission 타임아웃(300ms)보다 넉넉히 기다린다 — 거절될 것이었으면 이미 거절됐다.
  await new Promise((resolve) => setTimeout(resolve, 500));

  expect(releasers).toHaveLength(TOTAL_OPS);

  releasers.forEach((resolve) => resolve({ ok: true }));
  await expect(Promise.all(inFlight)).resolves.toHaveLength(TOTAL_OPS);
});

test("a low-limit waiter does not head-of-line block higher-limit waiters", async () => {
  // 보안 가드는 우선순위 레인(maxConcurrent 2)을 쓴다. 예전 drain 은 대기열 선두에서 멈췄기 때문에
  // limit 2 대기자가 선두에 있으면 뒤의 limit 5 인증·결제 대기자까지 함께 굶었다.
  const connection = {
    readyState: 0,
    db: { command: jest.fn(async () => ({ ok: 1 })) },
    getClient: () => ({ on: jest.fn() }),
  };
  const mongooseMock = {
    connection,
    connect: jest.fn(async () => {
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => {
      connection.readyState = 0;
    }),
  };

  delete globalThis.__mongoOperationAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const { withMongoRetry } = await import("../../worker/lib/db.js");

  const env = { MONGO_URI: "mongodb://fake/test", MONGO_MAX_IN_FLIGHT_OPS: "3" };

  // 슬롯 3개를 모두 점유한다.
  const holders = [];
  const held = [];
  for (let i = 0; i < 3; i += 1) {
    held.push(withMongoRetry(env, () => new Promise((r) => { holders.push(r); }), { retries: 0 }));
  }
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(holders).toHaveLength(3);

  // 낮은 limit(2) 대기자를 **먼저** 큐에 넣는다 — active(3) >= 2 라 지금은 못 들어간다.
  let lowAdmitted = false;
  const lowLimit = withMongoRetry(env, async () => { lowAdmitted = true; return { ok: "low" }; }, {
    retries: 0,
    maxConcurrent: 2,
    admissionTimeoutMS: 5000,
  }).catch((error) => ({ rejected: error.name }));

  // 그 뒤에 정상 limit 대기자를 넣는다.
  let highReleased;
  const highLimit = withMongoRetry(env, () => new Promise((r) => { highReleased = r; }), {
    retries: 0,
    admissionTimeoutMS: 2000,
  });

  // 슬롯 하나만 비운다 → active 2. 선두의 low-limit 은 여전히 막히지만(2 >= 2),
  // 뒤의 high-limit 은 들어갈 수 있어야 한다(2 < 3). 이게 head-of-line blocking 회귀 가드다.
  holders[0]({ ok: true });
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(typeof highReleased).toBe("function"); // 뒤에 있던 대기자가 앞을 넘어 들어갔다
  expect(lowAdmitted).toBe(false);              // 선두의 낮은 limit 은 여전히 대기 중이다

  highReleased({ ok: "high" });
  holders[1]({ ok: true });
  holders[2]({ ok: true });

  await expect(highLimit).resolves.toEqual({ ok: "high" });
  // 슬롯이 충분히 비면 low-limit 도 결국 들어간다(굶기는 게 아니라 순서만 양보한 것).
  await expect(lowLimit).resolves.toEqual({ ok: "low" });
  await Promise.all(held);
});
