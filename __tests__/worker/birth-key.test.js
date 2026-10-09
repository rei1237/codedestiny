/**
 * @jest-environment node
 */

import {
  computeBirthKey,
  computeCompatBirthKey,
  isBirthEntitlementProfileId,
  normalizeProfileBirth,
  toBirthEntitlementProfileId,
} from "../../worker/lib/birth-key.js";
import {
  BIRTH_SCOPED_UNLOCK_FEATURE_KEYS,
  findUnlockScopeClassificationProblems,
  isBirthScopedUnlockFeatureKey,
  withoutBirthScopedUnlockKeys,
} from "../../worker/lib/paid-feature-registry.js";

const card = (overrides = {}, birth = {}) => ({
  profileId: "p1",
  name: "홍길동",
  gender: "F",
  birth: { year: 1990, month: 5, day: 17, hour: 9, minute: 30, timeUnknown: false, calType: "solar", ...birth },
  location: { label: "서울", lat: 37.5, lng: 127 },
  ...overrides,
});

test("name, location and profileId are not part of the birth identity", () => {
  expect(computeBirthKey(card({ profileId: "p2", name: "다른이름", location: { label: "부산" } })))
    .toBe(computeBirthKey(card()));
});

test.each([
  ["year", { year: 1991 }],
  ["month", { month: 6 }],
  ["day", { day: 18 }],
  ["hour", { hour: 10 }],
  ["minute", { minute: 31 }],
  ["timeUnknown", { timeUnknown: true }],
  ["calType lunar", { calType: "lunar" }],
  ["leap month", { calType: "lunar_leap" }],
])("changing %s changes the birth identity", (_label, birth) => {
  expect(computeBirthKey(card({}, birth))).not.toBe(computeBirthKey(card()));
});

test("gender is part of the birth identity", () => {
  expect(computeBirthKey(card({ gender: "M" }))).not.toBe(computeBirthKey(card()));
});

test("time-unknown births ignore stale hour/minute values", () => {
  expect(computeBirthKey(card({}, { timeUnknown: true, hour: 3 })))
    .toBe(computeBirthKey(card({}, { timeUnknown: true, hour: 22, minute: 5 })));
});

test("incomplete birth data yields no identity", () => {
  expect(normalizeProfileBirth(card({}, { day: undefined }))).toBe("");
  expect(computeBirthKey({})).toBe("");
});

test("compat identity is ordered main → partner", () => {
  const main = card();
  const partner = card({ gender: "M" }, { year: 1988 });
  expect(computeCompatBirthKey(main, partner)).not.toBe(computeCompatBirthKey(partner, main));
  expect(computeCompatBirthKey(main, card({ gender: "M" }, { year: 1987 })))
    .not.toBe(computeCompatBirthKey(main, partner));
});

test("synthetic entitlement profile id fits the 80-char column and round-trips", () => {
  const id = toBirthEntitlementProfileId(computeBirthKey(card()));
  expect(id.length).toBeLessThanOrEqual(80);
  expect(isBirthEntitlementProfileId(id)).toBe(true);
  expect(toBirthEntitlementProfileId("not-a-hash")).toBe("");
});

test("every unlock key is classified exactly once as birth or account scoped", () => {
  expect(findUnlockScopeClassificationProblems()).toEqual([]);
});

test("birth scope classification covers aliases and year-suffixed content keys", () => {
  expect(BIRTH_SCOPED_UNLOCK_FEATURE_KEYS).toContain("section_summary");
  expect(isBirthScopedUnlockFeatureKey("openSibylDominator")).toBe(true);
  expect(isBirthScopedUnlockFeatureKey("sukyo_yearly_fortune_unlock:2027")).toBe(true);
  expect(isBirthScopedUnlockFeatureKey("flower-fc")).toBe(false);
  expect(withoutBirthScopedUnlockKeys(["section_daewun", "flower-fc", "rpt_villainCard"])).toEqual(["flower-fc"]);
});
