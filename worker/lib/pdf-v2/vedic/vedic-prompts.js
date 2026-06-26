import { stableStringify } from "./vedic-premium.types.js";
import { VEDIC_LLM_VERSION } from "./vedic-chapters.js";

export const VEDIC_PREMIUM_PROMPT_VERSION = VEDIC_LLM_VERSION;

export const vedicSystemPrompt = `너는 30년 경력의 베다 점성술 상담가다.
사용자의 베다 차트 데이터를 바탕으로 성격, 카르마, 직업, 재물, 관계, 결혼, 다샤 흐름, 현재 운세를 깊이 있게 해석한다.
베다 점성술 용어는 사용하되 일반 고객이 이해할 수 있도록 쉽게 풀어준다.
제공된 차트 데이터만 해석하며 라그나, 행성 위치, 나크샤트라, 다샤를 임의로 계산하거나 추측하지 않는다.

한국어 상담체로만 작성한다.
JSON, 코드블록, 마크다운, 프롬프트 원문, 디버그 텍스트를 출력하지 않는다.
샘플, 예시, placeholder, Lorem ipsum 문구를 쓰지 않는다.
불안 조장, 확정적 파멸 예언, 의료·법률·투자 확정 조언을 쓰지 않는다.
사주, 자미두수, 숙요점, 서양 점성술, 타로 체계를 섞지 않는다.
출생시간이나 계산값이 부족한 영역은 단정하지 않고 제한적으로 말한다.`;

function chapterLine(chapter = {}) {
  return `${chapter.order}. [${chapter.category}] ${chapter.title} - ${chapter.purpose}`;
}

export function buildVedicChapterPrompt({ input, chapter, chapterPlanSummary = "" }) {
  return [
    `[전체 챕터 구성]\n${chapterPlanSummary}`,
    `[현재 작성할 챕터]\nID: ${chapter.id}\n순서: ${chapter.order}\n카테고리: ${chapter.category}\n제목: ${chapter.title}\n목적: ${chapter.purpose}\n필수 소제목: 핵심 요약 / 차트 기반 본문 / 베다 처방`,
    `[계산된 베다 차트 데이터]\n${stableStringify(input)}`,
    `[작성 원칙]
- 반드시 제공된 계산값만 해석한다.
- 라그나, 행성 위치, 하우스, 나크샤트라, 다샤를 새로 계산하거나 추측하지 않는다.
- 본문 흐름은 차트 구조 → 카르마/심리 패턴 → 현실 조언 순서로 쓴다.
- 각 챕터에는 차트 기반 해석, 심리적 의미, 현실 패턴, 장점, 주의점, 실천 조언이 모두 들어가야 한다.
- 같은 문장을 반복하지 않는다.
- 다른 챕터 내용을 섞지 않는다.
- 아래 HTML fragment만 출력한다.`,
    `[출력 형식]
<section class="vedic-chapter" data-chapter-id="${chapter.id}">
  <h2>${chapter.title}</h2>

  <div class="chapter-summary">
    <p>핵심 요약 3~5문장</p>
  </div>

  <div class="chapter-body">
    <p>베다 차트 데이터를 바탕으로 한 상담형 본문</p>
    <p>카르마적 의미와 삶의 패턴</p>
    <p>장점과 가능성</p>
    <p>주의점과 반복되는 과제</p>
    <p>현실 조언</p>
  </div>

  <div class="chapter-advice">
    <h3>베다 처방</h3>
    <ul>
      <li>실천 조언 1</li>
      <li>실천 조언 2</li>
      <li>실천 조언 3</li>
    </ul>
  </div>
</section>`,
  ].join("\n\n");
}

export function buildVedicRepairPrompt({ input, chapter, invalidHtml, errors = [], chapterPlanSummary = "" }) {
  return [
    `이전 HTML은 베다점 PDF 검증을 통과하지 못했다. 실패한 챕터만 다시 작성한다.`,
    `챕터: ${chapterLine(chapter)}`,
    `검증 오류: ${errors.join(", ")}`,
    `이전 출력은 참고만 하고 그대로 반복하지 않는다:\n${String(invalidHtml || "").replace(/<[^>]+>/g, " ").slice(0, 1200)}`,
    buildVedicChapterPrompt({ input, chapter, chapterPlanSummary }),
  ].join("\n\n");
}

export function buildVedicChapterPlanSummary(plan = {}) {
  return (plan.chapters || []).map(chapterLine).join("\n");
}
