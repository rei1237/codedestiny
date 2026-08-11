import mongoose from "mongoose";

import { getEnv, installProcessEnv } from "./env.js";

let connectPromise = null;
// 마지막으로 연결 건강을 확인한 시각(ping 성공 또는 신규 연결 성공).
// 웜 커넥션 재사용 시 매 요청 ping 왕복을 피하기 위해 유휴 임계 이내면 ping을 생략한다.
let lastHealthyAt = 0;
// 마지막으로 전역 풀 disconnect(resetMongooseConnection)를 실행한 시각. op-타임아웃 버스트가
// 동시에 여러 번 disconnect해 아이솔레이트 공유 풀을 반복 절단(재연결 폭풍)하는 것을 쿨다운으로 막는다.
let lastPoolResetAt = 0;
// 지금 이 아이솔레이트에서 진행 중인 withMongoRetry 작업들. 전역 disconnect는 공유 연결을 끊어
// '아직 살아서 실행 중인' 동시 요청의 소켓까지 함께 절단하므로, 혼자일 때만 즉시 끊는다.
//
// 🔴 단순 카운터였다가 Set 으로 바꿨다(2026-08-08). 카운터는 **영구 누수**했다:
// op 가 12초 상한에 걸리면 finally 에서 finalizeOperation() 을 부르는데, 그때 드라이버 프로미스가
// 아직 pending 이면(= 정확히 타임아웃 상황이다) 감소를 건너뛴다. 그 프로미스가 영영 settle 하지
// 않으면 카운터는 영원히 1 높은 채로 남는다. 프로덕션 실측에서 1 → 2 → 4 → 5 → 6 으로 단조 증가했다.
//
// 그 누수의 실제 피해는 "숫자가 틀리는 것"이 아니라 **안전밸브가 죽는 것**이다:
//   · 리셋 예약(pendingPoolReset)은 finalizeOperation 에서 inFlightOps <= 0 일 때만 실행된다
//     → 누수로 0 에 영영 도달하지 못해 **안전한 리셋 경로가 사라진다**
//   · 남는 것은 forceReset(연속 실패 임계) 뿐인데, 이건 쿨다운과 동시성 가드를 **둘 다 우회**한다
//   · 그 disconnect 가 살아 있는 동시 요청의 체크아웃을 poolClosed 로 죽이고, 그 실패가 다시
//     연속 실패 카운터를 올려 forceReset 을 재장전한다 → 자기지속 리셋 폭풍 → 유료 라우트 503
//
// setTimeout 기반 정리는 쓸 수 없다 — 요청 컨텍스트가 죽으면 그 타이머도 함께 죽어 누수가 그대로다.
// 그래서 타이머 없이 **읽는 시점에 나이로 만료**시킨다. 버려진 작업은 소켓 정리 시간이 지나면
// 더는 공유 소켓을 쓰고 있지 않으므로, 그때부터는 보호 대상에서 빼는 것이 옳다.
const activeMongoOps = new Set();
// 버려진 작업을 회계에서 제외하기까지의 시간. socketTimeoutMS(기본 11초) + 여유 —
// 그 시점이면 드라이버가 소켓을 이미 정리했으므로 '살아서 실행 중'으로 볼 근거가 없다.
const ABANDONED_OP_MAX_AGE_MS = 15000;

function countActiveMongoOps() {
  const now = Date.now();
  for (const record of activeMongoOps) {
    if (now - record.startedAt > ABANDONED_OP_MAX_AGE_MS) activeMongoOps.delete(record);
  }
  return activeMongoOps.size;
}
// 동시 요청 때문에 미뤄 둔 전역 disconnect가 있는지. 마지막 작업이 빠져나갈 때 한 번만 처리한다.
let pendingPoolReset = false;
// A topology failure can be observed by several requests at once. Keep the
// disconnect/reset operation single-flight so one request cannot close a pool
// that another request has just started reconnecting to.
let poolResetPromise = null;
// 이 연결 위에서 성공한 작업 없이 연속으로 실패한 연결-레벨 오류 수(성공하면 0으로 돌아간다).
// 미뤄 둔 리셋이 영영 실행되지 않는 데드락을 깨는 유일한 신호다 — 아래 withMongoRetry 주석 참고.
let consecutiveConnectionFailures = 0;

// A small Mongoose pool cannot safely absorb every simultaneous Worker
// request. Bound operation admission before MongoDB checkout so a burst is
// rejected/degraded quickly instead of creating a second wave of waiters.
const mongoOperationAdmission = globalThis.__mongoOperationAdmission
  || (globalThis.__mongoOperationAdmission = {
    active: 0,
    waiters: [],
  });

function createMongoOperationOverloadedError() {
  const error = new Error("MongoDB operation capacity is temporarily saturated.");
  error.name = "MongoOperationOverloadedError";
  error.code = "MONGO_OPERATION_ADMISSION_TIMEOUT";
  return error;
}

function drainMongoOperationWaiters() {
  // 🔴 대기열 선두에서 멈추지 않고 **스캔**한다.
  // 예전에는 선두 대기자가 못 들어가면 곧바로 return 했다. 모든 대기자의 limit 이 같을 때는 그게
  // 맞았지만, 지금은 낮은 limit 을 쓰는 우선순위 레인이 있다(worker/lib/security: maxConcurrent 2).
  // 그대로 두면 limit 2 인 보안 대기자가 선두에 있을 때 active 가 2 이상이기만 하면 뒤에 있는
  // limit 5 인증·결제 대기자까지 통째로 막힌다(head-of-line blocking). 자기 limit 을 못 넘는
  // 대기자는 건너뛰고 다음을 본다 — 건너뛰어진 쪽은 자기 타임아웃(보안 레인 250ms)에 실패하고,
  // 그 실패는 fail-open 이라 정책에 영향이 없다.
  // 같은 limit 끼리는 배열 순서를 그대로 따르므로 FIFO 가 유지된다.
  let index = 0;
  while (index < mongoOperationAdmission.waiters.length) {
    const waiter = mongoOperationAdmission.waiters[index];
    if (waiter.settled) {
      mongoOperationAdmission.waiters.splice(index, 1);
      continue;
    }
    if (mongoOperationAdmission.active >= waiter.limit) {
      index += 1;
      continue;
    }
    mongoOperationAdmission.waiters.splice(index, 1);
    waiter.settled = true;
    clearTimeout(waiter.timer);
    mongoOperationAdmission.active += 1;
    waiter.resolve(() => releaseMongoOperationSlot());
  }
}

function releaseMongoOperationSlot() {
  mongoOperationAdmission.active = Math.max(0, mongoOperationAdmission.active - 1);
  drainMongoOperationWaiters();
}

