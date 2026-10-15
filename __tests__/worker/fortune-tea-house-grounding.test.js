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

  test("숙요 석 달 리듬은 30일 세 구간과 두 사람 모두 순한 날·조심할 날만 넘긴다", async () => {
    const { buildTeaSukuyoMonthlyRhythm, teaSukuyoRhythmFromLongitudes } = await import("../../worker/lib/tea-sukuyo-monthly.js");
    // 달이 하루에 한 수(宿)씩 나아가는 결정론 황경. 실제 천체력(WASM) 없이 날짜별 판정만 본다.
    const rhythm = teaSukuyoRhythmFromLongitudes("2026-10-15", Array.from({ length: 90 }, (_, i) => (i * 360) / 27 + 1), 3, 17);
    expect(rhythm.windows.map(w => [w.startsOn, w.endsOn])).toEqual([
      ["2026-10-15", "2026-11-13"], ["2026-11-14", "2026-12-13"], ["2026-12-14", "2027-01-12"],
    ]);
    for (const w of rhythm.windows) for (const who of ["user", "partner"]) expect(w[who].good + w[who].caution + w[who].special).toBe(30);
    expect(rhythm.bestSharedDays).toHaveLength(3);
    for (const day of rhythm.bestSharedDays) for (const who of ["user", "partner"]) expect(day[who]).toMatch(/^(대길일|길일) · /);
    for (const day of rhythm.cautionSharedDays) for (const who of ["user", "partner"]) expect(day[who]).toMatch(/^(주의일|흉일) · /);
    expect(teaSukuyoRhythmFromLongitudes("2026-10-15", Array(90).fill(null), 3, 17)).toBeNull();
    await expect(buildTeaSukuyoMonthlyRhythm({}, undefined, 17, { todayKst: "2026-10-15" })).resolves.toBeNull();
  });
});

describe("숙요 출생 시각 근거", () => {
  test("오프셋을 받지 않으면 비워 두어 IANA 역사 오프셋을 쓰고, 복구 해시는 예전 기본값 9와 같다", async () => {
    const { createHash } = await import("node:crypto");
    const { __fortuneTeaHouseTestUtils: utils } = await import("../../worker/routes/fortune-tea-house.js");
    const { resolveTimezoneOffsetHours } = await import("../../worker/lib/iana-offset.js");
    const body = {
      consultationMode: "sukuyo", selectedTeaCupId: "cup", selectedTeaCupName: "찻잔", selectedTeaCupTopic: "연애", question: "우리 사이는 어떨까요?",
      sukuyo: { user: { birthDate: "1958-01-15", birthTime: "07:40" }, partner: { birthDate: "1988-07-15", birthTimeUnknown: true } },
    };
    const request = utils.normalizeRequest(body);
    expect(request.sukuyo.user).toMatchObject({ birthTime: "07:40", birthTimeUnknown: false, timezone: "Asia/Seoul", timezoneOffset: null });
    expect(request.sukuyo.partner).toMatchObject({ birthTimeUnknown: true, timezoneOffset: null });
    // 서울은 1954~61년 +8:30, 1988년 여름은 서머타임 +10이었다.
    expect(resolveTimezoneOffsetHours("Asia/Seoul", { year: 1958, month: 1, day: 15, hour: 7, minute: 40 })).toBe(8.5);
    expect(resolveTimezoneOffsetHours("Asia/Seoul", { year: 1988, month: 7, day: 15, hour: 12, minute: 0 })).toBe(10);

    const legacy = { ...request, sukuyo: { ...request.sukuyo, user: { ...request.sukuyo.user, timezoneOffset: 9 }, partner: { ...request.sukuyo.partner, timezoneOffset: 9 } } };
    expect(utils.fortuneTeaRequestHash(request)).toBe(createHash("sha256").update(JSON.stringify(legacy)).digest("hex"));
    const explicit = utils.normalizeRequest({ ...body, sukuyo: { ...body.sukuyo, user: { ...body.sukuyo.user, timezoneOffset: 8.5 } } });
    expect(explicit.sukuyo.user.timezoneOffset).toBe(8.5);
    expect(utils.fortuneTeaRequestHash(explicit)).not.toBe(utils.fortuneTeaRequestHash(request));
  });
});

