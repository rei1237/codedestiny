/**
 * 결제 컨텍스트의 **유일한 Mongo 진입점**.
 *
 * ## 규칙 하나: 요청당 admission 슬롯 1개
 *
 * 503 의 근본 원인은 결제 로직 버그가 아니라 admission 포화였다. 실측(worker/lib/db.js:101-134)으로
 * 한도는 8, 풀은 5인데 `POST /api/billing/coin-gate` 한 번이 슬롯을 4~6개 먹었다. 즉 **동시 결제
 * 2명이면 한도를 넘고**, 넘는 순간 MongoOperationOverloadedError 가 재시도 제외라 곧바로 하드 503 이
 * 된다. 복구 가능한 대기가 복구 불가능한 실패로 바뀌는 지점이 거기다.
 *
 * 그래서 이 파일이 `withMongoRetry` 를 부르는 **컨텍스트 내 유일한 곳**이고, 핸들러의 모든 Mongo
 * 작업은 그 콜백 **하나 안에서** 돈다. 슬롯은 요청당 정확히 1개다. db.js 의 주석이 말한
 * "근본 처방은 한도를 올리는 게 아니라 auth 를 각자 다시 푸는 진입 엔드포인트 수를 줄이는 것"을
 * 라우트가 아니라 **구조**로 지키는 방법이다.
 *
 * 중첩은 실수로도 못 하게 막는다(아래 nested 가드). verify:no-nested-retry 가 정적으로도 잡지만,
 * 정적 검사는 동적 호출 경로를 못 보므로 런타임 가드를 함께 둔다.
 *
 * ## 왜 네이티브 드라이버(Model.collection.*)인가
 *
 * 핫패스에서 mongoose 캐스팅·검증을 건너뛴다. 부수 효과가 더 중요한데, mongoose 의 strict 모드가
 * **스키마에 없는 필드를 조용히 버리는** 함정을 아예 통과하지 않는다. 대신 캐스팅이 없으므로
 * 타입은 호출부가 책임진다 — 아래 toObjectId/toUserIdString 를 반드시 경유할 것.
 */
import { getEnv } from "../lib/env.js";
import {
  connectDb,
  connectPaymentDb,
  isTransientMongoError,
  mongoose,
  resetPaymentConnection,
  withMongoRetry,
} from "../lib/db.js";

/* 🔴 ContentEntitlement.userId 는 String 이고 나머지 결제 컬렉션은 전부 ObjectId 다
   (worker/lib/models.js). 네이티브 드라이버는 캐스팅을 해 주지 않으므로, auth 의 userId 를
   그대로 넘기면 타입이 어긋난 채 저장되고 **unique 인덱스가 충돌하지 않는다** — 중복 방지가
   조용히 사라진다는 뜻이다. 컬렉션마다 어느 쪽인지 여기 두 함수로만 표현한다. */
export function toObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  const text = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(text)) return null;
  return new mongoose.Types.ObjectId(text);
}

export function toUserIdString(value) {
  return String(value || "").trim();
}

/** 요청 하나의 수명 동안 들고 다니는 상태. 로그 한 줄과 왕복 예산이 여기서 나온다. */
export function createPaymentContext({ requestId, route }) {
  return {
    requestId: String(requestId || ""),
    route: String(route || ""),
    startedAt: Date.now(),
    mongoOps: 0,
    inDb: false,
  };
}

/* 결제 전용 커넥션(connectPaymentDb)의 컬렉션 해석. 전용 레인이 아직 없거나 실패한 경우
   공유 커넥션(Model.collection)으로 폴백한다 — 레인 분리는 기아 방지 최적화이지 가용성
   조건이 아니다("PG 결제창이 안 뜬다" 2026-08-12, worker/lib/db.js 결제 레인 주석 참고). */
function resolveCollection(Model, paymentConn) {
  if (paymentConn && paymentConn.readyState === 1) {
    try {
      const name = Model.collection.collectionName || Model.collection.name;
      if (name) return paymentConn.db.collection(name);
    } catch { /* 공유 커넥션 폴백 */ }
  }
  return Model.collection;
}

