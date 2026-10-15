/** @jest-environment node */
// 전문가 상담 캐릭터 페르소나(윤달·무성·서한비) — 덧붙이는 위치, 로케일, 말투 이탈 검사.
// 🔴 LLM 을 부르지 않는다(CMS 는 모킹, 검사기는 결정적 함수).
import { jest } from "@jest/globals";

const cmsPromptText = jest.fn(async (_env, key, fallback) => (key.startsWith("expert-persona-") ? fallback : "관리자 오버라이드 지시문"));
jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText, cmsPromptModelConfig: async () => ({}) }));

let personas, ZIWEI_DEEP_CHAPTERS, buildZiweiDeepChapterPrompt, calculateZiweiAiChart;

beforeAll(async () => {
  personas = await import("../../worker/lib/expert-character-personas.js");
  ({ ZIWEI_DEEP_CHAPTERS, buildZiweiDeepChapterPrompt } = await import("../../worker/lib/ziwei-deep-report-prompt.mjs"));
  ({ calculateZiweiAiChart } = await import("../../worker/lib/ziwei-ai-chart.js"));
});

beforeEach(() => cmsPromptText.mockClear());

test("관리자 오버라이드가 있어도 페르소나는 그 뒤에 붙는다", async () => {
  for (const [key, header] of [["yun", "[상담자 페르소나 — 윤달]"], ["musung", "[상담자 페르소나 — 무성]"], ["hanbi", "[상담자 페르소나 — 서한비]"]]) {
    const base = await cmsPromptText({}, "route-key", "기본 지시문");
    const prompt = await personas.appendExpertPersona({}, key, base);
    expect(prompt.startsWith("관리자 오버라이드 지시문\n\n")).toBe(true);
    expect(prompt.endsWith(personas.getDefaultExpertPersona(key))).toBe(true);
    expect(prompt).toContain(header);
  }
  expect(cmsPromptText).toHaveBeenCalledWith({}, "expert-persona-yun", personas.YUN_PERSONA_KO);
});

test("무성은 한국어 밖 로케일에서 영어 메모를 쓰고 페르소나 CMS 를 읽지 않는다", async () => {
  const prompt = await personas.appendExpertPersona({}, "musung", "BASE", { locale: "en" });
  expect(prompt).toBe(`BASE\n\n${personas.MUSUNG_PERSONA_EN}`);
  expect(cmsPromptText).not.toHaveBeenCalled();
  expect(await personas.appendExpertPersona({}, "musung", "BASE", { locale: "ko-KR" })).toContain("[상담자 페르소나 — 무성]");
});

test("페르소나는 출력 형식을 바꾸지 않고, 금지 이름·다른 상담자 어휘를 지시하지 않는다", () => {
  for (const text of [personas.YUN_PERSONA_KO, personas.MUSUNG_PERSONA_KO, personas.HANBI_PERSONA_KO]) {
    expect(text).toMatch(/그대로 따릅니다\. 이 페르소나는 말투와 상담 태도만 정합니다\./u);
    expect(text).not.toContain("박지은");
  }
  expect(personas.MUSUNG_PERSONA_KO).toMatch(/meta\.dayun, action_plan/u);
  expect(personas.MUSUNG_PERSONA_KO).toMatch(/성인 고객.*애칭.*연애적 친밀감/u);
  expect(personas.HANBI_PERSONA_KO).toMatch(/JSON 키와 점수 필드/u);
});

test("자미두수 심층 리포트 장 프롬프트는 작성 지시 뒤에 로케일별 무성 페르소나를 둔다", () => {
  const birthInfo = { name: "테스트", gender: "여성", birthDate: "1987-06-15", birthTime: "08:20", calendarType: "solar" };
  const chart = calculateZiweiAiChart({ birthInfo }, { year: 2026 });
  const chapter = ZIWEI_DEEP_CHAPTERS[0];
  const ko = buildZiweiDeepChapterPrompt(chart, birthInfo, chapter);
  expect(ko.indexOf("[상담자 페르소나 — 무성]")).toBeGreaterThan(ko.indexOf("[작성 지시]"));
  expect(ko.trimEnd().endsWith(`이제 "${chapter.title}"를 작성하라.`)).toBe(true);
  expect(ko).not.toMatch(/\d+년 경력/u);
  const en = buildZiweiDeepChapterPrompt(chart, birthInfo, chapter, null, "en");
  expect(en).toContain("[Advisor persona — Museong]");
  expect(en).not.toContain("[상담자 페르소나 — 무성]");
});

test("롤백 스위치는 고정돼 있고, 알 수 없는 키는 원래 프롬프트를 그대로 돌려준다", async () => {
  expect(Object.isFrozen(personas.EXPERT_PERSONA_ENABLED)).toBe(true);
  expect(await personas.appendExpertPersona({}, "unknown", "BASE")).toBe("BASE");
});

describe("말투 이탈 검사", () => {
  test("윤달: 해요체 상담문은 통과, 반말·설정어는 걸린다", () => {
    expect(personas.yunRegisterDrift("태어난 시각을 분까지 알면 상승궁이 또렷해져요. 태양은 사자자리 10하우스에 있어요. 이 배치는 무대에 서는 일과 잘 맞습니다.")).toEqual([]);
    expect(personas.yunRegisterDrift("태양은 사자자리다. 너는 무대에 서야 한다. 달은 물고기자리에 있다. 강새벽이 말해 준다.")).toEqual(["banmal", "lore:강새벽"]);
  });
  test("무성: 판결로 여는 섹션은 통과, 첫 문장이 판결이 아니거나 친밀 표현이 있으면 걸린다", () => {
    expect(personas.musungRegisterDrift("① 막힌 자리는 관록궁입니다. 화기가 앉은 자리라 일이 자꾸 멈춰요. 이번 달에는 보고 주기를 일주일로 줄여 보세요.")).toEqual([]);
    const issues = personas.musungRegisterDrift("관록궁이 막혔다. 화기가 앉았다. 보고를 줄이면 풀린다. 자기야, 깃털이 말해 줄게.");
    expect(issues).toEqual(expect.arrayContaining(["banmal", "lore:깃털", "intimacy:자기야", "verdict-opening"]));
  });
  test("서한비: 다른 상담자 어휘와 금지 이름을 잡는다", () => {
    expect(personas.hanbiRegisterDrift("두 분의 달집 사이에는 일정한 거리가 있어요. 그 거리가 쌓이는 빚이 되지 않게, 한 주에 한 번 먼저 안부를 건네 보세요.")).toEqual([]);
    expect(personas.hanbiRegisterDrift("찻잔을 사이에 두고 박지은이 말했어요.")).toEqual(["lore:박지은", "lore:찻잔"]);
  });
});
