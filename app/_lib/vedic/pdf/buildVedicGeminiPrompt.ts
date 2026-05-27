import { VEDIC_KNOWLEDGE_BASE } from "./vedicPdfKnowledgeBase";
import type { VedicPdfChapterDefinition, VedicPdfContext } from "./types";

const CANONICAL_VEDIC_SECTION_HINTS: Record<string, string[]> = {
  V1: [
    "라그나가 보여주는 인생의 출발점",
    "달 별자리와 나크샤트라가 보여주는 마음의 구조",
    "태양이 보여주는 자아와 삶의 방향",
    "차트 전체에서 가장 강한 신호",
    "이번 생의 핵심 키워드",
  ],
  V2: [
    "라그나 별자리의 핵심 성향",
    "1하우스 행성이 만드는 첫인상과 존재감",
    "라그나 로드의 위치와 인생 방향",
    "강점이 드러나는 방식",
    "약점이 반복되는 패턴",
    "라그나 기준 실전 조언",
  ],
  V3: [
    "달 별자리의 감정 패턴",
    "나크샤트라가 보여주는 본능적 욕구",
    "마음이 흔들리는 순간",
    "애착과 안정감의 구조",
    "감정 회복 루틴",
  ],
  V4: [
    "아트마카라카 행성의 의미",
    "영혼이 반복해서 마주하는 과제",
    "고통이 성숙으로 바뀌는 지점",
    "피하면 반복되는 문제",
    "이번 생에서 반드시 키워야 할 힘",
  ],
  V5: [
    "개인 행성이 만드는 성격과 선택",
    "목성과 금성이 주는 확장과 관계성",
    "토성이 만드는 책임과 지연",
    "라후와 케투가 만드는 욕망과 해탈",
    "행성 전체의 균형과 불균형",
  ],
  V6: [
    "1·4·7·10하우스 핵심 축",
    "2·6·10하우스 현실 성취 축",
    "5·7·11하우스 관계와 욕망 축",
    "8·12하우스 무의식과 변화 축",
    "하우스 전체에서 반복되는 삶의 패턴",
  ],
  V7: [
    "직업적 방향성과 사회적 역할",
    "10하우스 행성과 커리어 욕망",
    "라후가 만드는 비정형적 성공 욕구",
    "조직형·독립형·창작형 적성",
    "커리어 리스크와 돌파 전략",
  ],
  V8: [
    "돈을 버는 방식",
    "수익이 커지는 구조",
    "돈이 막히는 습관",
    "네트워크와 보상의 연결",
    "재물 관리 실전 조언",
  ],
  V9: [
    "사랑에서 드러나는 매력",
    "끌리는 상대의 특징",
    "관계에서 이상화가 생기는 지점",
    "장기 관계에서의 과제",
    "사랑을 오래 지키는 방법",
  ],
  V10: [
    "몸과 마음의 취약 패턴",
    "스트레스가 쌓이는 방식",
    "무의식적 소진과 회피",
    "회복이 필요한 생활 습관",
    "건강 관리 조언",
  ],
  V11: [
    "현재 마하다샤의 큰 흐름",
    "현재 안타르다샤의 세부 과제",
    "지금 열리는 기회",
    "지금 조심해야 할 선택",
    "현재 운을 활용하는 전략",
  ],
  V12: [
    "차트 전체 핵심 요약",
    "가장 강한 자원",
    "가장 반복되는 약점",
    "앞으로 강화해야 할 선택",
    "피해야 할 선택",
    "최종 실행 로드맵",
  ],
};

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function buildVedicCoreJsonData(context: VedicPdfContext) {
  return {
    lagna: context?.core?.lagna ?? null,
    moon_nakshatra: context?.core?.moon ?? null,
    sun: context?.core?.sun ?? null,
    atmakaraka: context?.core?.atmakaraka ?? null,
    dasha_flow: context?.core?.dasha ?? null,
    yogas: Array.isArray(context?.core?.yogas) ? context.core.yogas : [],
    d1_house_placements: context?.charts?.d1?.houses ?? [],
    d1_planet_placements: context?.charts?.d1?.planets ?? [],
    d9: context?.charts?.d9 ?? null,
    d10: context?.charts?.d10 ?? null,
    source_meta: context?.sourceMeta ?? null,
    missing_summary: Array.isArray(context?.missingSummary) ? context.missingSummary : [],
  };
}

