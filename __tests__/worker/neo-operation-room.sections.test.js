/**
 * 네오 팩폭 작전실 — 챕터(섹션) 배치 생성 로직 단위 테스트.
 * 순수 함수(빌더/병합기)만 검증하므로 모킹이 필요 없다.
 */
import {
  NEO_INITIAL_SECTIONS,
  NEO_REFINED_SECTIONS,
  buildNeoInitialSectionPrompt,
  buildNeoRefinedSectionPrompt,
  parseNeoSectionResponse,
  mergeNeoInitialSections,
  mergeNeoRefinedSections,
} from "../../worker/lib/neo-operation-room-prompt.js";

const input = {
  selectedMethod: "ziwei",
  topic: "돈/재물",
  intensity: "roar",
  question: "돈을 어떻게 벌어야 할까",
  birthInfo: { birthTimeUnknown: false },
};
const methodSummary = { method: "ziwei", evidenceSummary: "명궁: 자미◎(최상)", evidenceTokens: ["자미", "재백궁"] };

describe("neo section registries", () => {
  test("1차 챕터 합계 minChars가 2만 자 이상을 목표로 한다", () => {
    const total = NEO_INITIAL_SECTIONS.reduce((sum, s) => sum + s.minChars, 0);
    expect(total).toBeGreaterThanOrEqual(20000);
  });
  test("타고난 성향은 1차에만, 30일 전략은 2차에만 존재한다", () => {
    const initIds = NEO_INITIAL_SECTIONS.map((s) => s.id);
    const refinedIds = NEO_REFINED_SECTIONS.map((s) => s.id);
    expect(initIds).toEqual(expect.arrayContaining(["innateCore", "innateStrength"]));
    expect(refinedIds).not.toContain("innateRecheck");
    expect(refinedIds).toEqual(expect.arrayContaining(["thirtyDayWeek12", "thirtyDayWeek34"]));
    expect(initIds).not.toContain("thirtyDayWeek12");
  });
  test("주제 카테고리 챕터가 1차에 포함된다", () => {
    const initIds = NEO_INITIAL_SECTIONS.map((s) => s.id);
    expect(initIds).toEqual(expect.arrayContaining(["topicStyle", "topicAreaBreakdown", "topicTiming"]));
  });
});

describe("buildNeoInitialSectionPrompt", () => {
  test("주제·전문가 페르소나·자미두수 별 세기 지시를 주입한다", () => {
    const section = NEO_INITIAL_SECTIONS.find((s) => s.id === "topicAreaBreakdown");
    const prompt = buildNeoInitialSectionPrompt(section, { ...input, methodSummary });
    expect(prompt).toContain("돈/재물");
    expect(prompt).toContain("자미두수 명반 대가");
    expect(prompt).toContain("별 세기");
    expect(prompt).toContain(`최소 ${section.minChars}자`);
  });
});

