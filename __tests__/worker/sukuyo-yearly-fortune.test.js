/**
 * @jest-environment node
 */

const { execFileSync } = require("child_process");
const path = require("path");
const { pathToFileURL } = require("url");

function runSukuyoProbe(body) {
  const moduleUrl = pathToFileURL(path.resolve(__dirname, "../../worker/routes/sukuyo.js")).href;
  const unlockModuleUrl = pathToFileURL(path.resolve(__dirname, "../../worker/lib/content-unlocks.js")).href;
  const script = `
    (async function() {
      const mod = await import(${JSON.stringify(moduleUrl)});
      const unlockUtils = await import(${JSON.stringify(unlockModuleUrl)});
      const utils = mod.__sukuyoYearlyTestUtils;
      const buildProfile = ${buildProfile.toString()};
      const result = (function() {
        ${body}
      })();
      process.stdout.write(JSON.stringify(result));
    })().catch(function(error) {
      console.error(error && error.stack ? error.stack : error);
      process.exit(1);
    });
  `;
  return JSON.parse(execFileSync(process.execPath, ["-e", script], {
    cwd: path.resolve(__dirname, "../.."),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
  }));
}

function buildProfile(overrides = {}) {
  return {
    profileId: "profile-yearly-1",
    name: "민서",
    gender: "F",
    birth: {
      year: 1992,
      month: 7,
      day: 14,
      hour: 12,
      minute: 0,
      calType: "solar",
    },
    ...overrides,
  };
}

function flattenText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(flattenText).join(" ");
  if (typeof value === "object") return Object.values(value).map(flattenText).join(" ");
  return "";
}

