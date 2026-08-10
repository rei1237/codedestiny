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
import { withMongoRetry, mongoose } from "../lib/db.js";

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

/* 왕복 카운터. 예산(계획서: orders 1회 · confirm cold 3회)이 지켜지는지 **실측으로** 보기 위한 것이지
   장식이 아니다. 회귀는 코드 리뷰가 아니라 이 숫자가 잡는다. */
function makeCountingDb(ctx) {
  const count = () => { ctx.mongoOps += 1; };
  return {
    findOne(Model, filter, options) {
      count();
      return Model.collection.findOne(filter, options);
    },
    find(Model, filter, options) {
      count();
      return Model.collection.find(filter, options).toArray();
    },
    insertOne(Model, doc) {
      count();
      return Model.collection.insertOne(doc);
    },
    updateOne(Model, filter, update, options) {
      count();
      return Model.collection.updateOne(filter, update, options);
    },
    findOneAndUpdate(Model, filter, update, options) {
      count();
      return Model.collection.findOneAndUpdate(filter, update, options);
    },
    deleteOne(Model, filter) {
      count();
      return Model.collection.deleteOne(filter);
    },
    countDocuments(Model, filter, options) {
      count();
      return Model.collection.countDocuments(filter, options);
    },
  };
}

/* 결제 경로 전용 재시도 설정.
   retries 는 db.js 기본값(1)을 그대로 쓴다 — 결제에서 재시도를 더 늘리면 admission 을 더 먹는다.
   사용자가 금지한 "숨기는 재시도"는 **라우트·클라이언트 레벨**의 것이고, 드라이버 한 단계 재연결은
   그것과 다르다(연결이 끊긴 것과 요청이 실패한 것은 다른 사건이다). 여기서 0 으로 낮추면 콜드
   아이솔레이트의 첫 요청이 핸드셰이크 중 끊길 때마다 사용자에게 그대로 나간다. */
const PAYMENT_DB_OPTIONS = Object.freeze({});

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
      return fn(makeCountingDb(ctx));
    }, PAYMENT_DB_OPTIONS);
  } finally {
    ctx.inDb = false;
  }
}

export const __paymentDbTestUtils = { makeCountingDb, PAYMENT_DB_OPTIONS };
