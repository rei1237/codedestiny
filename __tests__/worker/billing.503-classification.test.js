/**
 * @jest-environment node
 *
 * "결제 503 이 반복된다"의 회귀 가드 — 분류와 계측 두 축.
 *
 * ## 왜 필요한가
 *
 * 예전 `PAID_ACCESS_DB_ERROR_SIGNATURES` 는 "connection" / "connect" / "timeout" / "timed out" /
 * "network" / "mongo" 같은 **일반 단어 부분문자열** 목록이었고, isDatabaseUnavailableError 가 그것을
 * message·code 양쪽에 적용했다. 두 가지가 동시에 망가졌다:
 *
 *   ① 우리가 **스스로 건** 예산 상한(COIN_GATE_PASS_RESOLVE_TIMEOUT 등)이 "DB 장애"로 세탁돼
 *      503 PASS_STATUS_TEMPORARILY_UNAVAILABLE 로 나갔다. Mongo 가 죽은 게 아니라 느렸을 뿐인
 *      요청까지 장애로 보고된 것이고, 사용자가 겪은 "반복되는 결제 503" 의 표면이다.
 *   ② 메시지에 "connection"/"network" 가 우연히 든 **비-DB 코드 버그**까지 retryable 503 으로
 *      위장됐다. worker/lib/http.js 가 바로 그 안티패턴이 며칠간 장애를 가린 사례를 기록해 뒀다
 *      (guardian ensureGuest 의 ConflictingUpdateOperators).
 *
 * 지금은 자체 예산만 **정확 일치**로 잡고, 진짜 인프라 판정은 http.js 의 단일 정의를 재사용한다.
 * 그 분류를 검사하는 verify 스크립트가 하나도 없어서 이 파일이 유일한 안전망이다.
 */

let utils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/billing.js");
  utils = mod.__billingTestUtils;
});

describe("503 분류: 자체 예산 vs 진짜 DB 장애", () => {
  test.each([
    ["COIN_GATE_PASS_RESOLVE_TIMEOUT"],
    ["COIN_GATE_PROFILE_RESOLVE_TIMEOUT"],
    ["UNLOCK_ACCESS_DECISION_TIMEOUT"],
    ["UNLOCK_DB_TIMEOUT"],
  ])("자체 예산 코드 %s 는 degrade 대상이지만 stage 는 billing-pass-budget 이다", (code) => {
    const error = new Error(code);
    // degrade 자체는 유지한다(호출부 동작 불변) — 달라지는 것은 '왜' degrade 됐는지의 라벨뿐이다.
    expect(utils.isDatabaseUnavailableError(error)).toBe(true);
    expect(utils.paidAccessErrorStage(error)).toBe("billing-pass-budget");
  });

  test("진짜 인프라 장애는 이름만으로도 잡히고 stage 는 db 다", () => {
    // MongoPoolClearedError 는 메시지에 'mongo' 가 없을 수 있어 이름으로만 잡힌다.
    const poolCleared = Object.assign(new Error("pool was cleared"), { name: "MongoPoolClearedError" });
    expect(utils.isDatabaseUnavailableError(poolCleared)).toBe(true);
    expect(utils.paidAccessErrorStage(poolCleared)).toBe("db");

    const admissionTimeout = Object.assign(new Error("Mongo operation admission timed out"), {
      name: "MongoOperationOverloadedError",
    });
    expect(utils.isDatabaseUnavailableError(admissionTimeout)).toBe(true);
    expect(utils.paidAccessErrorStage(admissionTimeout)).toBe("db");
  });

  test("🔴 일반 단어가 든 비-DB 코드 버그는 더 이상 503 으로 위장되지 않는다", () => {
    // 예전 목록의 "connection" 부분문자열에 걸려 retryable 503 으로 나가던 형태들.
    // 이제는 전파되어 500 으로 눈에 띄어야 한다.
    expect(utils.isDatabaseUnavailableError(new Error("Cast to ObjectId failed for connection field"))).toBe(false);
    expect(utils.isDatabaseUnavailableError(new Error("websocket network handshake rejected"))).toBe(false);
    expect(utils.isDatabaseUnavailableError(new Error("payment provider connect failed"))).toBe(false);
    expect(utils.isDatabaseUnavailableError(new TypeError("Cannot read properties of undefined"))).toBe(false);
  });

  test("확정적 거부(MongoServerError permanent code)는 여전히 일시 장애가 아니다", () => {
    // http.js PERMANENT_MONGO_ERROR_CODES allowlist 를 재사용하는지 확인한다.
    const conflicting = Object.assign(new Error("ConflictingUpdateOperators"), {
      name: "MongoServerError",
      code: 40,
    });
    expect(utils.isDatabaseUnavailableError(conflicting)).toBe(false);
  });
});