describe("sukuyo yearly fortune", () => {
  test("yearly fortune unlock resolves to sukuyo service key by content key", () => {
    const result = runSukuyoProbe(`
      return unlockUtils.resolvePaidContentUnlockTarget({
        userId: "user-yearly-1",
        profileId: "profile-yearly-1",
        featureKey: "sukyo_yearly_fortune_unlock",
        contentKey: "sukyo_yearly_fortune_unlock:2026",
      });
    `);

    expect(result.serviceKey).toBe("sukuyo");
    expect(result.profileId).toBe("profile-yearly-1");
    expect(result.contentKey).toBe("sukyo_yearly_fortune_unlock:2026");
    expect(result.scope).toBe("PROFILE");
  });

  test("full result includes detailed local sukuyo calculation fields", () => {
    const result = runSukuyoProbe(`
      return utils.buildSukuyoYearlyFortuneResult({
        auth: { userId: "user-yearly-1" },
        profile: buildProfile(),
        targetYear: 2026,
      });
    `);

    expect(result.calculationBasis.methodVersion).toBe("sukuyo-yearly-v2");
    expect(result.monthlyFlow).toHaveLength(12);
    expect(result.yearlyTheme.evidence.length).toBeGreaterThanOrEqual(4);
    for (const month of result.monthlyFlow) {
      expect(month.anchorDate).toMatch(/^2026-\d{2}-15$/);
      expect(month.monthSukuyo.nameKo).toBeTruthy();
      expect(month.relation.label).toBeTruthy();
      expect(month.scoreBand.label).toBeTruthy();
      expect(month.relationship.length).toBeGreaterThan(40);
      expect(month.workMoney.length).toBeGreaterThan(40);
      expect(month.healthMind.length).toBeGreaterThan(40);
      expect(month.caution).toBeTruthy();
    }
    expect(flattenText(result).length).toBeGreaterThan(4500);
    expect(flattenText(result)).not.toMatch(/이 기능은|이 결과는|분석 결과는/);
  });

  test("locked preview omits full result but keeps paid teaser", () => {
    const preview = runSukuyoProbe(`
      const full = utils.buildSukuyoYearlyFortuneResult({
        auth: { userId: "user-yearly-1" },
        profile: buildProfile(),
        targetYear: 2026,
      });
      return utils.buildSukuyoYearlyPreview(full);
    `);

    expect(preview.profileSummary.targetYear).toBe(2026);
    expect(preview.monthlyPreview).toHaveLength(2);
    expect(preview.totalFortunePreview.text.length).toBeLessThanOrEqual(123);
    expect(preview.lockedNotice).toContain("잠금 해제");
  });

  test("point evidence must match exact feature, profile, content key and coin amount", () => {
    const result = runSukuyoProbe(`
      const contentKey = utils.sukuyoYearlyContentKey(2026);
      const good = {
        kind: "deduct",
        delta: -100,
        featureKey: "sukyo_yearly_fortune_unlock",
        metadata: {
          profileId: "profile-yearly-1",
          contentKey,
          targetYear: 2026,
          coinPrice: 100,
        },
      };
      const wrongProfile = {
        ...good,
        metadata: { ...good.metadata, profileId: "other-profile" },
      };
      const wrongYear = {
        ...good,
        metadata: { ...good.metadata, contentKey: utils.sukuyoYearlyContentKey(2027), targetYear: 2027 },
      };
      return {
        good: utils.isSukuyoYearlyPointEvidence(good, { profileId: "profile-yearly-1", contentKey, targetYear: 2026 }),
        wrongProfile: utils.isSukuyoYearlyPointEvidence(wrongProfile, { profileId: "profile-yearly-1", contentKey, targetYear: 2026 }),
        wrongYear: utils.isSukuyoYearlyPointEvidence(wrongYear, { profileId: "profile-yearly-1", contentKey, targetYear: 2026 }),
      };
    `);

    expect(result.good).toBe(true);
    expect(result.wrongProfile).toBe(false);
    expect(result.wrongYear).toBe(false);
  });

  test("payment evidence must match exact target and paid amount", () => {
    const result = runSukuyoProbe(`
      const contentKey = utils.sukuyoYearlyContentKey(2026);
      const good = {
        status: "paid",
        paymentAmount: 10000,
        pricingSnapshot: {
          featureKey: "sukyo_yearly_fortune_unlock",
          profileId: "profile-yearly-1",
          contentKey,
          targetYear: 2026,
        },
      };
      const contentIdOnly = {
        status: "paid",
        paymentAmount: 10000,
        pricingSnapshot: {
          featureKey: "sukyo_yearly_fortune_unlock",
          profileId: "profile-yearly-1",
          contentId: contentKey,
          targetYear: 2026,
        },
      };
      const underpaid = {
        ...good,
        paymentAmount: 100,
        pricingSnapshot: { ...good.pricingSnapshot, coinPrice: 1 },
      };
      const wrongProfile = {
        ...good,
        pricingSnapshot: { ...good.pricingSnapshot, profileId: "other-profile" },
      };
      const wrongYear = {
        ...good,
        pricingSnapshot: { ...good.pricingSnapshot, contentKey: utils.sukuyoYearlyContentKey(2027), targetYear: 2027 },
      };
      return {
        good: utils.isSukuyoYearlyPaymentEvidence(good, { profileId: "profile-yearly-1", contentKey, targetYear: 2026 }),
        contentIdOnly: utils.isSukuyoYearlyPaymentEvidence(contentIdOnly, { profileId: "profile-yearly-1", contentKey, targetYear: 2026 }),
        underpaid: utils.isSukuyoYearlyPaymentEvidence(underpaid, { profileId: "profile-yearly-1", contentKey, targetYear: 2026 }),
        wrongProfile: utils.isSukuyoYearlyPaymentEvidence(wrongProfile, { profileId: "profile-yearly-1", contentKey, targetYear: 2026 }),
        wrongYear: utils.isSukuyoYearlyPaymentEvidence(wrongYear, { profileId: "profile-yearly-1", contentKey, targetYear: 2026 }),
      };
    `);

    expect(result.good).toBe(true);
    expect(result.contentIdOnly).toBe(true);
    expect(result.underpaid).toBe(false);
    expect(result.wrongProfile).toBe(false);
    expect(result.wrongYear).toBe(false);
  });

  // 🔴 500 회귀 가드. Solar.fromYmdHms 는 범위를 벗어난 인자에 status 없는 맨 Error("wrong month 0")를
  // 던지고, 그 에러는 라우트의 4xx 분기에도 503 분기에도 안 걸려 그대로 500 이 됐다. 클라이언트는
  // 500 을 '서버 혼잡'으로 표시했으므로 원인 추적이 막힌 채 결제 경로까지 죽었다.
  test("out-of-range birth date fails as 422, never as a status-less throw", () => {
    const result = runSukuyoProbe(`
      function attempt(birth) {
        try {
          utils.buildSukuyoYearlyFortuneResult({
            auth: { userId: "user-yearly-1" },
            profile: buildProfile({ birth }),
            targetYear: 2026,
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, status: Number(error && error.status) || 0, code: String((error && error.code) || ""), message: String((error && error.message) || "") };
        }
      }
      const base = { year: 1992, month: 7, day: 14, hour: 12, minute: 0, calType: "solar" };
      return {
        monthZero: attempt({ ...base, month: 0 }),
        monthNull: attempt({ ...base, month: null }),
        dayZero: attempt({ ...base, day: 0 }),
        monthThirteen: attempt({ ...base, month: 13 }),
        lunarMonthZero: attempt({ ...base, month: 0, calType: "lunar" }),
        missing: attempt({}),
      };
    `);

    for (const key of ["monthZero", "monthNull", "dayZero", "monthThirteen", "lunarMonthZero", "missing"]) {
      expect(result[key].ok).toBe(false);
      expect(result[key].status).toBe(422);
      expect(result[key].code).toBe("INVALID_PROFILE_BIRTH");
      // "wrong month 0" 같은 라이브러리 원문이 새어 나오면 곧 500 이라는 뜻이다.
      expect(result[key].message).not.toMatch(/wrong (month|day|hour)/);
    }
  });

  test("out-of-range birth clock is clamped, not rejected", () => {
    // 시·분은 본명숙 판정의 신원 값이 아니다. 거부하면 정상 프로필까지 막히므로 정오로 접는다.
    const result = runSukuyoProbe(`
      function attempt(birth) {
        try {
          const full = utils.buildSukuyoYearlyFortuneResult({
            auth: { userId: "user-yearly-1" },
            profile: buildProfile({ birth }),
            targetYear: 2026,
          });
          return { ok: true, natal: full.calculationBasis.natalSukuyo.nameKo };
        } catch (error) {
          return { ok: false, message: String((error && error.message) || "") };
        }
      }
      const base = { year: 1992, month: 7, day: 14, hour: 12, minute: 0, calType: "solar" };
      return {
        negativeHour: attempt({ ...base, hour: -1 }),
        hour24: attempt({ ...base, hour: 24 }),
        minute99: attempt({ ...base, minute: 99 }),
        noon: attempt(base),
      };
    `);

    for (const key of ["negativeHour", "hour24", "minute99", "noon"]) {
      expect(result[key].ok).toBe(true);
    }
    // 정오로 접히므로 정오 프로필과 같은 본명숙이 나와야 한다.
    expect(result.negativeHour.natal).toBe(result.noon.natal);
    expect(result.hour24.natal).toBe(result.noon.natal);
  });

  test("V2 order evidence passes on contentKey alone, without targetYear", () => {
    // 셸이 contentKey 를 실어 보내게 된 뒤의 실제 주문 스냅샷 모양이다(worker/payments/orders.js
    // pricingSnapshot 에는 targetYear 가 없다 — contentKey 에서 유도되는 사실을 두 번 저장하지 않는다).
    const result = runSukuyoProbe(`
      const contentKey = utils.sukuyoYearlyContentKey(2026);
      const v2Order = {
        status: "paid",
        paymentAmount: 10000,
        featureKey: "sukyo_yearly_fortune_unlock",
        pricingSnapshot: { profileId: "profile-yearly-1", contentKey, scope: "" },
      };
      return {
        v2Order: utils.isSukuyoYearlyPaymentEvidence(v2Order, { profileId: "profile-yearly-1", contentKey, targetYear: 2026 }),
      };
    `);

    expect(result.v2Order).toBe(true);
  });

  test("collects current paid gate access evidence from nested payload", () => {
    const result = runSukuyoProbe(`
      return utils.collectSukuyoYearlyEvidenceIds({
        access: {
          requestId: "access-request-root",
          payload: {
            data: {
              transactionId: "access-transaction-data",
              accessGrant: {
                evidenceId: "entitlement-access-1",
                purchaseId: "purchase-access-1",
                requestId: "request-access-1",
              },
              consume: {
                transactionId: "consume-access-1",
              },
              payment: {
                paymentId: "payment-access-1",
              },
            },
          },
        },
        _paymentContext: {
          transactionId: "context-access-1",
        },
      });
    `);

    expect(result).toEqual(expect.arrayContaining([
      "access-request-root",
      "access-transaction-data",
      "entitlement-access-1",
      "purchase-access-1",
      "request-access-1",
      "consume-access-1",
      "payment-access-1",
      "context-access-1",
    ]));
  });
});
