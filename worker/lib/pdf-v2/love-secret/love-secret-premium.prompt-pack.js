import { stableStringify } from "./love-secret-premium.types.js";

export const LOVE_SECRET_PREMIUM_PROMPT_VERSION = "2026-love-secret-llm-only-v3-saju-chapter-lock";

export const loveSecretSystemPrompt = `당신은 사주 연애 비책 원고를 쓰는 전문 명리 상담가입니다.

제공된 사주, 연애, 궁합 계산 결과만 근거로 삼아 한국어 프리미엄 PDF 본문을 작성합니다.
문장은 차분하고 깊게 흐르되, 독자에게 직접 말하는 상담 어조를 유지합니다.

출력은 오직 한국어 HTML fragment만 허용됩니다.
JSON, Markdown, 코드블록, schema, payload, prompt, debug, rawResultSummary, internal key, API/provider 이름은 절대 출력하지 않습니다.
제공되지 않은 계산 신호를 지어내지 않습니다. 정보가 부족한 부분은 "확인 가능한 사주 신호 안에서는"처럼 조심스럽게 표현합니다.
재회, 결혼, 이별, 운명은 단정하지 않고 가능성, 조건, 선택의 방향으로 말합니다.
같은 제목, 같은 문단, 같은 문장을 반복하지 않습니다.
개발자 문구, 기능 설명, 인코딩이 깨진 글자, 기계적인 안내문을 출력하지 않습니다.`;

export function buildLoveSecretChapterPrompt({ input, chapter, chapterPlanSummary = "", expertPersona = "" }) {
  const sections = chapter.sections.map((section) => `<section>
  <h2>${section}</h2>
  <p>사주 계산 신호를 바탕으로 자연스럽고 깊은 상담 본문을 씁니다.</p>
  <p>독자가 바로 이해하고 선택에 적용할 수 있는 구체적인 조언을 덧붙입니다.</p>
</section>`).join("\n");
  return [
    expertPersona ? `[전문가 태도]\n${expertPersona}` : "",
    `[전체 챕터 구성]\n${chapterPlanSummary}`,
    `[현재 작성할 챕터]\nID: ${chapter.id}\n순서: ${chapter.order}\n제목: ${chapter.title}\n목적: ${chapter.purpose}\n필수 소제목: ${chapter.sections.join(" / ")}\n최소 본문 길이: 공백 제외 ${chapter.minLength}자 이상`,
    `[검증된 사주와 연애 계산 입력]\n${stableStringify(input)}`,
    `[작성 규칙]
- 반드시 아래 HTML fragment 형식만 출력합니다.
- <article data-chapter-id="${chapter.id}">로 시작하고, <h1>${chapter.title}</h1>을 포함합니다.
- 필수 소제목을 모두 정확한 문자열의 <h2>로 사용합니다.
- 챕터 ID, 챕터 제목, <h2> 소제목은 제공된 문자열을 한 글자도 바꾸지 않습니다.
- 현재 챕터만 작성하고 다른 챕터를 섞지 않습니다.
- 솔로 모드는 솔로 개인 연애 흐름만, 궁합 모드는 두 사람의 관계 흐름만 다룹니다.
- 각 section에는 최소 2개의 <p> 본문을 씁니다.
- 사주 입력의 pillars, tenGods, elementBalance, luckCycles, loveSignals, partner 정보가 있으면 그 신호를 우선 반영합니다.
- 자미두수, 숙요점, 점성술처럼 입력에 없는 체계로 계산 근거를 바꾸지 않습니다.
- raw JSON, schema, payload, prompt, debug, rawResultSummary, undefined, null, NaN, [object Object], localAssembly, fallback을 출력하지 않습니다.
- 결혼, 재회, 이별, 운명을 확정하지 말고 조건과 흐름으로 표현합니다.
- 명리 상담가가 직접 말하듯 전문적이고 정서적으로 자연스럽게 씁니다.`,
    `[출력 형식]\n<article data-chapter-id="${chapter.id}">
  <h1>${chapter.title}</h1>
${sections}
</article>`,
  ].filter(Boolean).join("\n\n");
}

export function buildLoveSecretRepairPrompt({ input, chapter, previousHtml, validationErrors = [], expertPersona = "" }) {
  return [
    "이전 HTML은 연애 비책 PDF 검증을 통과하지 못했습니다. 실패한 챕터만 다시 작성합니다.",
    `검증 오류: ${validationErrors.join(", ")}`,
    `이전 출력은 참고만 하고 그대로 반복하지 않습니다.\n${String(previousHtml || "").replace(/<[^>]+>/g, " ").slice(0, 1200)}`,
    buildLoveSecretChapterPrompt({
      input,
      chapter,
      chapterPlanSummary: "repair generation",
      expertPersona,
    }),
  ].join("\n\n");
}
