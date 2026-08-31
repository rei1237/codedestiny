/**
 * @jest-environment node
 *
 * 만 14세 미만 결제 차단의 회귀 가드 — 구 payments.js 경로와 V2 라우터 양쪽.
 *
 * 🔴 이 파일이 생긴 이유(2026-08-31 수정): 이 차단은 도입 이래 **한 번도 동작하지 않았다.**
 *   ① 술어가 `validateBirthDateWithAge()` 의 반환에 없는 `requiresGuardianConsent` 를 읽어
 *      항상 `return null` 이었고,
 *   ② 설령 살아 있었어도 대상 경로 `/prepare`·`/subscription/prepare` 는 worker/index.js 에서
 *      **V2 로 먼저 갈라져** 그 함수에 닿지 않았다(`/api/billing/checkout` 도 POST /prepare 로
 *      재작성돼 V2 를 탄다). 즉 라이브에서 실제로 막히는 결제 경로는 0건이었다.
 * 단언하는 테스트가 0건이라 둘 다 아무도 몰랐다. 그래서 여기서 네 축을 함께 잰다:
 *   ① 판정 정본(isUnderSelfConsentAge) 의 경계와 "판정 불가는 통과" 계약
 *   ② 구 payments.js enforceMinorPaymentRestriction 의 동작
 *   ③ V2 라우터의 실제 403 (서명한 진짜 JWT 로 handlePaymentsContext 를 탄다 — mock 없음)
 *   ④ 커버리지 — 구 경로가 막기로 한 path 중 V2 에도 있는 것은 전부 blocksMinors 를 달았는가.
 *      ④는 이름을 손으로 열거하지 않고 **양쪽 소스에서 전수 발견**하며, 발견 건수가 0이면
 *      실패한다(fail-closed). 라우트를 새로 늘렸을 때 ③보다 먼저 이쪽이 문다.
 *
 * 🔴 고정 날짜 리터럴을 쓰지 말 것 — 며칠 뒤 나이가 바뀌어 통째로 무의미해진다.
 * 생년월일은 매 실행마다 KST 오늘에서 역산한다.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { MIN_SELF_CONSENT_AGE, isUnderSelfConsentAge, validateBirthDateWithAge } from "../../worker/lib/validation.js";
import { signAuthToken } from "../../worker/lib/auth.js";
import { __paymentsContextTestUtils, handlePaymentsContext } from "../../worker/payments/index.js";
import { __paymentsTestUtils } from "../../worker/routes/payments.js";

const { enforceMinorPaymentRestriction } = __paymentsTestUtils;
const { ROUTES } = __paymentsContextTestUtils;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PAYMENTS_SOURCE_PATH = join(ROOT, "worker", "routes", "payments.js");

/** KST 오늘에서 정확히 `years` 년 전 날짜(YYYY-MM-DD). 그날 태어난 사람은 오늘 만 `years` 세다. */
function birthDateForExactAge(years) {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear() - years;
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MINOR_BIRTH_DATE = birthDateForExactAge(MIN_SELF_CONSENT_AGE - 1);
const ADULT_BIRTH_DATE = birthDateForExactAge(35);
/** 판정할 수 없는 입력들 — 전부 "통과" 여야 한다. */
const UNDECIDABLE = ["", "1990-02-30", "not-a-date", "20200101", "1990/01/01", birthDateForExactAge(-1)];

// ── ① 판정 정본 ────────────────────────────────────────────────────────────────
describe("isUnderSelfConsentAge — 판정 정본", () => {
  test(`만 ${MIN_SELF_CONSENT_AGE - 1}세는 미성년, 생일 당일의 만 ${MIN_SELF_CONSENT_AGE}세는 아니다 — 경계는 '미만'이다`, () => {
    expect(isUnderSelfConsentAge(MINOR_BIRTH_DATE)).toBe(true);
    expect(isUnderSelfConsentAge(birthDateForExactAge(MIN_SELF_CONSENT_AGE))).toBe(false);
    expect(isUnderSelfConsentAge(ADULT_BIRTH_DATE)).toBe(false);
  });

  test.each(UNDECIDABLE)("판정 불가 입력 %p 은 차단하지 않는다 — 거짓 양성이 유일한 위험이다", (value) => {
    expect(isUnderSelfConsentAge(value)).toBe(false);
  });

  test("null·undefined·비문자열도 통과시킨다", () => {
    for (const value of [null, undefined, 0, {}, []]) expect(isUnderSelfConsentAge(value)).toBe(false);
  });

  test("validateBirthDateWithAge 는 미성년과 형식 오류를 둘 다 isValid:false 로 준다 — isValid 단독 판정은 성립하지 않는다", () => {
    const underage = validateBirthDateWithAge(MINOR_BIRTH_DATE);
    const malformed = validateBirthDateWithAge("not-a-date");

    expect(underage.isValid).toBe(false);
    expect(malformed.isValid).toBe(false);
    // 둘을 가르는 유일한 값이 age 다. 이 두 줄이 깨지면 isUnderSelfConsentAge 도 함께 고쳐야 한다.
    expect(underage.age).toBe(MIN_SELF_CONSENT_AGE - 1);
    expect(malformed.age).toBe(-1);
  });

  test("반환 계약 — 판정 정본이 읽는 프로퍼티는 전부 실제 반환 키 안에 있다", () => {
    const returnedKeys = new Set(Object.keys(validateBirthDateWithAge("1990-01-01")));
    expect(returnedKeys.size).toBeGreaterThan(0);

    const source = readFileSync(join(ROOT, "worker", "lib", "validation.js"), "utf8");
    const body = source.slice(source.indexOf("export function isUnderSelfConsentAge"));
    // 술어가 구조분해로 붙잡은 이름을 소스에서 발견한다(손으로 적지 않는다).
    const destructured = body.match(/const\s*\{([^}]*)\}\s*=\s*validateBirthDateWithAge\s*\(/);
    expect(destructured).not.toBeNull();

    const names = destructured[1].split(",").map((s) => s.trim().split(":")[0].trim()).filter(Boolean);
    // fail-closed: 읽는 이름이 하나도 안 잡히면 이 가드는 아무것도 검사하지 않은 것이다.
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !returnedKeys.has(name))).toEqual([]);
  });
});