// 🔴 기본값 5 → 8 (2026-08-09). 5 는 **요청 간 auth dedup 이 있다는 전제**에서 나온 숫자였고,
// 그 전제가 사라졌다.
//
// 경위: 6ab597c0b 가 resolveActiveUserAuth 의 in-flight dedup(globalThis 캐시)을 제거했다.
// Cloudflare Workers 가 요청 간 Promise continuation 을 금지하기 때문에 제거 자체는 옳았다.
// 그런데 그 dedup 은 Mongo read 만 합친 게 아니라 **admission 슬롯도 합치고 있었다** — 같은
// 라우트를 셸과 React 가 각각 찌르던 중복이 슬롯 1개로 접히던 것이 이제 각각 1개씩 먹는다.
// 한도는 그대로 5 인 채 팬아웃만 늘어, 배포 32a78e702 직후 로그인 사용자가 503 과
// "로그인이 필요합니다" 를 동시에 받았다(같은 원인의 두 갈래 — worker/lib/auth.js 참고).
//
// 실측 진입 팬아웃(withMongoRetry 로 감싼 호출만 슬롯을 먹는다):
//   /api/auth/me 1 · /api/profile 1 · /api/me/access-state 1 · /api/billing/balance 1(직렬 2)
//   · /api/subscription/status 1  → 1인 1탭 피크 5~6. rate-limit 은 별도 레인(maxConcurrent 2).
// 한도 5 에서는 5~6번째가 2500ms 대기 후 죽는다.
//
// 이 거절이 특히 나쁜 이유는 **재시도되지 않는다**는 것이다. MongoWaitQueueTimeoutError 는
// transient 로 분류돼 재시도되지만(아래 isTransientMongoError), MongoOperationOverloadedError 는
// withMongoRetry 에서 명시적으로 재시도 제외라 그대로 503 이 된다. 즉 게이트가 **복구 가능한 대기를
// 복구 불가능한 503 으로 바꾼다.** 8 로 올리면 대기는 풀의 waitQueue(5s 상한, 재시도 대상)로
// 옮겨간다 — 그게 원래 있어야 할 자리다.
//
// ⚠️ 8 은 1인 기준 처방이지 구조적 해결이 아니다. 동시 진입 사용자가 2명이면 다시 넘는다.
// 근본 처방은 한도를 계속 올리는 게 아니라 **auth 를 각자 다시 푸는 진입 엔드포인트 수를 줄이는 것**이다
// (docs/DEBUGGING_GUIDE.md: "정상 로그인 홈 진입은 GET /api/me/access-state 1회").
//
// maxPoolSize 는 5 로 유지한다. 전역 연결 = 아이솔레이트 수 × poolSize 이고 Atlas M0 상한이 500 이라
// 근거 없이 올리지 않는다(아래 connectDb 주석 참고). 올리려면 `[db-connect-error]` 가 0 인 것을 먼저 볼 것 —
// 지금 한도(8) > 풀(5) 이라 초과분은 waitQueue 로 가며, 그 대기가 리셋을 유발하지 않도록
// withMongoRetry 의 isConnectionLevelFailure 에서 MongoWaitQueueTimeoutError 를 제외해 뒀다(한 세트다).
// 🔴 8 → 12 (2026-08-12). 단건결제 체크아웃에서 resolveActiveUserAuth 가 이 게이트에 걸려
// MongoOperationOverloadedError(재시도 제외) → 503 AUTH_STATUS_TEMPORARILY_UNAVAILABLE 로
// 죽는 것을 프로덕션에서 실측(Network 탭 "checkout" 요청 그대로 재현) — 결제창이 대부분 안 뜨고
// 가끔만 뜨던 원인이었다. 12는 위 클램프가 이미 허용하는 상한이라 새 장치가 아니라 기존 노브를
// 돌리는 것뿐이다. 예산은 그대로 여유 있다(2500ms admission + 5000ms waitQueue + 쿼리 ≈ 8s <
// 11.5s 시도 상한).
const MONGO_MAX_IN_FLIGHT_OPS_DEFAULT = "12";
// 1500ms 는 콜드 핸드셰이크 중앙값(1497ms)보다 짧았다 — 연결 하나 세우는 시간도 못 기다렸다는 뜻이다.
// 예산 검산: 2500(admission) + 5000(waitQueue) + 쿼리 ≈ 8s < 11.5s(시도 상한 하한). 여유 있다.
const MONGO_OP_ADMISSION_TIMEOUT_MS_DEFAULT = "2500";

