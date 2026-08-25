/**
 * @jest-environment node
 *
 * `canAccessPaidFeaturesBatch` 의 **실제 판정 로직**을 구동한다.
 *
 * 🔴 이 파일이 생긴 이유: `paid-feature-access.js` 를 참조하는 기존 테스트 11개는 전부
 * `jest.unstable_mockModule` 로 이 모듈을 통째로 갈아끼운다. 즉 이 판정기를 실제로 태우는
 * 테스트가 하나도 없었고, 그 사이 회당 결제 키가 `ALREADY_PURCHASED` 로 영구 통과하는
 * 결함이 초록불 아래에서 살아 있었다. 여기서는 DB 계층(models·db)만 가짜로 두고
 * 판정 자체는 진짜를 돌린다.
 *
 * 고정하는 계약:
 *  ① `User.unlockedFeatures`/`paidFeatures` 에 회당 결제 키가 있어도 무료로 열리지 않는다
 *     (PR #1137 이전 잔존분이 서버에서 영구 무료를 만들던 경로)
 *  ② 같은 배열의 영구 해금 키는 그대로 열린다 — 돈 낸 사용자가 막히는 반대 회귀 차단
 *  ③ 🔴 회당 결제의 `Payment` 행 경로는 **아직 살아 있어야 한다.** tarot-year-fortune ·
 *     ziwei-deep-pdf 가 그것을 회당 결제 증빙으로 쓰고 있어서, 여기서 같이 막으면 방금
 *     카드로 결제한 사용자가 402 를 받는다. 요청 단위로 좁히는 것은 별도 작업이며,
 *     이 단언은 그 작업이 시작될 때 **의도적으로 뒤집으라는 표식**이다.
 */

let canAccessPaidFeature;
let userFindById;
let paymentFind;

// 판정 결과는 모듈 안 캐시(userId + featureKey + coinCost)에 남는다 — 케이스마다 다른 userId 를 쓴다.
let seq = 0;
const nextUserId = () => `64b0000000000000000000${String(seq += 1).padStart(2, "0")}`;

function lean(value) {
  return { select: () => ({ lean: async () => value }), lean: async () => value };
}

beforeAll(async () => {
  userFindById = jest.fn();
  paymentFind = jest.fn();

  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => undefined),
    withMongoRetry: jest.fn(async (_env, run) => run()),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    User: { findById: (...args) => userFindById(...args) },
    Payment: { find: (...args) => paymentFind(...args) },
  }));
  jest.unstable_mockModule("../../worker/lib/content-unlocks.js", () => ({
    // 영구 해금 스냅샷은 이 테스트의 관심사가 아니다(그쪽은 이미 isUnlockPaidFeatureKey 로 걸러진다).
    getUnlockedContentSnapshot: jest.fn(async () => ({ featureKeys: [], contentKeys: [] })),
  }));

  ({ canAccessPaidFeature } = await import("../../worker/lib/paid-feature-access.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  paymentFind.mockReturnValue({ select: () => ({ lean: async () => [] }) });
});

/** 이용권·구독·라이선스가 전혀 없는 순수 계정. 통과한다면 근거는 배열이나 Payment 행뿐이다. */
function seedUser(userId, { unlockedFeatures = [], paidFeatures = [] } = {}) {
  userFindById.mockReturnValue(lean({
    _id: userId,
    unlockedFeatures,
    paidFeatures,
    points: 0,
    profileSubscription: null,
  }));
}

test("① 회당 결제 키가 unlockedFeatures 에 남아 있어도 무료로 열리지 않는다", async () => {
  const userId = nextUserId();
  seedUser(userId, { unlockedFeatures: ["dream-psycho-analysis"], paidFeatures: ["dream-psycho-analysis"] });

  const decision = await canAccessPaidFeature(userId, "dream-psycho-analysis", { env: {} });

  expect(decision.allowed).toBe(false);
  expect(decision.reason).not.toBe("ALREADY_PURCHASED");
});

test("① 회당 결제 키가 paidFeatures 에만 있어도 무료로 열리지 않는다", async () => {
  const userId = nextUserId();
  seedUser(userId, { paidFeatures: ["tarot-year-fortune"] });

  const decision = await canAccessPaidFeature(userId, "tarot-year-fortune", { env: {} });

  expect(decision.allowed).toBe(false);
});

test("② 영구 해금 키는 계정 배열만으로 그대로 열린다 (대조군 — 돈 낸 사용자를 막지 않는다)", async () => {
  const userId = nextUserId();
  seedUser(userId, { unlockedFeatures: ["sukuyo-relationship-encyclopedia"] });

  const decision = await canAccessPaidFeature(userId, "sukuyo-relationship-encyclopedia", { env: {} });

  expect(decision.allowed).toBe(true);
  expect(decision.reason).toBe("ALREADY_PURCHASED");
});

test("② 레지스트리에서 빠진 과거 키는 계속 열린다 (게이트를 isUnlock 이 아니라 !isPerUse 로 건 이유)", async () => {
  // 둘 다 false 인 키를 isUnlockPaidFeatureKey 로 걸었다면 여기서 정당한 구매자가 잠긴다.
  const userId = nextUserId();
  seedUser(userId, { unlockedFeatures: ["some-retired-product-key"] });

  const decision = await canAccessPaidFeature(userId, "some-retired-product-key", { env: {} });

  expect(decision.allowed).toBe(true);
});

test("③ 회당 결제의 Payment 행 경로는 아직 살아 있다 (같이 막으면 방금 결제한 사용자가 402)", async () => {
  const userId = nextUserId();
  seedUser(userId);
  paymentFind.mockReturnValue({
    select: () => ({ lean: async () => [{ featureKey: "ziwei-deep-pdf" }] }),
  });

  const decision = await canAccessPaidFeature(userId, "ziwei-deep-pdf", { env: {} });

  // 🔴 이 단언이 깨지면 그건 회귀가 아니라 **다음 작업이 시작된 것**이다. 그때는
  //    tarot-year-fortune · ziwei-deep-pdf 라우트에 requestId 스코프 증빙을 먼저 넣고
  //    이 테스트를 "소비된 결제는 다시 통과시키지 않는다" 로 다시 쓴다.
  expect(decision.allowed).toBe(true);
  expect(paymentFind).toHaveBeenCalled();
});
