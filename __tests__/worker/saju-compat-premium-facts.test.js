/**
 * 사주 고급 궁합 결정적 계산 모듈 계약.
 * 결정성, 시간 모름 정상 처리, 바람기 지표의 등급·근거, 전생 인연 정적 표를 지킨다.
 */
import {
  PAST_LIFE_TABLE,
  calculateSajuCompatPremiumFacts,
  normalizeSajuCompatPremiumInput,
} from "../../worker/lib/saju-compat-premium-facts.js";

const NOW = Date.UTC(2026, 10, 20);
const SELF = { birthDate: "1990-05-15", birthTime: "14:30", gender: "male", name: "나" };

function facts(partner, options = {}) {
  const normalized = normalizeSajuCompatPremiumInput({ self: SELF, partner, relationType: "dating" });
  expect(normalized.ok).toBe(true);
  return calculateSajuCompatPremiumFacts(normalized.input, { nowMs: NOW, ...options });
}

describe("saju-compat-premium facts", () => {
  test("같은 입력이면 같은 결과를 낸다", () => {
    const partner = { birthDate: "1992-11-03", birthTimeUnknown: true, gender: "female" };
    expect(JSON.stringify(facts(partner))).toBe(JSON.stringify(facts(partner)));
  });

  test("상대 시간 모름은 정상 입력이며 시주를 비우고 불확실성만 표시한다", () => {
    const result = facts({ birthDate: "1992-11-03", birthTimeUnknown: true, gender: "female" }, { authorityEnabled: true });
    expect(result.partner.timeUnknown).toBe(true);
    expect(result.partner.pillars.hour).toBeNull();
    expect(result.self.pillars).toEqual({ year: "庚午", month: "辛巳", day: "庚辰", hour: "癸未" });
    expect(result.uncertainty).toEqual(["partner_birth_time_unknown"]);
    expect(result.support.basis).toMatch(/확정 용신·기신 판정 아님/);
    for (const key of ["attraction", "stability", "communication", "endurance"]) {
      expect(Number.isFinite(result.axisScores[key])).toBe(true);
    }
  });

  test("바람기 지표는 근거 가중치 합으로 등급을 매기고 단정·비난 표현을 쓰지 않는다", () => {
    const high = facts({ birthDate: "1985-06-18", birthTime: "09:10", gender: "male" }).partnerTemperament;
    expect(high.grade).toBe("높음");
    expect(high.score).toBe(high.evidence.reduce((sum, row) => sum + row.weight, 0));
    expect(high.evidence.map((row) => row.key)).toEqual(
      expect.arrayContaining(["dohwa", "oppositeTenGodMixed", "spousePalaceCombination", "spousePalaceClash"]),
    );
    expect(high.oppositeTenGod.label).toBe("재성");

    const low = facts({ birthDate: "1992-11-03", birthTimeUnknown: true, gender: "female" }).partnerTemperament;
    expect(low.grade).toBe("낮음");
    expect(low.oppositeTenGod.label).toBe("관성");

    const text = JSON.stringify([high, low]);
    expect(text).not.toMatch(/바람둥이|외도한다|불륜|배신한다|반드시|틀림없/);
    expect(high.caution).toMatch(/판정하지 않/);
  });

  test("전생 인연은 일주×상대 년주 정적 표 20칸에서만 나온다", () => {
    const cells = Object.values(PAST_LIFE_TABLE).flatMap((row) => Object.values(row));
    expect(cells).toHaveLength(20);
    const result = facts({ birthDate: "1992-11-03", birthTimeUnknown: true, gender: "female" }).pastLife;
    expect(result.selfDayPillar).toBe("庚辰");
    expect(result.partnerYearPillar).toBe("壬申");
    expect(PAST_LIFE_TABLE[result.stemKey][result.branchKey]).toMatchObject({ title: result.title, grade: result.grade, text: result.text });
  });

  test("validate 모드는 두 명식 계산 가능 여부만 확인한다", () => {
    const result = facts({ birthDate: "1992-11-03", birthTimeUnknown: true, gender: "female" }, { mode: "validate" });
    expect(result).toEqual({
      version: "saju-compat-premium-facts-v1",
      mode: "validate",
      self: { dayPillar: "庚辰", timeUnknown: false },
      partner: { dayPillar: "癸未", timeUnknown: true },
    });
  });

  test("성별·날짜·관계 유형이 잘못되면 정규화에서 거절한다", () => {
    expect(normalizeSajuCompatPremiumInput({ self: SELF, partner: { birthDate: "1992-02-30", gender: "female" }, relationType: "dating" }).ok).toBe(false);
    expect(normalizeSajuCompatPremiumInput({ self: SELF, partner: { birthDate: "1992-11-03" }, relationType: "dating" }).ok).toBe(false);
    expect(normalizeSajuCompatPremiumInput({ self: SELF, partner: { birthDate: "1992-11-03", gender: "female" }, relationType: "enemy" }).ok).toBe(false);
  });
});