async function acquireMongoOperationSlot(env, options = {}) {
  const limit = clampInt(
    options.maxConcurrent != null
      ? options.maxConcurrent
      : getEnv(env, "MONGO_MAX_IN_FLIGHT_OPS", MONGO_MAX_IN_FLIGHT_OPS_DEFAULT),
    Number(MONGO_MAX_IN_FLIGHT_OPS_DEFAULT),
    1,
    // 상한은 기본값보다 커야 한다 — 같으면 env 노브가 아래로만 움직여 긴급 상향을 못 한다.
    12,
  );
  const waitTimeoutMS = clampTimeoutMs(
    options.admissionTimeoutMS != null
      ? options.admissionTimeoutMS
      : getEnv(env, "MONGO_OP_ADMISSION_TIMEOUT_MS", MONGO_OP_ADMISSION_TIMEOUT_MS_DEFAULT),
    Number(MONGO_OP_ADMISSION_TIMEOUT_MS_DEFAULT),
    100,
    5000,
  );

  if (mongoOperationAdmission.active < limit) {
    mongoOperationAdmission.active += 1;
    return () => releaseMongoOperationSlot();
  }

  return new Promise((resolve, reject) => {
    const waiter = {
      limit,
      settled: false,
      timer: null,
      resolve,
      reject,
    };
    waiter.timer = setTimeout(() => {
      if (waiter.settled) return;
      waiter.settled = true;
      const index = mongoOperationAdmission.waiters.indexOf(waiter);
      if (index >= 0) mongoOperationAdmission.waiters.splice(index, 1);
      try {
        console.warn("[db-op-admission]", JSON.stringify({
          limit,
          waitTimeoutMS,
          active: mongoOperationAdmission.active,
          queued: mongoOperationAdmission.waiters.length,
        }));
      } catch (e) {
        // Diagnostics must never change the failure path.
      }
      reject(createMongoOperationOverloadedError());
    }, waitTimeoutMS);
    mongoOperationAdmission.waiters.push(waiter);
    drainMongoOperationWaiters();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mongo 연산 계측 — op-타임아웃의 원인을 세 갈래로 가르기 위한 최소 카운터.
//
// 2026-08-01 현재 인증 요청의 ~75%가 `resolveAuth` 12초 상한에 걸리는데, 핸드셰이크는
// 1497ms 로 싸다(= 연결 수립이 아니라 '수립된 연결 위의 쿼리'가 멈춘다). 남은 후보는 셋이고
// 드라이버 이벤트로만 구분할 수 있다:
//   1) 풀 포화       → 체크아웃이 오래 걸리거나 실패한다(checkedOut.durationMS / checkOutFailed)
//   2) 서버 지연     → 명령은 나갔는데 응답이 늦다(commandStarted 만 늘고 succeeded 가 안 는다)
//   3) 요청간 I/O 격리 → 명령이 아예 나가지 않는다(checkOutStarted 조차 안 늘거나 즉시 실패)
//
// 카운터는 아이솔레이트 전역이라 op 단위로 정확히 귀속되지 않는다. 그래서 시도 시작 시점의
// 스냅샷을 떠 두고 타임아웃 때 '차이'만 본다 — 그 시도 동안 무슨 일이 있었는지는 이걸로 갈린다.
const mongoOpCounters = {
  checkOutStarted: 0,
  checkedOut: 0,
  checkOutFailed: 0,
  poolCleared: 0,
  commandStarted: 0,
  commandSucceeded: 0,
  commandFailed: 0,
  maxCheckoutWaitMs: 0,
  maxCommandMs: 0,
  lastCheckOutFailReason: "",
};
const instrumentedMongoClients = new WeakSet();

function snapshotMongoCounters() {
  return { ...mongoOpCounters };
}

// 시도 동안의 증분만 남긴다(0 인 항목은 빼서 로그를 짧게 유지).
function diffMongoCounters(before) {
  const delta = {};
  for (const key of Object.keys(mongoOpCounters)) {
    if (key === "lastCheckOutFailReason") continue;
    const change = mongoOpCounters[key] - (before[key] || 0);
    if (change) delta[key] = change;
  }
  if (mongoOpCounters.lastCheckOutFailReason) {
    delta.lastCheckOutFailReason = mongoOpCounters.lastCheckOutFailReason;
  }
  return delta;
}

function instrumentMongoClient(client) {
  if (!client || typeof client.on !== "function") return;
  if (instrumentedMongoClients.has(client)) return;
  instrumentedMongoClients.add(client);
  try {
    client.on("connectionCheckOutStarted", () => { mongoOpCounters.checkOutStarted += 1; });
    client.on("connectionCheckedOut", (event) => {
      mongoOpCounters.checkedOut += 1;
      const waited = Number(event?.durationMS || 0);
      if (waited > mongoOpCounters.maxCheckoutWaitMs) mongoOpCounters.maxCheckoutWaitMs = waited;
    });
    client.on("connectionCheckOutFailed", (event) => {
      mongoOpCounters.checkOutFailed += 1;
      mongoOpCounters.lastCheckOutFailReason = String(event?.reason || "unknown").slice(0, 40);
    });
    client.on("connectionPoolCleared", () => { mongoOpCounters.poolCleared += 1; });
    client.on("commandStarted", () => { mongoOpCounters.commandStarted += 1; });
    client.on("commandSucceeded", (event) => {
      mongoOpCounters.commandSucceeded += 1;
      const took = Number(event?.duration || 0);
      if (took > mongoOpCounters.maxCommandMs) mongoOpCounters.maxCommandMs = took;
    });
    client.on("commandFailed", () => { mongoOpCounters.commandFailed += 1; });
  } catch (e) {
    // 계측 실패가 DB 접근을 막아서는 안 된다.
  }
}

function extractDbNameFromUri(uri) {
  try {
    const parsed = new URL(String(uri || ""));
    const pathname = String(parsed.pathname || "").replace(/^\/+/, "");
    if (!pathname) return "";
    const firstSegment = pathname.split("/")[0] || "";
    return firstSegment.trim();
  } catch (e) {
    return "";
  }
}

export function resolveMongoDbName(env = {}) {
  const explicit = (
    getEnv(env, "MONGO_DB_NAME")
    || getEnv(env, "MONGO_NAME")
    || getEnv(env, "MONGODB_DB_NAME")
  );
  if (explicit) return explicit;

  const uri = (
    getEnv(env, "MONGO_URI")
    || getEnv(env, "MONGODB_URI")
    || getEnv(env, "MONGO_URL")
    || getEnv(env, "DATABASE_URL")
  );
  return extractDbNameFromUri(uri) || "code_destiny";
}

export async function resetMongooseConnection() {
  if (poolResetPromise) return poolResetPromise;
  const disconnectTimeoutMs = 1500;
  poolResetPromise = (async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await Promise.race([
          mongoose.disconnect(),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("mongoose_disconnect_timeout")), disconnectTimeoutMs);
          }),
        ]);
      }
    } catch (e) {
      // Ignore disconnect failures; next connect attempt will retry.
    }
  })();
  try {
    await poolResetPromise;
  } finally {
    poolResetPromise = null;
  }
}

/**
 * 라우트가 "연결이 이상하다"고 판단했을 때 부르는 **유일한** 복구 진입점.
 *
 * 🔴 resetMongooseConnection() 을 라우트에서 직접 부르면 안 된다. 그건 가드 없는 전역
 * disconnect 라, 같은 아이솔레이트에서 **살아서 실행 중인 동시 요청의 소켓까지 함께 끊는다**
 * (bufferCommands:false 라 진행 중인 raw 드라이버 호출이 즉시 throw 한다). 그래서 한 사용자의
 * 실패한 로그인이 그 아이솔레이트의 모든 동시 요청을 죽일 수 있었다 — 아래 withMongoRetry 의
 * catch 가 inFlightOps 가드와 쿨다운을 두고 있는 이유가 정확히 그것인데, auth 라우트 3곳이
 * 그 가드를 통째로 우회하고 있었다(2026-08-08 수정).
 *
 * 여기서는 withMongoRetry 가 쓰는 것과 **같은 상태기계**를 재사용한다:
 *   · 쿨다운(MONGO_POOL_RESET_COOLDOWN_MS) 안이면 건너뛴다 — 재연결 폭풍 방지
 *   · inFlightOps > 1 이면 지금 끊지 않고 예약만 한다 — 마지막 작업이 빠져나갈 때 처리
 *   · poolResetPromise single-flight 는 resetMongooseConnection 이 이미 보장
 * 강제 복구(연속 실패 임계 초과)는 withMongoRetry 안에 그대로 남는다 — 그쪽은 실패 횟수를 안다.
 *
 * 호출부는 await 하지 않아도 된다(void). 복구는 다음 요청을 위한 것이지 이 요청을 살리는 게 아니다.
 */
export async function requestPoolRecovery(env = {}, options = {}) {
  const cooldownMS = clampInt(getEnv(env, "MONGO_POOL_RESET_COOLDOWN_MS", "2000"), 2000, 0, 10000);
  if (options.force !== true && Date.now() - lastPoolResetAt < cooldownMS) return false;

  // 웜 상태는 즉시 무효화한다 — 실제 disconnect 를 미루더라도 다음 connectDb 는 재검증해야 한다.
  lastHealthyAt = 0;
  connectPromise = null;

  if (countActiveMongoOps() > 1 && options.force !== true) {
    pendingPoolReset = true;
    return false;
  }

  pendingPoolReset = false;
  lastPoolResetAt = Date.now();
  consecutiveConnectionFailures = 0;
  await resetMongooseConnection();
  return true;
}

