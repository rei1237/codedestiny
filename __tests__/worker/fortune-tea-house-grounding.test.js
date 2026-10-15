/**
 * @jest-environment node
 *
 * 운명 찻집 풀이 근거: LLM이 지어내지 않도록 서버가 계산해 넘기는 사실값을 고정한다.
 * 과금 LLM 호출 없이 순수 계산 함수만 검증한다.
 */

import { buildFortuneTeaSajuSnapshotFromParts } from "../../lib/fortune-tea-house/saju-result-adapter.mjs";

const birth = { birthDate: "1990-05-05", birthTime: "10:30", calendarType: "solar", timezone: "Asia/Seoul" };

test("여성 표기는 male 패턴보다 먼저 여성으로 판정해 대운 방향을 바꾼다", () => {
  const firstPillar = gender => buildFortuneTeaSajuSnapshotFromParts({ ...birth, gender }).daewoon[0].pillar;
  // 1990 庚午는 양년이라 남성은 순행, 여성은 역행한다.
  for (const gender of ["female", "Woman", "여", "여성"]) expect(firstPillar(gender)).toBe("己卯");
  for (const gender of ["male", "man", "남", "남성"]) expect(firstPillar(gender)).toBe("辛巳");
});

describe("시기 근거", () => {
  let utils, canonicalTeaSaju;
  beforeAll(async () => {
    ({ __fortuneTeaHouseTestUtils: utils } = await import("../../worker/routes/fortune-tea-house.js"));
    ({ canonicalTeaSaju } = await import("../../worker/lib/tea-saju-facts.js"));
  });

  test("서버 명식의 대운 중 한국 시각 기준 현재 대운 하나만 표시한다", () => {
    const saju = canonicalTeaSaju({ ...birth, gender: "female" }, {}, new Date("2026-10-15T03:00:00Z"));
    const current = saju.daewoon.filter(row => row.isCurrent);
    expect(current).toHaveLength(1);
    expect(current[0]).toMatchObject({ pillar: "丁丑", startYear: 2020, endYear: 2029 });
    expect(utils.buildFortuneTeaTimingFacts(saju, "2026-10-15").daewoonRows.filter(row => row.isCurrent)).toHaveLength(1);
  });

  test("세운은 1월 1일이 아니라 입춘에 바뀐다", () => {
    const saju = canonicalTeaSaju({ ...birth, gender: "female" });
    expect(utils.buildFortuneTeaTimingFacts(saju, "2027-01-20").sewoonRows[0]).toMatchObject({ year: 2026, pillar: "병오", isCurrent: true });
    expect(utils.buildFortuneTeaTimingFacts(saju, "2027-02-10").sewoonRows[0]).toMatchObject({ year: 2027, pillar: "정미", isCurrent: true });
  });

  test("월운은 절입 시각부터 바뀌고 석 달만 원국 관계와 함께 넘긴다", async () => {
    const { buildTeaSajuMonthlyRows } = await import("../../worker/lib/tea-saju-monthly.js");
    const pillars = { year: "庚午", month: "庚辰", day: "庚午", hour: "辛巳" };
    // 2026년 한로 절입은 10월 8일 15:30(KST)이다.
    expect(buildTeaSajuMonthlyRows(pillars, new Date("2026-10-08T06:00:00Z"))[0].pillar).toBe("丁酉");
    expect(buildTeaSajuMonthlyRows(pillars, new Date("2026-10-08T07:00:00Z"))[0]).toMatchObject({
      startsOn: "2026-10-08", nextStartsOn: "2026-11-07", pillar: "戊戌", stemTenGod: "편인", natalRelations: ["월운↔월주 지지충 진술충"],
    });

    const timing = utils.buildFortuneTeaTimingFacts(canonicalTeaSaju({ ...birth, gender: "female" }), "2026-10-15");
    expect(timing.monthlyAvailable).toBe(true);
    expect(timing.monthlyRows.map(row => row.pillar)).toEqual(["무술", "기해", "경자"]);
    expect(timing.monthlyRows[0]).toMatchObject({ isCurrent: true });
  });
});
