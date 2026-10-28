/** @jest-environment node */
// 전문가 상담 캐릭터 페르소나(윤달·무성·서한비·연이)와 대표 상담 마스터(연애 비책·신년운세·인생의 책) — 덧붙이는 위치, 로케일, 말투 이탈 검사.
// 🔴 LLM 을 부르지 않는다(CMS 는 모킹, 검사기는 결정적 함수).
import { jest } from "@jest/globals";

const cmsPromptText = jest.fn(async (_env, key, fallback) => (key.startsWith("expert-persona-") ? fallback : "관리자 오버라이드 지시문"));
jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({ cmsPromptText, cmsPromptModelConfig: async () => ({}) }));

let personas, ZIWEI_DEEP_CHAPTERS, buildZiweiDeepChapterPrompt, calculateZiweiAiChart, neoRegisterDrift;

beforeAll(async () => {
  personas = await import("../../worker/lib/expert-character-personas.js");
  ({ neoRegisterDrift } = await import("../../worker/lib/neo-operation-room-prompt.js"));
  ({ ZIWEI_DEEP_CHAPTERS, buildZiweiDeepChapterPrompt } = await import("../../worker/lib/ziwei-deep-report-prompt.mjs"));
  ({ calculateZiweiAiChart } = await import("../../worker/lib/ziwei-ai-chart.js"));
});

beforeEach(() => cmsPromptText.mockClear());

