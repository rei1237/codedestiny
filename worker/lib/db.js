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
// 버려진 작업을 회계에서 제외하기까지의 시간. socketTimeoutMS(프로덕션 [vars] 7초 — 실측값은
// wrangler [vars]/db.vars-code-default-parity 테스트가 정본, 2026-08-31) + 여유 —
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

// 🔴 결제 전용 admission 레인. 아래 connectPaymentDb 의 소켓 레인과 **한 세트**다.
// 2c2a16205 는 소켓만 나누고 이 게이트를 공유한 채 뒀는데, 그러면 부팅 폭풍이 공유 한도(12)를
// 채우는 순간 checkout 이 여전히 2500ms 뒤 MongoOperationOverloadedError → 재시도 제외 →
// 하드 503 이 된다(= "PG 결제창이 안 뜬다"의 남은 절반). maxConcurrent 옵션으로는 못 고친다 —
// 그 옵션은 같은 active 카운터의 한도만 낮출 뿐이라 카운터가 이미 차 있으면 소용이 없다.
// 카운터 자체를 분리해야 "부팅 트래픽이 결제 슬롯을 먹는" 경로가 구조적으로 사라진다.
const mongoPaymentAdmission = globalThis.__mongoPaymentAdmission
  || (globalThis.__mongoPaymentAdmission = {
    active: 0,
    waiters: [],
  });

function resolveAdmissionLane(options = {}) {
  return options.admissionLane === "payment" ? mongoPaymentAdmission : mongoOperationAdmission;
}

function createMongoOperationOverloadedError() {
  const error = new Error("MongoDB operation capacity is temporarily saturated.");
  error.name = "MongoOperationOverloadedError";
  error.code = "MONGO_OPERATION_ADMISSION_TIMEOUT";
  return error;
}

function drainMongoOperationWaiters(lane) {
  // 🔴 대기열 선두에서 멈추지 않고 **스캔**한다.
  // 예전에는 선두 대기자가 못 들어가면 곧바로 return 했다. 모든 대기자의 limit 이 같을 때는 그게
  // 맞았지만, 지금은 낮은 limit 을 쓰는 우선순위 레인이 있다(worker/lib/security: maxConcurrent 2).
  // 그대로 두면 limit 2 인 보안 대기자가 선두에 있을 때 active 가 2 이상이기만 하면 뒤에 있는
  // limit 5 인증·결제 대기자까지 통째로 막힌다(head-of-line blocking). 자기 limit 을 못 넘는
  // 대기자는 건너뛰고 다음을 본다 — 건너뛰어진 쪽은 자기 타임아웃(보안 레인 250ms)에 실패하고,
  // 그 실패는 fail-open 이라 정책에 영향이 없다.
  // 같은 limit 끼리는 배열 순서를 그대로 따르므로 FIFO 가 유지된다.
  let index = 0;
  while (index < lane.waiters.length) {
    const waiter = lane.waiters[index];
    if (waiter.settled) {
      lane.waiters.splice(index, 1);
      continue;
    }
    if (lane.active >= waiter.limit) {
      index += 1;
      continue;
    }
    lane.waiters.splice(index, 1);
    waiter.settled = true;
    clearTimeout(waiter.timer);
    lane.active += 1;
    waiter.resolve(() => releaseMongoOperationSlot(lane));
  }
}