describe("mergeNeoInitialSections", () => {
  test("챕터 JSON을 병합하고 30일 전략을 포함하지 않는다", () => {
    const results = [
      { id: "opening", parsed: { operationTitle: "돈 작전", neoOpening: "질문 돈.", frontlineSummary: "전선" } },
      { id: "innateCore", parsed: { innateNature: { title: "핵", description: "설명", keyTraits: ["a", "b"] } } },
      { id: "topicStyle", parsed: { topicStyle: { title: "방식", description: "설명", keyPoints: ["k"] } } },
      { id: "topicAreaBreakdown", parsed: { topicAreas: [{ area: "재백궁", reading: "자미◎ 근거" }] } },
      { id: "methodEvidence", parsed: { methodEvidence: [{ label: "근거", summary: "재백궁 자미◎" }] } },
      { id: "meta", parsed: { realityCheckQuestions: [{ question: "q", whyItMatters: "w" }], badge: { name: "휘장", description: "d" }, tsundereClosing: "끝" } },
    ];
    const briefing = mergeNeoInitialSections(results, input, methodSummary);
    expect(briefing.innateNature.description).toBe("설명");
    expect(briefing.topicAreas).toHaveLength(1);
    expect(briefing).not.toHaveProperty("thirtyDayStrategy");
    expect(briefing.methodEvidence[0].summary).toContain("자미◎");
  });

  test("빈 챕터는 폴백으로 채우고 methodEvidence는 요약으로 대체한다", () => {
    const briefing = mergeNeoInitialSections([], input, methodSummary);
    expect(briefing.methodEvidence).toHaveLength(1);
    expect(briefing.methodEvidence[0].summary).toContain("자미◎");
  });

  test("LLM이 문자열 자리에 객체/배열을 반환해도 [object Object] 없이 텍스트로 평탄화한다", () => {
    const results = [
      {
        id: "repeatedChoice",
        parsed: {
          repeatedChoice: {
            title: "반복되는 선택",
            // 중첩 객체 — 실서비스에서 [object Object]를 만든 케이스
            description: { title: "패전의 뿌리", description: "결정 직전에 확신을 버리고 남의 말을 따른다." },
          },
        },
      },
      {
        id: "innateCore",
        parsed: {
          innateNature: {
            title: "핵",
            // 배열 반환 케이스
            description: ["첫 문단이다.", { text: "둘째 문단이다." }],
            keyTraits: [{ point: "직관", why: "빠른 판단" }, "b"],
          },
        },
      },
      { id: "bluntTruth", parsed: { bluntTruth: { content: "팩트만 말한다." } } },
    ];
    const briefing = mergeNeoInitialSections(results, input, methodSummary);
    expect(briefing.repeatedChoice.description).toContain("결정 직전에 확신을 버리고");
    expect(briefing.innateNature.description).toContain("첫 문단이다.");
    expect(briefing.innateNature.description).toContain("둘째 문단이다.");
    expect(briefing.bluntTruth).toBe("팩트만 말한다.");
    // 블랭킷 검증: 어떤 필드에도 [object Object]가 남지 않는다.
    expect(JSON.stringify(briefing)).not.toContain("[object Object]");
  });
});

describe("mergeNeoRefinedSections", () => {
  test("주차 챕터를 30일 전략으로 합치고 verdict를 정규화한다", () => {
    const results = [
      { id: "neoReview", parsed: { operationTitle: "재판단", neoReview: "리뷰" } },
      { id: "verdict", parsed: { verdict: { status: "조정 필요", statement: "s" }, verdictBasis: "재백궁 자미◎" } },
      { id: "thirtyDayWeek12", parsed: { thirtyDayWeek12: ["1주차 x", "2주차 y"] } },
      { id: "thirtyDayWeek34", parsed: { thirtyDayWeek34: ["3주차 z", "4주차 w"] } },
      { id: "meta", parsed: { badge: { name: "b", description: "d" }, tsundereClosing: "끝" } },
    ];
    const refined = mergeNeoRefinedSections(results, { selectedMethod: "ziwei" });
    expect(refined.thirtyDayStrategy).toHaveLength(4);
    expect(refined.verdict.status).toBe("조정이 필요하다");
    expect(refined).not.toHaveProperty("innateRecheck");
  });

  test("2차 문서도 객체형 statement/neoReview를 [object Object] 없이 평탄화한다", () => {
    const results = [
      { id: "neoReview", parsed: { neoReview: { summary: "재판단 요약이다." } } },
      { id: "verdict", parsed: { verdict: { status: "조정 필요", statement: { text: "방향을 틀어라." } } } },
      { id: "thirtyDayWeek12", parsed: { thirtyDayWeek12: [{ week: "1주차", plan: "정리" }, "2주차 y"] } },
    ];
    const refined = mergeNeoRefinedSections(results, { selectedMethod: "ziwei" });
    expect(refined.neoReview).toBe("재판단 요약이다.");
    expect(refined.verdict.statement).toBe("방향을 틀어라.");
    expect(JSON.stringify(refined)).not.toContain("[object Object]");
  });
});

