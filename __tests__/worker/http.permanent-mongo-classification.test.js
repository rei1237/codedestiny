/**
 * @jest-environment node
 *
 * isDbUnavailableError 의 "일시적 / 영구" 경계를 고정한다.
 *
 * 왜 필요한가: 이 판별기 하나가 503(재시도하세요)과 500(코드 버그다)을 가른다. 넓히면 영구 버그가
 * "DB 일시 장애" 뒤에 숨고(2026-08-09 에 ConflictingUpdateOperators 가 그렇게 며칠간 숨어 기능이
 * 100% 죽어 있었다 — scripts/verify-no-timestamp-update-conflict.mjs 참고), 좁히면 진짜 인프라 흔들림이
 * 500 으로 나가 재시도·degrade 경로가 통째로 죽는다. 양쪽 실패가 다 조용해서 테이블로 못박는다.
 */
import { isDbUnavailableError, isPermanentMongoError } from "../../worker/lib/http.js";

function mongoError(name, message, code) {
  const error = new Error(message);
  error.name = name;
  if (code !== undefined) error.code = code;
  return error;
}

/* 재시도해도 결과가 같은 것들 — 500 으로 나가야 눈에 띈다. */
const PERMANENT_CASES = [
  ["BadValue(2)", mongoError("MongoServerError", "unknown operator", 2)],
  ["FailedToParse(9)", mongoError("MongoServerError", "bad pipeline", 9)],
  ["TypeMismatch(14)", mongoError("MongoServerError", "field is of wrong type", 14)],
  ["IndexNotFound(27)", mongoError("MongoServerError", "index not found", 27)],
  ["PathNotViable(28)", mongoError("MongoServerError", "cannot create field", 28)],
  ["ConflictingUpdateOperators(40)", mongoError("MongoServerError", "conflict at updatedAt", 40)],
  ["ImmutableField(66)", mongoError("MongoServerError", "performing an update on _id", 66)],
  ["InvalidOptions(72)", mongoError("MongoServerError", "invalid options", 72)],
  ["DocumentValidationFailure(121)", mongoError("MongoServerError", "document failed validation", 121)],
  ["QueryExceededMemoryLimit(292)", mongoError("MongoServerError", "exceeded memory limit", 292)],
  ["MongoInvalidArgumentError", mongoError("MongoInvalidArgumentError", "Argument must be a string")],
  ["MongoParseError", mongoError("MongoParseError", "Invalid connection string")],
  ["MongoAPIError", mongoError("MongoAPIError", "Cannot use a session that has ended")],
  ["MongoCompatibilityError", mongoError("MongoCompatibilityError", "Topology does not support")],
  ["MongoMissingDependencyError", mongoError("MongoMissingDependencyError", "optional dependency")],
  ["MongoMissingCredentialsError", mongoError("MongoMissingCredentialsError", "credentials required")],
  // 코드 96(OperationFailed)은 너무 범용이라 코드로 못 잡는다 — 문구로만 좁혀 잡는다.
  ["sort memory blowup (code 96)", mongoError("MongoServerError", "Executor error: Sort exceeded memory limit of 33554432 bytes", 96)],
  ["external sorting refusal", mongoError("MongoServerError", "Sort operation did not opt in to external sorting", 96)],
];

/* 인프라가 흔들리는 것들 — 503 + 재시도/degrade 로 남아야 한다. 하나라도 false 가 되면
   결제·인증·access-state 의 degrade 경로가 조용히 죽는다. */
const TRANSIENT_CASES = [
  ["op 타임아웃(withMongoRetry 문구)", new Error("MongoDB operation timed out in Worker.")],
  ["connectDb 가드 타임아웃", new Error("MongoDB connection timed out in Worker.")],
  ["connection not ready", new Error("MongoDB connection is not ready in Worker.")],
  ["admission 포화", mongoError("MongoOperationOverloadedError", "MongoDB operation capacity is temporarily saturated.", "MONGO_OPERATION_ADMISSION_TIMEOUT")],
  ["waitQueue 타임아웃", mongoError("MongoWaitQueueTimeoutError", "Timed out while checking out a connection")],
  ["pool cleared", mongoError("MongoPoolClearedError", "Connection pool for host was cleared because of an error")],
  ["server selection", mongoError("MongooseServerSelectionError", "getaddrinfo ENOTFOUND cluster0.mongodb.net")],
  ["network timeout", mongoError("MongoNetworkTimeoutError", "connection timed out")],
  ["ECONNRESET", new Error("socket hang up ECONNRESET")],
  ["ETIMEDOUT", new Error("network error ETIMEDOUT")],
];

/* 판별기가 손대면 안 되는 것들 — 기존 호출부 동작을 지키려고 일부러 allowlist 에서 뺐다. */
const DELIBERATELY_UNLISTED = [
  ["Unauthorized(13)", mongoError("MongoServerError", "not authorized on code_destiny", 13)],
  ["DuplicateKey(11000)", mongoError("MongoServerError", "E11000 duplicate key error", 11000)],
  ["MaxTimeMSExpired(50)", mongoError("MongoServerError", "operation exceeded time limit", 50)],
];

describe("isPermanentMongoError", () => {
  test.each(PERMANENT_CASES)("%s 는 영구 오류다", (_label, error) => {
    expect(isPermanentMongoError(error)).toBe(true);
    expect(isDbUnavailableError(error)).toBe(false);
  });

  test.each(TRANSIENT_CASES)("%s 는 영구 오류가 아니다", (_label, error) => {
    expect(isPermanentMongoError(error)).toBe(false);
  });

  test.each(DELIBERATELY_UNLISTED)("%s 는 의도적으로 영구 목록에 없다", (_label, error) => {
    expect(isPermanentMongoError(error)).toBe(false);
  });
});

describe("isDbUnavailableError", () => {
  test.each(TRANSIENT_CASES)("%s 는 일시 장애로 남는다", (_label, error) => {
    expect(isDbUnavailableError(error)).toBe(true);
  });

  test("MaxTimeMSExpired 는 503 으로 남는다 — '지금 느리다'는 사실이고, 공유 풀 리셋 없이 빠르게 실패한다", () => {
    const [, error] = DELIBERATELY_UNLISTED[2];
    expect(isDbUnavailableError(error)).toBe(true);
  });

  test("DB 와 무관한 오류는 여전히 500 으로 간다", () => {
    expect(isDbUnavailableError(new TypeError("x.map is not a function"))).toBe(false);
    expect(isDbUnavailableError(new Error("PortOne 결제 승인 실패"))).toBe(false);
  });
});
