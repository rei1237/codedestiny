import { asArray, stableStringify } from "./love-secret-premium.types.js";

export const LOVE_SECRET_PREMIUM_PROMPT_VERSION = "2026-06-love-secret-llm-v1";

export const loveSecretSystemPrompt = `너는 30년 경력의 사주 명리학자이자, 현실적인 연애 상담을 잘하는 상담사다.
사주 용어를 쓰되 고객이 이해하기 쉬운 말로 풀어준다.
불안 조장, 단정적 저주, 무조건적인 결혼·이별 확정 표현은 금지한다.

출력은 반드시 한국어 HTML fragment 하나만 허용한다.
JSON, Markdown, 코드블록, schema, payload, prompt, debug, rawResultSummary, API, provider, model 이름은 절대 출력하지 않는다.
제공된 사주·연애·궁합 계산 신호를 근거로 쓰되, 정보가 부족한 부분은 조심스럽게 가능성과 조건으로 말한다.
같은 문장과 같은 문단을 반복하지 않고, 챕터 제목을 본문에서 반복해 늘리지 않는다.
중요한 관계 결정은 현실의 대화와 상황을 함께 보아야 한다는 안전한 상담 관점을 유지한다.`;

function inputForPrompt(input = {}) {
  return stableStringify({
    mode: input.mode,
    userProfile: input.userProfile,
    partnerProfile: input.partnerProfile,
    saju: input.saju,
    love: input.love,
    luck: input.luck,
    compatibility: input.compatibility,
    warnings: input.warnings,
  });
}

function modeRule(input = {}, chapter = {}) {
  const perspectives = asArray(chapter.requiredPerspectives).join(", ");
  if (input.mode === "compatibility") {
    return [
      `- 최종 챕터 수는 궁합 모드 13개 중 현재 챕터 하나이며, 현재 chapter id는 ${chapter.id}이다.`,
      "- 두 사람의 사주 차이, 감정 리듬, 현실 관계 운영법을 함께 해석한다.",
      `- 본문 어딘가에 다음 관점이 자연스럽게 드러나야 한다: ${perspectives}.`,
      "- personA와 personB의 정보가 모두 상담에 반영되어야 한다.",
    ].join("\n");
  }
  return [
    `- 최종 챕터 수는 솔로 모드 10개 중 현재 챕터 하나이며, 현재 chapter id는 ${chapter.id}이다.`,
    "- personB가 없어도 오류처럼 쓰지 말고, 사용자의 개인 연애 흐름에 집중한다.",
    `- 본문 어딘가에 다음 관점이 자연스럽게 드러나야 한다: ${perspectives}.`,
  ].join("\n");
}

export function buildLoveSecretChapterPrompt({ input, chapter, chapterPlanSummary = "", expertPersona = "", previousSummary = "" }) {
  return [
    expertPersona ? `[상담자 관점]\n${expertPersona}` : "",
    `[전체 챕터 플랜]\n${chapterPlanSummary}`,
    previousSummary ? `[직전 챕터 요약]\n${previousSummary}` : "",
    `[현재 작성할 챕터]\nID: ${chapter.id}\n순서: ${chapter.order}\n제목: ${chapter.title}\n목적: ${chapter.purpose}\n목표 분량: 공백 제외 ${chapter.minLength}자 이상`,
    `[검증된 입력]\n${inputForPrompt(input)}`,
    `[작성 원칙]
- 자연스러운 한국어 상담체로 고객에게 직접 말하듯 작성한다.
- 사주 구조 → 연애 심리 → 현실 행동 조언 순서가 흐름 안에서 느껴져야 한다.
- 과도한 전문용어 나열, 같은 문장 반복, 챕터 제목 반복을 피한다.
- "이 장에서는", "다음 장에서는" 같은 기계적인 안내문을 최소화한다.
- "당신은 무조건", "반드시 헤어진다", "망한다", "100%"처럼 단정하는 표현을 쓰지 않는다.
- 빈 챕터, JSON 덤프, 프롬프트 원문, AI 생성 언급, 샘플 문장, 예시 텍스트를 절대 넣지 않는다.
${modeRule(input, chapter)}`,
    `[반드시 이 HTML 조각만 반환]
<section class="love-secret-chapter" data-chapter-id="${chapter.id}">
  <h2>${chapter.title}</h2>

  <div class="chapter-summary">
    <p>이 챕터의 핵심 요약 3~5문장</p>
  </div>

  <div class="chapter-body">
    <p>상담형 본문</p>
    <p>상담형 본문</p>
    <p>상담형 본문</p>
    <p>상담형 본문</p>
    <p>상담형 본문</p>
  </div>

  <div class="chapter-advice">
    <h3>연애 비책</h3>
    <ul>
      <li>실천 조언 1</li>
      <li>실천 조언 2</li>
      <li>실천 조언 3</li>
    </ul>
  </div>
</section>`,
  ].filter(Boolean).join("\n\n");
}

export function buildLoveSecretRepairPrompt({ input, chapter, previousHtml, validationErrors = [], expertPersona = "" }) {
  return [
    "이전 HTML은 연애 비책 PDF 검증을 통과하지 못했다. 전체 리포트를 다시 만들지 말고 실패한 현재 챕터만 다시 작성한다.",
    `실패 사유: ${validationErrors.join(", ") || "unknown"}`,
    `같은 chapter id와 title을 유지한다.\nchapter id: ${chapter.id}\nchapter title: ${chapter.title}`,
    `이전 출력은 참고만 하고 그대로 반복하지 않는다.\n${String(previousHtml || "").replace(/<[^>]+>/g, " ").slice(0, 1200)}`,
    buildLoveSecretChapterPrompt({
      input,
      chapter,
      chapterPlanSummary: "repair only",
      expertPersona,
      previousSummary: "",
    }),
  ].join("\n\n");
}
