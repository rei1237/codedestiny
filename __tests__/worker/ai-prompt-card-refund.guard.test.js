/**
 * @jest-environment node
 */

// SEC-2 회귀 방지.
// (1) 카드 단건 결제(DIRECT_KRW/CARD)는 코인 환불이 아니라 PortOne 취소 경로로 분류돼야 한다.
//     PointHistory 차감행이 없어 코인 환불은 반드시 409 로 실패하고, 그 실패가 카드 환불을 가린다.
// (2) 카드 환불 대상 Payment 는 반드시 사용자·기능·결제상태로 좁혀 재조회해야 한다.
//     transactionId 체인에는 클라이언트가 준 body.payment._id 폴백이 섞일 수 있어,
//     좁히지 않으면 남의 결제를 취소시킬 수 있다.
//
// 실제 PortOne 호출은 하지 않는다 — 분류와 조회 조건만 검증한다.

let buildAIPromptCardRefundPaymentQuery;
let readAIPromptRefundContext;

const USER_ID = "507f1f77bcf86cd799439011";
const PAYMENT_ID = "64f0a1b2c3d4e5f678901234";
const FEATURE_KEY = "astrology-ai-prompt";

beforeAll(async () => {
  const mod = await import("../../worker/routes/fortune.js");
  buildAIPromptCardRefundPaymentQuery = mod.__fortuneAccessTestUtils.buildAIPromptCardRefundPaymentQuery;
  readAIPromptRefundContext = mod.__fortuneAccessTestUtils.readAIPromptRefundContext;
});

describe("AI 프롬프트 실패 시 결제수단 분류", () => {
  test("카드 단건 결제는 카드 환불로 분류한다", () => {
    const direct = readAIPromptRefundContext({ paymentMode: "DIRECT_KRW", transactionId: PAYMENT_ID }, {});
    expect(direct.isCardSpend).toBe(true);
    expect(direct.isPointSpend).toBe(false);

    const card = readAIPromptRefundContext({ accessMethod: "CARD", transactionId: PAYMENT_ID }, {});
    expect(card.isCardSpend).toBe(true);
    expect(card.isPointSpend).toBe(false);
  });

  test("코인 차감은 코인 환불로 분류한다", () => {
    const coin = readAIPromptRefundContext({ paymentMode: "COIN", chargedCoins: 50, transactionId: PAYMENT_ID }, {});
    expect(coin.isPointSpend).toBe(true);
    expect(coin.isCardSpend).toBe(false);
  });

  test("이용권·월정석은 어느 환불 경로에도 들어가지 않는다", () => {
    const pass = readAIPromptRefundContext({ paymentMode: "MEMBERSHIP_PASS", accessMethod: "PASS" }, {});
    expect(pass.isPointSpend).toBe(false);
    expect(pass.isCardSpend).toBe(false);

    const monthly = readAIPromptRefundContext({ paymentMode: "MOONLIGHT_STONE", accessMethod: "MONTHLY" }, {});
    expect(monthly.isPointSpend).toBe(false);
    expect(monthly.isCardSpend).toBe(false);
  });
});

describe("카드 환불 대상 Payment 조회 조건", () => {
  test("항상 사용자·기능·결제상태로 좁힌다", () => {
    const query = buildAIPromptCardRefundPaymentQuery({
      userId: USER_ID,
      paymentId: PAYMENT_ID,
      featureKey: FEATURE_KEY,
    });
    expect(query.userId).toBe(USER_ID);
    expect(query._id).toBe(PAYMENT_ID);
    expect(query.status).toEqual({ $in: ["paid", "success", "fulfilled"] });
    expect(query.featureKey).toBeDefined();
  });

  test("사용자 스코프가 없으면 조회 자체를 만들지 않는다", () => {
    expect(buildAIPromptCardRefundPaymentQuery({ userId: "", paymentId: PAYMENT_ID, featureKey: FEATURE_KEY })).toBeNull();
  });

  test("ObjectId 형식이 아닌 결제 식별자는 조회하지 않는다", () => {
    expect(buildAIPromptCardRefundPaymentQuery({ userId: USER_ID, paymentId: "", featureKey: FEATURE_KEY })).toBeNull();
    expect(buildAIPromptCardRefundPaymentQuery({ userId: USER_ID, paymentId: "not-an-id", featureKey: FEATURE_KEY })).toBeNull();
    // requestId 폴백이 transactionId 자리에 실려도 결제 취소로 이어지지 않는다.
    expect(buildAIPromptCardRefundPaymentQuery({ userId: USER_ID, paymentId: `refund:${USER_ID}`, featureKey: FEATURE_KEY })).toBeNull();
  });

  test("featureKey 가 없으면 조회하지 않는다(기능 교차 취소 차단)", () => {
    expect(buildAIPromptCardRefundPaymentQuery({ userId: USER_ID, paymentId: PAYMENT_ID, featureKey: "" })).toBeNull();
  });
});
