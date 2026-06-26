import { clean } from "./saju-new-year-premium.types.js";

export const newYearSystemPrompt = [
  "너는 30년 경력의 사주 명리학자이자 신년운세 상담 전문가다.",
  "사용자의 사주 원국, 대운, 세운, 월운 데이터를 바탕으로 해당 연도의 일, 돈, 관계, 건강, 변화 흐름을 깊이 있게 해석한다.",
  "사주 용어는 사용하되 일반 고객이 이해할 수 있도록 쉽게 풀어준다.",
  "제공된 계산 데이터만 해석하며 사주, 대운, 세운, 월운을 임의로 계산하거나 추측하지 않는다.",
].join("\n");

function compactJson(value) {
  return JSON.stringify(value, (_key, item) => {
    if (item === undefined) return undefined;
    if (typeof item === "string") return clean(item, 1200);
    return item;
  });
}

function chapterLine(chapter) {
  return `${clean(chapter.id)} | ${clean(chapter.category)} | ${clean(chapter.title)} | ${clean(chapter.purpose)}`;
}

export function buildNewYearChapterPrompt({ input, chapter, chapterPlan }) {
  const planSummary = (Array.isArray(chapterPlan) ? chapterPlan : []).map(chapterLine).join("\n");
  return [
    `대상 연도: ${input.targetYear}`,
    `이번 챕터: ${chapterLine(chapter)}`,
    "",
    "챕터 플랜:",
    planSummary,
    "",
    "계산 데이터:",
    compactJson({
      birth: {
        userName: input.userName,
        gender: input.gender,
        birthDate: input.birthDate,
        birthTime: input.birthTime || "unknown",
        calendarType: input.calendarType,
        targetYear: input.targetYear,
        question: input.question,
      },
      sajuChart: input.sajuChart,
      luckCycles: input.luckCycles,
      annualLuck: input.annualLuck,
      monthlyLuck: input.monthlyLuck,
      categories: input.categories,
    }),
    "",
    "작성 규칙:",
    "- 한국어 상담체로 쓴다.",
    "- 제공된 사주 원국, 대운, 세운, 월운 데이터만 해석한다.",
    "- 연도 간지, 대운, 세운, 월운을 새로 계산하지 않는다.",
    "- 출생시간이 unknown이면 시주 해석을 단정하지 않는다.",
    "- 세운 구조, 현실 흐름, 기회, 주의점, 실천 처방이 모두 드러나야 한다.",
    "- 불안 조장, 확정적 파멸 예언, 의료·법률·투자 확정 조언을 하지 않는다.",
    "- JSON, 마크다운 코드블록, 프롬프트 원문, 샘플, 예시, placeholder를 출력하지 않는다.",
    "- 아래 HTML 조각 하나만 반환한다.",
    "",
    `<section class="new-year-chapter" data-chapter-id="${chapter.id}">`,
    `  <h2>${chapter.title}</h2>`,
    "  <div class=\"chapter-summary\">",
    "    <p>핵심 요약 3~5문장</p>",
    "  </div>",
    "  <div class=\"chapter-body\">",
    "    <p>사주·대운·세운·월운 데이터를 바탕으로 한 상담형 본문</p>",
    "    <p>올해 현실에서 드러나는 흐름</p>",
    "    <p>기회와 강점</p>",
    "    <p>주의점과 조심해야 할 패턴</p>",
    "    <p>실천 조언</p>",
    "  </div>",
    "  <div class=\"chapter-advice\">",
    "    <h3>올해의 실천 처방</h3>",
    "    <ul>",
    "      <li>실천 조언 1</li>",
    "      <li>실천 조언 2</li>",
    "      <li>실천 조언 3</li>",
    "    </ul>",
    "  </div>",
    "</section>",
  ].join("\n");
}

export function buildNewYearRepairPrompt({ input, chapter, invalidHtml, errors }) {
  return [
    buildNewYearChapterPrompt({ input, chapter, chapterPlan: [chapter] }),
    "",
    "이전 출력은 검증에 실패했다.",
    `검증 오류: ${(Array.isArray(errors) ? errors : []).join(", ")}`,
    "이전 출력:",
    clean(invalidHtml, 12000),
    "",
    "위 오류를 모두 고쳐 같은 챕터의 HTML 조각만 다시 반환한다.",
  ].join("\n");
}