function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function clampInt(rawValue, fallback, min, max) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  return Math.max(min, Math.min(max, normalized));
}

function clampTimeoutMs(rawValue, fallback, min, max) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  return Math.max(min, Math.min(max, normalized));
}

function isTruthyLike(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

function sleep(ms) {
  const wait = Number(ms);
  if (!Number.isFinite(wait) || wait <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, wait);
  });
}

export async function connectDb(env = {}) {
  installProcessEnv(env);

  const guardTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_WORKER_CONNECT_GUARD_MS", "10000"), 10000, 3000, 20000);
  const serverSelectionTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS", "8000"), 8000, 2000, 15000);
  const connectTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_CONNECT_TIMEOUT_MS", "8000"), 8000, 2000, 15000);
  // 🔴 op 예산(withMongoRetry 의 attemptTimeoutMS, 기본 12000)보다 **짧게** 잡는다.
  // 예전엔 20000 이라, op-타임아웃(12초)이 난 뒤에도 드라이버 작업은 취소되지 않아 소켓이 8초를
  // 더 풀에 묶여 있었다. maxPoolSize 가 작아(M0 예산 때문에 의도적으로 작다) 멈춘 op 몇 개면 풀이 마비되고,
  // 그 사이 들어온 요청은 체크아웃 큐에서 굶다가 또 12초에 걸리는 자기증폭 고리가 됐다
  // (2026-08-01 [db-op-timeout] 실측: 체크아웃 대기 최대 10,383ms, 한 창에서 41건 시작/4건 성사).
  // 서버 명령 실행은 250~417ms 라 11초도 20배 이상 여유다.
  const socketTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_SOCKET_TIMEOUT_MS", "11000"), 11000, 5000, 45000);
  // 커넥션을 못 받고 큐에서 기다리는 상한. 이걸 넘겨 기다려봐야 어차피 op 예산을 넘기므로,
  // 12초 stall 대신 빠른 실패로 바꿔 호출부가 즉시 degrade 하게 한다(연결 수 1.5초 + 큐 5초 +
  // 쿼리 0.5초 = 7초라, 기다렸다 성공하는 op 는 여전히 예산 안에 들어온다).
  const waitQueueTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_WAIT_QUEUE_TIMEOUT_MS", "5000"), 5000, 1000, 15000);
  // 유휴 소켓을 드라이버가 능동적으로 닫아, Atlas 유휴 리핑으로 편도 사망한 좀비(half-open) 소켓을 풀이
  // 보유하는 것을 근절한다(Atlas 유휴 컷보다 짧게). 이 설정 부재가 '웜 쿼리 op-타임아웃 다발·콜드 성공'의
  // 1차 근본 원인이었다 — 유휴 후 재개된 아이솔레이트가 죽은 소켓 위에서 쿼리를 매달았기 때문.
  // 🔴 M0(무료 티어)의 **총 연결 상한은 500**이고, 총 연결 = 아이솔레이트 수 × maxPoolSize 다.
  // 유휴 커넥션을 오래 붙들수록 '지금 일하지 않는 아이솔레이트'가 전역 예산을 점유해,
  // 정작 요청을 처리 중인 아이솔레이트가 커넥션을 못 받는다(= 체크아웃 굶음).
  // 60초는 그 점유가 너무 길다. Atlas 유휴 리핑보다는 여전히 짧게 두면서 20초로 당겨
  // 전역 예산 회전율을 3배로 올린다(좀비 소켓 근절이라는 원래 목적은 그대로 유지된다).
  const maxIdleTimeMS = clampTimeoutMs(getEnv(env, "MONGO_MAX_IDLE_TIME_MS", "20000"), 20000, 10000, 300000);
  const retryCount = clampInt(getEnv(env, "MONGO_WORKER_CONNECT_RETRIES", "2"), 2, 0, 4);
  const retryBaseDelayMS = clampInt(getEnv(env, "MONGO_WORKER_RETRY_DELAY_MS", "220"), 220, 0, 2000);

  if (mongoose.connection.readyState === 1) {
    // 최근에 건강을 확인했다면(유휴 임계 이내) ping 왕복을 생략해 요청 지연을 줄인다.
    const pingMinIntervalMS = clampTimeoutMs(getEnv(env, "MONGO_PING_MIN_INTERVAL_MS", "20000"), 20000, 0, 60000);
    if (lastHealthyAt && Date.now() - lastHealthyAt < pingMinIntervalMS) {
      return mongoose.connection;
    }
    const pingTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_PING_TIMEOUT_MS", "3500"), 3500, 1000, 10000);
    try {
      await withTimeout(
        mongoose.connection.db.command({ ping: 1 }),
        pingTimeoutMS,
        "MongoDB ping timed out in Worker.",
      );
      lastHealthyAt = Date.now();
      return mongoose.connection;
    } catch (e) {
      // ping 실패가 곧 '죽은 연결'을 뜻하지는 않는다(Cloudflare 아이솔레이트가 유휴 후 재개될 때
      // 순간적으로 느려 ping이 상한을 넘길 수 있다). 연결 상태(readyState)가 여전히 1이면 공유 연결을
      // 절대 disconnect하지 않는다 — 프로덕션 tail 실측에서 이 disconnect가 동시 요청(4초 폴링+생성)까지
      // 끊어 재연결 폭풍(resetMonitorState 반복·timeout listener 누수·쿼리 serverSelection 타임아웃)을
      // 일으키는 주범이었다. 드라이버 SDAM이 개별 소켓을 스스로 치유하도록 연결을 그대로 반환하고,
      // lastHealthyAt만 무효화해 다음 요청이 다시 ping하게 한다(단, 연결 객체는 유지).
      if (mongoose.connection.readyState === 1) {
        lastHealthyAt = 0;
        return mongoose.connection;
      }
      // 실제로 끊어진 경우에만 리셋(이때는 아래 콜드 연결 루프가 재수립).
      await resetMongooseConnection();
      connectPromise = null;
      lastHealthyAt = 0;
    }
  }

  const uri = (
    getEnv(env, "MONGO_URI")
    || getEnv(env, "MONGODB_URI")
    || getEnv(env, "MONGO_URL")
    || getEnv(env, "DATABASE_URL")
  );
  if (!uri) {
    throw new Error("Mongo URI is required (MONGO_URI, MONGODB_URI, MONGO_URL, or DATABASE_URL) for Worker-native API routes.");
  }

  const ipFamilyRaw = String(getEnv(env, "MONGO_IP_FAMILY") || "").trim();
  const explicitIpFamily = Number(ipFamilyRaw);
  const familyCandidates = (() => {
    if (Number.isFinite(explicitIpFamily) && explicitIpFamily === 0) return [0];
    if (Number.isFinite(explicitIpFamily) && (explicitIpFamily === 4 || explicitIpFamily === 6)) {
      return isTruthyLike(getEnv(env, "MONGO_IP_FAMILY_AUTO_FALLBACK"))
        ? [explicitIpFamily, 0]
        : [explicitIpFamily];
    }
    return [4, 0];
  })();

  let lastError = null;

  for (let familyIndex = 0; familyIndex < familyCandidates.length; familyIndex += 1) {
    const ipFamily = familyCandidates[familyIndex];

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      if (!connectPromise) {
        console.log(`[db-connect] starting connection to mongodb... family=${ipFamily} attempt=${attempt + 1}/${retryCount + 1}`);
        const connectOptions = {
          dbName: resolveMongoDbName(env) || undefined,
          // 🔴 이 값은 전역 예산의 분모다: 총 연결 = 아이솔레이트 수 × maxPoolSize.
          // 2026-08-01 에 "M0 상한 500 에 포화됐다"고 보고 5 → 2 로 줄였다가 **되돌렸다**.
          // 계측이 그 전제를 반증했다:
          //   · 전 구간 `[db-connect-error]` **0건** — 상한에 닿았다면 연결 생성이 실패해야 한다.
          //   · 풀 2 구간에서 체크아웃 **257건 시도 / 219건 실패(85%)**, inFlightOps 가 6까지 올라
          //     커넥션 2개로는 아이솔레이트 내부 동시성을 감당하지 못했다.
          // 즉 병목은 전역 상한이 아니라 **아이솔레이트 내부 풀 고갈**이고, 그건 소켓 점유 시간을
          // 줄이는 쪽(socketTimeoutMS 11초)이 맞는 처방이었다. 근거 없이 다시 줄이지 말 것.
          maxPoolSize: Number(getEnv(env, "MONGO_MAX_POOL_SIZE", "5")),
          // 유휴 시 커넥션을 하나도 붙들지 않는다(드라이버 기본값이지만 전역 예산에 직결되므로 명시).
          minPoolSize: 0,
          serverSelectionTimeoutMS,
          connectTimeoutMS,
          socketTimeoutMS,
          waitQueueTimeoutMS,
          maxIdleTimeMS,
          bufferCommands: false,
          autoIndex: false,
          // Cloudflare Workers는 요청 간 I/O 격리로 '한 요청에서 만든 스트림/소켓'을 다른 요청이 쓰면 막는다.
          // 드라이버 기본 'stream' 모니터는 요청 수명을 넘겨 지속되는 ReadableStream을 만들어, 다른 요청이 연결을
          // 재사용할 때 "Cannot perform I/O on behalf of a different request"(→ Mongo 에러로 분류 안 돼 500)를
          // 유발했다. 'poll' 모드는 짧은 개별 하트비트만 써 이 지속 스트림을 만들지 않는다(서버리스/엣지 권장).
          serverMonitoringMode: "poll",
          // commandStarted/Succeeded 이벤트를 켠다 — '명령이 나갔는지'와 '서버가 늦는지'를
          // 가르는 유일한 신호다. 카운터만 올리므로 비용은 무시할 수준이다.
          monitorCommands: true,
        };
        if (ipFamily === 4 || ipFamily === 6) {
          connectOptions.family = ipFamily;
        }

        const connectStartedAt = Date.now();
        const connectTask = mongoose.connect(uri, connectOptions);

        // 핸드셰이크 실비용을 남긴다 — op-타임아웃이 '쿼리가 느린' 것인지 '연결 수립이 느린' 것인지
        // 구분할 유일한 근거다(2026-08-01 조사에서 이 값이 없어 한참 헤맸다).
        connectTask
          .then(() => console.log(`[db-connect] mongodb connected successfully. family=${ipFamily} elapsedMs=${Date.now() - connectStartedAt}`))
          .catch((err) => {
            console.error(`[db-connect-error] mongodb connection failed. family=${ipFamily}:`, err.message);
          });

        connectPromise = withTimeout(
          connectTask,
          guardTimeoutMS,
          "MongoDB connection timed out in Worker.",
        ).catch(async (error) => {
          console.error(`[db-connect-error] connection promise failed. family=${ipFamily}:`, error.message);
          await resetMongooseConnection();
          throw error;
        });
      }

      try {
        await connectPromise;
      } catch (error) {
        lastError = error;
        connectPromise = null;
        await resetMongooseConnection();

        const isLastAttemptForFamily = attempt >= retryCount;
        const hasMoreFamilyCandidates = familyIndex < familyCandidates.length - 1;
        if (!isLastAttemptForFamily || hasMoreFamilyCandidates) {
          const delayMs = retryBaseDelayMS * (attempt + 1);
          await sleep(delayMs);
          continue;
        }
        break;
      } finally {
        if (mongoose.connection.readyState !== 1) {
          connectPromise = null;
        }
      }

      if (mongoose.connection.readyState === 1) {
        lastHealthyAt = Date.now();
        // 새 클라이언트가 생겼을 수 있으므로 여기서 계측을 건다(WeakSet 가드로 1회만 붙는다).
        try {
          instrumentMongoClient(mongoose.connection.getClient?.() || mongoose.connection.client);
        } catch (e) {
          // 계측 실패는 무시한다.
        }
        return mongoose.connection;
      }

      lastError = new Error("MongoDB connection is not ready in Worker.");
      connectPromise = null;
      await resetMongooseConnection();

      const isLastAttemptForFamily = attempt >= retryCount;
      const hasMoreFamilyCandidates = familyIndex < familyCandidates.length - 1;
      if (!isLastAttemptForFamily || hasMoreFamilyCandidates) {
        const delayMs = retryBaseDelayMS * (attempt + 1);
        await sleep(delayMs);
        continue;
      }
    }
  }

  if (lastError) throw lastError;
  throw new Error("MongoDB connection is not ready in Worker.");
}

