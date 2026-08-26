/**
 * @jest-environment node
 *
 * 회당 결제 증빙의 **왕복** 계약 — 쓰는 쪽과 읽는 쪽을 한 테스트 안에서 잇는다.
 *
 * 왜 이 파일이 필요한가: 월정석 결제는 `worker/payments/moonstone.js`(writer)가 원장에 남기고
 * `worker/lib/moonstone-spend-proof.js`(reader 정본)가 그것을 찾아 증빙한다. 두 파일은 서로를
 * import 하지 않아서 필드명이 한쪽에서만 바뀌어도 아무도 모른다. 실제로 두 번 그렇게 깨졌다 —
 *
 *   ① V2 컷오버가 PointHistory 쓰기를 없애고 멱등키를 `sourceId` 로 옮겼는데 reader 는 원장
 *      스키마에 존재하지도 않는 top-level `requestId`/`idempotencyKey` 를 계속 찾았다. 그래서
 *      **월정석으로 결제한 사용자가 차감만 당하고 402(미결제)를 받았다**(초융합 ₩30,000 실사고).
 *   ② 같은 컷오버가 성공 응답의 `ledgerId` 를 비워 보내면서, 클라이언트 에코를 ObjectId 로
 *      요구하던 소비 라우트 3곳이 **항상** 증빙 실패했다(네오 팩폭 전략실 실사고).
 *
 * 기존 단위 테스트가 이걸 못 잡은 이유는 원장 조회를 쿼리와 무관하게 행을 돌려주도록 mock 했기
 * 때문이다. 여기서는 **실제 writer 가 만든 행**을 **실제 reader 의 쿼리**로 평가한다
 * (fixture 의 matches 는 진짜 연산자 구현이라 통과시켜 주는 스텁이 아니다).
 *
 * 🔴 이 파일을 mock 으로 우회하지 말 것 — 우회하는 순간 이 가드는 아무것도 지키지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { jest } from "@jest/globals";
import * as mongooseModule from "mongoose";
import { makeFakePaymentDb, matches } from "../fixtures/fake-payment-db.mjs";
import { ORACLE_CONSULTATION_TIERS } from "../../lib/tarot/oracle-consultation-pricing.mjs";

const USER_ID = "507f1f77bcf86cd799439011";
const FUSION_FEATURE_KEY = "fusion-fortune-consultation";
const OTHER_FEATURE_KEY = "fortune-chat-consultation";
/** 초융합 클라이언트가 실제로 만드는 모양 — app/fusion-fortune/FusionFortuneClient.tsx */
const REQUEST_ID = "fusion-fortune-consultation:1755300000000-a1b2c3d";

const PRODUCT = Object.freeze({
  productId: FUSION_FEATURE_KEY,
  featureKey: FUSION_FEATURE_KEY,
  label: "초융합 운세 상담 1회",
  priceKRW: 30000,
  priceCoins: 300,
  monthlyCost: 3000,
});

// 프로덕션에 실제로 존재하는 unique 인덱스(2026-08-11 실측). 예약 멱등이 여기 기댄다.
const makeLedgerDb = () => makeFakePaymentDb({ uniqueKeys: [["userId", "type", "sourceId"]] });

/** reader 가 쓰는 Mongoose 체이닝(.select().lean())을 흉내내되, 필터는 **실제로 평가한다.** */
function findOneOver(getRows) {
  return (filter) => ({
    select: () => ({ lean: async () => getRows().find((row) => matches(row, filter)) || null }),
  });
}

/** 정본 reader 는 find().select().sort().limit().lean() 를 쓴다. 필터는 역시 실제로 평가한다. */
function findManyOver(getRows) {
  return (filter) => {
    const chain = {
      select: () => chain,
      sort: () => chain,
      limit: (count) => { chain.__limit = count; return chain; },
      lean: async () => {
        const hits = getRows().filter((row) => matches(row, filter));
        return Number.isFinite(chain.__limit) ? hits.slice(0, chain.__limit) : hits;
      },
    };
    return chain;
  };
}

/** writer 가 남긴 행들. 각 테스트가 spendMoonstone 을 돌린 뒤 여기에 꽂는다. */
const ledgerRows = [];
let userDoc = { _id: USER_ID, role: "user" };