export function buildVedicGeminiPrompt(input: {
  chapter: VedicPdfChapterDefinition;
  context: VedicPdfContext;
  previousChapterTexts?: string[];
}): string {
  const previousChapterTexts = Array.isArray(input.previousChapterTexts)
    ? input.previousChapterTexts.filter((text) => String(text || "").trim().length > 0).slice(-3)
    : [];
  const canonicalSectionHints = CANONICAL_VEDIC_SECTION_HINTS[input.chapter.id] || [];
  const vedicJsonData = JSON.stringify(buildVedicCoreJsonData(input.context));

  return [
    "[SYSTEM ROLE]",
    "너는 베다점 PDF용 해석 생성기다. 계산기가 아니다.",
    "너는 인도 조티쉬(베다 점성술) 최고 권위자야. 내가 제공하는 이 [명반 핵심값 JSON 데이터: {{vedic_json_data}}]를 절대적으로 기반하여 리포트를 작성해. 절대로 '명반을 기준으로 분석합니다' 같은 안내 멘트나 더미 텍스트를 생성하지 말고, 각 챕터별로 실제 기질, 운세, 실전 조언을 바로 도출해.",
    `[명반 핵심값 JSON 데이터: ${vedicJsonData}]`,
    "라그나, 나크샤트라, 다샤, 요가, D9, D10을 임의 생성하거나 추정하지 마라.",
    "없는 데이터는 null, [], fallbackUsed=true로 처리하고 본문에 추정으로 쓰지 마라.",
    "건강/수명/사망을 단정하지 말고, 경향/루틴/권장 행동 중심으로 작성하라.",
    "",
    "[CHAPTER TARGET]",
    `chapterNumber: ${input.chapter.number}`,
    `chapterId: ${input.chapter.id}`,
    `chapterTitle: ${input.chapter.titleKo}`,
    `objective: ${input.chapter.objective}`,
    `canonicalSectionHints: ${safeJson(canonicalSectionHints)}`,
    "",
    "[VEDIC KNOWLEDGE BASE]",
    safeJson(VEDIC_KNOWLEDGE_BASE),
    "",
    "[NORMALIZED CONTEXT]",
    safeJson(input.context),
    "",
    "[PREVIOUS CHAPTER TEXTS - OPTIONAL]",
    safeJson(previousChapterTexts),
    "",
    "[OUTPUT RULES]",
    "반드시 JSON만 출력하라. 마크다운 코드펜스 금지.",
    "금지 문구: '명반을 기준으로 분석합니다', '해석할 때 가장 먼저 확인한 축은 라시와 하우스를 분리해 보는 것입니다'.",
    "sections.title은 canonicalSectionHints를 우선 사용하라. 제목 순서와 의미를 섞거나 다른 챕터 제목으로 바꾸지 마라.",
    "각 section.body는 해당 챕터의 canonical 주제만 다뤄라. 다른 챕터 주제(예: 다샤/재물/커리어/관계)를 섞지 마라.",
    "JSON 스키마:",
    safeJson({
      chapterNumber: input.chapter.number,
      chapterId: input.chapter.id,
      title: input.chapter.titleKo,
      summary: "핵심 요약 6~10문장",
      sections: canonicalSectionHints.length
        ? canonicalSectionHints.map((title) => ({ title, body: "2~4문단" }))
        : [
            { title: "섹션 제목", body: "2~4문단" },
          ],
      actionItems: ["실행 항목 1", "실행 항목 2", "실행 항목 3"],
      cautions: ["주의 1", "주의 2"],
      missingFields: ["context 내 누락된 경로"],
      fallbackUsed: false,
      confidence: 0.0,
    }),
    "",
    "[CONSTRAINTS]",
    `- sections는 최소 ${Math.max(4, canonicalSectionHints.length || 4)}개`,
    canonicalSectionHints.length ? `- sections.title은 다음 canonical 순서를 우선 유지: ${canonicalSectionHints.join(" | ")}` : "",
    "- actionItems는 3~7개",
    "- confidence는 0~1 사이 숫자",
    "- missingFields는 context.missingSummary와 일치하거나 그 부분집합",
    "- compatibility 모드면 관계/소통 문맥 포함",
  ].join("\n");
}
