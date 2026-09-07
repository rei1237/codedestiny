/**
 * @jest-environment node
 *
 * 운명 찻집 결제 증빙 조회의 **쿼리 캐스팅** 계약.
 *
 * 왜 이 파일이 필요한가: 클라이언트는 매 상담 요청에 `ftea_<hash>_<base36>` 형태의 attemptId 를
 * requestId·idempotencyKey 로 함께 보낸다(src/features/fortune-tea-house/lib/honeyDrops.ts).
 * 증빙 조회는 그 토큰들을 여러 필드에 뿌려 `$or` 를 만드는데, `PointHistory.paymentId` 는
 * 스키마 타입이 ObjectId 라서 Mongoose 가 **쿼리 캐스팅 단계에서** CastError 를 던졌다.
 * 그 오류는 transient 로도 db-unavailable 로도 분류되지 않아 결제 안내(402) 대신 500 이 됐고,
 * 결과적으로 **이용권이 커버하지 못하는 사용자에게 결제창이 아예 뜨지 않았다**(실사고).
 *
 * 🔴 models.js 를 mock 으로 바꾸지 말 것 — 이 가드의 전제가 "실제 스키마 타입"이다.
 */
import { PaidExecutionRecord, Payment, PointHistory } from "../../worker/lib/models.js";
import { idClauses } from "../../worker/routes/fortune-tea-house.js";

const ATTEMPT_ID = "ftea_1a2b3c4d_m9x8k";
const OBJECT_ID = "507f1f77bcf86cd799439011";

const POINT_FIELDS = ["paymentId", "impUid", "merchantUid", "metadata.requestId"];

function castOr(model, clauses) {
  return model.findOne({ $or: clauses }).cast(model);
}

describe("증빙 조회 쿼리 캐스팅 — ObjectId 경로에 임의 토큰을 넣지 않는다", () => {
  test("🔴 전제: PointHistory.paymentId 는 ObjectId 라서 임의 토큰을 그대로 넣으면 던진다", () => {
    expect(PointHistory.schema.path("paymentId").instance).toBe("ObjectId");
    expect(() => castOr(PointHistory, [{ paymentId: ATTEMPT_ID }])).toThrow(/Cast to ObjectId failed/);
  });

  test("🔴 idClauses 가 만든 절은 캐스팅에서 던지지 않는다 (500 → 402 회귀 방지)", () => {
    const clauses = idClauses(PointHistory, [ATTEMPT_ID], POINT_FIELDS);
    expect(clauses.length).toBeGreaterThan(0);
    expect(() => castOr(PointHistory, clauses)).not.toThrow();
    expect(clauses.some((clause) => "paymentId" in clause)).toBe(false);
  });

  test("24-hex 증빙은 계속 ObjectId 필드로도 조회된다 (증빙 커버리지 축소 금지)", () => {
    const clauses = idClauses(PointHistory, [OBJECT_ID], POINT_FIELDS);
    expect(clauses.some((clause) => clause.paymentId === OBJECT_ID)).toBe(true);
    expect(clauses.some((clause) => clause._id === OBJECT_ID)).toBe(true);
    expect(() => castOr(PointHistory, clauses)).not.toThrow();
  });

  test("String 타입 필드는 그대로 남는다 (PaidExecutionRecord·Payment 증빙 경로)", () => {
    const deferred = idClauses(PaidExecutionRecord, [ATTEMPT_ID], ["requestId", "idempotencyKey", "paymentId"]);
    expect(deferred.some((clause) => clause.requestId === ATTEMPT_ID)).toBe(true);
    expect(deferred.some((clause) => clause.paymentId === ATTEMPT_ID)).toBe(true);
    expect(() => castOr(PaidExecutionRecord, deferred)).not.toThrow();

    const payments = idClauses(Payment, [ATTEMPT_ID], ["requestId", "idempotencyKey", "merchantUid", "impUid"]);
    expect(payments).toHaveLength(4);
    expect(() => castOr(Payment, payments)).not.toThrow();
  });
});
