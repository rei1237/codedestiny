// 유료 AI 상담이 "결론만 던지는 글"에서 "근거를 먼저 밝히는 상담문"이 되도록,
// 다섯 기능(자미두수·점성술·베다·숙요·사주)이 공유하는 출력 계약을 한곳에 모은다.
//
// 사용자에게 보이는 최종 구조는 다음과 같다.
//   ① 분석 데이터   ← LLM이 쓰지 않는다. 서버 확정값을 UI가 직접 렌더한다(analysis-basis-contract.js).
//   ② 핵심 구조 분석 · ③ 영향 요인 · ④ 해석 근거 · ⑤ 종합 해석 · ⑥ 분야별 분석 · ⑦ 추천 행동  ← 여기가 이 모듈의 담당.
//
// 기존 섹션 키는 건드리지 않고 아래 다섯 키를 "추가"하는 방식으로만 적용한다.
// 과거에 생성돼 DB에 저장된 상담에는 이 키가 없으므로, 렌더러는 항상 키 부재를 관용해야 한다.

import { buildBasisFactLines, collectBasisLabels } from "./analysis-basis-contract.js";

export const REASONING_SECTION_KEYS = Object.freeze([
  "structure_core",
  "influence_factors",
  "evidence_basis",
  "domain_matrix",
  "action_plan",
]);

// minChars는 의도적으로 작게 잡았다. 이 다섯 섹션을 더하면서 기존 섹션 총량을 그대로 두면
// maxOutputTokens 상한에 걸려 JSON이 잘리고 invalid_json 폴백으로 떨어진다.
export const REASONING_SECTION_SPECS = Object.freeze([
  {
    key: "structure_core",
    title: "핵심 구조 분석",
    minChars: 420,
    guide: "이번 흐름을 가장 크게 만드는 구조 1~2개를 지목하고, 왜 그것이 중심축인지 확정값으로 설명한다. 전문용어를 쓰면 그 자리에서 쉬운 말로 한 번 풀어 준다.",
  },
  {
    key: "influence_factors",
    title: "영향 요인",
    minChars: 480,
    guide: "'힘을 실어 주는 요소'와 '주의가 필요한 요소'를 분리해 각각 2~4개씩 제시한다. 항목마다 무엇이 / 왜 / 어떤 영향을 주는지 순서로 쓴다.",
  },
  {
    key: "evidence_basis",
    title: "해석 근거",
    minChars: 520,
    guide: "결론보다 근거를 먼저 놓는다. 3~7개의 근거를 각각 '판단 한 줄' + '괄호 안에 그 판단이 나온 확정값' 형태로 쓴다. 판단은 단정하지 말고 경향으로 표현한다.",
  },
  {
    key: "domain_matrix",
    title: "분야별 분석",
    minChars: 780,
    guide: "지정된 분야를 지정된 순서 그대로 다룬다. 각 분야는 현재 흐름 → 해석 근거 → 추천 행동 순으로 쓰고, 분야마다 서로 다른 확정값을 근거로 든다.",
  },
  {
    key: "action_plan",
    title: "추천 행동",
    minChars: 360,
    guide: "오늘부터 실제로 해볼 수 있는 행동 5가지를 제시한다. '마음을 다스리세요'처럼 추상적인 조언 대신 언제 무엇을 하는지가 드러나게 쓴다.",
  },
]);

// 기본 6분야 — 개인 운세 기능(사주·자미두수·점성술·베다)이 쓴다.
export const DEFAULT_ANALYSIS_DOMAINS = Object.freeze(["연애", "직업", "사업", "금전", "건강", "인간관계"]);

// 숙요 궁합처럼 두 사람의 관계만 다루는 기능은 금전·건강을 억지로 넣으면 근거 없는 문장이 나온다.
// 관계가 실제로 작동하는 무대별로 나눈다.
export const RELATIONSHIP_ANALYSIS_DOMAINS = Object.freeze(["연애·결혼", "직장·사업 파트너", "우정", "가족"]);

function toLines(values) {
  return (Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean);
}

/**
 * 확정값 표 이름에 기대지 않는 출력 구조 규칙. 근거 고정 규칙의 마지막 세 줄과 같은 문장이며,
 * 확정값 블록을 자기 이름으로 부르는 기능(네오 작전실의 [계산 요약 데이터], 지오맨시의 카드 데이터)이
 * 표 이름을 잘못 가리키지 않고 이 규칙만 가져다 쓸 수 있게 분리해 둔다.
 */
export const REASONING_OUTPUT_RULE_LINES = Object.freeze([
  "판단의 근거를 먼저 말하고 결론을 뒤에 놓는다. 결론만 남는 문장을 만들지 않는다.",
  "사고 과정이나 검토 절차를 그대로 노출하지 않는다. 이론에 근거한 해석만 정리해 전한다.",
  "운명을 확정하지 말고 '가능성이 높습니다', '이런 경향이 있습니다'처럼 경향으로 표현한다.",
]);

/**
 * 근거 고정 규칙. 화면에 렌더되는 확정값(analysis basis)과 본문이 어긋나지 않게 묶는다.
 * @param {{ groups?: unknown[] }} basisPayload buildAnalysisBasisPayload 결과
 * @param {{ includeFactTable?: boolean }} [options] 프롬프트에 이미 확정값 블록이 있으면 false
 * @returns {string[]}
 */