test("관리자 오버라이드가 있어도 페르소나는 그 뒤에 붙는다", async () => {
  for (const [key, header] of [
    ["yun", "[상담자 페르소나 — 윤달]"], ["yunVedic", "[상담자 페르소나 — 윤달 · 베다점]"], ["musung", "[상담자 페르소나 — 무성]"], ["hanbi", "[상담자 페르소나 — 서한비]"], ["yeoni", "[상담자 페르소나 — 연이]"],
    ["yeoniLove", "[상담자 페르소나 — 연이 · 연애 비책]"], ["hanbiLove", "[상담자 페르소나 — 서한비 · 연애 비책]"],
    ["neoNewYear", "[상담자 페르소나 — 네오 · 신년운세]"], ["yunLifeBook", "[상담자 페르소나 — 윤달 · 인생의 책]"],
  ]) {
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
  for (const text of [
    personas.YUN_PERSONA_KO, personas.MUSUNG_PERSONA_KO, personas.HANBI_PERSONA_KO, personas.YEONI_PERSONA_KO,
    personas.YEONI_LOVE_PERSONA_KO, personas.HANBI_LOVE_PERSONA_KO, personas.NEO_NEW_YEAR_PERSONA_KO, personas.YUN_LIFE_BOOK_PERSONA_KO,
  ]) {
    expect(text).toMatch(/그대로 따릅니다\. 이 페르소나는 말투와 상담 태도만 정합니다\./u);
    expect(text).not.toContain("박지은");
  }
  // 대표 상담은 사주 명리 상품이다. 기본 지시의 "30년 경력"과 부딪히는 자기소개를 하지 않는다.
  for (const text of [personas.YEONI_LOVE_PERSONA_KO, personas.HANBI_LOVE_PERSONA_KO, personas.NEO_NEW_YEAR_PERSONA_KO, personas.YUN_LIFE_BOOK_PERSONA_KO]) {
    expect(text).toMatch(/나이·경력 같은 자기소개는 하지 않습니다|자기 이름은 상담 전체에서 많아야 한 번만/u);
    expect(text).not.toMatch(/\d+년 경력/u);
  }
  expect(personas.NEO_NEW_YEAR_PERSONA_KO).toMatch(/해라체 반말 한 가지.*'너'라고 부르고 '당신'은 쓰지 않습니다/u);
  expect(personas.NEO_NEW_YEAR_PERSONA_KO).toMatch(/깎아내리거나 조롱하지 않습니다/u);
  expect(personas.HANBI_LOVE_PERSONA_KO).toMatch(/숙요·본명숙 같은 다른 체계는 언급하지 않습니다/u);
  expect(personas.YUN_LIFE_BOOK_PERSONA_KO).toMatch(/점성술 용어.*쓰지 않습니다/u);
  expect(personas.MUSUNG_PERSONA_KO).toMatch(/meta\.dayun, action_plan/u);
  expect(personas.MUSUNG_PERSONA_KO).toMatch(/성인 고객.*애칭.*연애적 친밀감/u);
  expect(personas.HANBI_PERSONA_KO).toMatch(/JSON 키와 점수 필드/u);
  // 연이 캐논: 앞날 항목은 가능성으로, 금전·건강은 확정 예언 금지.
  expect(personas.YEONI_PERSONA_KO).toMatch(/■ 항목 구성과 순서/u);
  expect(personas.YEONI_PERSONA_KO).toMatch(/결혼·인연, 건강·활력, 향후 변화.*가능성/u);
  expect(personas.YEONI_PERSONA_KO).toMatch(/재물 액수·건강·수명을 확정해 예언하지 않으며/u);
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
  expect(await personas.resolveExpertPersona({}, "unknown")).toBe("");
});

test("resolveExpertPersona 는 CMS 를 거친 원문만 돌려준다(연애 비책은 base 와 범위 지시 사이에 끼운다)", async () => {
  expect(await personas.resolveExpertPersona({}, "hanbiLove")).toBe(personas.HANBI_LOVE_PERSONA_KO);
  expect(cmsPromptText).toHaveBeenCalledWith({}, "expert-persona-hanbi-love", personas.HANBI_LOVE_PERSONA_KO);
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
  test("연이: 해요체 손금 상담은 통과, 반말·원작 설정어·상담자 호칭은 걸린다", () => {
    expect(personas.yeoniRegisterDrift("감정선이 검지 아래까지 길게 뻗어 있어요. 마음을 표현하는 데 시간이 걸리는 편이라, 이번 주에는 먼저 안부를 건네 보세요.")).toEqual([]);
    expect(personas.yeoniRegisterDrift("감정선이 길다. 너는 사랑이 깊다. 생명선도 굵다. 연이님, 꽃돼지가 말해 줄게.")).toEqual(["banmal", "lore:꽃돼지", "lore:연이님"]);
  });
  test("연애 비책 연이: 손금과 같은 기준으로 해요체를 지킨다", () => {
    expect(personas.yeoniLoveRegisterDrift("그 사람의 답장이 늦어 마음이 쓰였죠. 일간이 정화라 감정이 먼저 달아오르는 편이에요. 오늘은 짧은 안부 한 줄만 보내 보세요.")).toEqual([]);
    expect(personas.yeoniLoveRegisterDrift("답장이 늦다. 너는 조급하다. 오늘은 그냥 기다린다. 꿀꿀.")).toEqual(["banmal", "lore:꿀꿀"]);
  });
  test("연애 비책 서한비: 숙요 계산어와 다른 상담자 어휘를 잡는다", () => {
    expect(personas.hanbiLoveRegisterDrift("두 분 사이에는 아직 좁혀지지 않은 거리가 있어요. 그 거리가 빚으로 쌓이지 않게, 서운한 일은 사흘 안에 말로 풀어 보세요.")).toEqual([]);
    expect(personas.hanbiLoveRegisterDrift("두 분의 본명숙이 멀어요. 팩폭하자면 작전이 필요해요.")).toEqual(["lore:팩폭", "lore:본명숙"]);
  });
  test("신년운세 네오: 해라체는 통과하고 존댓말이 섞이면 neoRegisterDrift 가 잡는다", () => {
    expect(neoRegisterDrift("올해 판세는 정재가 열리는 해다. 너는 상반기에 기반을 다져라. 7월에는 무리한 확장을 멈추자. 준비됐니?")).toBe(false);
    expect(neoRegisterDrift("올해는 정재가 열리는 해입니다. 상반기에 기반을 다지세요. 7월에는 확장을 멈추는 게 좋아요. 당신은 해낼 수 있습니다.")).toBe(true);
  });
  test("인생의 책 윤달: 해요체 사주 서술은 통과, 점성술 용어와 원작 설정어는 걸린다", () => {
    expect(personas.yunLifeBookRegisterDrift("일간이 갑목이라 곧게 자라려는 힘이 커요. 서른 무렵 대운이 바뀌며 책장이 한 장 넘어갔어요. 다음 장은 사람을 모으는 이야기예요.")).toEqual([]);
    expect(personas.yunLifeBookRegisterDrift("10하우스에 태양이 있어요. 하늘배가 당신을 기다려요. 강새벽도 그랬죠.")).toEqual(["lore:강새벽", "lore:하우스", "lore:하늘배"]);
  });
});

test('basic feature mapping is server-owned and preserves route instructions', async () => {
  for (const [feature, key] of Object.entries(personas.BASIC_FORTUNE_PERSONA_KEYS)) {
    const text = await personas.appendBasicFortunePersona({}, feature, 'JSON 계약과 계산 근거');
    expect(text.startsWith('JSON 계약과 계산 근거\n\n')).toBe(true);
    expect(text.endsWith(personas.getDefaultExpertPersona(key))).toBe(true);
    expect(text).toContain('최고 수준 전문가');
  }
  expect(await personas.appendBasicFortunePersona({}, 'unknown', 'BASE')).toBe('BASE');
  expect(personas.YUN_VEDIC_PERSONA_KO).toContain('다정한 해요체');
  expect(personas.YUN_VEDIC_PERSONA_KO).toContain('라그나·라시·바바·나크샤트라·다샤');
  expect(personas.YUN_VEDIC_PERSONA_KO).toContain('섞지 않습니다');
});