// ── ② 구 payments.js 경로 ──────────────────────────────────────────────────────
describe("구 payments.js enforceMinorPaymentRestriction", () => {
  const authWith = (birthDate) => ({ userId: "64f0a1b2c3d4e5f678901234", authUserDoc: { birthDate } });
  /** 막기로 선언한 path 를 소스에서 전수 발견한다 — 목록을 여기 손으로 적지 않는다. */
  const blockedPaths = legacyBlockedPaths();

  test("차단 대상 path 선언이 비어 있지 않다", () => {
    expect(blockedPaths.length).toBeGreaterThan(0);
  });

  test.each(blockedPaths)("만 %s 미만 계정은 POST %s 에서 403 MINOR_PAYMENT_BLOCKED", async (path) => {
    const response = await enforceMinorPaymentRestriction({}, authWith(MINOR_BIRTH_DATE), "POST", path);
    expect(response).not.toBeNull();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "MINOR_PAYMENT_BLOCKED" });
  });

  test("성인·경계(생일 당일)·판정 불가는 막지 않는다", async () => {
    for (const birthDate of [ADULT_BIRTH_DATE, birthDateForExactAge(MIN_SELF_CONSENT_AGE), ...UNDECIDABLE]) {
      const response = await enforceMinorPaymentRestriction({}, authWith(birthDate), "POST", blockedPaths[0]);
      expect(response).toBeNull();
    }
  });

  test("이미 승인된 결제의 완료 경로는 막지 않는다 — 돈만 빠지고 지급이 안 되는 상태가 더 나쁘다", async () => {
    for (const path of ["/confirm", "/single/complete", "/subscription/confirm"]) {
      expect(await enforceMinorPaymentRestriction({}, authWith(MINOR_BIRTH_DATE), "POST", path)).toBeNull();
    }
  });

  test("GET 은 막지 않는다", async () => {
    expect(await enforceMinorPaymentRestriction({}, authWith(MINOR_BIRTH_DATE), "GET", blockedPaths[0])).toBeNull();
  });
});

