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
const PAYMENT_DB_OPTIONS = Object.freeze({
  /* 🔴 결제 전용 admission 레인. 소켓 레인(connectPaymentDb)과 **한 세트**다 — 소켓만 나누고
     이 게이트를 공유하면, 부팅 폭풍이 공유 한도를 채우는 순간 결제가 여전히 2500ms 뒤
     MongoOperationOverloadedError(재시도 제외) → 하드 503 이 된다. 그게 "PG 결제창이 안 뜬다"의
     남은 절반이었다(worker/lib/db.js mongoPaymentAdmission 주석). */
  admissionLane: "payment",
  /* 결제는 임계경로다. 순간 버스트로 슬롯을 못 잡았을 때 하드 503 대신 짧은 지터 뒤 1회만
     다시 잡는다(예산: 2500+≤300+2500 ≈ 5.3s < 11.5s 시도 상한). 전용 레인이라 지속 포화
     가능성이 낮아 대기열 압력이 배가되는 부작용도 제한적이다. */
  retryAdmissionOnOverload: true,
  /* 🔴 공유 커넥션 핸드셰이크를 타지 않는다. 이게 없으면 **콜드 아이솔레이트에서 핸드셰이크를
     두 번** 한다 — withMongoRetry 가 시도마다 connectDb(공유)를 부르고, 그 뒤 아래 콜백이
     connectPaymentDb(레인)를 또 세운다. M0 서버선택이 최대 8초라 둘을 직렬로 하면 12초 op
     예산을 넘겨 DB_UNAVAILABLE(op timeout)이 된다. 2026-08-12 배포 직후 실측: 같은 핸들러인데
     웜 아이솔레이트로 간 /api/payments/prepare 는 201, 콜드로 간 /api/billing/checkout 은 503.
     실패 시의 공유 풀 리셋 부기도 함께 꺼진다 — 레인 실패로 전역 disconnect 를 걸면 레인은
     안 낫고 그 순간 살아 있던 부팅 트래픽만 죽는다(worker/lib/db.js ownsSharedConnection 주석). */
  skipSharedConnect: true,
});

/**
 * 이 요청의 **모든** Mongo 작업을 한 슬롯 안에서 실행한다.
 *
 * @param {object} env
 * @param {ReturnType<typeof createPaymentContext>} ctx
 * @param {(db: ReturnType<typeof makeCountingDb>) => Promise<any>} fn
 */
export async function withPaymentDb(env, ctx, fn) {
  if (ctx.inDb) {
    // 중첩은 슬롯을 2개 먹고, 바깥 재시도가 안쪽을 통째로 재실행해 시도 수를 곱한다.
    // 이 레포에는 그 사고 이력이 있다(CLAUDE.md 코딩 원칙 6번).
    throw new Error("withPaymentDb is already active for this request; do not nest it.");
  }
  ctx.inDb = true;
  try {
    return await withMongoRetry(env, async () => {
      // 재시도가 일어나면 이전 시도의 왕복은 세지 않는다 — 예산은 '성공한 시도'의 비용이다.
      ctx.mongoOps = 0;
      /* 결제 전용 레인이 이 요청의 **유일한** 핸드셰이크다(위 skipSharedConnect).
         레인 수립에 실패한 경우에만 공유 커넥션을 세워 폴백한다 — 그때는 핸드셰이크 비용을
         내야 하지만, 그건 '레인이 죽었을 때'로 한정된 예외 경로이고 가용성이 지연보다 중요하다.
         🔴 폴백에서 connectDb 를 빠뜨리면 안 된다: bufferCommands:false 라 연결이 없는 상태의
         Model.collection 호출은 버퍼링 없이 즉시 실패한다. */
      let paymentConn = null;
      try { paymentConn = await connectPaymentDb(env); } catch { paymentConn = null; }
      if (!paymentConn) await connectDb(env);
      return fn(makeCountingDb(ctx, paymentConn));
    }, PAYMENT_DB_OPTIONS);
  } finally {
    ctx.inDb = false;
  }
}

export const __paymentDbTestUtils = { makeCountingDb, resolveCollection, PAYMENT_DB_OPTIONS };
