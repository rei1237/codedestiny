/**
 * @jest-environment node
 */
const REF = "2026-10-04";
const ROMANCE_WORDS = ["연애", "사랑", "설렘", "심쿵", "데이트", "커플", "로맨스", "썸", "키스", "스킨십", "고백", "애인", "연인", "달달", "밀당"];
const ASSERTION_WORDS = ["사생활은", "실제로", "확실히", "반드시", "분명히", "틀림없"];

function walkStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => walkStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => walkStrings(v, out));
  return out;
}

describe("idol-chemi copy library", () => {
  let chemi;
  let copyLib;
  let typeCopy;

  beforeAll(async () => {
    chemi = await import("../../lib/idol-chemi/index.js");
    copyLib = await import("../../lib/idol-chemi/copy/index.js");
    typeCopy = (await import("../../lib/idol-chemi/copy/types.js")).TYPE_COPY;
  });

  const run = (birthDate, partnerRef, referenceDate = REF) =>
    chemi.runChemi({ user: { birthDate }, partner: partnerRef, referenceDate });

  test("every type bundle has both modes filled; minor pools carry no romance vocabulary", () => {
    for (const typeId of chemi.CHEMI_TYPE_IDS) {
      const b = typeCopy[typeId];
      expect(b).toBeTruthy();
      for (const mode of ["adult", "minor"]) {
        expect(b.oneLiners[mode].length).toBeGreaterThanOrEqual(3);
        expect(b.corePoints[mode].length).toBeGreaterThanOrEqual(4);
        expect(b.scenarios[mode].length).toBeGreaterThanOrEqual(3);
        expect(b.finish[mode].length).toBeGreaterThanOrEqual(3);
      }
      const minorText = walkStrings({ o: b.oneLiners.minor, p: b.corePoints.minor, s: b.scenarios.minor, f: b.finish.minor }).join("\n");
      for (const w of ROMANCE_WORDS) expect(minorText).not.toContain(w);
    }
  });

  test("no copy text asserts private facts (사생활·실제로·확실히…)", async () => {
    const shared = await import("../../lib/idol-chemi/copy/shared.js");
    const cautions = await import("../../lib/idol-chemi/copy/cautions.js");
    const all = walkStrings({ typeCopy, s: shared.SIGNAL_POINTS, t: shared.TEN_GOD_POINTS, g: shared.GENERIC_POINTS, c: cautions.CAUTIONS, n: cautions.NEUTRAL_CAUTIONS }).join("\n");
    for (const w of ASSERTION_WORDS) expect(all).not.toContain(w);
  });

  test("assembled copy: 3 points, labeled scenario/caution/finish, entertainment notice, [최애] substituted", () => {
    const { result, copy } = run("1997-09-01", { kind: "roster", id: "bts-jin" });
    expect(copy.copyVersion).toBe(copyLib.COPY_VERSION);
    expect(copy.title).toBe(result.chemiTypeNameKo);
    expect(copy.points).toHaveLength(3);
    for (const p of copy.points) {
      expect(p.label).toMatch(/^케미 포인트 [123]$/);
      expect(p.text.length).toBeGreaterThan(10);
      expect(p.evidenceKo.length).toBeGreaterThan(2);
    }
    expect(copy.scenario.label).toBe("상상 장면");
    expect(copy.scenario.setting.length).toBeGreaterThan(0);
    expect(copy.caution.label).toBe("티키타카 주의 구간");
    expect(copy.finish.label).toBe("오늘의 덕질 한 줄");
    expect(copy.notices[0]).toMatch(/오락용/);
    expect(copy.notices.some((n) => /시주/.test(n))).toBe(true);
    const text = JSON.stringify(copy);
    expect(text).not.toContain("[최애]");
    expect(text).not.toMatch(/1997-09-01|1992-12-04/);
  });

  test("deterministic: same result → identical copy; different seed can differ but never empty", () => {
    const a = run("1997-09-01", { kind: "roster", id: "bts-jin" }).copy;
    const b = run("1997-09-01", { kind: "roster", id: "bts-jin" }).copy;
    expect(b).toEqual(a);
  });

  test("minorMode adds the minor notice and uses minor pools", () => {
    const { result, copy } = run("1997-09-01", { kind: "roster", id: "ive-leeseo" }, "2026-01-01");
    expect(result.minorMode).toBe(true);
    expect(copy.notices).toContain(copyLib.MINOR_NOTICE);
    const bundle = typeCopy[result.chemiTypeId];
    const minorOneLiners = bundle.oneLiners.minor.map((t) => t.split("[최애]").join(result.partner.displayName));
    expect(minorOneLiners).toContain(copy.oneLiner);
  });

  test("preset partner adds the preset notice", () => {
    const presetId = chemi.PRESET_PARTNERS[0].id;
    const { copy } = run("1997-09-01", { kind: "preset", id: presetId });
    expect(copy.notices.some((n) => /프리셋/.test(n))).toBe(true);
  });

  test("no empty slot across all 9 types and both modes (sweep of fixtures)", () => {
    const fixtures = ["1988-01-25", "1988-01-01", "1988-01-16", "1988-01-04", "1988-04-07", "1988-01-13", "1988-01-07", "1988-02-16", "1988-02-07"];
    const seen = new Set();
    for (const birthDate of fixtures) {
      for (const [partnerId, ref] of [["bts-jin", REF], ["ive-leeseo", "2026-01-01"]]) {
        const { result, copy } = run(birthDate, { kind: "roster", id: partnerId }, ref);
        seen.add(result.chemiTypeId + ":" + result.minorMode);
        expect(copy.points).toHaveLength(3);
        for (const s of walkStrings(copy)) expect(s.trim().length).toBeGreaterThan(0);
        expect(new Set(copy.points.map((p) => p.text)).size).toBe(3);
      }
    }
    expect([...seen].filter((k) => k.endsWith(":false")).length).toBe(9);
  });

  test("fill(): Korean particles follow the partner name's final consonant", () => {
    expect(copyLib.fill("[최애]가 [최애]와 [최애]는 [최애]를 [최애]랑", "진")).toBe("진이 진과 진은 진을 진이랑");
    expect(copyLib.fill("[최애]가 [최애]와 [최애]는 [최애]를 [최애]랑", "하니")).toBe("하니가 하니와 하니는 하니를 하니랑");
    expect(copyLib.fill("[최애]의 [최애]", "정국")).toBe("정국의 정국");
    expect(copyLib.fill("[최애]가", "Hanni")).toBe("Hanni가");
  });

  test("runChemi rejects unknown partner", () => {
    expect(() => run("1997-09-01", { kind: "roster", id: "nope-nope" })).toThrow("IDOL_CHEMI_PARTNER_UNKNOWN");
  });
});