function releaseMongoOperationSlot(lane) {
  lane.active = Math.max(0, lane.active - 1);
  drainMongoOperationWaiters(lane);
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
// 한도 > 풀 이어야 한다. 초과분은 waitQueue 로 가며, 그 대기가 리셋을 유발하지 않도록
// withMongoRetry 의 isConnectionLevelFailure 에서 MongoWaitQueueTimeoutError 를 제외해 뒀다(한 세트다).
// 🔴 8 → 12 (2026-08-12). 단건결제 체크아웃에서 resolveActiveUserAuth 가 이 게이트에 걸려
// MongoOperationOverloadedError(재시도 제외) → 503 AUTH_STATUS_TEMPORARILY_UNAVAILABLE 로
// 죽는 것을 프로덕션에서 실측(Network 탭 "checkout" 요청 그대로 재현) — 결제창이 대부분 안 뜨고
// 가끔만 뜨던 원인이었다.
//
// 🔴 12 → 24 (2026-08-12, Atlas M0 → M10 전환). 위 "⚠️ 8 은 1인 기준 처방" 경고가 예고한 지점에
// 실제로 도달했다 — 팬아웃 6 × 동시 진입 2명 = 12 라 한도와 정확히 같아져 여유가 0 이었다.
// M0 에서는 그 이상 올릴 수 없었다(공유 vCPU 라 동시 op 를 늘리면 op 당 지연이 같이 늘어 예산을
// 넘겼다). M10 은 전용 노드라 그 제약이 사라졌고, 커넥션 상한도 노드당 1,490 으로 M0(500 공유)의
// 3배다. 24 = 팬아웃 6 × 동시 4명. 이건 용량을 늘린 게 아니라 **M0 때문에 눌러 둔 값을 티어에
// 맞게 되돌린 것**이다. 근본 처방(진입 엔드포인트 수 줄이기)은 여전히 유효하며 이걸로 대체되지 않는다.
//
// 🔴 M10 에서도 이 한도를 **무한정 올리면 안 된다** — 새 벽은 총량이 아니라 **신규 커넥션 생성률
// (노드당 초당 15개, M10·M20 전용)** 이다. 한도를 올려 풀이 더 많은 소켓을 열게 되는 것 자체는
// 괜찮지만(소켓은 재사용된다), 그 소켓이 자주 버려졌다 다시 열리면 그 예산을 태운다.
// 그래서 이 값과 maxIdleTimeMS(아래 connectDb) 는 **반대 방향으로 함께** 움직여야 한다.
const MONGO_MAX_IN_FLIGHT_OPS_DEFAULT = "24";
// 1500ms 는 콜드 핸드셰이크 중앙값(1497ms)보다 짧았다 — 연결 하나 세우는 시간도 못 기다렸다는 뜻이다.
// 예산 검산: 2500(admission) + 5000(waitQueue) + 쿼리 ≈ 8s < 11.5s(시도 상한 하한). 여유 있다.
const MONGO_OP_ADMISSION_TIMEOUT_MS_DEFAULT = "2500";

// 결제 레인의 한도. 위 공유 레인 주석과 같은 논리로 **한도 > 풀** 이어야 한다 — 초과분이
// admission(2500ms, 재시도 **불가**)이 아니라 드라이버 waitQueue(5000ms, 재시도 가능)에서
// 기다리게 하는 것이 요점이다.
// 🔴 6 → 12 (M10 전환). 결제 레인 풀도 4 → 6 으로 올렸다(MONGO_PAYMENT_POOL_SIZE). 결제는
// 임계경로라 여유를 공유 레인보다 후하게 잡는다 — 여기서 한 번 거절되면 사용자에게는 "결제창이
// 안 뜬다" 로 보이고, 그 복구는 재시도 버튼뿐이다.
const MONGO_PAYMENT_MAX_IN_FLIGHT_OPS_DEFAULT = "12";

async function acquireMongoOperationSlot(env, options = {}) {
  const lane = resolveAdmissionLane(options);
  const isPaymentLane = lane === mongoPaymentAdmission;
  const limitDefault = isPaymentLane
    ? MONGO_PAYMENT_MAX_IN_FLIGHT_OPS_DEFAULT
    : MONGO_MAX_IN_FLIGHT_OPS_DEFAULT;
  const limit = clampInt(
    options.maxConcurrent != null
      ? options.maxConcurrent
      : getEnv(
        env,
        isPaymentLane ? "MONGO_PAYMENT_MAX_IN_FLIGHT_OPS" : "MONGO_MAX_IN_FLIGHT_OPS",
        limitDefault,
      ),
    Number(limitDefault),
    1,
    // 상한은 기본값보다 커야 한다 — 같으면 env 노브가 아래로만 움직여 긴급 상향을 못 한다.
    // 🔴 2026-08-12 이전에는 상한이 기본값과 **같아서**(12/12) 이 규칙이 이미 깨져 있었다.
    // M10 전환으로 기본값을 24/12 로 올리면서 상한도 함께 벌려 노브를 되살린다.
    isPaymentLane ? 24 : 48,
  );
  const waitTimeoutMS = clampTimeoutMs(
    options.admissionTimeoutMS != null
      ? options.admissionTimeoutMS
      : getEnv(env, "MONGO_OP_ADMISSION_TIMEOUT_MS", MONGO_OP_ADMISSION_TIMEOUT_MS_DEFAULT),
    Number(MONGO_OP_ADMISSION_TIMEOUT_MS_DEFAULT),
    100,
    5000,
  );

  if (lane.active < limit) {
    lane.active += 1;
    return () => releaseMongoOperationSlot(lane);
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
      const index = lane.waiters.indexOf(waiter);
      if (index >= 0) lane.waiters.splice(index, 1);
      try {
        console.warn("[db-op-admission]", JSON.stringify({
          lane: isPaymentLane ? "payment" : "shared",
          limit,
          waitTimeoutMS,
          active: lane.active,
          queued: lane.waiters.length,
        }));
      } catch (e) {
        // Diagnostics must never change the failure path.
      }
      reject(createMongoOperationOverloadedError());
    }, waitTimeoutMS);
    lane.waiters.push(waiter);
    drainMongoOperationWaiters(lane);
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

/**
 * 핸드셰이크 한 덩어리(elapsedMs)를 네 갈래로 가른다.
 *
 * 왜 필요한가: 프로덕션 핸드셰이크는 410~450ms 인데(2026-08-31), 그 값 하나로는 **줄일 수 있는
 * 성분이 남았는지**를 못 가른다. 왕복 수로만 설명되면(= helloRttMs × N) 코드로 줄일 것이 없고
 * RTT 자체가 답이다. 반대로 dnsMs 가 큰 덩어리면 `mongodb+srv://` 를 시드리스트 URI 로 바꿔
 * SRV+TXT 조회 두 번을 없앨 수 있다 — 그건 코드가 아니라 URI 하나의 문제다.
 *
 *   dnsMs        connect() 시작 → 첫 serverOpening. SRV/TXT 조회 구간(비-SRV URI 면 0에 가깝다).
 *   hosts        토폴로지에 등록된 노드 수(M10 리플리카셋이면 3).
 *   helloRttMs   첫 hello 왕복. **Atlas 까지의 실제 RTT 단위**라 나머지 값을 왕복 수로 환산한다.
 *   socketReadyMs 풀 소켓 하나의 connectionCreated → connectionReady. TCP+TLS+SCRAM 인증 합계.
 *
 * 실패해도 연결을 막지 않는다(전부 try 안, 값은 -1 로 남는다).
 */
function observeConnectPhases(startedAt) {
  const phases = { dnsMs: -1, hosts: 0, helloRttMs: -1, socketReadyMs: -1 };
  try {
    const client = mongoose.connection.getClient?.();
    if (!client || typeof client.on !== "function") return phases;
    const createdAtByConnection = new Map();
    client.on("serverOpening", () => {
      phases.hosts += 1;
      if (phases.dnsMs < 0) phases.dnsMs = Date.now() - startedAt;
    });
    client.on("serverHeartbeatSucceeded", (event) => {
      if (phases.helloRttMs < 0) phases.helloRttMs = Math.round(Number(event?.duration) || 0);
    });
    client.on("connectionCreated", (event) => {
      const key = `${event?.address}#${event?.connectionId}`;
      if (!createdAtByConnection.has(key)) createdAtByConnection.set(key, Date.now());
    });
    client.on("connectionReady", (event) => {
      if (phases.socketReadyMs >= 0) return;
      const openedAt = createdAtByConnection.get(`${event?.address}#${event?.connectionId}`);
      if (openedAt) phases.socketReadyMs = Date.now() - openedAt;
    });
  } catch (e) {
    // 계측 실패가 연결 수립을 막아서는 안 된다.
  }
  return phases;
}

function formatConnectPhases(phases) {
  if (!phases) return "dnsMs=-1 hosts=0 helloRttMs=-1 socketReadyMs=-1";
  return `dnsMs=${phases.dnsMs} hosts=${phases.hosts} helloRttMs=${phases.helloRttMs} socketReadyMs=${phases.socketReadyMs}`;
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

// 배경으로 소켓·세션을 정리하고 있는 stale MongoClient 의 작업. 흐름에는 관여하지 않고
// (아무도 await 하지 않는다) 테스트가 완료를 기다릴 수 있게만 붙들어 둔다.
let staleClientCloseTask = null;

/**
 * 웜 검증(ping)에 실패한 죽은 커넥션을 **임계 경로에서 기다리지 않고** 떼어 낸다.
 *
 * 여기 있던 `await resetMongooseConnection()` 은 요청당 프로덕션 ≈232ms · 스테이징 ≈1316ms 를
 * 먹었고(2026-08-31 `[db-connect] warmResetMs` 실측), 그게 끝나야 새 커넥션 수립이 시작됐다.
 * 비용의 정체는 죽은 소켓 위에서 도는 드라이버 `MongoClient.close()` 다 — activeCursors 정리 →
 * activeSessions 의 endSession() → `endSessions` 명령(서버 왕복) 순서라, 소켓이 죽어 있으면
 * 그 왕복들이 전부 늘어진다(node_modules/mongodb/lib/mongo_client.js 의 `_close`).
 * 🔴 드라이버 7 의 `close(force)` 는 force 를 **무시한다**(`async close(_force = false)`) —
 * "강제로 싸게 닫기"는 선택지가 아니다.
 *
 * 그런데 **새 커넥션을 세우는 데 그 정리가 끝나 있을 필요가 없다.** mongoose 의 `openUri` 는
 * 매번 `new mongodb.MongoClient(...)` 를 만들어 `connection.client` 에 새로 꽂으므로
 * (node-mongodb-native/connection.js 의 `createClient`), 옛 클라이언트는 자기 소켓·토폴로지만
 * 들고 있는 별개 객체다. 그래서 순서를 뒤집는다:
 *
 *   ① mongoose 상태 전이만 먼저 끝낸다 — `close({ skipCloseClient: true })` 는 `doClose` 에서
 *      `client.close()` 를 건너뛰므로 I/O 가 0 이고, 이 await 가 끝난 시점에 readyState 는
 *      확정적으로 0 이다. 이 시점부터 stale 클라이언트는 **mongoose 에서 도달 불가**다.
 *   ② 그 다음에 옛 클라이언트를 배경으로 닫는다. 새 핸드셰이크(프로덕션 ≈423ms ·
 *      스테이징 ≈2440ms)와 겹쳐 돌므로 요청이 그 시간을 다시 내지 않는다.
 *
 * 🔴 이 순서가 2026-08-08 재연결 폭주에 대한 경계를 **좁힌다**. 종전 `mongoose.disconnect()` 는
 * mongoose 가 아직 그 클라이언트를 가리키는 채로 `closeCheckedOutConnections()` 를 불렀다 —
 * 그래서 그 사이 컬렉션을 잡은 op 은 함께 끊겼다. 지금은 **끊기 전에 먼저 떼므로**, 떼어 낸 뒤
 * 들어온 요청은 옛 클라이언트에 닿을 길이 없다. 호출부의
 * `countActiveMongoOps() > activeOpsOwned` 가드(= 남이 쓰고 있으면 아예 여기까지 오지 않는다)는
 * 그대로 남는다 — 두 장치는 서로를 대체하지 않는다.
 *
 * 🔴 옛 클라이언트를 그냥 버리면 안 된다 — `serverMonitoringMode:"poll"` 모니터가 노드마다
 * heartbeat 를 계속 던져(heartbeatFrequencyMS 주석 참조) 트래픽 없는 시간대의 Atlas Opcounters 를
 * 그대로 태운다. 닫기는 하되 기다리지 않는 것이 이 함수의 전부다.
 *
 * 🔴 `skipCloseClient` 가 mongoose 업그레이드로 사라지면 `doClose` 가 그 객체를 그대로
 * `client.close(force)` 에 넘겨 **종전 동작(느리지만 정확한 teardown)** 으로 퇴화한다. 조용히
 * 느려지지 않게 두 테스트가 값으로 고정한다 —
 * `__tests__/worker/db.mongoose-detach-contract.test.js`(실제 mongoose 와의 계약) ·
 * `__tests__/worker/db.warm-teardown-off-critical-path.test.js`(임계 경로 위 순서).
 */
async function detachDeadWarmConnection() {
  const staleClient = (() => {
    try {
      return mongoose.connection.getClient?.() || mongoose.connection.client || null;
    } catch (e) {
      return null;
    }
  })();

  try {
    await mongoose.connection.close({ skipCloseClient: true });
  } catch (error) {
    // 상태 전이에 실패하면 확실한 쪽(전량 teardown)으로 떨어진다. 여기서 조용히 넘기면
    // readyState 가 1 로 남아 아래 재수립이 죽은 커넥션을 그대로 돌려준다 — 2026-08-16 의 7.8초다.
    console.warn(`[db-detach] fast detach failed, falling back to full teardown. reason=${String(error?.message || error).slice(0, 120)}`);
    await resetMongooseConnection();
    return;
  }

  if (!staleClient || typeof staleClient.close !== "function") return;

  const closeStartedAt = Date.now();
  staleClientCloseTask = Promise.resolve()
    .then(() => staleClient.close())
    .then(() => {
      console.log(`[db-detach] stale client closed off the critical path. elapsedMs=${Date.now() - closeStartedAt}`);
    })
    .catch((error) => {
      // 죽은 소켓 위의 close 는 실패해도 정상이다 — 남는 건 mongoose 에서 이미 분리된 객체뿐이라
      // 이 요청에도 다음 요청에도 영향이 없다. 다만 조용히 삼키면 모니터 누수를 못 보므로 남긴다.
      console.warn(`[db-detach] stale client close failed (ignored). elapsedMs=${Date.now() - closeStartedAt} reason=${String(error?.message || error).slice(0, 120)}`);
    });
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

/**
 * @param {object} [env]
 * @param {object} [options]
 * @param {number} [options.activeOpsOwned=0] 호출부가 **이미 회계에 등록해 둔** 자기 op 수.
 *   웜 커넥션 재수립이 "남의 소켓을 끊는 것"인지 판정하는 데만 쓴다(아래 웜 분기).
 *   withMongoRetry 는 슬롯을 잡은 뒤 부르므로 1 을 넘기고, 라우트가 직접 부르는 경우는 0(기본)이라
 *   다른 요청이 하나라도 살아 있으면 끊지 않는 보수적인 쪽으로 떨어진다.
 *   🔴 countActiveMongoOps() 만으로는 이 둘을 구분할 수 없다 — 구분하지 않으면 직접 호출 경로가
 *   동시 요청 하나를 자기 자신으로 착각해 그 요청의 소켓을 끊는다(2026-08-08 재연결 폭풍의 형태).
 */
export async function connectDb(env = {}, options = {}) {
  installProcessEnv(env);
  const activeOpsOwned = Number.isFinite(options?.activeOpsOwned) ? Math.max(0, options.activeOpsOwned) : 0;
  // withMongoRetry 가 넘겨 주는 계측 싱크(없으면 null). 여기서 채우는 값은 전부 진단용이고
  // 흐름을 바꾸지 않는다 — 소비처는 worker/lib/auth.js 의 authDetail 과 아래 [db-*] 로그다.
  const timings = options.timings && typeof options.timings === "object" ? options.timings : null;
  // 웜 커넥션 검증 구간의 실비용. -1 은 '이 요청은 웜 판정을 타지 않았다'(콜드 아이솔레이트)를 뜻한다.
  let warmPingMs = -1;
  let warmResetMs = -1;

  const guardTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_WORKER_CONNECT_GUARD_MS", "10000"), 10000, 3000, 20000);
  // 🔴 8000 → 3000 (2026-08-12, M10 전환의 두 번째 축). 8000 의 근거는 **M0 의 공유 vCPU 스로틀링**
  // 이었다. M10 은 전용 노드라 서버선택 자체가 sub-second 이고, Cloudflare 엣지에서 실제로 드는
  // 비용은 서버선택이 아니라 TLS+인증 핸드셰이크(실측 중앙값 1497ms)다 — 3000 은 그 2배 여유다.
  //
  // 이 값이 중요한 이유는 자기 자신이 아니라 **파생값** 때문이다. withMongoRetry 의 시도 상한 하한이
  // `serverSelectionTimeoutMS + 3500` 이라, 8000 일 때는 11500 아래로 내려갈 수 없어 슬롯 하나가
  // 최대 12초를 붙잡았다. 3000 이면 하한이 6500 이 되어 시도 상한을 8000 으로 낮출 수 있다.
  // 앞선 M10 조정이 **용량 축**(한도 12→24 · 풀 5→10 · maxIdleTime 20s→60s)을 열었다면 이건
  // **점유 시간 축**이다 — 같은 한도로 처리량을 올리므로 전역 연결 예산을 한 개도 더 쓰지 않는다.
  const serverSelectionTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS", "3000"), 3000, 2000, 15000);
  // TLS+인증까지 덮으므로 serverSelection 보다는 여유를 남긴다(콜드 핸드셰이크 1497ms 의 3배).
  const connectTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_CONNECT_TIMEOUT_MS", "5000"), 5000, 2000, 15000);
  // 🔴 op 예산(withMongoRetry 의 attemptTimeoutMS, 기본 8000)보다 **짧게** 잡는다.
  // 예전엔 20000 이라, op-타임아웃이 난 뒤에도 드라이버 작업은 취소되지 않아 소켓이 8초를
  // 더 풀에 묶여 있었다. 멈춘 op 몇 개면 풀이 마비되고, 그 사이 들어온 요청은 체크아웃 큐에서
  // 굶다가 또 예산에 걸리는 자기증폭 고리가 됐다
  // (2026-08-01 [db-op-timeout] 실측: 체크아웃 대기 최대 10,383ms, 한 창에서 41건 시작/4건 성사).
  // 11000 → 7000: 시도 상한이 8000 으로 내려갔으므로 이 부등식을 유지하려면 함께 내려야 한다.
  // 서버 명령 실행은 250~417ms 라 7초도 15배 이상 여유다.
  const socketTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_SOCKET_TIMEOUT_MS", "7000"), 7000, 5000, 45000);
  // 커넥션을 못 받고 큐에서 기다리는 상한. 이걸 넘겨 기다려봐야 어차피 op 예산을 넘기므로,
  // 긴 stall 대신 빠른 실패로 바꿔 호출부가 즉시 degrade 하게 한다.
  // 5000 → 4000: 시도 상한(8000) 안에 큐 대기 + 쿼리가 함께 들어가야 한다
  // (예산 검산: 큐 4초 + 쿼리 0.5초 = 4.5초 < 8초. admission 대기는 이 타이머 **밖**이다).
  const waitQueueTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_WAIT_QUEUE_TIMEOUT_MS", "4000"), 4000, 1000, 15000);
  // 유휴 소켓을 드라이버가 능동적으로 닫아, Atlas 유휴 리핑으로 편도 사망한 좀비(half-open) 소켓을 풀이
  // 보유하는 것을 근절한다(Atlas 유휴 컷보다 짧게). 이 설정 부재가 '웜 쿼리 op-타임아웃 다발·콜드 성공'의
  // 1차 근본 원인이었다 — 유휴 후 재개된 아이솔레이트가 죽은 소켓 위에서 쿼리를 매달았기 때문.
  //
  // 🔴 20000 → 60000 (2026-08-12, Atlas M0 → M10 전환). **이 값의 방향이 티어와 함께 뒤집혔다.**
  // 20초를 고른 근거는 "M0 총 연결 상한 500 을 아이솔레이트들이 나눠 쓰므로 회전율을 3배로 올린다"
  // 였다. 그 전제가 두 군데서 무너진다:
  //   1. M10 의 상한은 노드당 1,490(3노드) 이라 총량이 더 이상 병목이 아니다.
  //   2. 대신 M10·M20 에는 M0 에 없던 **신규 커넥션 생성률 제한(노드당 초당 15개)** 이 있다.
  //      초과분은 큐잉되고, 포화가 지속되면 드롭된다.
  // 즉 "회전율을 3배로 올린다" = "커넥션 생성률을 3배로 올린다" 이고, 그건 M0 에서는 이득이었지만
  // M10 에서는 정확히 새 상한을 향해 돌진하는 설정이다. 살아 있는 아이솔레이트가 20초마다 소켓을
  // 버리고 다시 여는 톱니(sawtooth) churn 이 그 증상이다(Atlas Metrics → Connections 로 확인).
  //
  // 60000 은 임의 값이 아니라 **이 코드가 M0 튜닝 전에 실제로 쓰던 값**이라 프로덕션 검증을 이미
  // 거쳤다. 좀비 소켓 근절이라는 원래 목적(Atlas 유휴 컷보다 짧게)도 그대로 만족한다.
  // 🔴 여기서 더 올리려면 좀비 소켓 재발 여부를 먼저 실측할 것 — 그게 이 옵션이 존재하는 이유다.
  const maxIdleTimeMS = clampTimeoutMs(getEnv(env, "MONGO_MAX_IDLE_TIME_MS", "60000"), 60000, 10000, 300000);
  const retryCount = clampInt(getEnv(env, "MONGO_WORKER_CONNECT_RETRIES", "2"), 2, 0, 4);
  const retryBaseDelayMS = clampInt(getEnv(env, "MONGO_WORKER_RETRY_DELAY_MS", "220"), 220, 0, 2000);

  if (mongoose.connection.readyState === 1) {
    /* 🔴 웜 커넥션을 **검증 없이 재사용하지 않는다**(2026-08-16 프로덕션 실측 후 방향 반전).
     *
     * 여기 있던 "최근에 건강을 확인했으면 ping 을 생략한다"(50초)는 M0→M10 전환기에 넣은 것이고,
     * 그 전제는 "지금 풀에 있는 소켓은 maxIdleTimeMS(60초) 덕에 살아 있다" 였다. 프로덕션에서
     * 재 보니 그 전제가 성립하지 않는다 — Mongo 읽기 **한 건**짜리 라우트
     * (GET /api/payments/orders/:id)를 간격을 바꿔 7회 호출한 결과(Server-Timing, 2026-08-16):
     *
     *   gap=    0ms  cdconn=0     cdop=7843   ← 무검증 재사용 → 쿼리가 죽은 소켓을 밟는다
     *   gap=  300ms  cdconn=1416  cdop=2218
     *   gap=  300ms  cdconn=1269  cdop=135    ← 앞 시도 8121ms 통째 타임아웃 후, 새 커넥션에서 재시도
     *   gap= 1000ms  cdconn=1302  cdop=2212
     *   gap= 3000ms  cdconn=1285  cdop=139    ← 위와 같음
     *   gap=10000ms  cdconn=0     cdop=7852
     *   gap=30000ms  cdconn=0     cdop=7833
     *
     * 300ms 만에 다시 들어온 요청도 죽은 소켓을 만난다 — 즉 원인은 Atlas 유휴 리핑이 아니라
     * **요청 컨텍스트가 끝나면 그 컨텍스트에서 연 소켓이 못 쓰게 되는** Cloudflare 의 성질이고,
     * maxIdleTimeMS 로는 막을 수 없다. 반면 **그 요청 안에서 새로 세운 커넥션**은
     * cdconn≈1280 + cdop≈137 = **1.4초**로 일관되게 빠르다(n=3).
     *
     * 그래서 재사용 판단을 "얼마나 최근에 확인했나"에서 "지금 살아 있음을 확인했나"로 바꾼다.
     * 기본값은 [vars] 와 코드 양쪽 모두 MONGO_PING_MIN_INTERVAL_MS=0 (= 매 요청 검증)이며,
     * 되돌리기는 그 값을 올리는 것 하나다(둘을 함께 — db.vars-code-default-parity.test.js).
     */
    const pingMinIntervalMS = clampTimeoutMs(getEnv(env, "MONGO_PING_MIN_INTERVAL_MS", "0"), 0, 0, 60000);
    if (lastHealthyAt && Date.now() - lastHealthyAt < pingMinIntervalMS) {
      return mongoose.connection;
    }
    /* 3500 → 1000 → 300. 이 타이머는 "느린 서버를 기다리는 예산"이 아니라 **죽은 커넥션을 얼마나 빨리
       포기하는가**이다. 살아 있는 소켓의 ping 은 왕복 한 번이고, 죽은 쪽은 1.3초를 넘겨서야 돌아왔다.
       늦게 포기할수록 그만큼이 그대로 결제창 앞 지연이다.

       🔴 1000 → 300 (2026-08-31). 1000 이 "그 사이를 가른다"는 것은 맞았지만, **거의 모든 요청이
       그 1초를 통째로 낸다**는 것이 프로덕션 실측으로 드러났다. `wrangler tail` 로 프로덕션·스테이징
       워커 로그를 읽고 공용 connectDb 를 타는 `GET /api/insights` 를 6회씩 돌린 결과:

         프로덕션 웜 ×10  요청시작→[db-connect] 1222~1286ms · 핸드셰이크 417~501ms · wall 1761~1867ms
         프로덕션 콜드 ×5  요청시작→[db-connect]  223~ 834ms · 핸드셰이크 1481~1611ms
         스테이징 웜 ×4   요청시작→[db-connect] 1689~1692ms · 핸드셰이크 1247~1269ms · wall 3087~3110ms

       ping 을 타는 웜과 안 타는 콜드의 선행 구간 차이가 **약 1000ms** 로 이 노브와 정확히 같고,
       웜 10건의 산포가 ±32ms 라 고정 타이머의 모양이다. 즉 매 요청이 실패가 예정된 ping 에 1초를
       태우고 있었다. 재수립 자체는 양쪽 환경 공통이며(프로브 12건 전부 새 연결) 스테이징 퇴행이 아니다 —
       3.5s vs 1.4s 격차의 정체는 정책이 아니라 Atlas 핸드셰이크(1256ms vs 493ms)다.

       🔴 그런데도 ping 을 없애지 않는 이유는 **재사용이 되는 요청이 실제로 있기 때문**이다 —
       같은 창에서 `[db-connect]` 없이 353~380ms 로 끝난 요청이 3건 있었다(= ping 이 통과한 살아 있는
       소켓). 검증 없이 무조건 재수립하면 그 요청들을 ~500ms 핸드셰이크로 끌어올리고, M10 의
       노드당 초당 15개 신규 커넥션 생성률 제한(maxIdleTimeMS 주석)을 향해 전 요청을 밀어 넣는다.
       그래서 "포기 속도"만 줄인다. 300 은 이 clamp 의 기존 하한이라 가드레일을 건드리지 않는다.
       🔴 더 내리려면 살아 있는 ping 의 왕복 시간을 먼저 재야 한다 — 위 353ms 는 핸들러+쿼리를 포함한
       요청 전체라 ping 만 분해한 값이 아니다. 그 측정 없이 하한(300)을 내리지 말 것.
       되돌리기는 이 값과 양쪽 `[vars]` 를 함께 1000 으로 올리는 것 하나다
       (__tests__/worker/db.vars-code-default-parity.test.js 가 둘을 묶는다). */
    const pingTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_PING_TIMEOUT_MS", "300"), 300, 300, 10000);
    const pingStartedAt = Date.now();
    try {
      await withTimeout(
        mongoose.connection.db.command({ ping: 1 }),
        pingTimeoutMS,
        "MongoDB ping timed out in Worker.",
      );
      warmPingMs = Date.now() - pingStartedAt;
      if (timings) timings.pingMs = warmPingMs;
      /* 🔴 살아 있는 소켓의 ping 왕복 **단독 수치**다. 이 한 줄이 없어서 하한(clampTimeoutMs 의
         min=300) 인하 판단이 막혀 있었다 — 가진 근거가 핸들러+쿼리를 포함한 요청 전체
         353~380ms 뿐이라 ping 만 떼어낸 값이 없었다(2026-08-31 기각 사유).
         재사용 성공은 프로덕션 45건 중 3건 정도라 로그가 시끄러워지지 않는다. */
      console.log(`[db-ping] warm socket alive. rttMs=${warmPingMs} budgetMs=${pingTimeoutMS}`);
      lastHealthyAt = Date.now();
      return mongoose.connection;
    } catch (e) {
      warmPingMs = Date.now() - pingStartedAt;
      if (timings) timings.pingMs = warmPingMs;
      /* 🔴 검증에 실패한 커넥션을 그대로 돌려주지 않는다. 예전에는 readyState 가 1 이기만 하면
         돌려줬고, 그 뒤 쿼리가 죽은 소켓 위에서 7.8초(위 표 1·6·7행)를 태웠다.
         "느린 성공"은 사용자에게 실패와 구분되지 않는다.

         🔴 다만 **동시 요청이 있으면 끊지 않는다** — 여기의 전역 disconnect 가 같은 아이솔레이트의
         살아 있는 요청까지 함께 죽여 재연결 폭풍을 일으킨 실사고가 있다(2026-08-08). 그때의 처방은
         "절대 끊지 않는다"였는데, 그건 필요조건을 과하게 잡은 것이었다 — 실제로 위험한 것은
         **남의 작업을 끊는 것**이지 내 커넥션을 새로 세우는 것이 아니다. 그래서 조건을
         requestPoolRecovery 와 같은 가드(활성 op 이 나뿐인가)로 좁힌다. 남이 쓰고 있으면 종전대로
         커넥션을 그대로 돌려주고 lastHealthyAt 만 무효화한다(그쪽은 느려도 동작한다). */
      if (mongoose.connection.readyState === 1 && countActiveMongoOps() > activeOpsOwned) {
        lastHealthyAt = 0;
        return mongoose.connection;
      }
      /* 🔴 이 teardown 은 **임계 경로 위에 있었다** — 여기가 끝나야 새 커넥션 수립이 시작됐다.
         2026-08-31 계측(`[db-connect] warmResetMs`)이 그 값을 찍었다: 프로덕션 ≈232ms ·
         스테이징 1313~1390ms. 산술도 닫혔다 — 스테이징 선행 구간 1623 ≈ ping 300 + reset 1316.
         지금은 detachDeadWarmConnection() 이 그 정리를 배경으로 내보내므로 이 resetMs 는
         **떼어 내는 비용만**(mongoose 상태 전이, I/O 0) 남는다. 배경 정리의 실비용은 별도 줄
         `[db-detach]` 로 나간다. */
      const resetStartedAt = Date.now();
      await detachDeadWarmConnection();
      warmResetMs = Date.now() - resetStartedAt;
      if (timings) timings.resetMs = warmResetMs;
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
      // 이 시도가 실제로 커넥션을 세웠을 때만 채워진다(다른 요청이 만든 connectPromise 를 기다린
      // 경우에는 null 로 남는다 — 그 요청의 계측을 훔쳐 오지 않는다).
      let connectStartedAt = 0;
      let connectPhases = null;
      if (!connectPromise) {
        // warmPingMs/warmResetMs 는 "이 요청이 왜 재수립하게 됐는가"의 값이다. 별도 줄로 찍으면
        // 요청당 로그가 하나 더 늘므로 이미 요청당 1회 나가는 이 줄에 붙인다.
        const warmSuffix = warmPingMs >= 0 ? ` warmPingMs=${warmPingMs} warmResetMs=${warmResetMs}` : "";
        console.log(`[db-connect] starting connection to mongodb... family=${ipFamily} attempt=${attempt + 1}/${retryCount + 1}${warmSuffix}`);
        const connectOptions = {
          dbName: resolveMongoDbName(env) || undefined,
          // 🔴 이 값은 전역 예산의 분모다: 총 연결 = 아이솔레이트 수 × maxPoolSize.
          // 2026-08-01 에 "M0 상한 500 에 포화됐다"고 보고 5 → 2 로 줄였다가 **되돌렸다**.
          // 계측이 그 전제를 반증했다:
          //   · 전 구간 `[db-connect-error]` **0건** — 상한에 닿았다면 연결 생성이 실패해야 한다.
          //   · 풀 2 구간에서 체크아웃 **257건 시도 / 219건 실패(85%)**, inFlightOps 가 6까지 올라
          //     커넥션 2개로는 아이솔레이트 내부 동시성을 감당하지 못했다.
          // 즉 병목은 전역 상한이 아니라 **아이솔레이트 내부 풀 고갈**이고, 그건 소켓 점유 시간을
          // 줄이는 쪽(당시 socketTimeoutMS 11초 — 현재값은 [vars]/패리티 테스트가 정본, 2026-08-31)이 맞는
          // 처방이었다. 근거 없이 다시 줄이지 말 것.
          //
          // 🔴 5 → 10 (2026-08-12). 위 진단이 여전히 맞고, 소켓 점유 시간을 줄이는 것만으로는
          // 부족하다는 것이 프로덕션 실측으로 드러났다. 결제 경로 응답 시간이 **두 덩어리로 뭉친다**:
          //   · ~5.07~5.20초 — waitQueueTimeoutMS(5,000)에서 커넥션을 못 받아 실패 → 재시도 성공
          //   · ~14초        — op 예산(12,000)에서 잘려 실패 → 재시도 성공
          // 두 값이 각 타임아웃과 200ms 안쪽으로 일치한다. 즉 대부분의 요청이 '느린 것'이 아니라
          // **커넥션을 기다리다 타임아웃 후 재시도로 살아나는** 것이다. 실제로 자유 소켓을 즉시
          // 받은 요청 하나는 1,588ms 로 끝났다 — 쿼리 자체는 빠르다.
          // Mongo 를 아예 안 쓰는 라우트(GET /api/payments/config)는 158~894ms 라, 워커·네트워크
          // 고정비가 아니라 커넥션 확보가 병목임이 같은 측정에서 함께 확인된다.
          // 전역 예산은 여전히 여유가 있다(총 연결 = 아이솔레이트 수 × 10, M0 상한 500).
          // env(MONGO_MAX_POOL_SIZE)로 배포 없이 되돌릴 수 있다.
          //
          // 🔴 M10 전환 후에도 10 을 유지한다(2026-08-12). 위 두 덩어리(5.1초/14초) 증상의 원인은
          // 소켓 부족 그 자체가 아니라 **M0 에서 op 하나가 소켓을 오래 물고 있던 것**이었다
          // (서버 명령 실행은 250~417ms 인데 체크아웃 대기가 최대 10,383ms). M10 전용 노드에서
          // 점유 시간이 짧아지면 같은 10 소켓의 회전율이 올라가 자연히 해소된다. 여기서 더 올리면
          // 아이솔레이트당 소켓만 늘어 **신규 커넥션 생성률(노드당 15/s)** 예산을 더 먹는다.
          // 올리기 전에 반드시 Atlas Metrics 의 커넥션 그래프와 `[db-op-timeout]` 의 checkOutFailed 를
          // 먼저 볼 것 — 지금 필요한 것은 소켓 수가 아니라 소켓 회전율이다.
          //
          // clampInt 를 쓴다: 예전엔 이 줄만 raw Number() 라 비숫자 env 가 NaN 으로 드라이버에
          // 그대로 들어갔다(이웃 옵션은 전부 clamp 를 탄다).
          maxPoolSize: clampInt(getEnv(env, "MONGO_MAX_POOL_SIZE", "10"), 10, 1, 50),
          // 유휴 시 커넥션을 하나도 붙들지 않는다(드라이버 기본값이지만 전역 예산에 직결되므로 명시).
          // 🔴 M10 에서도 0 을 유지한다. minPoolSize > 0 은 아이솔레이트가 뜰 때마다 그 수만큼
          // 핸드셰이크를 **미리** 하게 만드는데, 서버리스는 아이솔레이트가 수시로 생기고 죽으므로
          // 그게 곧 15/s 예산을 태우는 행위다. 예열은 장수명 런타임에서만 의미가 있다.
          minPoolSize: 0,
          // 🔴 동시에 새로 여는 커넥션 수의 상한(드라이버 기본값 2). M10·M20 의 신규 커넥션
          // 생성률 제한(노드당 초당 15개)에 직접 대응하는 유일한 드라이버 노브라 기본값에 맡기지
          // 않고 명시한다 — 드라이버 버전이 기본값을 바꿔도 우리 예산이 흔들리지 않게 한다.
          // 콜드 아이솔레이트가 풀을 한꺼번에 채우지 않고 2개씩 계단식으로 연다.
          maxConnecting: clampInt(getEnv(env, "MONGO_MAX_CONNECTING", "2"), 2, 1, 8),
          // 🔴 M10 은 3노드 리플리카셋이다(M0 에는 리플리카셋이 없어 이 두 옵션이 무의미했다).
          // 이제 primary 교체(failover/election) 시 드라이버가 자동으로 한 번 다시 시도한다.
          // 🔴 선거 내성을 담당하는 것은 **이 두 옵션과 withMongoRetry 의 재시도**이지 긴 선택창이
          // 아니다(2026-08-13 정정). 예전 주석은 serverSelectionTimeoutMS 8000 을 "선거가 끝날
          // 때까지 기다려 주는 시간"이라 적었지만, 그 값은 파생 하한(+3500)을 통해 모든 요청의
          // 시도 예산을 11.5초로 밀어 올려 슬롯을 붙들었다 — 드문 선거를 위해 상시 비용을 냈다.
          // 지금은 3000 이며(코드·wrangler [vars] 동일), 되올리려면 양쪽을 함께 올려야 한다.
          retryWrites: true,
          retryReads: true,
          // Atlas Query Profiler / Real-Time Panel 에서 부하 주체를 구분하기 위한 라벨.
          // 이게 없으면 공유 커넥션과 결제 레인이 같은 익명 클라이언트로 뭉쳐 보인다.
          appName: String(getEnv(env, "MONGO_APP_NAME", "code-destiny-worker") || "code-destiny-worker").slice(0, 128),
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
          // 🔴 poll 모니터는 노드마다 주기적으로 hello 를 던진다. M10 은 3노드라 클라이언트 하나당
          // 초당 0.3회가 요청과 무관하게 상시 발생하고, 살아 있는 아이솔레이트 수만큼 배수가 된다
          // (M0 는 1노드였으므로 M10 전환만으로 3배가 됐다 — Atlas Opcounters 가 트래픽 없는
          // 새벽에도 평평하게 떠 있는 성분이 이것이다). 드라이버 기본값 10000 을 30000 으로 늘려
          // 3분의 1로 줄인다. 진행 중인 서버 선택은 느려지지 않는다 — 적합한 서버가 없으면
          // 드라이버가 즉시 모니터 확인을 트리거하기 때문이다(minHeartbeatFrequency 500ms).
          // 늦어지는 것은 **유휴 상태에서의 토폴로지 변화 발견**뿐이다.
          heartbeatFrequencyMS: clampTimeoutMs(getEnv(env, "MONGO_HEARTBEAT_FREQUENCY_MS", "30000"), 30000, 10000, 60000),
          // commandStarted/Succeeded 이벤트를 켠다 — '명령이 나갔는지'와 '서버가 늦는지'를
          // 가르는 유일한 신호다. 카운터만 올리므로 비용은 무시할 수준이다.
          monitorCommands: true,
        };
        if (ipFamily === 4 || ipFamily === 6) {
          connectOptions.family = ipFamily;
        }

        connectStartedAt = Date.now();
        const connectTask = mongoose.connect(uri, connectOptions);
        // 🔴 리스너는 connect() **직후 동기적으로** 건다. mongoose 는 MongoClient 를 동기적으로
        // 만든 뒤 SRV DNS 를 비동기로 풀기 때문에, 여기서 걸면 topology 가 열리기 전 구간
        // (= SRV+TXT 조회)이 그대로 잡힌다. 한 틱이라도 늦추면 그 구간을 놓친다.
        connectPhases = observeConnectPhases(connectStartedAt);

        // 핸드셰이크 실비용을 남긴다 — op-타임아웃이 '쿼리가 느린' 것인지 '연결 수립이 느린' 것인지
        // 구분할 유일한 근거다(2026-08-01 조사에서 이 값이 없어 한참 헤맸다).
        connectTask
          .then(() => console.log(`[db-connect] mongodb connected successfully. family=${ipFamily} elapsedMs=${Date.now() - connectStartedAt} ${formatConnectPhases(connectPhases)}`))
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
        if (timings && connectStartedAt) {
          timings.handshakeMs = Date.now() - connectStartedAt;
          if (connectPhases) {
            timings.dnsMs = connectPhases.dnsMs;
            timings.socketReadyMs = connectPhases.socketReadyMs;
            timings.helloRttMs = connectPhases.helloRttMs;
            timings.hosts = connectPhases.hosts;
          }
        }
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
// ── 결제 전용 커넥션 레인 ──────────────────────────────────────────────
// "PG 결제창이 아예 안 뜬다"(2026-08-12 실브라우저 재현)의 원인: 페이지 부팅 요청 폭풍이 공유
// 풀(당시 maxPoolSize 5 · M0 지연 시 op 당 최대 11s — 현재값은 [vars]/패리티 테스트가 정본,
// 2026-08-31)의 소켓을 선점·장점유하면, 결제 checkout 이
// waitQueue(5s)×재시도까지 굶다가 "Timed out while checking out a connection" → DB_BUSY 503.
// admission 노브(8→12)로는 드라이버 풀 자체의 기아를 못 막는다. 그래서 결제 컨텍스트
// (worker/payments/, 네이티브 컬렉션 호출만 사용)에 전용 소켓 풀을 분리한다 — 결제는 배경
// 트래픽과 커넥션을 두고 경쟁하지 않는다. 전역 연결 예산은 아이솔레이트 × (5+4)로 늘지만
// 실측상 여유가 있다(2026-08-01: 풀 5 전 구간 [db-connect-error] 0건). 이 연결이 실패하면
// 호출부(worker/payments/db.js)가 공유 커넥션으로 폴백하므로 오늘보다 나빠지는 경로는 없다.
//
// 🔴 이 소켓 레인만으로는 절반이다 — 위 mongoPaymentAdmission(전용 admission 레인)과 반드시
// 한 세트로 본다. 소켓만 나누고 게이트를 공유하면 부팅 폭풍이 공유 한도를 채우는 순간 결제는
// 소켓을 기다려 보지도 못하고 admission 에서 하드 503 이 된다.
let paymentConnection = null;
let paymentConnectionPromise = null;

// 레인 커넥션을 버린다. 공유 풀의 resetMongooseConnection 은 기본 커넥션만 건드리므로
// (withMongoRetry 의 skipSharedConnect 참고) 레인은 자기 회복 경로가 따로 있어야 한다.
// close 를 빠뜨리면 죽은 커넥션이 아이솔레이트에 그대로 남아 M0 연결 예산만 먹는다.
export async function resetPaymentConnection() {
  const stale = paymentConnection;
  paymentConnection = null;
  if (!stale) return;
  try {
    await stale.close(false);
  } catch (e) {
    // 이미 끊긴 커넥션을 닫는 실패는 정보가 없다 — 참조를 놓은 것으로 목적은 달성됐다.
  }
}

export async function connectPaymentDb(env = {}) {
  installProcessEnv(env);
  if (paymentConnection && paymentConnection.readyState === 1) return paymentConnection;
  if (paymentConnectionPromise) return paymentConnectionPromise;
  // readyState 가 1 이 아닌 커넥션이 남아 있으면 재할당 전에 닫는다(그냥 덮으면 소켓이 샌다).
  if (paymentConnection) await resetPaymentConnection();
  const uri = (
    getEnv(env, "MONGO_URI")
    || getEnv(env, "MONGODB_URI")
    || getEnv(env, "MONGO_URL")
    || getEnv(env, "DATABASE_URL")
  );
  if (!uri) throw new Error("Missing MongoDB URI for the payment connection.");
  const family = clampInt(getEnv(env, "MONGO_IP_FAMILY", "4"), 4, 0, 6);
  const options = {
    dbName: resolveMongoDbName(env) || undefined,
    // 🔴 2 → 4 (2026-08-12). 왕복 수(요청당 1~5회)만 보면 2로 충분한데, confirm 이 PortOne
    // 검증 HTTP(최대 8s)를 withPaymentDb 콜백 **안에서** 돌려 그동안 소켓 하나를 유휴 점유한다
    // (worker/payments/index.js 의 confirmOrder). 즉 2소켓은 "동시 confirm 2건"이 곧 포화라는 뜻이라
    // 왕복 예산이 아니라 점유 시간이 상한을 정한다. 여기를 키우면 전역 연결 예산(아이솔레이트 ×
    // (5 공유 + 이 값), M0 상한 500)을 그만큼 먹는다 — 더 올리려면 [db-connect-error] 가 0 인 것을
    // 먼저 확인할 것(위 connectDb 주석과 같은 기준).
    // 🔴 4 → 6 (2026-08-12, M10 전환). 위 진단(점유 시간이 상한을 정한다)이 그대로 유효하고,
    // M10 의 커넥션 상한(노드당 1,490)에서는 2소켓 더 쓰는 비용이 사실상 0 이다. 동시 confirm
    // 4건이 곧 포화이던 것을 6건으로 벌린다.
    maxPoolSize: clampInt(getEnv(env, "MONGO_PAYMENT_POOL_SIZE", "6"), 6, 1, 10),
    minPoolSize: 0,
    // 공유 커넥션과 같은 이유로 명시한다 — connectDb 의 maxConnecting 주석 참고.
    maxConnecting: clampInt(getEnv(env, "MONGO_MAX_CONNECTING", "2"), 2, 1, 8),
    // 🔴 아래 넷은 **공유 레인(connectDb)과 같은 env·같은 기본값**이어야 한다. 한쪽만 옛 값으로
    // 남으면 같은 이름의 env 가 레인마다 다른 값을 뜻하게 되어 추적이 불가능해진다.
    serverSelectionTimeoutMS: clampTimeoutMs(getEnv(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS", "3000"), 3000, 2000, 15000),
    connectTimeoutMS: clampTimeoutMs(getEnv(env, "MONGO_CONNECT_TIMEOUT_MS", "5000"), 5000, 2000, 15000),
    socketTimeoutMS: clampTimeoutMs(getEnv(env, "MONGO_SOCKET_TIMEOUT_MS", "7000"), 7000, 5000, 45000),
    waitQueueTimeoutMS: clampTimeoutMs(getEnv(env, "MONGO_WAIT_QUEUE_TIMEOUT_MS", "4000"), 4000, 1000, 15000),
    // 공유 커넥션과 같은 값·같은 이유(M10 의 신규 커넥션 생성률 예산) — connectDb 주석 참고.
    maxIdleTimeMS: clampTimeoutMs(getEnv(env, "MONGO_MAX_IDLE_TIME_MS", "60000"), 60000, 10000, 300000),
    // M10 리플리카셋에서 primary 교체 시 결제 op 를 드라이버가 살려 준다 — connectDb 주석 참고.
    retryWrites: true,
    retryReads: true,
    // Atlas Profiler 에서 결제 부하를 공유 트래픽과 분리해 보기 위한 라벨.
    appName: String(getEnv(env, "MONGO_PAYMENT_APP_NAME", "code-destiny-payments") || "code-destiny-payments").slice(0, 128),
    bufferCommands: false,
    autoIndex: false,
    // 공유 커넥션과 같은 이유(Workers 요청 간 I/O 격리)로 poll 모니터링을 쓴다 — connectDb 주석 참고.
    serverMonitoringMode: "poll",
    // 🔴 하트비트 주기도 공유 커넥션과 같은 값을 쓴다(근거는 connectDb 쪽 주석). 레인을 켜면
    // 아이솔레이트당 클라이언트가 둘이 되어 이 상시 부하가 그대로 2배가 되므로 특히 여기서 중요하다.
    heartbeatFrequencyMS: clampTimeoutMs(getEnv(env, "MONGO_HEARTBEAT_FREQUENCY_MS", "30000"), 30000, 10000, 60000),
    // 🔴 공유 커넥션에는 있고 여기엔 없던 계측을 맞춘다. instrumentMongoClient 가 붙지 않으면
    // `[db-op-timeout]` 의 checkOutFailed/checkedOut 카운터가 **가장 사고가 잦은 결제 경로를
    // 보지 못한다** — 진단할 때마다 공유 커넥션 수치를 결제 수치로 착각하게 된다.
    monitorCommands: true,
    ...(family === 4 || family === 6 ? { family } : {}),
  };
  const startedAt = Date.now();
  // 🔴 레인 수립에 재시도가 없던 것이 "결제가 한 번에 안 되고 재시도하면 되는" 증상의 마지막 조각이다
  // (2026-08-12). connectDb 는 IP family 후보 × MONGO_WORKER_CONNECT_RETRIES(2회)로 총 6번까지
  // 시도하는데, 이 레인은 **단 한 번** 시도하고 실패하면 그대로 null 을 돌려줬다. 그러면 호출부
  // (worker/payments/db.js)가 공유 커넥션 폴백으로 넘어가 **핸드셰이크를 처음부터 다시** 하고,
  // 그 둘을 더한 시간이 op 예산(12s)을 넘겨 503 → 사용자가 재시도 → 그때는 웜이라 성공한다.
  // 즉 사용자에게 보이던 "1회 실패 후 성공"은 대부분 이 비대칭이었다. 한 번의 일시적 실패
  // (SRV 조회 흔들림·IPv4 경로 문제·순간 거절)를 사용자에게 그대로 내보내지 않는다.
  //
  // 예산 검산: 시도당 serverSelection 8s 가 상한이지만 M10 전용 노드의 실측 핸드셰이크는 그보다
  // 훨씬 짧다. 그래도 최악을 대비해 **가드 타임아웃으로 전체를 묶는다** — 재시도가 op 예산을
  // 넘겨 버리면 재시도가 없느니만 못하다. 가드는 connectDb 와 같은 노브를 공유한다.
  const laneRetryCount = clampInt(getEnv(env, "MONGO_PAYMENT_CONNECT_RETRIES", "1"), 1, 0, 3);
  const laneGuardMS = clampTimeoutMs(getEnv(env, "MONGO_PAYMENT_CONNECT_GUARD_MS", "9000"), 9000, 3000, 15000);
  const laneFamilies = family === 4 && isTruthyLike(getEnv(env, "MONGO_IP_FAMILY_AUTO_FALLBACK"))
    ? [4, 0]
    : [family];

  const establishLane = async () => {
    let lastError = null;
    for (const candidate of laneFamilies) {
      const attemptOptions = { ...options };
      if (candidate === 4 || candidate === 6) attemptOptions.family = candidate;
      else delete attemptOptions.family;
      for (let attempt = 0; attempt <= laneRetryCount; attempt += 1) {
        try {
          const conn = await mongoose.createConnection(uri, attemptOptions).asPromise();
          paymentConnection = conn;
          console.log(`[db-connect] payment lane connected. elapsedMs=${Date.now() - startedAt} pool=${attemptOptions.maxPoolSize} family=${candidate} attempt=${attempt + 1}`);
          return conn;
        } catch (error) {
          lastError = error;
          console.error(`[db-connect-error] payment lane failed (family=${candidate} attempt=${attempt + 1}): ${String(error?.message || error).slice(0, 200)}`);
          // 마지막 시도가 아니면 짧은 지터 후 재시도한다. connectDb 와 같은 근거·같은 노브.
          if (attempt < laneRetryCount) await sleep(clampInt(getEnv(env, "MONGO_WORKER_RETRY_DELAY_MS", "220"), 220, 0, 2000) * (attempt + 1));
        }
      }
    }
    throw lastError || new Error("Payment lane connection failed.");
  };

  const establishPromise = establishLane();
  // 🔴 withTimeout 은 Promise.race 라 가드가 먼저 끊겨도 **수립 자체는 계속 진행된다.**
  // 그래서 in-flight 표식(paymentConnectionPromise)은 가드 시점이 아니라 수립이 **실제로** 끝날 때
  // 비운다. 가드에서 비우면 다음 요청이 '진행 중인 수립'을 못 보고 두 번째 핸드셰이크를 시작하는데,
  // 그게 M10 의 신규 커넥션 생성률(노드당 15/s) 예산을 태우는 정확히 그 행동이다.
  // 여기서 거절을 흡수(→ null)하는 것은 unhandled rejection 방지 겸, 이 표식을 먼저 받아 가는
  // 동시 호출자에게 "연결 없음"을 정상 값으로 넘기기 위해서다 — worker/payments/db.js 는
  // null 을 받으면 공유 커넥션으로 폴백한다(그 경로가 이미 있다).
  paymentConnectionPromise = establishPromise.then(
    (conn) => conn,
    () => null,
  ).finally(() => { paymentConnectionPromise = null; });
  return withTimeout(establishPromise, laneGuardMS, "Payment lane connection timed out in Worker.");
}

// 우리가 방금 부른 disconnect 의 '메아리'로 볼 실패의 시간 창.
// disconnect 는 bufferCommands:false 라 그 순간 살아 있던 동시 요청의 작업을 함께 죽인다.
// 그 직후 쏟아지는 실패는 새로운 진단 정보가 아니라 우리 행동의 결과다.
const SELF_INFLICTED_FAILURE_WINDOW_MS = 3000;

/**
 * `session.withTransaction(fn, mongoTransactionOptions())` 로 쓴다.
 *
 * 🔴 왜 필요한가 — M0 에는 리플리카셋이 없어 `startSession().withTransaction()` 이 **한 번도 열린
 * 적이 없었다**(영구 503 MONTHLY_ATOMIC_UNAVAILABLE). M10 은 3노드라 2026-08-12 티어 전환과 함께
 * 그 경로 9곳이 **배포 없이** 살아났다. 그런데 드라이버의 기본 동작이 우리 예산과 정면으로 어긋난다:
 *
 *   node_modules/mongodb/lib/sessions.js — `const MAX_TIMEOUT = 120000;`
 *   `withTransaction` 은 TransientTransactionError·UnknownTransactionCommitResult 를
 *   **최대 120초** 동안 내부 재시도한다. 우리 op 예산은 8초(MONGO_OP_ATTEMPT_TIMEOUT_MS)다.
 *
 * 즉 우리가 그 예산에서 잘라 사용자에게 "실패"를 응답한 뒤에도 트랜잭션은 살아서 100초 넘게 더
 * 재시도하다 **커밋될 수 있다.** "실패했다고 안내했는데 돈은 움직인 상태"가 그 결과다.
 * 같은 드라이버 주석이 경고하는 또 하나: 콜백 안에서 에러를 삼키면 드라이버가 트랜잭션이
 * abort 됐는지 알 수 없어 **무한 재시도**한다.
 *
 * 같은 파일이 그 상한을 우리가 정할 길도 함께 열어 둔다:
 *   `const timeoutMS = options?.timeoutMS ?? this.timeoutMS ?? null;`
 *   그리고 MAX_TIMEOUT 은 `!this.timeoutContext?.csotEnabled()` 일 때만 쓰인다.
 * 즉 timeoutMS 를 주면 120초 상한이 **우리 값으로 대체된다**(CSOT, 드라이버 7.1).
 *
 * 8000ms 인 이유: 이 트랜잭션들의 콜백은 전부 순수 Mongo 연산이다(PortOne 검증 같은 외부 HTTP 는
 * 트랜잭션 **밖**에서 끝난다). 문서 26k 규모라 실제 소요는 밀리초 단위이므로 8초는 대단히 넉넉하고,
 * 동시에 op 예산(당시 12초, 현재 [vars] MONGO_OP_ATTEMPT_TIMEOUT_MS=8000 과 같은 값 — 정본은
 * [vars]/패리티 테스트, 2026-08-31) 안에 들어온다. 이건 튜닝 노브가 아니라 **안전 상한**이다.
 *
 * 🔴 이 옵션을 빼지 말 것 — 빼면 조용히 120초로 돌아간다.
 */
export function mongoTransactionOptions(env = {}) {
  // env 를 안 넘겨도 된다: connectDb/connectPaymentDb 가 installProcessEnv 로 process.env 를
  // 채워 두므로 getEnv 가 거기서 읽는다. 호출부(라우트 깊숙한 클로저)에 env 가 없는 곳이 있다.
  return {
    timeoutMS: clampTimeoutMs(getEnv(env, "MONGO_TXN_TIMEOUT_MS", "8000"), 8000, 2000, 15000),
  };
}

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
  // op-래퍼 상한이 서버선택 타임아웃보다 짧으면, 콜드 아이솔레이트에서 연결이 자기 선택창(기본 3s)
  // 안인데도 op-래퍼가 먼저 잘라 "MongoDB operation timed out"으로 무조건 실패한다(→ 전 라우트 503).
  // 서버선택창 + 쿼리 여유(3.5s)를 하한으로 강제해, env 설정과 무관하게 이 미스매치를 구조적으로 차단한다.
  // 🔴 기본값은 connectDb 와 **반드시 같아야 한다**(둘 다 3000). 여기만 옛 값(8000)으로 남으면
  // 하한이 실제 서버선택창보다 5초 커져, 시도 상한을 낮춘 효과가 통째로 사라진다.
  const serverSelectionTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS", "3000"), 3000, 2000, 15000);
  const attemptTimeoutFloorMS = options.respectServerSelectionFloor === false
    ? 0
    : serverSelectionTimeoutMS + 3500;
  const attemptTimeoutMinimumMS = clampTimeoutMs(
    options.minAttemptTimeoutMS != null ? options.minAttemptTimeoutMS : 1500,
    1500,
    250,
    18000,
  );
  // 🔴 12000 → 8000 (2026-08-12, M10 전환의 점유 시간 축). 이 값은 **슬롯 하나가 붙잡히는 최대
  // 시간**이라 admission 레인의 실효 처리량을 직접 정한다(한도를 올리지 않고 얻는 이득이다).
  // 12000 은 위 하한(구 serverSelection 8000 + 3500 = 11500)에 눌려 있던 값이고, 서버선택을 3000 으로
  // 낮추면서 하한이 6500 이 되어 비로소 내릴 수 있게 됐다. 한 시도의 실제 비용은
  // waitQueue(4000) + 쿼리(실측 250~417ms)라 8000 은 2배 가까운 여유다
  // (admission 대기는 이 타이머 **밖**에서 일어난다 — 슬롯 획득이 attempt 루프보다 앞이다).
  //
  // ⚠️ 콜백 안에서 외부 HTTP 를 부르는 호출부는 이 기본값으로는 모자란다. 결제 confirm 이 그렇고
  // (PortOne 검증 최대 8s), 그쪽은 worker/payments/db.js 가 attemptTimeoutMS 를 따로 준다.
  const attemptTimeoutMS = Math.max(
    attemptTimeoutFloorMS,
    clampTimeoutMs(
      options.attemptTimeoutMS != null ? options.attemptTimeoutMS : getEnv(env, "MONGO_OP_ATTEMPT_TIMEOUT_MS", "8000"),
      8000,
      attemptTimeoutMinimumMS,
      18000,
    ),
  );

  // op-타임아웃 메시지는 아래 withTimeout 던짐과 catch의 판별이 공유한다(문자열 드리프트 방지).
  const operationTimeoutMessage = "MongoDB operation timed out in Worker.";
  /* 🔴 슬로우 op 로그 임계(2026-09-06). 이 리포에는 "느린데 성공한" Mongo 작업을 남기는 곳이
     없었다 — [db-op-timeout] 은 예산을 넘긴 실패만 찍고, timings 싱크는 넘긴 호출자(결제 레인)만
     본다. 그래서 로그인·결제 확정의 p95 를 말할 근거가 리포 안에 하나도 없었다(Phase 1 진단 §4).
     성공한 시도의 총 소요가 이 값 이상이면 한 줄만 남긴다. 0 이면 끈다. 라우트 식별은 워커
     로그의 호출 컨텍스트(요청 URL)가 이미 붙이므로 여기서 라벨을 받지 않는다. */
  const slowOpMS = clampInt(getEnv(env, "MONGO_SLOW_OP_MS", "500"), 500, 0, 30000);

  const poolResetCooldownMS = clampInt(getEnv(env, "MONGO_POOL_RESET_COOLDOWN_MS", "2000"), 2000, 0, 10000);
  const resetOnOperationTimeout = options.resetOnOperationTimeout != null
    ? options.resetOnOperationTimeout !== false
    : !isTruthyLike(getEnv(env, "MONGO_DISABLE_RESET_ON_OPERATION_TIMEOUT", "false"));
  /* 🔴 op-타임아웃을 재시도할 것인가. 기본은 **아니오**이고 그 이유는 아래 catch 주석에 있다
     (인증처럼 한 요청이 조회를 여러 번 하는 라우트는 11.5s×N 이 누적돼 워커 hung 감지를 부른다).
     결제 컨텍스트만 예외로 켠다 — withPaymentDb 는 요청당 슬롯도 op 도 **하나**라 누적이 없고,
     실패 시 이미 웜 커넥션 참조를 무효화하므로 재시도는 새 연결로 간다.
     이걸 켜지 않으면 다음이 실측된다(2026-08-12, 18요청): 실패 요청은 정확히 예산(12.2초)에서
     죽고 리셋만 남기며, **그 리셋의 수혜자는 다음 요청**이다. 그래서 성공↔실패가 교대로 나오고
     사용자 입장에서는 "결제창이 될 때도 있고 안 될 때도 있다"가 된다. 재시도를 켜면 그 리셋을
     자기 요청이 쓰므로, 하드 503 이 '조금 느린 성공'으로 바뀐다. */
  const retryOnOperationTimeout = options.retryOnOperationTimeout === true;
  // 연속 실패가 이 횟수를 넘으면 동시 요청이 있어도 리셋을 강행한다(아래 catch 참고).
  const forceResetAfter = clampInt(getEnv(env, "MONGO_POOL_FORCE_RESET_AFTER", "3"), 3, 1, 10);
  // 강행 리셋이 폭주하지 않도록 최소 간격만 남긴다(쿨다운 자체는 우회한다).
  const forcedResetMinIntervalMS = Math.min(poolResetCooldownMS, 1000);
  // 🔴 자기 커넥션을 따로 세우는 호출자(결제 레인 — worker/payments/db.js)는 공유 커넥션의
  // **대상도 주체도 아니다**. 이 플래그는 두 가지를 함께 끈다: ① 시도마다의 connectDb(env)
  // ② 실패 시의 공유 풀 리셋 부기(consecutiveConnectionFailures / resetMongooseConnection).
  // ②가 더 중요하다 — 공유 커넥션을 안 쓰는 실패로 전역 disconnect 를 걸면 자기 레인은 안 낫고
  // bufferCommands:false 때문에 그 순간 살아 있던 **부팅 트래픽만 통째로 죽는다**. 결제 기아를
  // 없애려다 기아의 원인 쪽을 절단하는 셈이다. 레인의 회복은 resetPaymentConnection() 이 맡는다.
  const ownsSharedConnection = options.skipSharedConnect !== true;
  /* 🔴 선택적 계측 싱크. 호출부가 객체를 주면 성공한 시도의 admission/connect/op 소요를 채운다.
     안 주면 아무 것도 하지 않는다 — 이 함수는 전 라우트가 지나므로 기본 경로에 비용을 얹지 않는다.
     같은 값을 이미 [db-op-timeout] 로그가 계산하고 있는데(아래 catch) 그건 **타임아웃일 때만**이라,
     "느린데 성공하는" 요청은 여전히 durationMs 한 덩어리로만 보였다. 그 공백을 메우는 것이 목적이다. */
  const timings = options.timings && typeof options.timings === "object" ? options.timings : null;

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
  const admissionStartedAt = Date.now();
  try {
    releaseMongoOpSlot = await acquireMongoOperationSlot(env, options);
  } catch (admissionError) {
    if (options.retryAdmissionOnOverload !== true || admissionError?.name !== "MongoOperationOverloadedError") {
      if (timings) timings.admissionMs = Date.now() - admissionStartedAt;
      throw admissionError;
    }
    await sleep(150 + Math.floor(Math.random() * 150));
    releaseMongoOpSlot = await acquireMongoOperationSlot(env, options);
    if (timings) timings.admissionRetried = true;
  }
  // 지터·2차 획득까지 포함한 실제 대기. 이 대기는 attempt 타이머 밖이라 attemptMs 에 안 잡힌다.
  if (timings) timings.admissionMs = Date.now() - admissionStartedAt;
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
          // activeOpsOwned:1 — 이 op 은 위에서 이미 activeMongoOps 에 등록됐다. 웜 커넥션 재수립
          // 판정이 자기 자신을 '동시 요청'으로 세지 않게 알려 준다(connectDb 머리주석).
          // timings 를 그대로 넘긴다 — connectDb 가 connectMs 안쪽을 pingMs·resetMs·handshakeMs 로
          // 쪼개 채운다(전용 레인은 공유 커넥션을 안 타므로 넘길 것이 없다).
          if (ownsSharedConnection) await connectDb(env, { activeOpsOwned: 1, timings });
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
        // 전용 레인의 성공은 공유 커넥션에 대해 아무것도 증명하지 않으므로 취소 권한도 없다.
        if (ownsSharedConnection) {
          pendingPoolReset = false;
          consecutiveConnectionFailures = 0;
        }
        if (timings) {
          // [db-op-timeout] 이 실패 때 쓰는 것과 같은 두 경계값이다(새 계산식을 만들지 않는다).
          timings.attempts = attempt + 1;
          timings.connectMs = connectFinishedAt ? connectFinishedAt - attemptStartedAt : 0;
          timings.opMs = connectFinishedAt ? Date.now() - connectFinishedAt : Date.now() - attemptStartedAt;
        }
        const totalMs = Date.now() - attemptStartedAt;
        if (slowOpMS > 0 && totalMs >= slowOpMS) {
          // [db-op-timeout] 과 같은 두 경계값(connectMs / opMs)을 쓴다 — 느린 성공의 원인이
          // 연결 수립인지 쿼리인지를 실패 로그와 같은 눈금으로 가른다.
          try {
            console.log("[db-slow-op]", JSON.stringify({
              lane: ownsSharedConnection ? "shared" : "payment",
              attempt: attempt + 1,
              totalMs,
              connectMs: connectFinishedAt ? connectFinishedAt - attemptStartedAt : null,
              opMs: connectFinishedAt ? Date.now() - connectFinishedAt : null,
              inFlightOps: countActiveMongoOps(),
              thresholdMs: slowOpMS,
            }));
          } catch (e) {
            // 계측 실패가 성공 응답을 막아서는 안 된다.
          }
        }
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
        const isConnectionLevelFailure = ownsSharedConnection
          && !isWaitQueueTimeout
          && ((isOperationTimeout && resetOnOperationTimeout) || isTransientMongoError(error));
        const willRetry = attempt < maxRetries
          && (isTransientMongoError(error) || (isOperationTimeout && retryOnOperationTimeout))
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
        // 실제 병목은 연결 수립이 아니라 **수립된 연결 위에서 쿼리가 op 예산(당시 12초, 현재 [vars]
        // MONGO_OP_ATTEMPT_TIMEOUT_MS=8000 — 정본은 [vars]/패리티 테스트, 2026-08-31)을 넘기는 것**이다.
        if (isConnectionLevelFailure) {
          lastHealthyAt = 0;
          connectPromise = null;
          // 🔴 우리가 방금 끊은 직후의 실패는 '연속 실패'로 세지 않는다.
          // disconnect 는 bufferCommands:false 라 그 순간 살아 있던 동시 요청의 작업을 함께 죽인다.
          // 그 실패들은 새로운 정보가 아니라 **우리 리셋의 메아리**인데, 그대로 세면 한 번의 리셋이
          // 곧바로 다음 forceReset(연속 3회)을 재장전해 자기지속 폭풍이 된다 — 프로덕션에서 관측된
          // 형태다(리셋 흔적 lastCheckOutFailReason:"poolClosed" 가 반복되는 내내 op-타임아웃(당시 12초)이
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
        // op-타임아웃은 기본적으로 재시도하지 않는다(인증 다중조회 라우트에서 11.5s×N 누적 →
        // hung-detection 재유발 방지). 리셋만 하고 즉시 던져 이 요청은 빠르게 degrade시키되,
        // 다음 요청이 깨끗한 연결로 복구된다.
        // 🔴 예외는 retryOnOperationTimeout 을 켠 호출자(결제)뿐이다 — 위 선언부 주석 참고.
        // 그 경우 방금 무효화한 웜 참조 덕에 재시도가 **새 연결**로 가므로, 리셋의 수혜자가
        // 다음 요청이 아니라 자기 자신이 된다(= 하드 503 이 느린 성공으로 바뀐다).
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
  // 배경 teardown 은 아무도 await 하지 않으므로(그게 이 변경의 요점이다) 테스트가 완료를
  // 확인할 창구가 따로 필요하다. 프로덕션 경로는 이 값을 읽지 않는다.
  awaitStaleClientCloseForTest: () => Promise.resolve(staleClientCloseTask),
  // agoMs 만큼 과거에 리셋이 있었던 것으로 둔다(쿨다운·자기유발 창을 시간 경과 없이 재현).
  markPoolResetForTest: (agoMs = 0) => {
    lastPoolResetAt = Date.now() - agoMs;
    consecutiveConnectionFailures = 0;
  },
};
