import { asArray, clean, stableStringify } from "./life-book-premium.types.js";

export const LIFE_BOOK_PROMPT_VERSION = "2026-06-life-book-prompts-v1";

export const lifeBookSystemPrompt = [
  "너는 30년 경력의 사주 명리학자이자 인생 상담 전문가다.",
  "사용자의 사주 팔자를 바탕으로 삶의 흐름, 성향, 직업, 재물, 관계, 건강, 대운과 세운을 깊이 있게 풀어준다.",
  "사주 용어는 사용하되 일반 고객이 이해할 수 있도록 반드시 쉽게 설명한다.",
  "불안 조장, 저주, 단정적 파멸 예언, 의료·법률·투자 확정 조언은 금지한다.",
  "출력은 요청한 HTML 조각만 반환하고 JSON, 마크다운 코드블록, 프롬프트 원문은 절대 반환하지 않는다.",
].join("\n");

function formatChapterPlan(chapters = []) {
  return asArray(chapters)
    .map((chapter) => `${chapter.order}. [${chapter.id}] ${chapter.category} - ${chapter.title}: ${chapter.purpose}`)
    .join("\n");
}

export function buildLifeBookInputDigest(input = {}) {
  const chart = input.sajuChart || {};
  return [
    `이름: ${clean(input.userName || "고객")}`,
    `성별: ${clean(input.gender || "미상")}`,
    `출생: ${clean(input.birthDate)} ${clean(input.birthTime || "출생시간 미상")}`,
    `달력/장소: ${clean(input.calendarType || "solar")} / ${clean(input.birthPlace || "미상")}`,
    input.birthTime ? "" : "출생시간이 없으므로 시주와 시주 기반 해석은 단정하지 말고 출생시간 미상 기준으로 표현한다.",
    `질문: ${clean(input.question || "인생 전반의 흐름", 600)}`,
    `사주 팔자: ${clean(stableStringify({
      yearPillar: chart.yearPillar,
      monthPillar: chart.monthPillar,
      dayPillar: chart.dayPillar,
      hourPillar: chart.hourPillar,
    }), 2500)}`,
    `십성/지장간/12운성: ${clean(stableStringify({
      tenGods: chart.tenGods,
      hiddenStems: chart.hiddenStems,
      twelveStages: chart.twelveStages,
    }), 2500)}`,
    `오행/용신/구조: ${clean(stableStringify({
      fiveElements: chart.fiveElements,
      usefulGod: chart.usefulGod,
      structure: chart.structure,
    }), 2500)}`,
    `합충형해: ${clean(stableStringify({
      combinations: chart.combinations,
      clashes: chart.clashes,
    }), 2000)}`,
    `대운: ${clean(stableStringify(input.luckCycles || {}), 2500)}`,
    `세운: ${clean(stableStringify(input.annualLuck || {}), 2500)}`,
    `계산 근거: ${clean(stableStringify(input.calculationEvidence || {}), 3500)}`,
  ].filter(Boolean).join("\n");
}

export function buildLifeBookChapterPrompt({ input, chapter, chapterPlan = [] } = {}) {
  return [
    "아래 한 챕터만 작성한다.",
    `chapterId: ${clean(chapter.id)}`,
    `chapterCategory: ${clean(chapter.category)}`,
    `chapterTitle: ${clean(chapter.title)}`,
    `chapterPurpose: ${clean(chapter.purpose || chapter.description)}`,
    "",
    "전체 챕터 플랜:",
    formatChapterPlan(chapterPlan),
    "",
    "작성 기준:",
    "- 한국어 상담체로 사용자를 직접 상담하듯 작성한다.",
    "- 사주 구조 → 삶의 패턴 → 현실 조언 순서로 전개한다.",
    "- 각 챕터에는 사주 구조 해석, 인생 상담식 풀이, 장점, 주의점, 실전 조언이 반드시 들어간다.",
    "- 이미 계산된 사주 팔자, 십성, 지장간, 형충합해, 대운, 세운 데이터를 근거로 삼고 생년월일만 보고 임의 재계산하지 않는다.",
    "- 중요한 선택은 현실 자료와 전문가 상담, 본인의 판단을 함께 고려하라는 문장을 자연스럽게 포함한다.",
    "- 전문용어를 나열하지 말고 쉬운 설명으로 풀어낸다.",
    "- 샘플, 예시, placeholder, mock, fallback, JSON, 프롬프트, 코드블록 같은 단어를 쓰지 않는다.",
    "- 궁합, 타로, 자미두수, 베다 점성술, 숙요점 내용은 섞지 않는다.",
    "",
    "반환 형식은 아래 HTML 조각과 같은 구조만 허용한다. html/head/body를 쓰지 않는다.",
    `<section class="life-book-chapter" data-chapter-id="${clean(chapter.id)}">`,
    `  <h2>${clean(chapter.title)}</h2>`,
    "  <div class=\"chapter-summary\">",
    "    <p>핵심 요약 3~5문장</p>",
    "  </div>",
    "  <div class=\"chapter-body\">",
    "    <p>사주 구조를 바탕으로 한 상담형 본문</p>",
    "    <p>삶의 패턴과 현실적 의미</p>",
    "    <p>장점과 가능성</p>",
    "    <p>주의점과 반복되는 숙제</p>",
    "    <p>실천 조언</p>",
    "  </div>",
    "  <div class=\"chapter-advice\">",
    "    <h3>인생 처방</h3>",
    "    <ul>",
    "      <li>실천 조언 1</li>",
    "      <li>실천 조언 2</li>",
    "      <li>실천 조언 3</li>",
    "    </ul>",
    "  </div>",
    "</section>",
    "",
    "사용자 사주 데이터:",
    buildLifeBookInputDigest(input),
  ].join("\n");
}

export function buildLifeBookRepairPrompt({ input, chapter, chapterPlan = [], previousHtml = "", validationErrors = [] } = {}) {
  return [
    "이전 응답은 검증을 통과하지 못했다. 같은 chapterId로 해당 챕터 전체를 다시 작성한다.",
    `chapterId: ${clean(chapter.id)}`,
    `chapterTitle: ${clean(chapter.title)}`,
    `검증 오류: ${asArray(validationErrors).map((issue) => clean(issue)).filter(Boolean).join(", ")}`,
    "",
    "이전 응답 일부:",
    clean(previousHtml, 2400),
    "",
    buildLifeBookChapterPrompt({ input, chapter, chapterPlan }),
  ].join("\n");
}
