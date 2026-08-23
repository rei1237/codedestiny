/**
 * @jest-environment node
 *
 * pending 주문 재조정 크론의 시간 예산.
 *
 * 후보 1건당 PortOne 조회 1회(기본 8000ms)를 직렬로 돌기 때문에 limit 만으로는 한 틱의 길이가
 * 묶이지 않는다. 예산이 하는 일은 세 가지이고, 셋 다 여기서 실행으로 확인한다.
 *   ① 예산이 소진되면 남은 후보를 건드리지 않고 멈춘다(다음 틱이 다시 만난다).
 *   ② 🔴 건너뛴 후보의 metadata.reconcile.attempts 가 오르지 않는다 — 예산 확인이 클레임보다
 *      앞이기 때문이다. 뒤에 있으면 손대지도 않은 주문이 maxAttempts 에 먼저 닿아 재조정
 *      대상에서 조용히 빠진다.
 *   ③ 🔴 예산 시계는 후보 쿼리 **뒤**에서 시작한다. 쿼리는 withMongoRetry 안이라 시도 상한
 *      8000ms × 재시도가 붙을 수 있고, 그 지연을 예산에서 빼면 콜드 아이솔레이트에서 한 건도
 *      처리하지 않고 "정상 종료"하는 틱이 나온다.
 *
 * 실제 대기 없이 재현하려고 Date.now 를 통제한다 — clamp 하한이 5000ms 라 실시간으로는
 * 테스트가 초 단위로 느려진다.
 */
import { jest } from "@jest/globals";

const paymentFind = jest.fn();
const paymentFindOneAndUpdate = jest.fn();
const paymentFindByIdAndUpdate = jest.fn();
const fetchPortOnePayment = jest.fn();

let reconcilePendingPayments;
let clock;
let realDateNow;

/** Payment.find(...).select(...).sort(...).limit(...).lean() 체인 대역. */
function fakeQuery(rows) {
  const chain = {
    select: () => chain,
    sort: () => chain,
    limit: () => chain,
    lean: async () => rows,
  };
  return chain;
}

function makeCandidates(count) {
  return Array.from({ length: count }, (_, index) => ({
    _id: `id-${index}`,
    merchantUid: `cd-${index}`,
    impUid: `imp-${index}`,
    status: "pending",
    paymentType: "digital_content",
    accessType: "single_purchase",
    createdAt: new Date("2026-08-01T00:00:00Z"),
  }));
}

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb: jest.fn(),
      // 실제 구현은 여기에 시도 상한과 재시도가 붙는다. 테스트별로 지연을 주입한다.
      withMongoRetry: jest.fn(async (_env, operation) => operation()),
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      CONTENT_ENTITLEMENT_STATUSES: { CANCELLED: "CANCELLED" },
      Payment: {
        find: paymentFind,
        findOneAndUpdate: paymentFindOneAndUpdate,
        findByIdAndUpdate: paymentFindByIdAndUpdate,
      },
    })),
    jest.unstable_mockModule("../../worker/lib/portone.js", () => ({ fetchPortOnePayment })),
    jest.unstable_mockModule("../../worker/lib/payment-refund.js", () => ({
      revokeSinglePaymentContentAccess: jest.fn(async () => ({ unlockRevoked: false })),
    })),
  ]);
  ({ reconcilePendingPayments } = await import("../../worker/lib/payment-reconcile-task.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  clock = { t: 1_700_000_000_000 };
  realDateNow = Date.now;
  Date.now = () => clock.t;

  // 클레임은 항상 성공한다고 본다 — 여기서 재는 것은 "몇 건을 클레임했는가"다.
  paymentFindOneAndUpdate.mockImplementation(() => ({ lean: async () => ({ status: "pending" }) }));
  paymentFindByIdAndUpdate.mockImplementation(() => ({ catch: async () => undefined }));
  // 조회 1건 = 8000ms. 상태 ready 는 "결제창 이탈"이라 손대지 않고 untouched 로 센다.
  fetchPortOnePayment.mockImplementation(async () => {
    clock.t += 8000;
    return { status: "ready" };
  });
});

afterEach(() => {
  Date.now = realDateNow;
});

test("예산이 소진되면 남은 후보를 건드리지 않고 멈추고, 그 사실을 요약에 남긴다", async () => {
  paymentFind.mockReturnValue(fakeQuery(makeCandidates(5)));

  const summary = await reconcilePendingPayments({}, { timeBudgetMs: 25000 });

  // 8000ms × 4건 = 32000 이 25000 을 넘는 순간 5번째 앞에서 끊긴다.
  expect(summary.abortedReason).toBe("time_budget");
  expect(summary.processed).toBe(4);
  expect(summary.remaining).toBe(1);
  expect(summary.scanned).toBe(5);
});

test("🔴 건너뛴 후보는 클레임되지 않는다 — attempts 가 오르면 손대지도 않은 주문이 시도 상한에 닿는다", async () => {
  paymentFind.mockReturnValue(fakeQuery(makeCandidates(5)));

  const summary = await reconcilePendingPayments({}, { timeBudgetMs: 25000 });

  // 클레임이 곧 $inc attempts 다. 처리한 건수와 정확히 같아야 한다.
  expect(paymentFindOneAndUpdate).toHaveBeenCalledTimes(summary.processed);
  expect(fetchPortOnePayment).toHaveBeenCalledTimes(summary.processed);
});

test("예산 안에서 끝나면 종전대로 전건을 처리하고 절단 표시를 남기지 않는다", async () => {
  paymentFind.mockReturnValue(fakeQuery(makeCandidates(2)));

  const summary = await reconcilePendingPayments({}, { timeBudgetMs: 25000 });

  expect(summary.abortedReason).toBeUndefined();
  expect(summary.remaining).toBeUndefined();
  expect(summary.processed).toBe(2);
  expect(summary.untouched).toBe(2);
  expect(paymentFindOneAndUpdate).toHaveBeenCalledTimes(2);
});

test("🔴 후보 쿼리 지연은 루프 예산에서 차감되지 않는다", async () => {
  // 콜드 아이솔레이트에서 첫 쿼리가 20초를 먹은 상황. 예산 25000 을 now 기준으로 재면
  // 두 번째 후보 앞에서 끊기지만, loopStartedAt 기준이면 둘 다 처리해야 한다.
  paymentFind.mockImplementation(() => {
    clock.t += 20000;
    return fakeQuery(makeCandidates(2));
  });

  const summary = await reconcilePendingPayments({}, { timeBudgetMs: 25000 });

  expect(summary.abortedReason).toBeUndefined();
  expect(summary.processed).toBe(2);
});