describe("503 계측: stage 헤더", () => {
  test("PASS_STATUS_TEMPORARILY_UNAVAILABLE 503 은 stage 와 Retry-After 를 헤더로 싣는다", async () => {
    const pricing = { featureKey: "saju-deep", cost: 50 };

    const budget = utils.buildPassStatusTemporarilyUnavailableFailure(pricing, {
      scope: "membership_pass_lookup",
      cause: "billing-pass-budget",
    });
    expect(budget.status).toBe(503);
    expect(budget.headers.get("X-CD-Error-Stage")).toBe("billing-pass-budget");
    expect(budget.headers.get("Retry-After")).toBe("2");

    const infra = utils.buildPassStatusTemporarilyUnavailableFailure(pricing, {
      scope: "membership_pass_lookup",
      cause: "db",
    });
    expect(infra.headers.get("X-CD-Error-Stage")).toBe("db");

    // 본문 계약은 그대로여야 한다 — 클라(useCoinGate·billing-client·정적 셸 6미러)가 이 코드를
    // transient 로 알고 결제창을 여는 경로가 이미 배선돼 있다.
    const payload = await budget.json();
    expect(payload.error.code).toBe("PASS_STATUS_TEMPORARILY_UNAVAILABLE");
    expect(payload.degraded).toBe(true);
    // 헤더용 값이 응답 본문으로 새면 안 된다.
    expect(payload.cause).toBeUndefined();
  });

  test("cause 를 주지 않아도 헤더는 붙고 db 로 폴백한다", () => {
    const response = utils.buildPassStatusTemporarilyUnavailableFailure({ featureKey: "saju-deep", cost: 50 }, {});
    expect(response.headers.get("X-CD-Error-Stage")).toBe("db");
    expect(response.headers.get("Retry-After")).toBe("2");
  });
});

describe("구독 상태 위임 오탐 가드", () => {
  /**
   * hasResolvableSubscriptionSignal 이 true 면 coin-gate 가 fortune.js 라우트로 위임한다
   * (264KB 지연 임포트 + 인증 op + User read + 3500ms 예산). 그런데 위임이 active 를 낼 수 있는
   * 경로는 둘뿐이고 **둘 다 tier 가 필수**다:
   *   fortune.js  handleSubscriptionStatus : if (tier !== "free")
   *   entitlement-policy.js activeCandidate: if (!tier) return null
   * 따라서 tier 류 필드가 하나도 없는 계정은 위임해 봐야 결과가 inactive 로 정해져 있다.
   */
  test("🔴 월정석 잔액은 이용권 신호가 아니다", () => {
    // 이 한 줄 때문에 월정석 보유·이용권 미보유 사용자 **전원**이 매 coin-gate 마다 위임을 탔다.
    expect(utils.hasResolvableSubscriptionSignal({
      profileSubscription: { membershipCreditBalance: 500 },
    })).toBe(false);
    expect(utils.hasResolvableSubscriptionSignal({
      profileSubscription: { membershipCreditBalance: 500, tier: "free" },
    })).toBe(false);
  });

  test("entitlement-policy 의 tier 소스는 하나도 빠짐없이 신호로 잡힌다", () => {
    // activeCandidate 가 읽는 집합: passTier|tier|subscriptionTier|membershipTier|plan|planId|productId
    for (const field of ["tier", "passTier", "subscriptionTier", "membershipTier"]) {
      expect(utils.hasResolvableSubscriptionSignal({
        profileSubscription: { [field]: "premium" },
      })).toBe(true);
    }
    for (const field of ["plan", "planId", "productId", "expiresAt", "startedAt", "customerUid"]) {
      expect(utils.hasResolvableSubscriptionSignal({
        profileSubscription: { [field]: "honey_premium_1m" },
      })).toBe(true);
    }
  });

  test("계정 레벨 레거시 신호는 그대로 보존된다", () => {
    expect(utils.hasResolvableSubscriptionSignal({ subscription: { tier: "vvip" } })).toBe(true);
    expect(utils.hasResolvableSubscriptionSignal({ subscriptionTier: "standard" })).toBe(true);
    expect(utils.hasResolvableSubscriptionSignal({ isSubscribed: true })).toBe(true);
    expect(utils.hasResolvableSubscriptionSignal({})).toBe(false);
    expect(utils.hasResolvableSubscriptionSignal(null)).toBe(false);
  });
});