// stateless Worker에서 웜 연결을 재사용하다 백그라운드 모니터 타임아웃 등으로 풀이 초기화되면
// (MongoPoolClearedError) 확립된 풀 위에서 실행되던 쿼리가 실패한다. 이런 '일시적' 에러는
// 재연결 후 재시도하면 대개 성공하므로 여기서 판별한다.
// 우리가 방금 부른 disconnect 의 '메아리'로 볼 실패의 시간 창.
// disconnect 는 bufferCommands:false 라 그 순간 살아 있던 동시 요청의 작업을 함께 죽인다.
// 그 직후 쏟아지는 실패는 새로운 진단 정보가 아니라 우리 행동의 결과다.
const SELF_INFLICTED_FAILURE_WINDOW_MS = 3000;

export function isTransientMongoError(error) {
  if (!error) return false;
  const name = String(error.name || "");
  if (
    name === "MongoPoolClearedError"
    || name === "PoolClearedError"
    || name === "MongoNetworkError"
    || name === "MongoNetworkTimeoutError"
    || name === "MongoServerSelectionError"
    || name === "MongoOperationOverloadedError"
    // 🔴 waitQueueTimeoutMS 도입과 한 세트다. 풀이 붐벼 커넥션을 못 받은 것은 명백히 '일시적'인데,
    // 이 이름을 여기 넣지 않으면 하드 에러로 분류돼 유료·인증 라우트가 503(재시도) 대신 500을 낸다.
    // 메시지가 "Timed out while checking out a connection..." 이라 아래 정규식(connection .*timed out)에도
    // 걸리지 않는다(어순이 반대다) — 이름으로만 잡힌다.
    || name === "MongoWaitQueueTimeoutError"
  ) {
    return true;
  }
  const message = String(error.message || "");
  // "Cannot perform I/O on behalf of a different request"(Cloudflare Workers 요청 간 I/O 격리): 이전 요청이
  // 만든 연결 I/O를 이 요청이 재사용할 때 발생. 재시도 시 이 요청 컨텍스트에서 새 연결을 세우면 회복되므로
  // 일시적으로 분류해, 500 하드에러 대신 503(재시도)로 완충한다(serverMonitoringMode:poll로 발생 자체도 저감).
  return /pool .*was cleared|was cleared because|connection .*timed out|socket .*timed out|network (error|timeout)|ECONNRESET|EPIPE|ETIMEDOUT|server selection timed out|connection is not ready|cannot perform i\/o|different request/i.test(message);
}

