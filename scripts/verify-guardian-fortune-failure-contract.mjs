#!/usr/bin/env node
/**
 * 연이 운명 상담(guardian fortune) **실패 분류 계약** 검증 — mock 전용.
 *
 * 배경: 프로덕션에서 상담이 500 과 503 을 섞어 뱉었다. 원인은 두 가지가 겹친 것이다.
 *   1) 같은 DB 일시 장애가 예약 **전**에 나면 503, 예약 **후**에 나면 500 으로 갈렸다.
 *      generateGuardianFortuneRequest 의 마지막 catch 만 isDbUnavailableError 판별이 빠져 있었다.
 *   2) 성공·실패 양쪽에서 사용량을 불필요하게 다시 읽어 Mongo 왕복이 늘었다
 *      (현재 프로덕션에서 조회 1건 ≈ 5초, 12초 op 상한에 걸리면 그대로 503).
 *
 * 이 스크립트는 그 계약을 고정한다. **실제 모델·실제 DB 를 호출하지 않는다** —
 * 인메모리 스토어와 주입 generator 만 쓴다(정본 패턴: scripts/verify-fortune-chat-reading.mjs).
 *
 * 사용: node scripts/verify-guardian-fortune-failure-contract.mjs
 */
import { readFileSync } from "node:fs";
import { generateGuardianFortuneRequest } from "../worker/lib/guardian-fortune-generate.js";
import {
  createMemoryGuardianFortuneStore,
  GUARDIAN_FORTUNE_ERROR_CODES,
} from "../worker/lib/guardian-fortune-usage.js";

const failures = [];
function check(label, condition, detail = "") {
  if (condition) return;
  failures.push(detail ? `${label} — ${detail}` : label);
}

const USER_ID = "6a784b743c0ea26140101059";
const DATE_KEY = "2026-08-09";

const BASE_INPUT = {
  birthDate: "1995-04-18",
  birthTime: "08:30",
  calendarType: "solar",
  gender: "female",
  category: "saju",
  topic: "money_work",
  mode: "yeoni",
};

/** 어댑터를 타지 않고 context 계약만 맞춰 돌려준다(오프라인·결정론). */
function stubContextBuilder() {
  return async () => ({
    ok: true,
    context: { version: "guardian-fortune.v1", availableSystems: ["saju"], integratedInsight: { openingHook: "x" } },
    warnings: [],
  });
}

function deliverableResult() {
  return {
    result: {
      openingLine: "지금의 흐름을 차분히 읽고 있어요.",
      innerState: "마음의 상태",
      coreReading: "핵심 해석",
      topicAdvice: "주제 조언",
      luckyAction: "오늘의 한 가지",
      evidenceLines: ["근거 1"],
      followUpQuestions: ["다음 질문?"],
    },
    usedFallback: false,
    deliverable: true,
  };
}

/** 스토어 호출 횟수를 세는 얇은 프록시. 어떤 메서드가 몇 번 불렸는지로 왕복 수를 검증한다. */
function countingStore(seed = {}) {
  const inner = createMemoryGuardianFortuneStore(seed);
  const calls = {};
  const wrapped = { calls, state: inner.state, kind: "counting" };
  for (const key of Object.keys(inner)) {
    const value = inner[key];
    if (typeof value !== "function") continue;
    wrapped[key] = async (...args) => {
      calls[key] = (calls[key] || 0) + 1;
      return value(...args);
    };
  }
  return wrapped;
}

function mongoError(message = "MongoDB operation timed out in Worker.") {
  return new Error(message);
}

function seedWithFreeLeft() {
  return { daily: { [USER_ID]: { userId: USER_ID, freeUsed: 0, reserved: 0, freeLimit: 3 } } };
}

