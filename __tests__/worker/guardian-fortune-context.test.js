/** @jest-environment node */

import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "@jest/globals";

const require = createRequire(import.meta.url);
const fixtures = require("../fixtures/guardian-fortune-context-fixtures.js");

let contextModule;
let tarotModule;
let adapterModules;

beforeAll(async () => {
  contextModule = await import("../../worker/lib/guardian-fortune-context.js");
  tarotModule = await import("../../worker/lib/guardian-fortune/adapters/tarot.js");
  adapterModules = {
    saju: await import("../../worker/lib/guardian-fortune/adapters/saju.js"),
    ziwei: await import("../../worker/lib/guardian-fortune/adapters/ziwei.js"),
    vedic: await import("../../worker/lib/guardian-fortune/adapters/vedic.js"),
    sukuyo: await import("../../worker/lib/guardian-fortune/adapters/sukuyo.js"),
    astrology: await import("../../worker/lib/guardian-fortune/adapters/astrology.js"),
  };
});

function fakeAdapters(overrides = {}) {
  return {
    saju: async () => ({
      dayMaster: "synthetic-day-master",
      tenGodsSummary: "synthetic ten gods",
      fiveElementsSummary: "synthetic five elements",
      currentFlow: "synthetic current flow",
      personalityHook: "synthetic personality hook",
      cautions: ["synthetic caution"],
      evidence: ["saju.dayMaster"],
    }),
    ziwei: async () => ({
      lifePalaceSummary: "synthetic life palace",
      topicPalaceSummary: "synthetic topic palace",
      keyStarsSummary: "synthetic key stars",
      strengths: ["synthetic strength"],
      evidence: ["ziwei.lifePalace"],
    }),
    vedic: async () => ({
      moonSignSummary: "synthetic moon",
      nakshatraSummary: "synthetic nakshatra",
      innerRhythm: "synthetic rhythm",
      evidence: ["vedic.nakshatra"],
    }),
    sukuyo: async () => ({
      birthMansion: "synthetic mansion",
      relationshipPattern: "synthetic relationship pattern",
      distancePattern: "synthetic distance pattern",
      evidence: ["sukuyo.birthMansion"],
    }),
    astrology: async () => ({
      sunSummary: "synthetic sun",
      moonSummary: "synthetic moon astrology",
      currentMoodSummary: "synthetic mood",
      evidence: ["astrology.moon"],
    }),
    tarot: async () => ({
      spreadType: "one_card",
      cards: [{ name: "synthetic card", orientation: "upright", meaningSummary: "synthetic meaning" }],
      symbolicMessage: "synthetic tarot message",
      evidence: ["tarot.cards"],
    }),
    ...overrides,
  };
}