let spendMoonstone;
let verifyPerUsePayment;
let findMoonstoneSpendEvidence;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb: async () => {},
      withMongoRetry: async (_env, run) => run(),
      isTransientMongoError: () => false,
      // 아래 셋은 worker/payments/db.js 가 모듈 최상단에서 읽는다. 이 테스트는 db 핸들을
      // 직접 넘기므로 실제로 호출되지는 않지만, import 가 살아 있어야 그래프가 뜬다.
      connectPaymentDb: async () => {},
      resetPaymentConnection: () => {},
      mongoose: mongooseModule.default || mongooseModule,
    })),
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      isAuthDbInfraError: () => false,
    })),
    /* 모델은 writer·reader 양쪽에 같은 객체로 주입된다. writer 는 db 핸들에 넘기는 식별자로만
       쓰고, reader 는 여기 붙은 find/findOne 으로 실제 조회한다. 결제·코인 경로는 이 시나리오에
       존재하지 않으므로 빈 컬렉션이다(월정석만으로 증빙돼야 한다는 것이 이 테스트의 요지다). */
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      Payment: { findOne: findOneOver(() => []) },
      PointHistory: { findOne: findOneOver(() => []) },
      MonthlyCreditLedger: { findOne: findOneOver(() => ledgerRows), find: findManyOver(() => ledgerRows) },
      User: { findById: () => ({ select: () => ({ lean: async () => userDoc }) }) },
      // monthly-credit-store.js 가 모듈 최상단에서 읽는다(lot CAS 는 주입으로 대체하지만 import 는 산다).
      RECENT_CONSUME_REQUEST_ID_CAP: 50,
    })),
  ]);

  ({ spendMoonstone } = await import("../../worker/payments/moonstone.js"));
  ({ verifyPerUsePayment } = await import("../../worker/lib/nakshatra-paid-access.js"));
  ({ findMoonstoneSpendEvidence } = await import("../../worker/lib/moonstone-spend-proof.js"));
});

beforeEach(() => {
  ledgerRows.length = 0;
  userDoc = { _id: USER_ID, role: "user" };
});

/** writer 를 실제로 돌려 원장 행을 만들고, 그 행을 reader 가 보는 컬렉션에 그대로 싣는다. */
async function runWriter({ product = PRODUCT, purchaseId = REQUEST_ID, consumeLots } = {}) {
  const db = makeLedgerDb();
  const deduct = consumeLots || (async () => ({ ok: true, reason: "OK", balance: 5000, user: null }));
  let spend = null;
  try {
    spend = await spendMoonstone(db, { userId: USER_ID, product, purchaseId }, { consumeLots: deduct });
  } finally {
    ledgerRows.push(...db.rows);
  }
  return { db, spend };
}

const proveFusion = () => verifyPerUsePayment({}, {
  userId: USER_ID,
  featureKey: FUSION_FEATURE_KEY,
  coinPrice: 300,
  requestId: REQUEST_ID,
});

describe("월정석 차감 → 회당 결제 증빙", () => {
  test("🔴 정산까지 끝난 월정석 차감은 증빙된다 (초융합 402 실사고의 재현)", async () => {
    await runWriter();
    // writer 가 실제로 남긴 것이 원장 한 행뿐임을 못 박는다 — PointHistory 로 되돌아가면 여기서 깨진다.
    expect(ledgerRows).toHaveLength(1);
    expect(ledgerRows[0]).toMatchObject({ type: "MONTHLY_CREDIT_SPEND", serviceKey: FUSION_FEATURE_KEY });

    await expect(proveFusion()).resolves.toMatchObject({ proven: true, source: "monthly" });
  });

  test("같은 requestId 재시도(멱등 replay)도 증빙된다 — 추가 결제 없이 결과를 받아야 한다", async () => {
    await runWriter();
    await expect(proveFusion()).resolves.toMatchObject({ proven: true, source: "monthly" });
    await expect(proveFusion()).resolves.toMatchObject({ proven: true, source: "monthly" });
  });

  test("🔴 미정산 예약행은 증빙이 아니다 — 차감되지 않은 요청이 무료로 열리면 매출 누수다", async () => {
    // 예약 직후 차감 단계에서 아이솔레이트가 죽은 상태. 예약 행만 남고 잔액은 그대로다.
    await expect(runWriter({
      consumeLots: async () => { throw new Error("isolate killed"); },
    })).rejects.toThrow("isolate killed");
    expect(ledgerRows).toHaveLength(1);
    expect(ledgerRows[0].settledAt).toBeUndefined();

    await expect(proveFusion()).resolves.toMatchObject({ proven: false });
  });

  test("다른 기능의 월정석 차감은 이 기능의 증빙이 되지 않는다", async () => {
    await runWriter({ product: { ...PRODUCT, productId: OTHER_FEATURE_KEY, featureKey: OTHER_FEATURE_KEY } });
    await expect(proveFusion()).resolves.toMatchObject({ proven: false });
  });

  test("다른 requestId 의 차감은 이 요청의 증빙이 되지 않는다", async () => {
    await runWriter({ purchaseId: "fusion-fortune-consultation:1755300000000-zzzzzzz" });
    await expect(proveFusion()).resolves.toMatchObject({ proven: false });
  });
});