async function run(store, overrides = {}) {
  return generateGuardianFortuneRequest({
    input: BASE_INPUT,
    userId: USER_ID,
    requestId: `fortune-chat-consultation:${Math.random().toString(36).slice(2)}`,
    dateKey: DATE_KEY,
    store,
    contextBuilder: stubContextBuilder(),
    generator: async () => deliverableResult(),
    contextOptions: { env: {} },
    ...overrides,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) 예약 **이후** DB 장애 → 500 이 아니라 재시도 가능한 503 이어야 한다 (핵심 회귀 테스트)
// ─────────────────────────────────────────────────────────────────────────────
{
  const store = countingStore(seedWithFreeLeft());
  const response = await run(store, {
    generator: async () => { throw mongoError(); },
  });

  check("예약 후 DB 장애: status 503", response.status === 503, `실제 ${response.status}`);
  check(
    "예약 후 DB 장애: SERVICE_TEMPORARILY_UNAVAILABLE 코드",
    response.error === GUARDIAN_FORTUNE_ERROR_CODES.SERVICE_TEMPORARILY_UNAVAILABLE,
    `실제 ${response.error}`,
  );
  check("예약 후 DB 장애: retryable=true", response.retryable === true);
  check("예약 후 DB 장애: 한국어 안내", /[가-힣]/.test(String(response.message || "")));
  check(
    "예약 후 DB 장애: 차감되지 않았다고 안내",
    String(response.message || "").includes("차감되지 않았어요"),
    response.message,
  );
  // 같은 장애에서 사용량을 또 읽으면 12초를 한 번 더 쓴다.
  check("예약 후 DB 장애: usage 재조회 없음", !store.calls.findDaily, `findDaily ${store.calls.findDaily || 0}회`);
  // 예약은 반드시 되돌려야 한다 — 무료 횟수를 물고 있으면 안 된다.
  check("예약 후 DB 장애: 예약 해제됨", store.calls.releaseDaily === 1, `releaseDaily ${store.calls.releaseDaily || 0}회`);
  check(
    "예약 후 DB 장애: 무료 횟수 미차감",
    store.state.daily.get(USER_ID)?.freeUsed === 0 && store.state.daily.get(USER_ID)?.reserved === 0,
    JSON.stringify(store.state.daily.get(USER_ID)),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) DB 와 무관한 예외는 종전대로 500 이어야 한다 (과잉 503 화 방지)
// ─────────────────────────────────────────────────────────────────────────────
{
  const store = countingStore(seedWithFreeLeft());
  const response = await run(store, {
    generator: async () => { throw new Error("prompt template exploded"); },
  });
  check("비 DB 예외: status 500 유지", response.status === 500, `실제 ${response.status}`);
  check("비 DB 예외: SERVER_ERROR 코드", response.error === GUARDIAN_FORTUNE_ERROR_CODES.SERVER_ERROR, String(response.error));
  check("비 DB 예외: retryable 아님", response.retryable !== true);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) 취소는 종전대로 499
// ─────────────────────────────────────────────────────────────────────────────
{
  const store = countingStore(seedWithFreeLeft());
  const controller = new AbortController();
  controller.abort();
  const response = await run(store, { abortSignal: controller.signal });
  check("취소: status 499 유지", response.status === 499, `실제 ${response.status}`);
  check("취소: CANCELLED 코드", response.error === GUARDIAN_FORTUNE_ERROR_CODES.CANCELLED, String(response.error));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) 성공: 커밋 문서를 재사용해 usage 재조회 왕복이 사라졌는지 + 값이 종전과 같은지
// ─────────────────────────────────────────────────────────────────────────────
{
  const store = countingStore(seedWithFreeLeft());
  const response = await run(store);

  check("성공: status 200", response.status === 200, `실제 ${response.status}`);
  check("성공: 커밋 후 findDaily 재조회 없음", !store.calls.findDaily, `findDaily ${store.calls.findDaily || 0}회`);
  // 값 자체는 종전과 동일해야 한다 — 여기서 틀리면 무료 잔여 표시와 결제 판정이 어긋난다.
  check("성공: dailyFreeUsed=1", response.usage?.dailyFreeUsed === 1, JSON.stringify(response.usage));
  check("성공: dailyFreeRemaining=2", response.usage?.dailyFreeRemaining === 2, JSON.stringify(response.usage));
  check("성공: dailyFreeLimit=3", response.usage?.dailyFreeLimit === 3, JSON.stringify(response.usage));
  check("성공: isLoggedIn=true", response.usage?.isLoggedIn === true);
  check("성공: canGenerate=true", response.usage?.canGenerate === true);
  check("성공: generationSource=daily_free", response.generationSource === "daily_free", String(response.generationSource));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) 게스트 성공도 같은 계약 (커밋 문서 재사용이 게스트 분기에서도 동일해야 한다)
// ─────────────────────────────────────────────────────────────────────────────
{
  const store = countingStore();
  const response = await generateGuardianFortuneRequest({
    input: BASE_INPUT,
    guestIdHash: "a".repeat(64),
    requestId: "fortune-chat-consultation:guest-1",
    dateKey: DATE_KEY,
    store,
    contextBuilder: stubContextBuilder(),
    generator: async () => deliverableResult(),
    contextOptions: { env: {} },
  });
  check("게스트 성공: status 200", response.status === 200, `실제 ${response.status}`);
  check("게스트 성공: findGuest 재조회 없음", !store.calls.findGuest, `findGuest ${store.calls.findGuest || 0}회`);
  check("게스트 성공: guestFreeUsed=1", response.usage?.guestFreeUsed === 1, JSON.stringify(response.usage));
  check("게스트 성공: guestFreeRemaining=0", response.usage?.guestFreeRemaining === 0, JSON.stringify(response.usage));
  check("게스트 성공: isLoggedIn=false", response.usage?.isLoggedIn === false);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) ctx.waitUntil 이 있으면 attempt 완료 쓰기를 응답 이후로 미룬다
// ─────────────────────────────────────────────────────────────────────────────
{
  const store = countingStore(seedWithFreeLeft());
  const deferred = [];
  const response = await run(store, {
    contextOptions: { env: {}, ctx: { waitUntil: (promise) => deferred.push(promise) } },
  });
  check("waitUntil: status 200", response.status === 200, `실제 ${response.status}`);
  check("waitUntil: attempt 완료 쓰기가 지연됨", deferred.length === 1, `deferred ${deferred.length}건`);
  await Promise.all(deferred);
  const attempt = await store.findAttempt("__none__").catch(() => null);
  void attempt;
  const attempts = [...store.state.attempts.values()];
  check("waitUntil: 지연 실행 후 completed 로 닫힘", attempts.some((item) => item.status === "completed"), JSON.stringify(attempts));
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) ctx 가 없으면 종전대로 동기 처리 (테스트·Express 경로 호환)
// ─────────────────────────────────────────────────────────────────────────────
{
  const store = countingStore(seedWithFreeLeft());
  const response = await run(store);
  check("ctx 없음: status 200", response.status === 200, `실제 ${response.status}`);
  const attempts = [...store.state.attempts.values()];
  check("ctx 없음: 응답 시점에 completed", attempts.some((item) => item.status === "completed"), JSON.stringify(attempts));
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) 커밋 실패는 usage 재조회 없이 재시도 가능한 503
// ─────────────────────────────────────────────────────────────────────────────
{
  const store = countingStore(seedWithFreeLeft());
  store.commitDaily = async () => null; // 예약을 소비하지 못한 상태를 흉내낸다.
  const response = await run(store);
  check("커밋 실패: status 503", response.status === 503, `실제 ${response.status}`);
  check(
    "커밋 실패: USAGE_COMMIT_FAILED 코드",
    response.error === GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED,
    String(response.error),
  );
  check("커밋 실패: retryable=true", response.retryable === true);
  check("커밋 실패: usage 재조회 없음", !store.calls.findDaily, `findDaily ${store.calls.findDaily || 0}회`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) 예약 **전** DB 장애는 종전 계약 그대로 (회귀 없음)
// ─────────────────────────────────────────────────────────────────────────────
{
  const store = countingStore(seedWithFreeLeft());
  store.beginAttempt = async () => { throw mongoError("MongoPoolClearedError"); };
  const response = await run(store);
  check("예약 전 DB 장애: status 503", response.status === 503, `실제 ${response.status}`);
  check(
    "예약 전 DB 장애: SERVICE_TEMPORARILY_UNAVAILABLE 코드",
    response.error === GUARDIAN_FORTUNE_ERROR_CODES.SERVICE_TEMPORARILY_UNAVAILABLE,
    String(response.error),
  );
  check("예약 전 DB 장애: retryable=true", response.retryable === true);
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) 죽은 예약(고아 reserved)이 무료 자리를 영구히 잠그지 않는다
//
// 예약과 커밋 사이에서 요청이 죽으면(엣지 컷·아이솔레이트 종료로 catch 조차 못 도는 경우)
// reserved 가 1 오른 채 남는다. 게스트는 한도가 1이라 그 한 건으로 영구 차단됐다.
// ─────────────────────────────────────────────────────────────────────────────
{
  const OLD = new Date(Date.now() - 60 * 60 * 1000); // TTL(10분)을 한참 넘긴 고아
  const hash = "b".repeat(64);
  const store = countingStore({ guests: { [hash]: { guestIdHash: hash, totalUsed: 0, reserved: 1, reservationUpdatedAt: OLD } } });
  const response = await generateGuardianFortuneRequest({
    input: BASE_INPUT,
    guestIdHash: hash,
    requestId: "fortune-chat-consultation:stale-guest-1",
    dateKey: DATE_KEY,
    store,
    contextBuilder: stubContextBuilder(),
    generator: async () => deliverableResult(),
    contextOptions: { env: {} },
  });
  check("고아 예약 회수: 상담이 성공한다(고치기 전엔 429 영구 차단)", response.status === 200, `실제 ${response.status} ${response.error || ""}`);
  check("고아 예약 회수: 만료분을 실제로 풀었다", store.calls.releaseStaleGuest >= 1, `releaseStaleGuest ${store.calls.releaseStaleGuest || 0}회`);
  check("고아 예약 회수: 무료 1회가 정상 차감됐다", store.state.guests.get(hash)?.totalUsed === 1, JSON.stringify(store.state.guests.get(hash)));
}

// 11) 아직 살아 있는(만료 전) 예약은 절대 건드리지 않는다 — 동시 요청 보호
{
  const FRESH = new Date(Date.now() - 5 * 1000);
  const hash = "c".repeat(64);
  const store = countingStore({ guests: { [hash]: { guestIdHash: hash, totalUsed: 0, reserved: 1, reservationUpdatedAt: FRESH } } });
  const response = await generateGuardianFortuneRequest({
    input: BASE_INPUT,
    guestIdHash: hash,
    requestId: "fortune-chat-consultation:fresh-guest-1",
    dateKey: DATE_KEY,
    store,
    contextBuilder: stubContextBuilder(),
    generator: async () => deliverableResult(),
    contextOptions: { env: {} },
  });
  check("신선한 예약 보호: 한도 초과로 429", response.status === 429, `실제 ${response.status}`);
  check("신선한 예약 보호: 남의 예약을 풀지 않았다", store.state.guests.get(hash)?.reserved === 1, JSON.stringify(store.state.guests.get(hash)));
}

// ─────────────────────────────────────────────────────────────────────────────
// 12) mongo store 의 모든 쿼리가 withMongoRetry 로 감싸져 있는가 (정적 검사)
//
// 인메모리 store 로는 검증할 수 없는 계약이라 소스를 직접 본다. 커밋 0ea717329 가 "bare Mongo
// call" 을 손으로 걷어냈지만 가드를 남기지 않아 guardian store 14곳이 그대로 남았고, 풀이 붐빌 때
// 재시도 없이 waitQueueTimeoutMS(5초)에 죽었다. 같은 이탈이 다시 생기지 않게 고정한다.
// ─────────────────────────────────────────────────────────────────────────────
{
  const source = readFileSync(new URL("../worker/lib/guardian-fortune-usage.js", import.meta.url), "utf8");
  const start = source.indexOf("export function createMongoGuardianFortuneStore");
  check("mongo store 팩토리를 찾았다", start !== -1);
  if (start !== -1) {
    const body = source.slice(start);
    const bare = [];
    // 모델 직접 호출 중 같은 줄에 run( 이 없는 것을 찾는다.
    const pattern = /^(?!.*run\(\(\) =>).*GuardianFortune(?:GuestUsage|AccountUsage|GenerationAttempt)\.(create|findOne|findOneAndUpdate|updateMany|updateOne|deleteOne)\b/gm;
    let match = pattern.exec(body);
    while (match) {
      bare.push(match[0].trim().slice(0, 90));
      match = pattern.exec(body);
    }
    check(
      "mongo store 에 withMongoRetry 없는 raw 쿼리가 없다",
      bare.length === 0,
      bare.length ? `${bare.length}건: ${bare[0]}…` : "",
    );
    check("withMongoRetry 를 import 한다", /import \{[^}]*withMongoRetry[^}]*\} from "\.\/db\.js"/.test(source));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n[verify-guardian-fortune-failure-contract] 실패 ${failures.length}건`);
  failures.forEach((line) => console.error(`  ✗ ${line}`));
  process.exit(1);
}
console.log("[verify-guardian-fortune-failure-contract] 통과 — 실패 분류·왕복 축소 계약 모두 만족");
