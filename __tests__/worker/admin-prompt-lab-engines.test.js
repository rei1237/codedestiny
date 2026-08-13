/**
 * @jest-environment node
 *
 * 관리자 프롬프트 실험실이 라이브 유료 경로와 "같은 스펙"으로 도는지 지킨다.
 *
 * 이 가드가 존재하는 이유: 예전 실험실은 자미두수 명반을 seed 해시로 위조하고
 * (명궁 = positiveModulo(seed, 12)) 숙요 상대를 "내 index + 7"로 합성했다.
 * 프롬프트 모양만 그럴듯하고 명리적 내용은 입력과 무관했기 때문에 검수 도구로 쓸 수 없었다.
 *
 * 🔴 LLM 을 호출하지 않는다. 프롬프트 문자열 생성까지만 검증한다(CLAUDE.md 코딩 원칙 8).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

let admin;
let ziweiChart;
let vedicPrompt;
let sukuyoPrompt;
let adminSource;

const BASE_INPUT = {
  name: "관리자 대상",
  gender: "F",
  birthTime: "09:30",
  birthTimeUnknown: false,
  birthPlace: "Seoul",
  latitude: 37.5665,
  longitude: 126.978,
  timezone: "Asia/Seoul",
};

beforeAll(async () => {
  admin = await import("../../worker/routes/admin.js");
  ziweiChart = await import("../../worker/lib/ziwei-ai-chart.js");
  vedicPrompt = await import("../../worker/lib/vedic-ai-prompt.js");
  sukuyoPrompt = await import("../../worker/lib/sukuyo-ai-prompt.js");
  adminSource = readFileSync(join(process.cwd(), "worker", "routes", "admin.js"), "utf8");
});

describe("자미두수 실험실 명반", () => {
  function buildChart(birthDate = "1990-05-17") {
    return admin.buildAdminZiweiChartFromEngine(
      admin.buildAdminPromptProfile({ ...BASE_INPUT, birthDate, calendarType: "solar" }),
    );
  }

  test("라이브 엔진(calculateZiweiAiChart) 결과와 명궁·신궁·국수·연주가 일치한다", () => {
    const chart = buildChart();
    const engine = ziweiChart.calculateZiweiAiChart({
      birthInfo: {
        gender: "female",
        birthDate: "1990-05-17",
        birthTime: "09:30",
        birthTimeUnknown: false,
        calendarType: "solar",
        isLeapMonth: false,
      },
    }, { year: new Date().getUTCFullYear() });

    expect(chart.mingGong).toBe(engine.lifePalace);
    expect(chart.shenGong).toBe(engine.bodyPalace);
    expect(chart.juInfo).toBe(engine.bureau.name);
    expect(chart.yearGan).toBe(engine.lunar.yearStem);
    expect(chart.yearZhi).toBe(engine.lunar.yearBranch);
  });

  test("사화 4성이 엔진의 카멜 키(huaLu 등)에서 끊기지 않고 이어진다", () => {
    const chart = buildChart();
    const engine = ziweiChart.calculateZiweiAiChart({
      birthInfo: {
        gender: "female",
        birthDate: "1990-05-17",
        birthTime: "09:30",
        birthTimeUnknown: false,
        calendarType: "solar",
        isLeapMonth: false,
      },
    }, { year: new Date().getUTCFullYear() });

    expect(chart.sihua.hualu).toBe(engine.fourTransformations.huaLu);
    expect(chart.sihua.huaquan).toBe(engine.fourTransformations.huaQuan);
    expect(chart.sihua.huake).toBe(engine.fourTransformations.huaKe);
    expect(chart.sihua.huaji).toBe(engine.fourTransformations.huaJi);
    // 프롬프트는 소문자 키만 읽으므로 하나라도 비면 사화가 통째로 사라진다.
    expect(chart.sihua.hualu).toBeTruthy();
  });

  test("12궁 전부 프롬프트 계약의 id 가 붙는다(노복궁 -> friends 포함)", () => {
    const chart = buildChart();
    expect(chart.palaces).toHaveLength(12);
    chart.palaces.forEach((palace) => {
      expect(palace.id).toBeTruthy();
      expect(palace.branch).toBeTruthy();
    });
    expect(chart.palaces.some((palace) => palace.id === "friends")).toBe(true);
  });

  test("강약 심볼은 엔진 표에 있는 값만 붙는다(없는 근거를 지어내지 않는다)", () => {
    const allowed = new Set(["◎", "O", "▲", "△", "X"]);
    buildChart().palaces
      .flatMap((palace) => [...palace.mainStars, ...palace.auxiliaryStars, ...palace.strengthSummary.weakStars])
      .forEach((star) => {
        if (star.strengthSymbol) expect(allowed.has(star.strengthSymbol)).toBe(true);
      });
  });

  test("최강궁과 최약궁이 서로 다르다 — 최약궁을 상위 3개 목록에서 뽑지 않는다", () => {
    const chart = buildChart();
    expect(chart.summary.strongestPalaceId).toBeTruthy();
    expect(chart.summary.weakestPalaceId).toBeTruthy();
    expect(chart.summary.weakestPalaceId).not.toBe(chart.summary.strongestPalaceId);
  });

  test("생년월일이 하루 달라지면 명반이 실제로 달라진다(seed 위조 회귀 감시)", () => {
    const starsOf = (chart) => chart.palaces.map((palace) => palace.mainStars.map((star) => star.name).join(","));
    expect(starsOf(buildChart("1990-05-17"))).not.toEqual(starsOf(buildChart("1990-05-18")));
  });
});

describe("숙요 궁합 실험실", () => {
  const profile = () => admin.buildAdminPromptProfile({ ...BASE_INPUT, birthDate: "1990-05-17", calendarType: "solar" });
  const partner = (birthDate, name) => admin.buildAdminPartnerProfile({
    partnerBirthDate: birthDate,
    partnerCalendarType: "solar",
    partnerGender: "M",
    partnerName: name,
  });

  test("상대를 넣지 않으면 궁합 데이터 없이 개인 해석만 나간다", () => {
    const solo = admin.buildAdminSukuyoContext(profile(), null);
    expect(solo.compatibilityResult).toBeNull();
    expect(solo.basicResult.mansion).toBeTruthy();
  });

  test("상대 생년월일이 실제 27수로 계산된다", () => {
    const context = admin.buildAdminSukuyoContext(profile(), partner("1992-11-03", "상대A"));
    expect(context.compatibilityResult).toBeTruthy();
    expect(context.compatibilityResult.partnerName).toBe("상대A");
    expect(context.compatibilityResult.partnerMansion).toMatch(/숙$/);
    expect(context.compatibilityResult.relationType).toBeTruthy();
  });

  test("상대 index 가 '내 index + 7' 합성이 아니다(회귀 감시)", () => {
    const context = admin.buildAdminSukuyoContext(profile(), partner("1992-11-03", "상대A"));
    const { myIdx, partnerIdx } = context.compatibilityResult;
    expect((partnerIdx - myIdx + 27) % 27).not.toBe(7);
  });

  test("상대를 바꾸면 본명숙이 실제로 달라진다", () => {
    const a = admin.buildAdminSukuyoContext(profile(), partner("1992-11-03", "상대A"));
    const b = admin.buildAdminSukuyoContext(profile(), partner("1988-02-20", "상대B"));
    expect(a.compatibilityResult.partnerIdx).not.toBe(b.compatibilityResult.partnerIdx);
  });

  test("객체로 오는 정본을 프롬프트가 읽는 문자열로 평문화한다", () => {
    const { compatibilityResult } = admin.buildAdminSukuyoContext(profile(), partner("1992-11-03", "상대A"));
    expect(compatibilityResult.roleGuideText).toBeTruthy();
    expect(compatibilityResult.elementHarmonyText).toBeTruthy();
    expect(compatibilityResult.strengthShadowText).toBeTruthy();
  });

  test("궁합 템플릿이 상대 데이터를 실제로 물고 프롬프트를 만든다", () => {
    const context = admin.buildAdminSukuyoContext(profile(), partner("1992-11-03", "상대A"));
    const built = sukuyoPrompt.buildSukuyoAIPromptWithDomain({
      question: "이 사람과 오래 갈 수 있을지 궁금합니다.",
      basicResult: context.basicResult,
      compatibilityResult: context.compatibilityResult,
      domain: "compatibility",
    });
    const text = String(built.generatedPrompt || built.prompt || "");
    expect(text).toContain(context.compatibilityResult.partnerMansion);
    expect(text).not.toContain("관리자 상대");
  });
});

describe("실험실이 프로덕션 계약을 벗어나지 않는다", () => {
  test("베다는 프로덕션과 같은 buildVedicAIPrompt 를 쓴다", () => {
    // 주석에도 이름이 나오므로 호출·임포트만 본다.
    expect(/buildVedicAIPrompt\(\{/.test(adminSource)).toBe(true);
    expect(/buildVedicAIPromptWithDomain\s*\(/.test(adminSource)).toBe(false);
    expect(/import\s*\{[^}]*buildVedicAIPromptWithDomain/.test(adminSource)).toBe(false);
  });

  test("그 빌더가 실제로 프롬프트를 만든다", () => {
    const built = vedicPrompt.buildVedicAIPrompt({
      question: "올해 이직해도 괜찮을까요?",
      vedicResult: {
        profile: { name: "관리자 대상", gender: "F", birthTimeKnown: true },
        lagna: { signKo: "메샤", sign: "Aries", degree: 12.5, lord: "망갈" },
        moonNakshatra: { name: "로히니", pada: 2, lord: "찬드라" },
        planets: [{ grahaKo: "수리야", rashiKo: "브리샤바", bhava: 2 }],
        bhavas: [{ number: 1, rashiKo: "메샤", lord: "망갈", planets: [] }],
        dashas: [{ planet: "슈크라", start: "2020", end: "2040", active: true }],
      },
      compatibilityResult: null,
    });
    expect(String(built.generatedPrompt || built.prompt || "").length).toBeGreaterThan(0);
  });

  test("CMS 도메인 템플릿 오버라이드를 프롬프트 빌드 전에 채운다", () => {
    expect(/primePromptTemplateOverrides\(env\)/.test(adminSource)).toBe(true);
    const primeAt = adminSource.indexOf("await primePromptTemplateOverrides(env)");
    const buildAt = adminSource.indexOf("const built = await buildAdminPromptByService(");
    expect(primeAt).toBeGreaterThan(-1);
    expect(buildAt).toBeGreaterThan(primeAt);
  });

  test("사주 생년정보를 마스킹하지 않는다 — 검수 대상과 실물이 같아야 한다", () => {
    expect(/hideName:\s*true/.test(adminSource)).toBe(false);
  });
});