export function buildEvidenceRuleLines(basisPayload, options = {}) {
  const { includeFactTable = true } = options;
  const labels = collectBasisLabels(basisPayload);
  const lines = ["[근거 고정 규칙]"];

  if (includeFactTable) {
    const factLines = buildBasisFactLines(basisPayload);
    if (factLines.length) {
      lines.push("아래 확정값은 서버가 계산해 사용자 화면에 그대로 표시된다. 본문은 이 값과 어긋나면 안 된다.", ...factLines, "");
    }
  }

  lines.push(
    "- 위 확정값에 있는 항목명과 값만 근거로 쓴다. 표에 없는 별·행성·각도·수치는 새로 만들지 않는다.",
    "- 해석 문단마다 확정값 항목을 최소 1개, 표에 적힌 이름 그대로 인용한다.",
    "- 확정값이 비어 있거나 불충분한 항목은 아는 척하지 말고 '입력된 정보로는 여기까지 확인된다'고 밝힌다.",
    ...REASONING_OUTPUT_RULE_LINES.map((line) => `- ${line}`),
  );

  if (labels.length) {
    lines.push(`- 인용 가능한 항목명: ${labels.slice(0, 40).join(", ")}`);
  }
  return lines;
}

/**
 * ⑥분야별 분석의 분야 목록과 작성 순서를 못 박는다.
 * @param {readonly string[]} [domains]
 * @returns {string[]}
 */
export function buildDomainAnalysisRuleLines(domains = DEFAULT_ANALYSIS_DOMAINS) {
  const list = toLines(domains);
  if (!list.length) return [];
  return [
    "[분야별 분석 규칙]",
    `- 다루는 분야와 순서: ${list.join(" → ")}. 순서를 바꾸거나 분야를 빠뜨리지 않는다.`,
    "- 각 분야는 현재 흐름 → 해석 근거 → 추천 행동 세 조각으로 쓴다.",
    "- 분야마다 서로 다른 확정값을 근거로 든다. 같은 근거를 여러 분야에 되풀이하지 않는다.",
    "- 건강은 질병을 단정하지 말고 생활 리듬과 회복 습관의 취약 경향으로만 다룬다.",
  ];
}

/**
 * JSON sections 스키마를 쓰는 기능(자미두수·베다·숙요)이 기존 스키마에 합칠 조각.
 * 기존 키를 지우지 말고 이 객체를 spread로 더하기만 한다.
 * @param {readonly string[]} [domains]
 * @returns {Record<string, { title: string, body: string }>}
 */
export function buildReasoningSectionSchema(domains = DEFAULT_ANALYSIS_DOMAINS) {
  const list = toLines(domains);
  const schema = {};
  for (const spec of REASONING_SECTION_SPECS) {
    schema[spec.key] = {
      title: spec.title,
      body: spec.key === "domain_matrix" && list.length ? `${list.join(" / ")} 순서로 각각 현재 흐름·해석 근거·추천 행동` : "상담 본문",
    };
  }
  return schema;
}

/**
 * 위 스키마 조각에 대응하는 작성 규칙 문장.
 * @param {readonly string[]} [domains]
 * @returns {string[]}
 */
export function buildReasoningSectionRuleLines(domains = DEFAULT_ANALYSIS_DOMAINS) {
  const lines = ["[근거 중심 섹션 작성 규칙]"];
  for (const spec of REASONING_SECTION_SPECS) {
    lines.push(`- ${spec.key}(${spec.title}): ${spec.guide} 최소 ${spec.minChars.toLocaleString("ko-KR")}자.`);
  }
  return lines.concat(buildDomainAnalysisRuleLines(domains));
}

/**
 * 자유 텍스트 기능(점성술·사주)이 [답변 형식] 목록에 이어 붙일 번호 항목.
 * @param {number} [startIndex] 앞선 항목 개수 + 1
 * @param {readonly string[]} [domains]
 * @returns {string[]}
 */
export function buildReasoningFormatLines(startIndex = 1, domains = DEFAULT_ANALYSIS_DOMAINS) {
  const list = toLines(domains);
  let index = Number(startIndex) || 1;
  return REASONING_SECTION_SPECS.map((spec) => {
    const detail = spec.key === "domain_matrix" && list.length
      ? `${spec.guide} 분야와 순서는 ${list.join(" → ")}.`
      : spec.guide;
    return `${index++}. ${spec.title}: ${detail}`;
  });
}

export const REASONING_SECTION_MIN_CHARS = REASONING_SECTION_SPECS.reduce((total, spec) => total + spec.minChars, 0);

/**
 * 다섯 흐름 중 일부만 필요한 기능이 쓴다.
 * 이미 같은 역할을 하는 섹션을 가진 기능(예: 숙요 궁합의 총평·영역별·처방)은
 * 전부 얹으면 분량 상한에 부딪히므로, 정말 빠진 흐름만 골라 더한다.
 * @param {string} key
 * @returns {{ key: string, title: string, minChars: number, guide: string } | null}
 */
export function getReasoningSectionSpec(key) {
  return REASONING_SECTION_SPECS.find((spec) => spec.key === key) || null;
}