describe("parseNeoSectionResponse", () => {
  test("깨진 JSON은 빈 객체로 폴백한다", () => {
    expect(parseNeoSectionResponse("설명만 있고 JSON 없음")).toEqual({});
    expect(parseNeoSectionResponse('앞말 {"a":1} 뒷말')).toEqual({ a: 1 });
  });

  // 🔴 실서비스 실패 모드(자미두수 실측 2026-08-01과 동일): gemini-2.5-flash 는 긴 한국어 본문에서
  // 문단을 나누며 JSON 문자열 값 안에 raw 개행을 그대로 넣는다. 복구 전에는 이 챕터가 통째로
  // {} 가 되어 사라졌고, 2차(8챕터)는 폴백이 얇아 몇 개만 날아가도 문서가 무너졌다.
  test("문자열 값 안의 raw 개행이 섞여도 복구해서 파싱한다", () => {
    const withRawNewlines = '{"neoReview":"첫 문단이다.\n\n둘째 문단이다.","verdictBasis":"자미◎\t재백궁"}';
    expect(() => JSON.parse(withRawNewlines)).toThrow();
    expect(parseNeoSectionResponse(withRawNewlines)).toEqual({
      neoReview: "첫 문단이다.\n\n둘째 문단이다.",
      verdictBasis: "자미◎\t재백궁",
    });
  });
});

describe("buildNeoRefinedSectionPrompt", () => {
  const refinedCtx = {
    selectedMethod: "ziwei",
    topic: "돈/재물",
    intensity: "roar",
    question: "돈을 어떻게 벌어야 할까",
    methodSummary,
    initialBriefing: {
      operationTitle: "1차 작전명",
      coreDiagnosis: "핵심 진단이다.",
      bluntTruth: "팩폭이다.",
      neoOpening: "여는말은_2차_프롬프트에_실리지_않는다",
      topicAreas: [{ area: "주제영역은_2차_프롬프트에_실리지_않는다" }],
      repeatedPattern: { title: "반복", description: "반복 설명" },
      currentProblem: { title: "문제", description: "문제 설명" },
    },
    realityCheck: { selectedChecks: ["시간이 없다"], freeform: "이직을 준비 중이다." },
    previousAdviceLog: "- [바로 작전] 이미 준 조언",
  };
  const section = NEO_REFINED_SECTIONS.find((s) => s.id === "neoReview");

  test("사용자 현실 점검 답변이 1차 브리핑보다 앞에 온다", () => {
    const prompt = buildNeoRefinedSectionPrompt(section, refinedCtx);
    const answerAt = prompt.indexOf("[사용자 현실 점검 답변]");
    const briefingAt = prompt.indexOf("[1차 작전 브리핑 요약");
    expect(answerAt).toBeGreaterThan(-1);
    expect(briefingAt).toBeGreaterThan(-1);
    expect(answerAt).toBeLessThan(briefingAt);
    expect(prompt).toContain("이직을 준비 중이다.");
  });

  // 1차는 20,050자 계약이고 2차는 챕터마다 프롬프트를 새로 만든다 — 전문을 실으면 같은 분량이
  // 8번 실려 지연·잘림·비용이 함께 오르고, 정작 중요한 사용자 답변이 그 더미에 묻힌다.
  test("1차 브리핑은 진단 요약만 싣고 전문을 덤프하지 않는다", () => {
    const prompt = buildNeoRefinedSectionPrompt(section, refinedCtx);
    expect(prompt).toContain("핵심 진단이다.");
    expect(prompt).not.toContain("여는말은_2차_프롬프트에_실리지_않는다");
    expect(prompt).not.toContain("주제영역은_2차_프롬프트에_실리지_않는다");
  });
});