describe("writer 가 돌려주는 ledgerId (네오 팩폭 실사고)", () => {
  test("🔴 신규 차감 성공 경로도 실제 원장 _id 를 돌려준다", async () => {
    const { spend } = await runWriter();
    // 예전에는 여기가 "" 였고, compat 이 그것을 requestId 로 폴백해 consume.transactionId 에 실었다.
    // 그 결과 ObjectId 에코를 요구하던 소비 라우트가 증빙을 영영 못 찾았다.
    expect(spend.ledgerId).toBeTruthy();
    expect(spend.ledgerId).toBe(String(ledgerRows[0]._id));
  });

  test("멱등 replay 경로의 ledgerId 와 같은 행을 가리킨다", async () => {
    const first = await runWriter();
    // 같은 purchaseId 로 다시 — 예약이 11000 으로 막히고 정산된 기존 행이 반환된다.
    const db = makeLedgerDb();
    db.rows.push(...ledgerRows);
    const replay = await spendMoonstone(db, { userId: USER_ID, product: PRODUCT, purchaseId: REQUEST_ID }, {
      consumeLots: async () => ({ ok: true, reason: "OK", balance: 5000, user: null }),
    });
    expect(replay.replayed).toBe(true);
    expect(replay.ledgerId).toBe(first.spend.ledgerId);
  });
});

/**
 * 소비 라우트 전수. 각 라우트가 인정하는 기능키로 실제 차감을 만들고, 정본 reader 가 그 라우트가
 * 넘기는 것과 같은 (featureKeys, tokens) 로 증빙을 찾아내는지 본다.
 *
 * 🔴 키는 라우트 소스에서 직접 읽는다 — 손으로 적은 목록은 라우트가 키를 바꿔도 계속 초록불이다.
 */
// 🔴 소비 라우트를 손으로 적지 않는다. 예전에는 12개를 배열에 열거했고, 추출기도 이름 4개
//    ("FEATURE_KEY"·"SERVICE_KEY"·"LEGACY_FEATURE_KEY"·"FORTUNE_TEA_HOUSE_SERVICE_KEY")만
//    알아봤다. 그 사이 소비 라우트가 21개로 늘었는데 목록은 12개에 멈춰 있었고, 빠진 9개
//    (animal-totem·fortune·fortune-tea-house·fusion-fortune·human-design-report·master-love-codex
//    ·nakshatra·nakshatra-premium·tarot)의 writer↔reader 왕복은 **한 번도 검사된 적이 없다**.
//    목록이 가드가 아니다(CLAUDE.md 원칙 10) — 소스에서 전수 발견하고 미분류를 실패시킨다.
const ROUTES_DIR = path.join(process.cwd(), "worker", "routes");

function readRouteSource(routeName) {
  return fs.readFileSync(path.join(ROUTES_DIR, `${routeName}.js`), "utf8");
}

// 증빙 reader 를 실제로 부르는 라우트만 대상이다. 둘 중 하나라도 부르면 이 계약에 묶인다.
function discoverConsumingRoutes() {
  return fs.readdirSync(ROUTES_DIR)
    .filter((file) => file.endsWith(".js"))
    .map((file) => file.replace(/\.js$/, ""))
    .filter((name) => /verifyPerUsePayment|findMoonstoneSpendEvidence/.test(readRouteSource(name)))
    .sort();
}

