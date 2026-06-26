import assert from "node:assert/strict";
import { handleSajuNewYearRoutes, __sajuNewYearTestUtils } from "../worker/routes/saju-new-year.js";
import { NEW_YEAR_LLM_VERSION, normalizeChapterPlan } from "../worker/lib/pdf-v2/saju-new-year/new-year-chapters.js";
import { buildNewYearPdfInputFromNormalized, generateNewYearPdfWithLlm } from "../worker/lib/pdf-v2/saju-new-year/new-year-pdf-service.js";
import { buildNewYearChapterCacheKey } from "../worker/lib/pdf-v2/saju-new-year/new-year-llm-engine.js";
import { validateFinalNewYearPdfPayload } from "../worker/lib/pdf-v2/saju-new-year/new-year-validator.js";

const targetYear = 2031;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMonths(year) {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    targetYear: year,
    label: `${index + 1}월 월운`,
    monthGanji: "갑자",
    finalScore: 68 + (index % 5),
    flow: "월운의 속도가 일과 관계의 조율을 요구한다.",
  }));
}

function buildNormalizedInput(year) {
  const defaultPlan = normalizeChapterPlan([], { targetYear: year });
  const monthlyLuck = buildMonths(year);
  const pillars = {
    year: { ganji: "갑자", element: "목수" },
    month: { ganji: "병인", element: "화목" },
    day: { ganji: "무진", element: "토토" },
    hour: { ganji: "unknown", note: "출생시간 미상" },
  };
  return {
    targetYear: year,
    expectedChapters: defaultPlan.chapters,
    chapterConfigSource: defaultPlan.source,
    chapterConfigVersion: defaultPlan.chapterConfigVersion,
    monthlyCalculation: monthlyLuck,
    yearlyCalculation: { targetYear: year, yearGanji: "신해", label: "신해 세운", tenGod: "식신" },
    normalizedData: {
      natal: {
        pillars,
        tenGods: { year: "편관", month: "정인", day: "일간", hour: "미상" },
        hiddenStems: { year: ["갑", "계"], month: ["병", "갑"], day: ["무", "을", "계"] },
        twelveStages: { day: "관대" },
        fiveElements: { wood: 2, fire: 1, earth: 2, metal: 1, water: 2 },
        combinations: ["합"],
        clashes: ["충"],
        usefulGods: ["목", "화"],
        structure: "식신생재형",
      },
      annual: { targetYear: year, yearGanji: "신해", label: "신해 세운", currentDaewoon: { ganji: "병인", range: "35-44" } },
    },
    seed: {
      targetYear: year,
      input: {
        name: "검증사용자",
        gender: "female",
        birthDate: "1990-05-17",
        birthTime: "",
        calendarType: "solar",
      },
      birthProfile: {
        name: "검증사용자",
        gender: "female",
        birthDate: "1990-05-17",
        birthTime: "",
        calendarType: "solar",
      },
      structure: "식신생재형",
      saju: {
        pillars,
        tenGods: { year: "편관", month: "정인", day: "일간", hour: "미상" },
        hiddenStems: { year: ["갑", "계"], month: ["병", "갑"], day: ["무", "을", "계"] },
        twelveStages: { day: "관대" },
        fiveElements: { wood: 2, fire: 1, earth: 2, metal: 1, water: 2 },
        relations: { combinations: ["합"], clashes: ["충"] },
        usefulGod: ["목", "화"],
        luckCycle: { current: { ganji: "병인", range: "35-44" } },
        annualLuck: { targetYear: year, yearGanji: "신해", label: "신해 세운", tenGod: "식신" },
        monthlyLuck,
      },
    },
  };
}

function renderChapterHtml(chapter, year) {
  const title = escapeHtml(chapter.title);
  return `<section class="new-year-chapter" data-chapter-id="${escapeHtml(chapter.id)}">
  <h2>${title}</h2>
  <div class="chapter-summary">
    <p>${year}년에는 사주 원국과 대운, 세운, 월운이 함께 맞물리며 현실의 방향이 선명해집니다. 이 흐름은 급하게 밀어붙이기보다 준비된 선택을 차분히 여는 운으로 드러납니다. 특히 세운의 기운이 월운의 리듬을 통해 일상 안에서 반복적으로 확인됩니다.</p>
  </div>
  <div class="chapter-body">
    <p>사주 원국에서 이미 강하게 자리한 오행의 균형은 올해 대운과 세운을 만나며 실행력과 조율력을 함께 요구합니다.</p>
    <p>현실에서는 일, 돈, 관계의 속도가 한꺼번에 빨라지기보다 월운의 흐름에 따라 순차적으로 열리는 모습이 강합니다.</p>
    <p>장점은 꾸준히 쌓아 온 경험이 신뢰로 드러나고, 필요한 사람과 자원이 자연스럽게 연결될 수 있다는 점입니다.</p>
    <p>주의할 부분은 세운이 자극하는 욕심이나 조급함을 그대로 따라가면 관계와 재물의 균형이 흔들릴 수 있다는 점입니다.</p>
    <p>월운이 부드러울 때는 확장하고, 충돌이 보이는 달에는 점검과 정리에 힘을 두면 올해의 운을 안정적으로 살릴 수 있습니다.</p>
  </div>
  <div class="chapter-advice">
    <h3>올해의 실천 처방</h3>
    <ul>
      <li>대운이 열어 주는 큰 방향을 먼저 정하고 월운마다 실행 범위를 조절하세요.</li>
      <li>세운이 강하게 움직이는 시기에는 계약, 약속, 지출을 한 번 더 확인하세요.</li>
      <li>사주 원국의 강점을 살릴 수 있는 루틴을 정해 꾸준히 반복하세요.</li>
    </ul>
  </div>
</section>`;
}