/* 왕복 카운터. 예산(계획서: orders 1회 · confirm cold 3회)이 지켜지는지 **실측으로** 보기 위한 것이지
   장식이 아니다. 회귀는 코드 리뷰가 아니라 이 숫자가 잡는다. */
function makeCountingDb(ctx, paymentConn = null) {
  const count = () => { ctx.mongoOps += 1; };
  const col = (Model) => resolveCollection(Model, paymentConn);
  return {
    findOne(Model, filter, options) {
      count();
      return col(Model).findOne(filter, options);
    },
    find(Model, filter, options) {
      count();
      return col(Model).find(filter, options).toArray();
    },
    insertOne(Model, doc) {
      count();
      return col(Model).insertOne(doc);
    },
    updateOne(Model, filter, update, options) {
      count();
      return col(Model).updateOne(filter, update, options);
    },
    findOneAndUpdate(Model, filter, update, options) {
      count();
      return col(Model).findOneAndUpdate(filter, update, options);
    },
    deleteOne(Model, filter) {
      count();
      return col(Model).deleteOne(filter);
    },
    countDocuments(Model, filter, options) {
      count();
      return col(Model).countDocuments(filter, options);
    },
  };
}

/* 결제 경로 전용 재시도 설정.
   retries 는 db.js 기본값(1)을 그대로 쓴다 — 결제에서 재시도를 더 늘리면 admission 을 더 먹는다.
   사용자가 금지한 "숨기는 재시도"는 **라우트·클라이언트 레벨**의 것이고, 드라이버 한 단계 재연결은
   그것과 다르다(연결이 끊긴 것과 요청이 실패한 것은 다른 사건이다). 여기서 0 으로 낮추면 콜드
   아이솔레이트의 첫 요청이 핸드셰이크 중 끊길 때마다 사용자에게 그대로 나간다. */
/**
 * 🔴 소켓 레인은 **기본 꺼짐**이다(2026-08-12 실측 후 결정).
 *
 * 레인을 켠 채 프로덕션을 재면 요청의 약 1/3 이 **정확히 op 예산(12.2초)에서** DB_UNAVAILABLE 로
 * 죽었고(성공 요청은 1.3~3.6초), 경로와 무관했다. 특정 아이솔레이트의 레인 커넥션이 좀비가 되면
 * 그 아이솔레이트로 라우팅된 결제가 계속 예산까지 매달린다는 뜻이다 — 공유 커넥션에는 이 상황을
 * 위한 복구 기계장치(연속 실패 카운터 · 풀 리셋 · 쿨다운)가 있지만 **레인에는 없었다.**
 * 게다가 skipSharedConnect 는 그 부기까지 꺼서, 레인이 죽으면 아무도 고치지 않는 상태가 된다.
 *
 * 그래서 커넥션 처리는 검증된 공유 경로로 되돌리고, 정작 효과가 확인된 **admission 레인만** 남긴다
 * (부팅 폭풍이 결제 슬롯을 먹는 문제는 그쪽이 해결했다 — 카운터 분리는 커넥션을 늘리지 않는다).
 * 아래 자가복구(resetPaymentConnection)를 배선해 두었으므로, Mongo 티어를 올린 뒤
 * `PAYMENTS_DB_SOCKET_LANE=1` 로 다시 켜서 재실측할 수 있다.
 */