// 상수 이름은 라우트마다 접두사가 붙는다(BASIC_FEATURE_KEY·YEAR_TAROT_FEATURE_KEY·SERVICE_KEY …).
// 접두사를 열거하는 대신 접미사로 받는다.
const KEY_CONST_NAME = "(?:[A-Z][A-Z0-9_]*_)?(?:FEATURE_KEY|SERVICE_KEY)";

function localKeyConsts(source) {
  return [...source.matchAll(new RegExp(`^const (${KEY_CONST_NAME}) = "([^"]+)";`, "gm"))].map((m) => m[2]);
}

// nakshatra-premium 처럼 상수 대신 상품 표를 두고 product.featureKey 를 넘기는 라우트.
// 🔴 featureKey 리터럴을 파일 전체에서 훑지 않는다 — fortune.js 에서 결제와 무관한 항목
//    (share-reward·pig-coin-charge 등)까지 딸려 와 대상이 부풀었다(실측).
function productTableKeys(source) {
  const keys = [];
  for (const table of source.matchAll(/^const [A-Z][A-Z0-9_]*PRODUCTS[A-Z0-9_]* = Object\.freeze\(\{([\s\S]*?)^\}\);/gm)) {
    for (const hit of table[1].matchAll(/\bfeatureKey:\s*"([^"]+)"/g)) keys.push(hit[1]);
  }
  return keys;
}

// fortune.js·fusion-fortune.js 는 키를 worker/lib 에서 import 한다. 라우트 본문만 보면 0건이다.
function importedKeyConsts(source) {
  const keys = [];
  for (const statement of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*"([^"]+)"/g)) {
    const names = statement[1].split(",").map((part) => part.trim())
      .filter((name) => new RegExp(`^${KEY_CONST_NAME}$`).test(name));
    if (!names.length) continue;
    const relative = statement[2].replace(/^\.\.\/\.\.\//, "").replace(/^\.\.\//, "worker/");
    const absolute = path.join(process.cwd(), relative);
    if (!fs.existsSync(absolute)) continue;
    const moduleSource = fs.readFileSync(absolute, "utf8");
    for (const name of names) {
      const match = moduleSource.match(new RegExp(`^export const ${name} = "([^"]+)";`, "m"));
      if (match) keys.push(match[1]);
    }
  }
  return keys;
}

// 🔴 소스에 리터럴이 아예 없는 라우트. 여기에 키 문자열을 손으로 적지 않는다 —
//    그 기능의 정본 모듈에서 뽑고, 뽑은 결과가 비면 아래 테스트가 실패한다.
//    tarot 오라클 상담은 카드 수 구간마다 키가 갈리고 서버가 런타임에 역산한다(PR #1171).
const DYNAMIC_ROUTE_KEYS = Object.freeze({
  tarot: () => ORACLE_CONSULTATION_TIERS.map((tier) => tier.featureKey),
});

function readRouteFeatureKeys(routeName) {
  const source = readRouteSource(routeName);
  const dynamic = DYNAMIC_ROUTE_KEYS[routeName] ? DYNAMIC_ROUTE_KEYS[routeName]() : [];
  return [...new Set([
    ...localKeyConsts(source),
    ...productTableKeys(source),
    ...importedKeyConsts(source),
    ...dynamic,
  ])];
}

const ROUTE_KEY_SOURCES = Object.freeze(discoverConsumingRoutes());
const ALL_ROUTE_FEATURE_KEYS = Object.freeze([
  ...new Set(ROUTE_KEY_SOURCES.flatMap((routeName) => readRouteFeatureKeys(routeName))),
]);