async function jsonBody(response) {
  return await response.json();
}

const chapterPlan = normalizeChapterPlan([], { targetYear });
assert.equal(chapterPlan.source, "default-13");
assert.equal(chapterPlan.chapters.length, 13);
assert.equal(__sajuNewYearTestUtils.buildSajuNewYearChapterSpecs(targetYear).length, 13);

const existingPlan = normalizeChapterPlan([
  { id: "custom-01", category: "총론", title: "맞춤 신년 총론", purpose: "저장된 챕터 설정을 우선 사용한다." },
], { targetYear });
assert.equal(existingPlan.source, "existing-config");
assert.equal(existingPlan.chapters.length, 1);

const invalidInput = __sajuNewYearTestUtils.normalizeInput({ birthDate: "1990-05-17" });
assert.equal(invalidInput.ok, false);
assert.equal(invalidInput.code, "INVALID_INPUT");

const unauthResponse = await handleSajuNewYearRoutes(new Request("https://verify.local/api/saju-new-year/prepare", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ service: "new-year", birthDate: "1990-05-17", targetYear }),
}), {});
const unauthBody = await jsonBody(unauthResponse);
assert.equal(unauthResponse.status, 401);
assert.equal(unauthBody.code, "AUTH_REQUIRED");
assert.doesNotMatch(unauthBody.message || "", /Authentication service error|retry login/i);

const expiredSessionResponse = await handleSajuNewYearRoutes(new Request("https://verify.local/api/saju-new-year/prepare", {
  method: "POST",
  headers: { "content-type": "application/json", cookie: "fortune_auth_token=expired" },
  body: JSON.stringify({ service: "new-year", birthDate: "1990-05-17", targetYear }),
}), {});
const expiredSessionBody = await jsonBody(expiredSessionResponse);
assert.equal(expiredSessionResponse.status, 401);
assert.equal(expiredSessionBody.code, "SESSION_INVALID");

const normalized = buildNormalizedInput(targetYear);
const progressEvents = [];
const callCounts = new Map();
const env = {
  SAJU_NEW_YEAR_LLM_PROVIDERS: "workers-ai",
  SAJU_NEW_YEAR_LLM_REPAIR_LIMIT: "2",
  SAJU_NEW_YEAR_CHAPTER_MAX_TOKENS: "4000",
  AI: {
    async run(_model, payload) {
      const prompt = payload?.messages?.map((item) => item.content).join("\n") || "";
      const chapterId = prompt.match(/data-chapter-id="([^"]+)"/)?.[1] || "newyear-01";
      const chapter = chapterPlan.chapters.find((item) => item.id === chapterId) || chapterPlan.chapters[0];
      const count = callCounts.get(chapterId) || 0;
      callCounts.set(chapterId, count + 1);
      if (chapterId === "newyear-01" && count === 0) return { response: "" };
      return { response: renderChapterHtml(chapter, targetYear) };
    },
  },
};

const input = buildNewYearPdfInputFromNormalized(normalized, { question: "올해 흐름을 알고 싶습니다." });
const cacheKeyA = buildNewYearChapterCacheKey(input, chapterPlan.chapters[0], {
  chapterConfigVersion: chapterPlan.chapterConfigVersion,
  modelName: `workers-ai:${NEW_YEAR_LLM_VERSION}`,
});
const cacheKeyB = buildNewYearChapterCacheKey({ ...input, targetYear: targetYear + 1 }, chapterPlan.chapters[0], {
  chapterConfigVersion: chapterPlan.chapterConfigVersion,
  modelName: `workers-ai:${NEW_YEAR_LLM_VERSION}`,
});
assert.notEqual(cacheKeyA, cacheKeyB);

const result = await generateNewYearPdfWithLlm({
  env,
  normalized,
  metadata: { question: "올해 흐름을 알고 싶습니다." },
  reportId: "verify-new-year-llm",
  onProgress(event) {
    progressEvents.push(event);
  },
});

assert.equal(result.status, "completed");
assert.equal(result.chapters.length, 13);
assert.equal(result.chapterConfigSource, "default-13");
assert.equal(result.llmAssembly.fallbackUsed, false);
assert.equal(result.promptVersion, NEW_YEAR_LLM_VERSION);
assert.ok(result.pdfReady.html.includes("<!DOCTYPE html>"));
assert.ok(result.pdfReady.html.includes("본 리포트는 사주 명리학을 바탕으로 한 자기이해와 엔터테인먼트 목적의 신년운세 콘텐츠입니다."));
assert.equal(callCounts.get("newyear-01"), 2);
assert.ok(progressEvents.some((event) => event.status === "validating" && event.progress === 5));
assert.ok(progressEvents.some((event) => event.status === "generating" && event.chapterId === "newyear-13"));
assert.ok(progressEvents.some((event) => event.status === "rendering" && event.progress === 95));

const finalValidation = validateFinalNewYearPdfPayload({
  html: result.pdfReady.html,
  chapters: result.chapters,
  chapterPlan: result.chapterPlan,
  targetYear,
});
assert.deepEqual(finalValidation.errors, []);
assert.doesNotMatch(result.pdfReady.html, /```|샘플|예시|placeholder|Lorem ipsum|Authentication service error|retry login/i);

console.log("verify:saju-new-year-llm ok", {
  version: NEW_YEAR_LLM_VERSION,
  chapters: result.chapters.length,
  progressEvents: progressEvents.length,
  repairedChapter: "newyear-01",
});