// 일시적 Mongo 에러에 대해 연결을 재확인/재수립하고 작업을 재시도한다.
// connectDb는 '연결 수립'만 재시도할 뿐 확립된 풀에서 실행되는 쿼리 실패는 재시도하지 않으므로,
// 이용권/구독 조회 같은 핫 리드 경로를 이 헬퍼로 감싸 풀 초기화 순간에도 정확한 결과를 돌려준다.
export async function withMongoRetry(env = {}, operation, options = {}) {
  if (typeof operation !== "function") {
    throw new TypeError("withMongoRetry(env, operation): operation must be a function");
  }
  const maxRetries = clampInt(
    options.retries != null ? options.retries : getEnv(env, "MONGO_OP_RETRIES", "1"),
    1,
    0,
    3,
  );
  const baseDelayMS = clampInt(
    options.baseDelayMS != null ? options.baseDelayMS : getEnv(env, "MONGO_OP_RETRY_DELAY_MS", "120"),
    120,
    0,
    1000,
  );
  // 각 시도(connectDb+operation)를 setTimeout 기반 시간 상한으로 감싼다. 대기 중인 타이머가 항상
  // 존재하므로, 죽은 소켓에서 Mongo 작업 프로미스가 멈춰도 Cloudflare의 "hung"(대기 I/O 없는 미해결
  // 프로미스) 데드락 감지가 발동하지 않는다. 상한 초과 시 즉시 예외를 던져 호출부의 degraded 폴백이
  // 빠르게 응답하게 하고(재시도로 또 hang을 만들지 않도록 타임아웃은 재시도하지 않는다).
  // op-래퍼 상한이 서버선택 타임아웃보다 짧으면, 콜드 아이솔레이트에서 연결이 자기 선택창(기본 8s)
  // 안인데도 op-래퍼가 먼저 잘라 "MongoDB operation timed out"으로 무조건 실패한다(→ 전 라우트 503).
  // 서버선택창 + 쿼리 여유(3.5s)를 하한으로 강제해, env 설정과 무관하게 이 미스매치를 구조적으로 차단한다.
  const serverSelectionTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS", "8000"), 8000, 2000, 15000);
  const attemptTimeoutFloorMS = options.respectServerSelectionFloor === false
    ? 0
    : serverSelectionTimeoutMS + 3500;
  const attemptTimeoutMinimumMS = clampTimeoutMs(
    options.minAttemptTimeoutMS != null ? options.minAttemptTimeoutMS : 1500,
    1500,
    250,
    18000,
  );
  const attemptTimeoutMS = Math.max(
    attemptTimeoutFloorMS,
    clampTimeoutMs(
      options.attemptTimeoutMS != null ? options.attemptTimeoutMS : getEnv(env, "MONGO_OP_ATTEMPT_TIMEOUT_MS", "12000"),
      12000,
      attemptTimeoutMinimumMS,
      18000,
    ),
  );

  // op-타임아웃 메시지는 아래 withTimeout 던짐과 catch의 판별이 공유한다(문자열 드리프트 방지).
  const operationTimeoutMessage = "MongoDB operation timed out in Worker.";

  const poolResetCooldownMS = clampInt(getEnv(env, "MONGO_POOL_RESET_COOLDOWN_MS", "2000"), 2000, 0, 10000);
  const resetOnOperationTimeout = options.resetOnOperationTimeout != null
    ? options.resetOnOperationTimeout !== false
    : !isTruthyLike(getEnv(env, "MONGO_DISABLE_RESET_ON_OPERATION_TIMEOUT", "false"));
  // 연속 실패가 이 횟수를 넘으면 동시 요청이 있어도 리셋을 강행한다(아래 catch 참고).
  const forceResetAfter = clampInt(getEnv(env, "MONGO_POOL_FORCE_RESET_AFTER", "3"), 3, 1, 10);
  // 강행 리셋이 폭주하지 않도록 최소 간격만 남긴다(쿨다운 자체는 우회한다).
  const forcedResetMinIntervalMS = Math.min(poolResetCooldownMS, 1000);

  let lastError = null;
  // 🔴 admission 거절(MongoOperationOverloadedError)은 아래 재시도 루프 **이전**에 던져져 willRetry
  // 에 닿지 않는다 — 그래서 이 에러만 "transient 로 분류되는데 재시도는 불가능"한 유일한 부류였고,
  // 순간 포화(1인 팬아웃 5~6슬롯 × 동시 사용자 2명)가 곧바로 하드 503 이 됐다(체크아웃 실측, 상단
  // MONGO_MAX_IN_FLIGHT_OPS 주석). 호출부가 retryAdmissionOnOverload 로 옵트인한 결제·인증
  // 크리티컬 읽기에 한해 짧은 지터 후 **슬롯 획득만 1회** 재시도한다. 예산 검산: 2500(1차 admission)
  // + ≤300(지터) + 2500(2차) ≈ 5.3s < 11.5s(시도 상한 하한). 전면 기본화하지 않는 이유: 모든
  // 대기자가 재진입하면 진짜 지속 포화에서 대기열 압력만 두 배가 된다 — 순간 버스트를 흡수하는
  // 장치이지 용량을 늘리는 장치가 아니다.
  let releaseMongoOpSlot;
  try {
    releaseMongoOpSlot = await acquireMongoOperationSlot(env, options);
  } catch (admissionError) {
    if (options.retryAdmissionOnOverload !== true || admissionError?.name !== "MongoOperationOverloadedError") {
      throw admissionError;
    }
    await sleep(150 + Math.floor(Math.random() * 150));
    releaseMongoOpSlot = await acquireMongoOperationSlot(env, options);
  }
  const pendingAttemptTasks = new Set();
  let admissionReleased = false;
  let operationFinalized = false;
  const opRecord = { startedAt: Date.now() };
  const finalizeOperation = () => {
    if (operationFinalized || pendingAttemptTasks.size > 0) return;
    operationFinalized = true;
    activeMongoOps.delete(opRecord);
    if (countActiveMongoOps() <= 0 && pendingPoolReset) {
      pendingPoolReset = false;
      lastPoolResetAt = Date.now();
      consecutiveConnectionFailures = 0;
      void resetMongooseConnection();
    }
  };
  const releaseAdmission = () => {
    if (admissionReleased) return;
    admissionReleased = true;
    releaseMongoOpSlot();
  };
  activeMongoOps.add(opRecord);
  try {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      // 시도 단위 계측 — 타임아웃 났을 때 '연결에서 샜는지 / 쿼리에서 샜는지'를 가른다.
      const attemptStartedAt = Date.now();
      const countersAtStart = snapshotMongoCounters();
      let connectFinishedAt = 0;
      try {
        const attemptTask = (async () => {
          await connectDb(env);
          connectFinishedAt = Date.now();
          return await operation();
        })();
        pendingAttemptTasks.add(attemptTask);
        attemptTask.then(
          () => {
            pendingAttemptTasks.delete(attemptTask);
            finalizeOperation();
          },
          () => {
            pendingAttemptTasks.delete(attemptTask);
            finalizeOperation();
          },
        );
        const result = await withTimeout(
          attemptTask,
          attemptTimeoutMS,
          operationTimeoutMessage,
        );
        // 이 연결 위에서 실제로 작업이 성공했다 = 연결은 살아 있다. 다른 요청이 예약해 둔 전역
        // disconnect가 있다면 취소한다 — 멀쩡한 연결을 끊어 다음 요청을 콜드 재연결로 몰지 않는다.
        pendingPoolReset = false;
        consecutiveConnectionFailures = 0;
        return result;
      } catch (error) {
        lastError = error;
        // 연결 레벨 실패(일시적 에러 또는 op-타임아웃)는 웜 커넥션이 죽었을 수 있으므로, 던지기 전에
        // 웜 상태를 무효화해 다음 시도/다음 요청이 콜드 재연결로 자가복구하게 한다(일반 쿼리 에러엔
        // 리셋하지 않는다 — 불필요한 재연결 폭풍 방지). op-타임아웃 메시지는 isTransientMongoError에
        // 잡히지 않아 과거엔 리셋 없이 throw됐고, 죽은 웜 커넥션이 stateless Worker 아이솔레이트에 잔존해
        // 그 아이솔레이트로 가는 모든 유료/인증 요청을 계속 11.5s hang→503/500으로 만들었다(지속성의 원인).
        const isOperationTimeout = String(error?.message || "") === operationTimeoutMessage;
        // 🔴 대기열 타임아웃은 '연결이 죽었다'가 아니라 '풀이 바쁘다'는 신호다 — 리셋 대상이 아니다.
        // admission 한도(8) > maxPoolSize(5) 라 초과분이 드라이버 waitQueue 로 가고, 거기서 나는
        // MongoWaitQueueTimeoutError 는 isTransientMongoError 에 포함돼 있다. 이걸 연결 레벨 실패로
        // 세면 consecutiveConnectionFailures 가 올라가 3회에 forceReset → 전역 disconnect 가 돌고,
        // bufferCommands:false 라 그 순간 살아 있던 동시 요청까지 함께 죽는다. 즉 **포화가 전면 절단으로
        // 번진다** — 위 MONGO_MAX_IN_FLIGHT_OPS 주석이 경고하는 "복구 가능한 대기를 복구 불가능한
        // 실패로 바꾸는" 안티패턴 그 자체다. 한도를 풀 크기 위로 올린 것과 이 제외는 한 세트다.
        //
        // 재시도·상태코드는 건드리지 않는다: isTransientMongoError 자체는 그대로라 아래 willRetry 가
        // 여전히 재시도하고, 라우트 계층의 503(재시도 가능) 매핑도 그대로다. 여기서 빠지는 것은
        // '웜 커넥션 무효화 + 풀 리셋' 판정뿐이다.
        const isWaitQueueTimeout = String(error?.name || "") === "MongoWaitQueueTimeoutError";
        const isConnectionLevelFailure = !isWaitQueueTimeout
          && ((isOperationTimeout && resetOnOperationTimeout) || isTransientMongoError(error));
        const willRetry = attempt < maxRetries
          && isTransientMongoError(error)
          && error?.name !== "MongoOperationOverloadedError";
        if (isOperationTimeout) {
          // 이 한 줄이 세 후보를 가른다:
          //   connectMs 가 크다        → 연결 수립이 범인(현재 실측상 아님, 중앙값 1497ms)
          //   checkedOut 증가 없음     → 풀에서 커넥션을 못 받음(포화 또는 요청간 I/O 격리)
          //   commandStarted 만 증가   → 명령은 나갔는데 서버 응답이 안 옴(Atlas 지연)
          //   증분이 전부 0            → 명령이 아예 나가지 않음(요청간 I/O 격리 유력)
          try {
            console.log("[db-op-timeout]", JSON.stringify({
              attempt: attempt + 1,
              totalMs: Date.now() - attemptStartedAt,
              connectMs: connectFinishedAt ? connectFinishedAt - attemptStartedAt : null,
              opMs: connectFinishedAt ? Date.now() - connectFinishedAt : null,
              inFlightOps: countActiveMongoOps(),
              delta: diffMongoCounters(countersAtStart),
            }));
          } catch (e) {
            // 계측 실패가 에러 처리를 막아서는 안 된다.
          }
        }
        // ⚠️ "방금 맺은 연결은 좀비가 아니니 리셋을 건너뛴다"를 2026-08-01 에 넣었다가 되돌렸다.
        // 전제는 "콜드 핸드셰이크가 시도 예산을 태운다"였는데, 같은 변경에서 추가한 핸드셰이크 계측
        // (`[db-connect] ... elapsedMs`)이 그 전제를 반증했다 — 핸드셰이크 중앙값은 1497ms 로 싸다.
        // 실측 결과 느린 요청 비율도 74%(수정 전) → 78%(수정 후)로 개선이 없었고, 쿼리가 멈춘 연결을
        // 그대로 붙들고 있을 위험만 남았다. 같은 아이디어를 다시 넣으려면 먼저 계측으로 전제를 세울 것.
        // 실제 병목은 연결 수립이 아니라 **수립된 연결 위에서 쿼리가 12초를 넘기는 것**이다.
        if (isConnectionLevelFailure) {
          lastHealthyAt = 0;
          connectPromise = null;
          // 🔴 우리가 방금 끊은 직후의 실패는 '연속 실패'로 세지 않는다.
          // disconnect 는 bufferCommands:false 라 그 순간 살아 있던 동시 요청의 작업을 함께 죽인다.
          // 그 실패들은 새로운 정보가 아니라 **우리 리셋의 메아리**인데, 그대로 세면 한 번의 리셋이
          // 곧바로 다음 forceReset(연속 3회)을 재장전해 자기지속 폭풍이 된다 — 프로덕션에서 관측된
          // 형태다(리셋 흔적 lastCheckOutFailReason:"poolClosed" 가 반복되는 내내 12초 op-타임아웃이
          // 이어지고 유료 라우트가 INFRA_503_AUTH 를 냈다).
          // 리셋 직후 짧은 창에서는 진짜 장애와 메아리를 구분할 방법이 없고, 방금 복구를 실행했으므로
          // 재장전을 잠시 미루는 쪽이 안전하다. 창을 지나서도 실패가 계속되면 그때 정상적으로 센다.
          const echoOfOurReset = Date.now() - lastPoolResetAt < SELF_INFLICTED_FAILURE_WINDOW_MS;
          if (!echoOfOurReset) consecutiveConnectionFailures += 1;
          // 🔴 데드락 탈출구. 아래 inFlightOps 가드는 '살아서 실행 중인 동시 요청'을 보호하려는 것인데,
          // 이 연결 위에서 성공한 작업 없이 연속으로 N번 실패했다면 보호할 건강한 요청이 없다 —
          // 동시 요청들도 전부 같은 죽은 소켓에 매달려 있다. 그런데도 계속 미루면, 실패를 본 클라이언트가
          // 재시도를 이어가며 inFlightOps 를 1 이상으로 유지해 **리셋이 영영 실행되지 않고** 아이솔레이트가
          // 죽은 연결에 붙박인다(2026-07-28 실측: 전 라우트가 auth/payments/billing 가릴 것 없이
          // "MongoDB operation timed out" 을 반복, 워커가 hung 으로 요청을 취소하기까지 함).
          // 그래서 연속 실패가 임계를 넘으면 쿨다운과 동시성 가드를 모두 우회해 즉시 끊는다.
          const forceReset = consecutiveConnectionFailures >= forceResetAfter
            && Date.now() - lastPoolResetAt >= forcedResetMinIntervalMS;
          // 전역 disconnect는 아이솔레이트 공유 풀을 끊어 동시 요청까지 절단하므로(재연결 폭풍), 쿨다운을 둔다:
          // op-타임아웃 버스트가 disconnect를 1회만 유발하게 해 동시 요청 연쇄 절단을 막는다. maxIdleTimeMS가
          // 좀비를 근절하므로 이 disconnect 자체가 드물어지며, connectDb의 좀비-보존 정책과도 정합한다.
          if (forceReset || Date.now() - lastPoolResetAt >= poolResetCooldownMS) {
            // 🔴 나 말고도 진행 중인 작업이 있으면 지금 끊지 않는다. 전역 disconnect는 '아직 살아서
            // 실행 중인' 동시 요청의 소켓까지 함께 잘라, 한 번의 블립을 동시 요청 전부의 실패로 번지게
            // 한다(메인 진입 시 auth/me·balance·subscription이 한꺼번에 503 나던 근본 원인).
            // connectDb의 ping 실패 경로가 readyState===1이면 disconnect를 거부하는 것과 같은 이유다 —
            // 두 경로의 정책을 일치시킨다. 여기서는 예약만 하고, 마지막 작업이 빠져나갈 때 처리한다.
            // 위의 lastHealthyAt/connectPromise 무효화는 그대로라 다음 요청은 어차피 재검증한다.
            // A lone timed-out attempt may never settle, so deferring its reset
            // forever leaves the isolate pinned to a dead pool. Protect other
            // active requests, but let the lone/forced recovery reset proceed.
            if (countActiveMongoOps() > 1 && !forceReset) {
              pendingPoolReset = true;
            } else {
              // 나 혼자거나(끊어도 아무도 안 다침) 연속 실패로 강행 판정 = 지금 끊는다.
              // 예약분이 있었다면 이걸로 갈음한다.
              pendingPoolReset = false;
              lastPoolResetAt = Date.now();
              consecutiveConnectionFailures = 0;
              await resetMongooseConnection();
            }
          }
        }
        // op-타임아웃은 재시도하지 않는다(인증 다중조회 라우트에서 11.5s×N 누적 → hung-detection 재유발
        // 방지). 리셋만 하고 즉시 던져 이 요청은 빠르게 degrade시키되, 다음 요청이 깨끗한 연결로 복구된다.
        if (!willRetry) throw error;
        await sleep(baseDelayMS * (attempt + 1));
      }
    }
    throw lastError;
  } finally {
    // A timed-out driver promise can settle after this request has already
    // returned. Keep it counted for reset safety, but do not let it reserve an
    // admission slot and turn every later read into an overload 503.
    releaseAdmission();
    finalizeOperation();
  }
}

export { mongoose };

// 테스트 전용 관찰/조작 창구. 프로덕션 경로는 이 객체를 참조하지 않는다.
// in-flight 회계와 연속 실패 카운터는 모듈 스코프라 밖에서 볼 수 없는데, 바로 그 둘이
// 리셋 폭풍의 핵심 상태라 회귀 테스트가 반드시 확인해야 한다.
export const __dbTestUtils = {
  countActiveMongoOps,
  getConsecutiveConnectionFailuresForTest: () => consecutiveConnectionFailures,
  // 나이 기반 만료를 시간 경과 없이 재현한다(테스트에서 15초를 실제로 기다릴 수는 없다).
  expireActiveOpsForTest: () => {
    for (const record of activeMongoOps) {
      record.startedAt -= ABANDONED_OP_MAX_AGE_MS + 1000;
    }
    return countActiveMongoOps();
  },
  // agoMs 만큼 과거에 리셋이 있었던 것으로 둔다(쿨다운·자기유발 창을 시간 경과 없이 재현).
  markPoolResetForTest: (agoMs = 0) => {
    lastPoolResetAt = Date.now() - agoMs;
    consecutiveConnectionFailures = 0;
  },
};