function isSocketLaneEnabled(env) {
  const raw = String(getEnv(env, "PAYMENTS_DB_SOCKET_LANE", "") || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

const PAYMENT_DB_OPTIONS = Object.freeze({
  /* 🔴 결제 전용 admission 레인. 소켓 레인(connectPaymentDb)과 **한 세트**다 — 소켓만 나누고
     이 게이트를 공유하면, 부팅 폭풍이 공유 한도를 채우는 순간 결제가 여전히 2500ms 뒤
     MongoOperationOverloadedError(재시도 제외) → 하드 503 이 된다. 그게 "PG 결제창이 안 뜬다"의
     남은 절반이었다(worker/lib/db.js mongoPaymentAdmission 주석). */
  admissionLane: "payment",
  /* 결제는 임계경로다. 순간 버스트로 슬롯을 못 잡았을 때 하드 503 대신 짧은 지터 뒤 1회만
     다시 잡는다(예산: 2500+≤300+2500 ≈ 5.3s). admission 대기는 시도 타이머 **밖**이라
     시도 상한을 잡아먹지 않는다. 전용 레인이라 지속 포화 가능성이 낮아 대기열 압력이
     배가되는 부작용도 제한적이다. */
  retryAdmissionOnOverload: true,
  /* 🔴 op-타임아웃을 이 요청 안에서 한 번 더 시도한다(결제 전용 예외 — db.js
     retryOnOperationTimeout 선언부 주석에 근거와 다른 라우트를 끄는 이유가 있다).
     실측(2026-08-12, 18요청): 실패는 정확히 예산(12.2초)에서 나고 풀 리셋만 남기는데, 그 리셋의
     수혜자가 **다음 요청**이라 성공↔실패가 교대로 나왔다 — 사용자에겐 "될 때도 있고 안 될 때도
     있는 결제창"이다. 켜면 그 리셋을 자기 요청이 써서 하드 503 이 느린 성공으로 바뀐다.
     결제는 요청당 슬롯도 op 도 하나뿐이라(withPaymentDb) 누적 걱정이 없고, 최악 16초도
     셸 checkout 상한(25초) 안이다(시도 상한 8초 × 2).
     🔴 이 산식은 db.js 코드 기본값과 wrangler.toml [vars] 가 **일치할 때만** 성립한다. 둘이 갈라지면
     env 가 이기고, serverSelectionTimeoutMS 가 크면 파생 하한(+3500)이 시도 상한을 8초 위로 밀어
     올려 이 주석이 조용히 거짓이 된다(2026-08-13 정렬 전 실제 상황: 8초가 아니라 11.5초였다). */
  retryOnOperationTimeout: true,
});

/**
 * 🔴 PG 검증을 콜백 **안에서** 하는 호출부(=확정)의 시도 예산.
 *
 * 공유 기본값(8000)은 "waitQueue + Mongo 쿼리"만 담는 예산이다. 그런데 confirmOrder 는
 * verifyPgPayment(PortOne REST, PORTONE_API_TIMEOUT_MS 기본 8000)를 withPaymentDb 콜백 안에서
 * 돌린다. 한 시도의 최악 비용이 waitQueue 4000 + PortOne 8000 + 쿼리 4~5회 ≈ 14초라, 기본값으로
 * 두면 **PG 가 느린 순간마다** op-타임아웃이 난다.
 *
 * 그 실패가 특히 나쁜 이유: 카드는 이미 승인됐는데 주문이 PENDING 으로 남는다. 재조정 크론
 * (worker/lib/payment-reconcile-task.js reconcilePendingPayments)이 PortOne 에 다시 물어 정산하므로
 * 돈이 사라지지는 않지만, 사용자는 그 사이 "결제 실패"를 본다. 되돌리지 말 것.
 *
 * retryOnOperationTimeout 을 끄는 이유: 여기서의 op-타임아웃은 죽은 커넥션이 아니라 **PG 지연**이
 * 지배적이라 재시도해도 같은 이유로 또 기다린다. 게다가 15000 × 2 = 30초는 셸 confirm 상한(25초,
 * index.html 의 요청 타임아웃 표)을 넘겨, 서버가 아직 붙들고 있는 요청을 클라가 먼저 포기하게 된다.
 * 커넥션 문제의 복구는 재조정 크론과 클라이언트의 재확정 티켓이 맡는다.
 *
 * 🔴 15000 은 **시도 상한 clamp(18000)** 안이어야 하고 셸 상한(25000)보다 작아야 한다.
 * PORTONE_API_TIMEOUT_MS 를 올리면 여기도 함께 올려야 한다(둘은 한 세트다).
 */
export const CONFIRM_DB_OPTIONS = Object.freeze({
  attemptTimeoutMS: 15000,
  retryOnOperationTimeout: false,
});

/* 소켓 레인을 켠 경우에만 공유 핸드셰이크를 끈다. 두 커넥션을 직렬로 세우면 콜드 아이솔레이트가
   op 예산을 넘기기 때문이다(레인이 켜져 있을 때만 성립하는 이야기다).
   overrides 는 호출부별 예산 조정용이다 — 지금은 CONFIRM_DB_OPTIONS 하나뿐이고, 새 키를
   자유롭게 받는 확장점이 아니다(admissionLane 을 덮으면 레인 분리가 조용히 무너진다). */
function paymentDbOptions(env, overrides) {
  const base = isSocketLaneEnabled(env)
    ? { ...PAYMENT_DB_OPTIONS, skipSharedConnect: true }
    : PAYMENT_DB_OPTIONS;
  if (!overrides) return base;
  return { ...base, ...overrides, admissionLane: PAYMENT_DB_OPTIONS.admissionLane };
}

/**
 * 이 요청의 **모든** Mongo 작업을 한 슬롯 안에서 실행한다.
 *
 * @param {object} env
 * @param {ReturnType<typeof createPaymentContext>} ctx
 * @param {(db: ReturnType<typeof makeCountingDb>) => Promise<any>} fn
 * @param {object} [overrides] 호출부별 예산(CONFIRM_DB_OPTIONS). 생략하면 결제 기본값.
 */
export async function withPaymentDb(env, ctx, fn, overrides) {
  if (ctx.inDb) {
    // 중첩은 슬롯을 2개 먹고, 바깥 재시도가 안쪽을 통째로 재실행해 시도 수를 곱한다.
    // 이 레포에는 그 사고 이력이 있다(CLAUDE.md 코딩 원칙 6번).
    throw new Error("withPaymentDb is already active for this request; do not nest it.");
  }
  ctx.inDb = true;
  const laneEnabled = isSocketLaneEnabled(env);
  try {
    return await withMongoRetry(env, async () => {
      // 재시도가 일어나면 이전 시도의 왕복은 세지 않는다 — 예산은 '성공한 시도'의 비용이다.
      ctx.mongoOps = 0;
      /* 레인이 꺼져 있으면(기본) 공유 커넥션만 쓴다 — withMongoRetry 가 이미 connectDb 를
         부르므로 여기서 할 일이 없고, 커넥션 처리는 복구 기계장치가 있는 검증된 경로를 탄다.
         레인을 켠 경우에는 레인이 이 요청의 유일한 핸드셰이크이고, 수립 실패 시에만 공유
         커넥션으로 폴백한다(bufferCommands:false 라 연결 없이 Model.collection 을 부르면
         버퍼링 없이 즉시 실패하므로 폴백 경로에는 connectDb 가 반드시 필요하다). */
      let paymentConn = null;
      if (laneEnabled) {
        try { paymentConn = await connectPaymentDb(env); } catch { paymentConn = null; }
        if (!paymentConn) await connectDb(env);
      }
      try {
        return await fn(makeCountingDb(ctx, paymentConn));
      } catch (error) {
        /* 🔴 레인 자가복구. 좀비 커넥션(readyState 는 1인데 실제로는 죽은 소켓)이 되면 그
           아이솔레이트로 오는 결제가 계속 op 예산까지 매달린다 — 공유 풀에는 리셋 기계장치가
           있지만 레인에는 없어서, 이 배선이 없으면 **영구 실패**가 된다. 연결성 실패일 때만
           참조를 놓아 다음 요청이 새로 세우게 한다(정상 오류는 그대로 통과). */
        if (paymentConn && isTransientMongoError(error)) {
          try { await resetPaymentConnection(); } catch { /* 참조를 놓은 것으로 목적 달성 */ }
        }
        throw error;
      }
    }, paymentDbOptions(env, overrides));
  } finally {
    ctx.inDb = false;
  }
}

export const __paymentDbTestUtils = {
  makeCountingDb, resolveCollection, PAYMENT_DB_OPTIONS, paymentDbOptions, isSocketLaneEnabled,
};
