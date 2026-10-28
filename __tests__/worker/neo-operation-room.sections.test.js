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
  neoRegisterDrift,
} from "../../worker/lib/neo-operation-room-prompt.js";
import { buildNeoBasisPayload } from "../../worker/lib/neo-operation-room-basis.js";

const input = {
  selectedMethod: "ziwei",
  topic: "돈/재물",
  intensity: "roar",
  question: "돈을 어떻게 벌어야 할까",
  birthInfo: { birthTimeUnknown: false },
};
const methodSummary = { method: "ziwei", evidenceSummary: "명궁: 자미◎(최상)", evidenceTokens: ["자미", "재백궁"] };

describe("neo section registries", () => {
  test("1차 챕터 합계 minChars가 2만6천 자 이상을 목표로 한다", () => {
    const total = NEO_INITIAL_SECTIONS.reduce((sum, s) => sum + s.minChars, 0);
    expect(total).toBeGreaterThanOrEqual(26000);
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
  test.each(["saju", "ziwei", "astrology", "vedic"])("%s의 모든 강도에서 약점 분석을 강점 전환으로 연결한다", (selectedMethod) => {
    for (const intensity of ["soft", "standard", "roar"]) {
      const ctx = { ...input, selectedMethod, intensity, methodSummary: { method: selectedMethod } };
      const initial = buildNeoInitialSectionPrompt(NEO_INITIAL_SECTIONS.find((s) => s.id === "innateStrength"), ctx);
      const refined = buildNeoRefinedSectionPrompt(NEO_REFINED_SECTIONS.find((s) => s.id === "actionAlternatives"), {
        ...ctx, realityCheck: { freeform: "일을 벌이기보다 마감 전에 확인을 너무 오래 합니다." },
      });
      for (const prompt of [initial, refined]) {
        expect(prompt).toContain("약점이 드러나기 쉬운 상황과 행동 → 같은 성향이 유리하게 쓰이는 조건 → 바꿀 행동 → 확인할 변화");
        expect(prompt).toContain("선택한 체계의 실제 제공된 근거만 사용한다");
        expect(prompt).toContain("환경 조정·도움 요청·중단 기준");
        expect(prompt).not.toContain("계산 근거가 있는 판단은 전부 단정문");
        expect(prompt).not.toContain("자기합리화 문장을 한 줄 그대로 재현");
      }
      expect(initial).toContain("각 weakPoints에는 약점이 드러나는 상황과 조절할 행동");
      expect(refined).toContain("기존 약점 해석과 다르다고 답하면");
      expect(refined).toContain("마감 전에 확인을 너무 오래 합니다");
    }
  });

  test("주제·전문가 페르소나·자미두수 별 세기 지시를 주입한다", () => {
    const section = NEO_INITIAL_SECTIONS.find((s) => s.id === "topicAreaBreakdown");
    const prompt = buildNeoInitialSectionPrompt(section, { ...input, methodSummary });
    expect(prompt).toContain("돈/재물");
    expect(prompt).toContain("자미두수 명반 대가");
    expect(prompt).toContain("별 세기");
    expect(prompt).toContain(`제목·공백을 제외한 본문이 ${Math.ceil(section.minChars / 0.8)}~${Math.ceil(section.minChars * 1.5)}자`);
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

test('second reality check reuses saved advice and grounded timing guidance',()=>{const prompt=buildNeoRefinedSectionPrompt(NEO_REFINED_SECTIONS.find(section=>section.id==='actionAlternatives'),{selectedMethod:'saju',question:'이직 준비',initialBriefing:{},realityCheck:{freeform:'면접을 마쳤어요'},previousRefinements:[{realityCheck:{freeform:'이력서를 준비했어요'},order:{thisWeekFirstStep:'지원할 회사를 세 곳으로 좁히기'}}]});expect(prompt).toContain('지원할 회사를 세 곳으로 좁히기');expect(prompt).toContain('면접을 마쳤어요');expect(prompt).toContain('계산된 구간');});

// R2 샘플(사주·직업/이직)의 계산 요약 모양을 그대로 옮긴 고정 프로필.
const sajuSummary = {
  method: "saju",
  pillars: { day: "辛酉", dayMaster: "辛" },
  fiveElements: { 목: 1, 화: 0, 토: 2, 금: 4, 수: 1 },
  tenGods: { 비견: 2.35, 편인: 0.35, 편관: 0.35, 편재: 0.7, 겁재: 1, 정재: 0.35, 정관: 0.35, 정인: 0.7, 상관: 1, 식신: 0.35 },
  seasonalBalance: { monthBranch: "寅", season: "봄", seasonElement: "목", climate: "생기가 열리는 초봄", adjustment: "화·목·수 기운을 희용신 후보로 봅니다.", dayElement: "금" },
  natalInteractions: { stemCombinations: [], stemClashes: [], branchCombinations: [{ type: "지지육합", label: "진유합", element: "금", pillars: ["day", "hour"], pillarLabels: ["일주", "시주"], values: ["酉", "辰"] }], branchClashes: [], branchHarms: [], branchBreaks: [] },
  majorLuck: { direction: "역행", currentCycle: { pillar: "丙戌", startAge: 36, endAge: 45, stemTenGod: "정관" }, cycles: [{ pillar: "丁亥", startAge: 26, stemTenGod: "편관" }, { pillar: "丙戌", startAge: 36, stemTenGod: "정관" }] },
  yearlyLuck: [{ year: 2026, pillar: "丙午", stemTenGod: "정관" }, { year: 2027, pillar: "丁未", stemTenGod: "편관" }, { year: 2028, pillar: "戊申", stemTenGod: "정인" }],
};
const sajuCtx = { ...input, selectedMethod: "saju", topic: "직업/이직", intensity: "standard", methodSummary: sajuSummary };
const basisValue = (key, label) => buildNeoBasisPayload(sajuSummary).groups.find((g) => g.key === key)?.items.find((i) => i.label === label)?.value || "";

describe("R2 사주 계산 확정값 표", () => {
  test("오행·십성은 이름과 수치를 짝지어 싣는다", () => {
    expect(basisValue("strength", "오행 분포")).toBe("목1 화0 토2 금4 수1");
    expect(basisValue("strength", "십성 분포")).toBe("비견2.35 편인0.35 편관0.35 편재0.7 겁재1 정재0.35 정관0.35 정인0.7 상관1 식신0.35");
  });
  test("원국 합충의 2단 객체와 조후 항목명을 버리지 않는다", () => {
    expect(basisValue("strength", "원국 합충")).toContain("진유합(일주·시주, 금)");
    expect(basisValue("strength", "조후")).toContain("월지 寅");
    expect(basisValue("strength", "조후")).toContain("생기가 열리는 초봄");
  });
  test("대운과 다가오는 세운에 십성을 붙인다", () => {
    expect(basisValue("timing", "현재 대운")).toContain("정관");
    expect(basisValue("timing", "다가오는 세운")).toBe("2027년 丁未(편관) · 2028년 戊申(정인)");
  });
});

describe("R2 챕터별 시기 근거", () => {
  test("시기 판단을 요구받는 챕터는 시기 흐름 표를 받는다", () => {
    for (const id of ["misalignedFlow", "bluntTruth", "todayOrders", "sevenDayMission"]) {
      expect(NEO_INITIAL_SECTIONS.find((s) => s.id === id).basisGroups).toContain("timing");
    }
  });
  test("시기 표가 없는 챕터는 대운·세운을 지어내지 말라는 지시를 받는다", () => {
    const innate = buildNeoInitialSectionPrompt(NEO_INITIAL_SECTIONS.find((s) => s.id === "innateCore"), sajuCtx);
    const timing = buildNeoInitialSectionPrompt(NEO_INITIAL_SECTIONS.find((s) => s.id === "topicTiming"), sajuCtx);
    expect(innate).not.toContain("丙戌");
    expect(innate).toContain("이 챕터에는 시기 흐름 표가 없다");
    expect(timing).not.toContain("이 챕터에는 시기 흐름 표가 없다");
  });
});

describe("R2 스키마 예시 복사 방지", () => {
  test("프롬프트의 스키마 예시는 그대로 붙여 넣을 수 있는 문장이 아니다", () => {
    const prompt = buildNeoInitialSectionPrompt(NEO_INITIAL_SECTIONS.find((s) => s.id === "innateCore"), sajuCtx);
    expect(prompt).not.toContain('"description":"중심 구조·자아·기본 동기 심층 해석"');
    expect(prompt).toContain('"description":"<중심 구조·자아·기본 동기 심층 해석>"');
  });
  test("모델이 스키마 예시를 그대로 돌려주면 병합에서 지운다", () => {
    const merged = mergeNeoInitialSections([
      { id: "innateCore", parsed: { innateNature: { title: "타고난 성향의 핵", description: "중심 구조·자아·기본 동기 심층 해석", keyTraits: ["<핵심 기질1>", "일간 辛은 마감 전 점검을 오래 붙잡게 만든다."] } } },
      { id: "originalStrategy", parsed: { originalStrategy: { description: "타고난 구조상 힘이 나는 방식", keyRules: ["규칙1"] } } },
    ], { selectedMethod: "saju" }, sajuSummary);
    expect(merged.innateNature.description).toBe("");
    expect(merged.innateNature.keyTraits).toEqual(["일간 辛은 마감 전 점검을 오래 붙잡게 만든다."]);
    expect(merged.originalStrategy.description).toBe("");
    expect(merged.originalStrategy.keyRules).toEqual([]);
  });
});

describe("R2 어조 단일화", () => {
  test("존댓말로 미끄러진 챕터를 결정적으로 찾아낸다", () => {
    expect(neoRegisterDrift("6년째 연봉 정체를 겪고 있군요. 요청을 받았습니다. 당신의 무기를 진단하겠습니다. 기록하십시오.")).toBe(true);
    expect(neoRegisterDrift("일간 辛은 예리하다. 마감 전 점검을 오래 붙잡는다. 이번 주에는 지원서를 두 곳만 낸다. 필요한 건 순서다. 중요한 건 기준이다.")).toBe(false);
  });
  test.each(["soft", "standard", "roar"])("%s 강도에서도 해라체 반말 한 가지로 쓰라고 지시한다", (intensity) => {
    const prompt = buildNeoInitialSectionPrompt(NEO_INITIAL_SECTIONS.find((s) => s.id === "opening"), { ...sajuCtx, intensity });
    expect(prompt).toContain("해라체 반말");
    expect(prompt).toContain("습니다");
  });
});
