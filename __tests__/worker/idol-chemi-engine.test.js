/**
 * @jest-environment node
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const REF = "2026-10-04";

describe("idol-chemi engine", () => {
  let engine;
  let partners;
  let jin;

  beforeAll(async () => {
    engine = await import("../../lib/idol-chemi/engine/index.js");
    partners = await import("../../lib/idol-chemi/data/partners.js");
    jin = partners.resolvePartner({ kind: "roster", id: "bts-jin" });
    expect(jin).toBeTruthy();
  });

  const run = (birthDate, partner, extra = {}) =>
    engine.computeChemi({ user: { birthDate, ...extra }, partner, referenceDate: REF });

  test("same input + same version → deep-equal result (determinism)", () => {
    const a = run("1997-09-01", jin);
    const b = run("1997-09-01", jin);
    expect(b).toEqual(a);
    expect(a.engineVersion).toBe("idol-chemi-1.0.0");
    expect(a.rulesVersion).toBe("chemi-rules-1.0.0");
    expect(a.rosterVersion).toBe(partners.ROSTER_VERSION);
    expect(a.inputHash).toMatch(/^[0-9a-f]{8}$/);
    expect(a.scoreVersion).toBe("chemi-score-1.0.0");
    expect(a.chemiIndex).toBe(a.score.total);
  });

  test("score: integer axes in range, grade from the shared table, spread across type fixtures", () => {
    const fixtures = ["1988-01-25", "1988-01-01", "1988-01-16", "1988-01-04", "1988-04-07", "1988-01-13", "1988-01-07", "1988-02-16", "1988-02-07"];
    const totals = fixtures.map((birthDate) => {
      const { score } = run(birthDate, jin);
      expect(Object.isFrozen(score)).toBe(true);
      expect(Number.isInteger(score.total)).toBe(true);
      expect(score.total).toBeGreaterThanOrEqual(40);
      expect(score.total).toBeLessThanOrEqual(99);
      for (const axis of engine.CHEMI_SCORE_AXES) {
        expect(Number.isInteger(score[axis])).toBe(true);
        expect(score[axis]).toBeGreaterThanOrEqual(20);
        expect(score[axis]).toBeLessThanOrEqual(99);
      }
      const row = engine.resolveChemiGrade(score.total);
      expect(score.grade).toBe(row.grade);
      expect(score.gradeTitle).toBe(row.gradeTitle);
      return score.total;
    });
    // 기존 엔진은 91.7% 가 한 등급에 몰렸다. 유형 픽스처끼리는 등급이 갈려야 한다.
    expect(new Set(totals.map((t) => engine.resolveChemiGrade(t).grade)).size).toBeGreaterThanOrEqual(3);
  });

  test.each([
    ["telepathy", "1988-01-25", ["dayStem.hap"]],
    ["same-wave", "1988-01-01", ["dayStem.same"]],
    ["accel-brake", "1988-01-16", ["dayStem.chung"]],
    ["locked-in", "1988-01-04", ["dayBranch.samhap"]],
    ["quiet-care", "1988-04-07", ["dayStem.generate", "element.complement"]],
    ["hype-charger", "1988-01-13", ["dayStem.generate", "sinsal.dohwa", "yinYang.opposite"]],
    ["push-pull", "1988-01-07", ["dayBranch.wonjin"]],
    ["cross-learn", "1988-02-16", ["dayStem.control"]],
    ["slow-burn", "1988-02-07", []],
  ])("type fixture %s (user %s × BTS 진)", (typeId, birthDate, keys) => {
    const r = run(birthDate, jin);
    expect(r.chemiTypeId).toBe(typeId);
    expect(r.matchedSignalKeys).toEqual(keys);
    expect(["high", "medium", "low"]).toContain(r.signalStrength);
    for (const s of r.signals) {
      expect(typeof s.evidenceKo).toBe("string");
      expect(["harmony", "friction", "neutral"]).toContain(s.tone);
    }
  });

  test("all 9 type ids are reachable and documented", () => {
    expect(engine.CHEMI_TYPE_IDS).toEqual([
      "telepathy", "same-wave", "accel-brake", "locked-in", "quiet-care", "hype-charger", "push-pull", "cross-learn", "slow-burn",
    ]);
    for (const t of engine.CHEMI_TYPES) {
      expect(t.nameKo.length).toBeGreaterThan(3);
      expect(t.ruleKo.length).toBeGreaterThan(3);
    }
  });

  test("hour pillar is never used, even when the user supplies a birth time", () => {
    const withTime = engine.computeChemi({ user: { birthDate: "1997-09-01", birthTime: "03:30" }, partner: jin, referenceDate: REF });
    const without = run("1997-09-01", jin);
    expect(withTime).toEqual(without);
    expect(withTime.pillars.user.includeHour).toBe(false);
    expect(withTime.pillars.partner.includeHour).toBe(false);
    expect(withTime.pillars.user.hour).toBeUndefined();
    expect(withTime.dataGaps).toContain("최애 출생 시간 비공개 — 시주 제외");
  });

  test("lunar input equals its solar equivalent (1997-07-30 lunar = 1997-09-01 solar)", () => {
    const lunar = run("1997-07-30", jin, { calendarType: "lunar" });
    const solar = run("1997-09-01", jin);
    expect(lunar.pillars).toEqual(solar.pillars);
    expect(lunar.chemiTypeId).toBe(solar.chemiTypeId);
    expect(lunar.inputHash).toBe(solar.inputHash);
  });

  test("minorMode: partner under 19 at referenceDate disables 도화·홍염 signals; referenceDate drives it", () => {
    const iseo = partners.resolvePartner({ kind: "roster", id: "ive-leeseo" });
    expect(iseo.birthDate).toBe("2007-02-21");
    const minor = engine.computeChemi({ user: { birthDate: "1997-09-01" }, partner: iseo, referenceDate: "2026-01-01" });
    expect(minor.minorMode).toBe(true);
    expect(minor.signals.some((s) => s.key.startsWith("sinsal."))).toBe(false);
    const adult = engine.computeChemi({ user: { birthDate: "1997-09-01" }, partner: iseo, referenceDate: "2026-10-04" });
    expect(adult.minorMode).toBe(false);
    // 사용자 쪽이 미성년이어도 minorMode
    const youngUser = engine.computeChemi({ user: { birthDate: "2010-05-05" }, partner: jin, referenceDate: REF });
    expect(youngUser.minorMode).toBe(true);
  });

  test("user under consent age (14) is rejected; bad inputs throw", () => {
    expect(() => engine.computeChemi({ user: { birthDate: "2014-01-01" }, partner: jin, referenceDate: REF })).toThrow("IDOL_CHEMI_USER_UNDER_CONSENT_AGE");
    expect(() => engine.computeChemi({ user: { birthDate: "1997-02-30" }, partner: jin, referenceDate: REF })).toThrow("IDOL_CHEMI_BIRTH_DATE_INVALID");
    expect(() => engine.computeChemi({ user: { birthDate: "1997-09-01" }, partner: jin })).toThrow("IDOL_CHEMI_REFERENCE_DATE_INVALID");
    expect(() => engine.computeChemi({ user: { birthDate: "1997-09-01" }, partner: null, referenceDate: REF })).toThrow("IDOL_CHEMI_PARTNER_REQUIRED");
    expect(() => engine.computeChemi({ user: { birthDate: "1997-09-01" }, partner: { ...jin, birthTimeKnown: true }, referenceDate: REF })).toThrow("IDOL_CHEMI_PARTNER_HOUR_FORBIDDEN");
  });

  test("result never carries a birth date string", () => {
    const r = run("1997-09-01", jin);
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/1997-09-01|19970901|1992-12-04/);
    expect(text).not.toMatch(/"birthDate"/);
  });

  test("engine sources never read the clock (no Date.now / new Date())", () => {
    const dir = path.join(ROOT, "lib/idol-chemi/engine");
    for (const file of fs.readdirSync(dir)) {
      const text = fs.readFileSync(path.join(dir, file), "utf8");
      expect(text).not.toMatch(/Date\.now\(/);
      expect(text).not.toMatch(/new Date\(\)/);
    }
  });

  test("relations.js tables match love-simulation relations.ts (parity)", async () => {
    const rel = await import("../../lib/idol-chemi/engine/relations.js");
    const ts = fs.readFileSync(path.join(ROOT, "app/saju/love-simulation/_engine/relations.ts"), "utf8").replace(/\/\/[^\n]*/g, "");
    const readArray = (name) => {
      const m = ts.match(new RegExp("const " + name + "[^=]*=\\s*(\\[[\\s\\S]*?\\]);"));
      if (!m) throw new Error("table not found: " + name);
      return JSON.parse(m[1].replace(/,\s*\]/g, "]"));
    };
    const readRecord = (name) => {
      const m = ts.match(new RegExp("const " + name + "[^=]*=\\s*\\{([\\s\\S]*?)\\};"));
      if (!m) throw new Error("record not found: " + name);
      const out = {};
      for (const row of m[1].matchAll(/"?([^\s":,{}]+)"?\s*:\s*"([^"]+)"/g)) out[row[1]] = row[2];
      return out;
    };
    const T = rel.RELATION_TABLES;
    for (const name of ["GAN_HE", "GAN_CHUNG", "ZHI_HE", "SAMHAP", "ZHI_CHUNG", "ZHI_PA", "ZHI_HAE", "WONJIN", "HYEONG_TRIADS", "HYEONG_PAIRS"]) {
      expect(T[name]).toEqual(readArray(name));
    }
    expect({ ...T.DOHWA_BY_GROUP }).toEqual(readRecord("DOHWA_BY_GROUP"));
    expect({ ...T.HONGYEOM_BY_STEM }).toEqual(readRecord("HONGYEOM_BY_STEM"));
    expect({ ...rel.STEM_ELEMENT }).toEqual(readRecord("STEM_ELEMENT"));
    expect({ ...rel.STEM_POLARITY }).toEqual(readRecord("STEM_POLARITY"));
    expect({ ...rel.BRANCH_ELEMENT }).toEqual(readRecord("BRANCH_ELEMENT"));
    expect({ ...rel.ELEMENT_GENERATES }).toEqual(readRecord("ELEMENT_GENERATES"));
    expect({ ...rel.ELEMENT_CONTROLS }).toEqual(readRecord("ELEMENT_CONTROLS"));
    // 십신 분기 스팟체크(정본 로직 이관)
    expect(rel.tenGodFromDayMaster("갑", "갑")).toBe("비견");
    expect(rel.tenGodFromDayMaster("갑", "을")).toBe("겁재");
    expect(rel.tenGodFromDayMaster("갑", "병")).toBe("식신");
    expect(rel.tenGodFromDayMaster("갑", "정")).toBe("상관");
    expect(rel.tenGodFromDayMaster("갑", "임")).toBe("편인");
    expect(rel.tenGodFromDayMaster("갑", "계")).toBe("정인");
    expect(rel.tenGodFromDayMaster("갑", "무")).toBe("편재");
    expect(rel.tenGodFromDayMaster("갑", "기")).toBe("정재");
    expect(rel.tenGodFromDayMaster("갑", "경")).toBe("편관");
    expect(rel.tenGodFromDayMaster("갑", "신")).toBe("정관");
    expect(rel.branchRelations("자", "오")).toEqual(["chung"]);
    expect(rel.branchRelations("자", "미")).toEqual(["hae", "wonjin"]);
    expect(rel.stemRelation("갑", "기")).toBe("hap");
  });
});