describe("소비 라우트 전수 — 정본 reader 가 각 기능의 월정석 차감을 찾아낸다", () => {
  test("🔴 라우트 발견과 키 추출이 비어 있지 않다 (가드가 대상 없이 통과하지 않게)", () => {
    // 발견이 통째로 빗나가면(경로 변경·정규식 오타) 대상 0개로 조용히 초록불이 된다.
    // 실측 2026-08-27: 21개. 하한을 두어 붕괴를 잡되, 정당한 감소 1건까지는 허용한다.
    expect(ROUTE_KEY_SOURCES.length).toBeGreaterThanOrEqual(20);
    for (const routeName of ROUTE_KEY_SOURCES) {
      expect(readRouteFeatureKeys(routeName).length).toBeGreaterThan(0);
    }
  });

  test("🔴 타로 오라클 상담의 카드 수 구간 키가 전부 대상에 들어 있다", () => {
    // DYNAMIC_ROUTE_KEYS 를 비우면 아래 루프는 공허하게 통과한다. 정본에서 직접 못박아
    // 그 구멍을 막는다 — 티어가 늘면 자동으로 커버 대상이 늘고, 특례를 지우면 여기서 깨진다.
    const tierKeys = ORACLE_CONSULTATION_TIERS.map((tier) => tier.featureKey);
    expect(tierKeys.length).toBeGreaterThan(0);
    for (const key of tierKeys) expect(ALL_ROUTE_FEATURE_KEYS).toContain(key);
  });

  test("🔴 동적 키 라우트는 정본 모듈에서 실제로 키를 뽑아 온다", () => {
    // 정본이 비거나 모양이 바뀌면 위 테스트는 다른 경로로 통과할 수 있다. 여기서 직접 못박는다.
    for (const [routeName, resolve] of Object.entries(DYNAMIC_ROUTE_KEYS)) {
      expect(ROUTE_KEY_SOURCES).toContain(routeName);
      const keys = resolve();
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.every((key) => typeof key === "string" && key.length > 0)).toBe(true);
      // 소스 리터럴만으로는 안 나오는 키여야 한다 — 나온다면 이 특례가 필요 없다는 뜻이다.
      const source = readRouteSource(routeName);
      const literal = new Set([...localKeyConsts(source), ...productTableKeys(source), ...importedKeyConsts(source)]);
      expect(keys.some((key) => !literal.has(key))).toBe(true);
    }
  });

  test.each(ROUTE_KEY_SOURCES)("%s — 결제한 기능키로 증빙된다", async (routeName) => {
    const featureKeys = readRouteFeatureKeys(routeName);
    const featureKey = featureKeys[0];
    const requestId = `${featureKey}:1755300000000-abcdef`;
    await runWriter({
      product: { ...PRODUCT, productId: featureKey, featureKey },
      purchaseId: requestId,
    });

    await expect(findMoonstoneSpendEvidence({}, {
      userId: USER_ID,
      featureKeys,
      tokens: [requestId],
    })).resolves.toMatchObject({ sourceId: requestId, serviceKey: featureKey });
  });

// 이 라우트가 소유하지 않은 실재 키를 대조군으로 고른다.
// 🔴 고정 상수를 쓰면 안 된다 — 그 키를 실제로 소유한 라우트에서는 "다른 기능"이 아니게 되어
//    테스트가 자기모순으로 깨진다(실측: fortune 라우트가 fortune-chat-consultation 을 소유한다).
function pickForeignFeatureKey(ownKeys) {
  const own = new Set(ownKeys);
  const foreign = ALL_ROUTE_FEATURE_KEYS.find((key) => !own.has(key));
  // 모든 라우트가 같은 키만 쓴다면 이 검사는 성립하지 않는다 — 조용히 넘기지 말고 실패시킨다.
  if (!foreign) throw new Error(`${[...own].join(",")} 밖의 대조군 키를 찾지 못했다`);
  return foreign;
}

  test.each(ROUTE_KEY_SOURCES)("%s — 다른 기능의 차감으로는 열리지 않는다", async (routeName) => {
    const featureKeys = readRouteFeatureKeys(routeName);
    const foreignKey = pickForeignFeatureKey(featureKeys);
    const requestId = "cross-feature-request-id";
    await runWriter({
      product: { ...PRODUCT, productId: foreignKey, featureKey: foreignKey },
      purchaseId: requestId,
    });
    // 대조군: 위 차감이 실제로 기록됐는데도 이 라우트의 키로는 안 잡혀야 한다.
    expect(ledgerRows).toHaveLength(1);

    await expect(findMoonstoneSpendEvidence({}, {
      userId: USER_ID,
      featureKeys,
      tokens: [requestId],
    })).resolves.toBeNull();
  });

  test("🔴 마스터 인연의 서 개인판/궁합판은 서로의 증빙이 되지 않는다 (30,000원으로 50,000원 열림 방지)", async () => {
    const soloKey = "master-love-codex";
    const compatKey = "master-love-codex-compat";
    const requestId = "master-love-codex:1755300000000-aaaaaa";
    await runWriter({
      product: { ...PRODUCT, productId: soloKey, featureKey: soloKey },
      purchaseId: requestId,
    });

    await expect(findMoonstoneSpendEvidence({}, {
      userId: USER_ID, featureKeys: [soloKey], tokens: [requestId],
    })).resolves.toMatchObject({ serviceKey: soloKey });
    await expect(findMoonstoneSpendEvidence({}, {
      userId: USER_ID, featureKeys: [compatKey], tokens: [requestId],
    })).resolves.toBeNull();
  });
});