describe("buildGuardianFortuneContext", () => {
  it("normalizes defaults without retaining raw concern in the normalized output logs", () => {
    const normalized = contextModule.normalizeGuardianFortuneInput({
      ...fixtures.baseInput,
      birthTime: undefined,
      calendarType: undefined,
      gender: undefined,
      targetDate: undefined,
      concern: "차분히 확인할 작은 선택이 있어요.",
    }, { now: new Date("2026-08-02T00:00:00+09:00") });

    expect(normalized.calendarType).toBe("solar");
    expect(normalized.gender).toBe("unknown");
    expect(normalized.hasBirthTime).toBe(false);
    expect(normalized.targetDate).toBe("2026-08-02");
    expect(normalized.hasConcern).toBe(true);
    expect(contextModule.maskGuardianFortuneInputForLog(fixtures.concernInput)).not.toHaveProperty("concern");
  });

  it("builds a context with only the explicitly selected adapter", async () => {
    const result = await contextModule.buildGuardianFortuneContext(fixtures.baseInput, {
      adapters: fakeAdapters(),
    });

    expect(result.ok).toBe(true);
    expect(result.context.availableSystems).toEqual(["saju"]);
    expect(result.context.inputSummary.hasBirthPlace).toBe(false);
    expect(result.context.integratedInsight.openingHook).toBeTruthy();
    expect(result.context.safetyConstraints).toEqual(expect.arrayContaining([
      "location_dependent_claims_require_birth_place",
    ]));
  });

  it("fails safely when the selected adapter fails", async () => {
    const result = await contextModule.buildGuardianFortuneContext({ ...fixtures.baseInput, category: "ziwei" }, {
      adapters: fakeAdapters({
        ziwei: async () => {
          const error = new Error("synthetic failure");
          error.code = "SYNTHETIC_ZIWEI_FAILURE";
          throw error;
        },
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("GUARDIAN_CONTEXT_ALL_ADAPTERS_FAILED");
    expect(JSON.stringify(result.warnings)).not.toContain(fixtures.baseInput.birthDate);
  });

  it("skips time and location dependent claims when inputs are missing", async () => {
    const result = await contextModule.buildGuardianFortuneContext({ ...fixtures.birthTimeUnknownInput, category: "ziwei" }, {
      adapters: fakeAdapters(),
    });

    expect(result.ok).toBe(true);
    expect(result.context.inputSummary.hasBirthTime).toBe(false);
    expect(result.context.availableSystems).toEqual(["ziwei"]);
    expect(result.context.unavailableClaims).toEqual(expect.arrayContaining([
      "ziwei.birth_time_required",
    ]));
  });

  it("returns a hard failure when every adapter is unavailable", async () => {
    const failedAdapters = Object.fromEntries(Object.keys(fakeAdapters()).map((name) => [name, async () => {
      const error = new Error("synthetic failure");
      error.code = `FAILED_${name.toUpperCase()}`;
      throw error;
    }]));
    const result = await contextModule.buildGuardianFortuneContext(fixtures.baseInput, { adapters: failedAdapters });

    expect(result).toMatchObject({ ok: false, errorCode: "GUARDIAN_CONTEXT_ALL_ADAPTERS_FAILED" });
    expect(result).not.toHaveProperty("context");
  });

  it("never places raw birth or concern fields in the context", async () => {
    const result = await contextModule.buildGuardianFortuneContext({
      ...fixtures.concernInput,
      birthPlace: fixtures.birthPlace,
    }, { adapters: fakeAdapters() });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(fixtures.baseInput.birthDate);
    expect(serialized).not.toContain(fixtures.baseInput.birthTime);
    expect(serialized).not.toContain(fixtures.concernInput.concern);
    expect(serialized).not.toContain(fixtures.birthPlace.city);
    expect(serialized).not.toContain(fixtures.birthPlace.latitude.toString());
  });

  it("uses only selected-system evidence keys", async () => {
    const result = await contextModule.buildGuardianFortuneContext({ ...fixtures.baseInput, topic: "love" }, {
      adapters: fakeAdapters(),
    });

    expect(result.ok).toBe(true);
    expect(result.context.integratedInsight.evidenceKeys).toEqual(expect.arrayContaining(["saju.dayMaster"]));
    expect(result.context.integratedInsight.evidenceKeys.join(" ")).not.toMatch(/ziwei|vedic|sukuyo|astrology|tarot/);
  });

  it.each(["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"])(
    "runs exactly the selected %s adapter once",
    async (category) => {
      const calls = Object.fromEntries(["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"].map((name) => [name, 0]));
      const adapters = Object.fromEntries(Object.entries(fakeAdapters()).map(([name, adapter]) => [name, async (...args) => {
        calls[name] += 1;
        return adapter(...args);
      }]));
      const result = await contextModule.buildGuardianFortuneContext({
        ...fixtures.baseInput,
        category,
        birthPlace: fixtures.birthPlace,
      }, { adapters });

      expect(result.ok).toBe(true);
      expect(result.context.availableSystems).toEqual([category]);
      expect(calls[category]).toBe(1);
      expect(Object.entries(calls).filter(([name]) => name !== category).every(([, count]) => count === 0)).toBe(true);
    },
  );

  it.each([undefined, "", "fusion", "unknown"])("rejects missing or invalid category %s", (category) => {
    expect(() => contextModule.normalizeGuardianFortuneInput({ ...fixtures.baseInput, category })).toThrow(
      expect.objectContaining({ code: "GUARDIAN_CONTEXT_INVALID_INPUT" }),
    );
  });
});

describe("guardian tarot adapter", () => {
  it("selects the same cards for the same deterministic seed", () => {
    const cards = ["M00", "M01", "M02", "M03"].map((id, index) => ({
      id,
      code: id,
      nameKo: `synthetic-${index}`,
      upright: { coreMeaning: "synthetic upright" },
      reversed: { coreMeaning: "synthetic reversed" },
    }));
    const input = { ...fixtures.baseInput, topic: "love" };
    const first = tarotModule.buildTarotAdapter(input, { cards, tarotSeed: "stable-seed", interpret: () => null });
    const second = tarotModule.buildTarotAdapter(input, { cards, tarotSeed: "stable-seed", interpret: () => null });

    expect(first).toEqual(second);
    expect(first.cards).toHaveLength(3);
    expect(first.cards.every((card) => card.name.startsWith("synthetic-"))).toBe(true);
  });
});

describe("individual guardian adapters", () => {
  it("projects saju data without copying raw birth input", async () => {
    const result = await adapterModules.saju.buildSajuAdapter(fixtures.baseInput, {
      calculator: async () => ({
        dayMaster: "갑목",
        fiveElements: { wood: 3, fire: 1 },
        tenGods: { output: 2 },
        relationSummary: "synthetic relation",
      }),
    });
    expect(result.dayMaster).toBe("갑목");
    expect(result.fiveElementsSummary).toContain("오행");
    expect(JSON.stringify(result)).not.toContain(fixtures.baseInput.birthDate);
  });

  it("projects ziwei palaces only when birth time is available", async () => {
    const result = await adapterModules.ziwei.buildZiweiAdapter({ ...fixtures.baseInput, hasBirthTime: true }, {
      calculator: async () => ({
        palaces: [
          { name: "명궁", mainStars: ["synthetic-star"], assistantStars: [] },
          { name: "부처궁", mainStars: ["synthetic-relationship-star"], assistantStars: [] },
        ],
        keyFeatures: { keyStars: ["synthetic-star"] },
      }),
    });
    expect(result.lifePalaceSummary).toContain("명궁");
    await expect(adapterModules.ziwei.buildZiweiAdapter(fixtures.birthTimeUnknownInput, {
      calculator: async () => ({}),
    })).rejects.toMatchObject({ code: "BIRTH_TIME_UNKNOWN" });
  });

  it("keeps vedic lagna optional and uses moon data when time is unknown", async () => {
    const result = await adapterModules.vedic.buildVedicAdapter({
      ...fixtures.birthTimeUnknownInput,
      birthPlace: fixtures.birthPlace,
      hasBirthPlace: true,
    }, {
      calculator: async () => ({ moon: { signKo: "달자리" }, moonNakshatra: { name: "synthetic nakshatra" }, lagna: { signKo: "사용하지 않음" } }),
    });
    expect(result.moonSignSummary).toContain("달자리");
    expect(result.lagnaSummary).toBeUndefined();
  });

  it("projects sukuyo relationship material from the existing lunar adapter", () => {
    const result = adapterModules.sukuyo.buildSukuyoAdapter(fixtures.baseInput, {
      calculator: () => ({ nameKo: "synthetic mansion", keywords: ["거리"] }),
    });
    expect(result.birthMansion).toBe("synthetic mansion");
    expect(result.relationshipPattern).toBeTruthy();
  });

  it("projects astrology signs without exposing chart payloads", async () => {
    const result = await adapterModules.astrology.buildAstrologyAdapter({
      ...fixtures.baseInput,
      hasBirthTime: true,
      birthPlace: fixtures.birthPlace,
      hasBirthPlace: true,
    }, {
      calculator: async () => ({
        planets: {
          Sun: { signKo: "태양자리" },
          Moon: { signKo: "달자리" },
        },
        ascendant: { signKo: "상승자리" },
      }),
    });
    expect(result.sunSummary).toContain("태양자리");
    expect(result.ascendantSummary).toContain("상승자리");
    expect(JSON.stringify(result)).not.toContain(fixtures.birthPlace.city);
  });
});
