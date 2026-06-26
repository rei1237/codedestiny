import { stableStringify } from "./astrology-premium.types.js";
import { ASTROLOGY_LLM_VERSION } from "./astrology-chapters.js";

export const ASTROLOGY_PROMPT_VERSION = ASTROLOGY_LLM_VERSION;

export const astrologySystemPrompt = `너는 30년 경력의 전문 점성술 상담가다.
사용자의 출생 차트 데이터를 바탕으로 성격, 관계, 직업, 재물, 인생 전환점, 현재 흐름을 깊이 있게 해석한다.
점성술 용어는 사용하되 일반 고객이 이해할 수 있도록 쉽게 풀어준다.
제공된 차트 데이터만 해석하며 행성 위치를 임의로 계산하거나 추측하지 않는다.
한국어 상담체로 쓰고, 고급 점성술 리포트의 품격을 유지한다.
JSON, 코드블록, 프롬프트 원문, 샘플 문장, placeholder, 디버그 텍스트를 출력하지 않는다.
의료, 법률, 투자에 대해 확정 조언을 하지 않는다.
불안 조장이나 파멸을 단정하는 예언을 하지 않는다.
사주, 자미두수, 숙요점, 베다 점성술, 타로 등 다른 점술 체계를 섞지 않는다.`;

function chapterSummary(chapterPlan = []) {
  return chapterPlan
    .map((chapter) => `${chapter.order}. [${chapter.category}] ${chapter.title}`)
    .join("\n");
}

function limitationLines(input = {}) {
  const lines = [];
  if (!input.birthTime) {
    lines.push("- 출생시간이 없으면 상승궁, 하우스, MC 해석을 단정하지 말고 제한을 분명히 밝혀라.");
  }
  if (!input.birthPlace || !input.timezone) {
    lines.push("- 출생지 또는 시간대 정보가 부족하면 하우스 정확도 제한을 분명히 밝혀라.");
  }
  if (input.zodiacType) {
    lines.push(`- 황도 기준은 ${input.zodiacType}로 표시하고 그 기준 안에서만 해석하라.`);
  }
  if (input.houseSystem) {
    lines.push(`- 하우스 시스템은 ${input.houseSystem}로 표시하고 그 기준 안에서만 해석하라.`);
  }
  return lines.join("\n");
}

export function buildAstrologyChapterPrompt({ input, chapter, chapterPlan = [] } = {}) {
  return [
    `[전체 챕터 플랜]\n${chapterSummary(chapterPlan)}`,
    `[현재 작성 챕터]\nID: ${chapter.id}\n순서: ${chapter.order}\n카테고리: ${chapter.category}\n제목: ${chapter.title}\n목적: ${chapter.purpose}`,
    `[계산된 점성술 데이터]\n${stableStringify({
      service: "astrology",
      userName: input.userName,
      gender: input.gender,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      birthPlace: input.birthPlace,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
      houseSystem: input.houseSystem,
      zodiacType: input.zodiacType,
      question: input.question,
      astrologyChart: input.astrologyChart,
      warnings: input.warnings,
    })}`,
    `[해석 제한]\n${limitationLines(input) || "- 제공된 차트 데이터에 근거해 필요한 제한만 자연스럽게 밝혀라."}`,
    `[작성 기준]
- 본문은 반드시 LLM이 새로 작성하되, 행성 위치·하우스·어스펙트·트랜짓을 새로 계산하지 말라.
- 제공된 차트 데이터 안의 태양, 달, 상승궁, MC, 행성, 하우스, 어스펙트, 트랜짓을 구체적으로 반영하라.
- 차트 구조 → 심리 패턴 → 현실 조언 순서로 전개하라.
- 별자리 일반론만 반복하지 말라.
- 같은 문장을 반복하지 말라.
- 각 챕터에는 차트 데이터 기반 해석, 심리적 의미, 현실 패턴, 장점, 주의점, 실천 조언이 모두 들어가야 한다.
- 출력은 아래 HTML 조각 하나만 반환하라.
- <html>, <head>, <body>, JSON, 마크다운 코드블록을 반환하지 말라.
- 다른 챕터 내용을 섞지 말라.`,
    `[출력 형식]
<section class="astrology-chapter" data-chapter-id="${chapter.id}">
  <h2>${chapter.title}</h2>

  <div class="chapter-summary">
    <p>핵심 요약 3~5문장</p>
  </div>

  <div class="chapter-body">
    <p>차트 데이터를 바탕으로 한 상담형 본문</p>
    <p>심리적 의미와 삶의 패턴</p>
    <p>장점과 가능성</p>
    <p>주의점과 반복되는 과제</p>
    <p>현실 조언</p>
  </div>

  <div class="chapter-advice">
    <h3>별자리 처방</h3>
    <ul>
      <li>실천 조언 1</li>
      <li>실천 조언 2</li>
      <li>실천 조언 3</li>
    </ul>
  </div>
</section>`,
  ].join("\n\n");
}

export function buildAstrologyRepairPrompt({ input, chapter, chapterPlan = [], invalidHtml = "", errors = [] } = {}) {
  return [
    "이전 출력은 점성술 PDF 챕터 HTML 검증에 실패했다. 실패한 챕터 하나만 다시 작성하라.",
    `검증 오류: ${errors.join(", ")}`,
    `이전 출력 일부: ${String(invalidHtml || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 1200)}`,
    buildAstrologyChapterPrompt({ input, chapter, chapterPlan }),
  ].join("\n\n");
}