describe("정산 판정 3갈래 — 하나라도 빠지면 정상 결제가 402 로 떨어진다", () => {
  const FEATURE_KEY = "neo-operation-room-consultation";
  const REQ = "neo-war-room-11111111-2222-3333-4444-555555555555";
  const probe = () => findMoonstoneSpendEvidence({}, {
    userId: USER_ID,
    featureKeys: [FEATURE_KEY, "neo-operation-room"],
    tokens: [REQ],
  });

  test("① 정산 완료(settledAt) → 증빙", async () => {
    await runWriter({ product: { ...PRODUCT, productId: FEATURE_KEY, featureKey: FEATURE_KEY }, purchaseId: REQ });
    expect(ledgerRows[0].settledAt).toBeTruthy();
    await expect(probe()).resolves.toMatchObject({ sourceId: REQ });
  });

  test("② 구 billing.js 행(settledAt 없음 + afterBalance 있음) → 증빙", async () => {
    // 구 경로는 settledAt 을 아예 쓰지 않고 생성 시점에 before/afterBalance 를 채웠다.
    ledgerRows.push({
      _id: "legacy-ledger-1",
      userId: USER_ID,
      type: "MONTHLY_CREDIT_SPEND",
      amount: 3000,
      beforeBalance: 8000,
      afterBalance: 5000,
      sourceId: REQ,
      serviceKey: FEATURE_KEY,
      metadata: { requestId: REQ, purchaseId: REQ },
    });
    await expect(probe()).resolves.toMatchObject({ ledgerId: "legacy-ledger-1", afterBalance: 5000 });
  });

  test("③ 미정산인데 차감은 끝난 창(recentConsumeRequestIds) → 증빙 (정산 레이스에서 402 금지)", async () => {
    await expect(runWriter({
      product: { ...PRODUCT, productId: FEATURE_KEY, featureKey: FEATURE_KEY },
      purchaseId: REQ,
      consumeLots: async () => { throw new Error("isolate killed after deduct"); },
    })).rejects.toThrow("isolate killed after deduct");
    expect(ledgerRows[0].settledAt).toBeUndefined();
    expect(ledgerRows[0].afterBalance).toBeUndefined();

    // 차감이 실제로 일어났다는 유일한 증거를 사용자 문서에 심는다(lot CAS 가 같은 갱신에서 넣는 값).
    userDoc = { _id: USER_ID, role: "user", recentConsumeRequestIds: [REQ] };
    await expect(probe()).resolves.toMatchObject({ sourceId: REQ });
  });

  test("🔴 미정산 + 차감 증거 없음 → 증빙 아님 (무료 열람 누수 금지)", async () => {
    await expect(runWriter({
      product: { ...PRODUCT, productId: FEATURE_KEY, featureKey: FEATURE_KEY },
      purchaseId: REQ,
      consumeLots: async () => { throw new Error("isolate killed before deduct"); },
    })).rejects.toThrow("isolate killed before deduct");
    userDoc = { _id: USER_ID, role: "user", recentConsumeRequestIds: ["some-other-request"] };
    await expect(probe()).resolves.toBeNull();
  });

  test("🔴 환불로 되돌린 차감은 증빙이 아니다", async () => {
    await runWriter({ product: { ...PRODUCT, productId: FEATURE_KEY, featureKey: FEATURE_KEY }, purchaseId: REQ });
    ledgerRows[0].metadata = { ...ledgerRows[0].metadata, refundedForUnlockFailure: true };
    await expect(probe()).resolves.toBeNull();
  });
});