// ── ③ V2 라우터 실동작 ────────────────────────────────────────────────────────
describe("V2 라우터 — 실제 서명 토큰으로 403", () => {
  const ENV = { JWT_ACCESS_SECRET: "minor-block-test-secret", NODE_ENV: "test" };

  async function callPrepare(birthDate, path = "/prepare") {
    const token = await signAuthToken(
      { _id: "507f1f77bcf86cd799439011", email: "t@example.com", role: "user", name: "t", birthDate },
      ENV,
    );
    const request = new Request(`https://x.test/api/payments${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ featureKey: "master-love-codex" }),
    });
    const response = await handlePaymentsContext(request, ENV, { prefix: "/api/payments" });
    return { status: response.status, body: await response.json() };
  }

  test.each(v2BlockingPaths())("만 14세 미만 계정은 POST %s 에서 403 MINOR_PAYMENT_BLOCKED", async (path) => {
    const { status, body } = await callPrepare(MINOR_BIRTH_DATE, path);
    expect(status).toBe(403);
    expect(body.code).toBe("MINOR_PAYMENT_BLOCKED");
  });

  test("성인 계정은 이 게이트에 걸리지 않는다 — 여기서 막히면 전 사용자 결제 차단이다", async () => {
    // 뒤 단계(DB·PG)에서 무엇으로 실패하든 상관없다. 확인하는 것은 '이 코드로는 안 막힌다'뿐이다.
    const { body } = await callPrepare(ADULT_BIRTH_DATE);
    expect(body.code).not.toBe("MINOR_PAYMENT_BLOCKED");
  });

  test.each(UNDECIDABLE)("판정 불가 생년월일(%p)은 이 게이트에 걸리지 않는다", async (birthDate) => {
    const { body } = await callPrepare(birthDate);
    expect(body.code).not.toBe("MINOR_PAYMENT_BLOCKED");
  });

  test("birthDate 클레임이 아예 없는 구형 토큰도 막지 않는다", async () => {
    const { body } = await callPrepare(undefined);
    expect(body.code).not.toBe("MINOR_PAYMENT_BLOCKED");
  });

  test("확정 경로에는 게이트가 없다 — 승인된 결제를 여기서 막으면 미지급이 된다", async () => {
    const { body } = await callPrepare(MINOR_BIRTH_DATE, "/confirm");
    expect(body.code).not.toBe("MINOR_PAYMENT_BLOCKED");
  });
});

// ── ④ 커버리지(fail-closed) ───────────────────────────────────────────────────
describe("커버리지 — 구 경로가 막는 path 는 V2 에도 배선돼 있다", () => {
  test("구 MINOR_BLOCKED_PAYMENT_PATHS 중 V2 라우트로 존재하는 것은 전부 blocksMinors 다", () => {
    const legacy = legacyBlockedPaths();
    expect(legacy.length).toBeGreaterThan(0);

    // V2 표에도 있는 path 만 대상이다(/single/start 는 V2 에 없다 — 구 핸들러가 계속 맡는다).
    const overlapping = legacy.filter((path) => Object.hasOwn(ROUTES, `POST ${path}`));
    // fail-closed: 겹치는 게 0건이면 이 가드는 아무것도 검사하지 않은 것이다.
    // (겹침이 0이 되려면 V2 에서 /prepare 가 사라져야 하고, 그건 배선을 다시 봐야 한다는 뜻이다.)
    expect(overlapping.length).toBeGreaterThan(0);

    const unguarded = overlapping.filter((path) => ROUTES[`POST ${path}`].blocksMinors !== true);
    expect(unguarded).toEqual([]);
  });

  test("blocksMinors 는 주문을 새로 만드는 라우트에만 붙는다 — 확정·웹훅에는 없다", () => {
    const flagged = Object.keys(ROUTES).filter((key) => ROUTES[key].blocksMinors === true);
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged.filter((key) => /confirm|webhook/i.test(key))).toEqual([]);
  });
});

/** worker/routes/payments.js 소스에서 차단 대상 path 집합을 그대로 읽어 온다. */
function legacyBlockedPaths() {
  const source = readFileSync(PAYMENTS_SOURCE_PATH, "utf8");
  const declaration = source.match(/MINOR_BLOCKED_PAYMENT_PATHS\s*=\s*new Set\(\[([^\]]*)\]\)/);
  if (!declaration) throw new Error("MINOR_BLOCKED_PAYMENT_PATHS 선언을 찾지 못했다 — 가드를 다시 배선할 것.");
  return [...declaration[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** V2 표에서 blocksMinors 가 붙은 path 를 발견한다(손으로 열거하지 않는다). */
function v2BlockingPaths() {
  const paths = Object.keys(ROUTES)
    .filter((key) => key.startsWith("POST ") && ROUTES[key].blocksMinors === true)
    .map((key) => key.slice("POST ".length));
  if (!paths.length) throw new Error("blocksMinors 라우트가 0건 — 게이트가 배선되지 않았다.");
  return paths;
}