describe("타로·숙요 프롬프트 근거", () => {
  const base = { selectedTeaCupId: "cup", selectedTeaCupName: "찻잔", selectedTeaCupTopic: "연애", question: "그 사람에게 지금 연락해도 될까요?", consultationVersion: "tea-v2" };

  test("타로 카드마다 서버가 고른 주제별 전통 해석과 오늘 날짜를 넘긴다", async () => {
    const { __fortuneTeaHouseTestUtils: utils } = await import("../../worker/routes/fortune-tea-house.js");
    const { teaDrawCards, teaSpread } = await import("../../lib/fortune-tea-house/tarot-contract.mjs");
    const { TAROT_CARDS } = await import("../../lib/tarot/tarot-cards.mjs");
    const request = utils.normalizeRequest({ ...base, consultationMode: "tarot", tarotSpread: "five" });
    const deck = { order: TAROT_CARDS.map(card => card.code), reversed: TAROT_CARDS.map((_, i) => i % 2 === 1) };
    const cards = teaDrawCards(teaSpread("yn_contact_first"), deck, [6, 1, 2, 3, 4]);
    const fallback = utils.normalizeDraftResult({ tarot: cards[0], tarotSpreadCards: cards, tarotSpread: "five" }, request);
    const facts = JSON.parse(utils.buildUserPrompt(request, fallback)).tarotFactInput;
    expect(facts.todayKst).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(facts.spreadCards).toHaveLength(5);
    // 연인 정방향, 연애 배열: 심리·조언·그림자에 연애 신호까지.
    expect(facts.spreadCards[0]).toMatchObject({ nameKo: "연인", orientation: "upright" });
    expect(Object.keys(facts.spreadCards[0].topicMeaning)).toEqual(expect.arrayContaining(["psychological", "advice", "shadow", "attraction", "fear", "commitment"]));
    // 예전 클라 초안처럼 JSON이 아닌 씨앗은 싣지 않는다.
    const legacy = utils.normalizeDraftResult({ tarot: cards[0], tarotSpreadCards: cards.map(card => ({ ...card, topicReadingSeed: "요약 문장" })), tarotSpread: "five" }, request);
    expect(JSON.parse(utils.buildUserPrompt(request, legacy)).tarotFactInput.spreadCards[0].topicMeaning).toBeUndefined();
  });

  test("숙요 프롬프트는 지운 점수·오행 조화를 근거로 요구하지 않는다", async () => {
    const { __fortuneTeaHouseTestUtils: utils } = await import("../../worker/routes/fortune-tea-house.js");
    const request = utils.normalizeRequest({ ...base, consultationMode: "sukuyo", sukuyo: { user: { birthDate: "1990-05-05" }, partner: { birthDate: "1992-08-20" } } });
    const prompt = utils.buildUserPrompt(request, utils.normalizeDraftResult({}, request));
    expect(prompt).not.toMatch(/elementHarmony|영역 점수|오행 조화\(|"scores"/);
    expect(JSON.parse(prompt).sukuyoFactInput.todayKst).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("사주 장 분량 규칙은 그룹 하한과 어긋나는 고정 글자 수를 두지 않는다", async () => {
    const { __fortuneTeaHouseTestUtils: utils } = await import("../../worker/routes/fortune-tea-house.js");
    const { canonicalTeaSaju } = await import("../../worker/lib/tea-saju-facts.js");
    const request = { ...base, ...birth, gender: "female", consultationMode: "saju" };
    const prompt = utils.buildUserPrompt(request, utils.normalizeDraftResult({ saju: canonicalTeaSaju(request) }, request));
    expect(JSON.parse(prompt).sajuQualityRule.sectionLengthRule).toContain("groupRule.minimumKoreanChars");
    expect(prompt).not.toContain("250~350자");
  });
});

describe("명식 관계 근거", () => {
  test("궁합 교차 관계는 같은 자리 지지끼리 계산하고 한쪽 시주가 없으면 시지를 뺀다", async () => {
    const { buildTeaCompatRelations, buildTeaNatalRelations } = await import("../../worker/lib/tea-saju-relations.js");
    const relations = buildTeaCompatRelations({ year: "庚午", month: "辛巳", day: "甲子", hour: "丙寅" }, { year: "병자", month: "辛丑", day: "己丑" });
    expect(relations.dayStems).toBe("갑↔기 천간합");
    expect(relations.branchPairs).toEqual([
      { position: "일지", self: "자", partner: "축", relations: ["육합"] },
      { position: "년지", self: "오", partner: "자", relations: ["충"] },
      { position: "월지", self: "사", partner: "축", relations: ["반합"] },
    ]);
    expect(buildTeaNatalRelations({ year: "庚午", day: "甲子" })).toEqual(["년주↔일주 천간충 갑경충", "년주↔일주 지지충 자오충"]);
  });

  test("궁합 근거에는 교차 관계와 상대 시기 표가, 단독 사주에는 원국 관계가 실린다", async () => {
    const { __fortuneTeaHouseTestUtils: utils } = await import("../../worker/routes/fortune-tea-house.js");
    const { canonicalTeaSaju } = await import("../../worker/lib/tea-saju-facts.js");
    const { buildSajuResultSection } = await import("../../lib/fortune-tea-house/saju-result-adapter.mjs");
    const request = { consultationVersion: "tea-v2", consultationMode: "sajuCompatibility", question: "우리 관계는 어떻게 흘러갈까요?" };
    const people = {
      user: { name: "나", gender: "female", ...birth, birthTimeUnknown: false },
      partner: { name: "상대", gender: "male", birthDate: "1992-08-20", birthTime: "", birthTimeUnknown: true, calendarType: "solar", timezone: "Asia/Seoul" },
    };
    const pair = Object.fromEntries(Object.entries(people).map(([key, person]) => {
      const personRequest = { ...request, ...person, nickname: person.name };
      return [key, { ...person, saju: canonicalTeaSaju(personRequest, buildSajuResultSection(buildFortuneTeaSajuSnapshotFromParts(person), personRequest)) }];
    }));
    const facts = utils.buildSajuFactInput(request, pair.user.saju, utils.resolveSajuCategoryRule(request), { sajuCompatibility: pair });
    expect(facts.compatRelations.dayStems).toBe("경↔무 상생");
    expect(facts.compatRelations.branchPairs.map(row => row.position)).toEqual(["일지", "년지", "월지"]);
    expect(facts.selfProfile.natalRelations).toEqual(["년주↔일주 지지형 오오형"]);
    expect(facts.partnerProfile.natalRelations).toEqual([]);
    expect(facts.partnerTimingFacts.monthlyRows).toHaveLength(3);
    expect(facts.sajuFacts.natalRelations).toBeUndefined();

    const single = { ...request, ...people.user, consultationMode: "saju" };
    const singleFacts = utils.buildSajuFactInput(single, canonicalTeaSaju(single), utils.resolveSajuCategoryRule(single));
    expect(singleFacts.sajuFacts.natalRelations).toEqual(["년주↔일주 지지형 오오형"]);
    expect(singleFacts.compatRelations).toBeUndefined();
    expect(singleFacts.partnerTimingFacts).toBeUndefined();
  });
});

describe("해외 출생 경도 근거", () => {
  test("경도 없는 뉴욕 출생은 그 시간대 표준 자오선으로 보정하고, 서울은 그대로 둔다", async () => {
    const { canonicalTeaSaju, withTeaSajuLongitude } = await import("../../worker/lib/tea-saju-facts.js");
    const pillar = (saju, key) => saju.pillars.find(row => row.key === key).ganji;
    const newYork = { birthDate: "1990-01-15", birthTime: "10:00", calendarType: "solar", timezone: "America/New_York", gender: "female" };
    expect(withTeaSajuLongitude(newYork).longitude).toBe(-75);
    const guessed = canonicalTeaSaju(newYork);
    const measured = canonicalTeaSaju({ ...newYork, longitude: -74.006 });
    // 서울 경도로 보정하면 일주가 다음 날 辛巳로, 시주가 戊子로 밀린다.
    expect([pillar(guessed, "day"), pillar(guessed, "hour")]).toEqual(["庚辰", "辛巳"]);
    expect([pillar(measured, "day"), pillar(measured, "hour")]).toEqual(["庚辰", "辛巳"]);

    const seoul = { ...newYork, timezone: "Asia/Seoul" };
    expect(withTeaSajuLongitude(seoul)).toBe(seoul);
    expect(withTeaSajuLongitude({ ...newYork, timezone: "KST" }).longitude).toBeUndefined();
    expect(pillar(canonicalTeaSaju(seoul), "hour")).toBe(pillar(canonicalTeaSaju({ ...seoul, longitude: 126.978 }), "hour"));
  });
});

describe("분량 목표", () => {
  test("체크포인트 그룹은 하한을 그대로 두고 목표만 15% 올린다", async () => {
    const { __fortuneTeaHouseTestUtils: utils } = await import("../../worker/routes/fortune-tea-house.js");
    const request = { consultationVersion: "tea-v2", consultationMode: "saju", question: "올해 일은 어떻게 풀릴까요?", ...birth };
    const main = utils.buildTeaCheckpointGroups(request, {}).find(group => group.key === "reading-main");
    expect([main.minChars, main.targetChars]).toEqual([3500, 5032]);
    const { groupRule } = utils.applyFortuneTeaGroupScope({ outputSchema: {} }, main);
    expect(groupRule.minimumKoreanChars).toBe(3500);
    expect(groupRule.targetBodyChars).toBe(5032);
    expect(groupRule.lengthRule).toContain("목표는 5032자 안팎");
  });
});
