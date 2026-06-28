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
