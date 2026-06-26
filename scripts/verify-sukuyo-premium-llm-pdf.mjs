import {
  SUKYO_PDF_CHAPTERS,
  SUKYO_PDF_CONFIG,
  assertSukyoCompatibilityPdfComplete,
  buildSukyoPdfSeed,
  generateSukyoPremiumReport,
  validateSukyoPdfCompletionPayload,
} from "../worker/lib/sukuyo-premium-pdf-v2.js";

function assert(condition, message, detail = undefined) {
  if (condition) return;
  const error = new Error(message);
  if (detail !== undefined) error.detail = detail;
  throw error;
}

function extract(pattern, text) {
  return text.match(pattern)?.[1] || "";
}

const paragraph = [
  "하린님과 도윤님의 본명숙은 서로의 반응 속도와 감정의 문턱을 다르게 비추고, 이 관계는 가까워질수록 말의 순서와 휴식의 약속이 중요해집니다.",
  "숙요점의 관계분류는 하린님이 어떤 자리에서 마음을 열고 도윤님이 어떤 자리에서 관계를 안정시키는지를 드러냅니다.",
  "도윤님의 리듬을 단정하지 않고 하린님이 먼저 확인하면 감정의 온도가 안정되고, 작은 차이도 관계를 키우는 배움으로 이어집니다.",
].join(" ");

const promptChecks = [];
const geminiModel = "gemini-verify-premium";
let fetchMode = "success";
globalThis.fetch = async (url, options = {}) => {
  const body = JSON.parse(String(options.body || "{}"));
  const prompt = body.contents?.[0]?.parts?.map((part) => part?.text || "").join("\n") || "";
  promptChecks.push({
    modelInUrl: String(url).includes(geminiModel),
    chapterCategory: prompt.includes("Chapter category:"),
    sectionCategories: prompt.includes("Section categories:"),
    chapterFocus: prompt.includes("Expert focus:"),
    forbiddenTone: prompt.includes("Forbidden tone keywords:"),
    nameInstruction: prompt.includes("하린님과 도윤님") && prompt.includes("상담 대상 1: 하린") && prompt.includes("상담 대상 2: 도윤"),
    noSubjectAB: !/^\s*[AB]\s*:/m.test(prompt),
  });
  if (fetchMode === "fail") {
    return new Response(JSON.stringify({ error: { message: "forced LLM failure" } }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
  const id = extract(/<article data-chapter-id="([^"]+)">/, prompt);
  const title = extract(/<h1>([^<]+)<\/h1>/, prompt);
  const sections = [...prompt.matchAll(/<section><h2>([^<]+)<\/h2><p>\.\.\.<\/p><p>\.\.\.<\/p><\/section>/g)]
    .map((match) => match[1]);
  const html = [
    `<article data-chapter-id="${id}">`,
    `<h1>${title}</h1>`,
    ...sections.map((section) => `<section><h2>${section}</h2><p>${paragraph} ${paragraph}</p><p>${paragraph} ${paragraph}</p></section>`),
    "</article>",
  ].join("");
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: html }] } }],
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
const env = {
  GEMINI_API_KEY: "test-gemini-key",
  PREMIUM_GEMINI_MODEL: geminiModel,
  SUKYO_PREMIUM_LLM_PROVIDERS: "gemini,workers-ai",
};

const seed = buildSukyoPdfSeed({
  reportId: "verify-sukuyo-premium-llm-pdf",
  requestId: "verify-sukuyo-premium-llm-pdf",
  userProfile: { name: "하린", birthYear: 1991, birthMonth: 5, birthDay: 14, gender: "여성" },
  partnerProfile: { name: "도윤", birthYear: 1989, birthMonth: 11, birthDay: 3, gender: "남성" },
});

seed.canonical = seed.canonical || {};
seed.canonical.compatibility = {
  ...(seed.canonical.compatibility || {}),
  forwardDistance: 3,
  reverseDistance: 24,
  shortestDistance: 3,
  relationType: "안괴",
  distance: "근거리",
  distanceLabel: "근거리",
  compatibilityIndex: 83,
  magnetism: 91,
  temperature: 86,
  chemistryScore: 88,
  stabilityScore: 72,
  growthScore: 84,
  communicationScore: 76,
  conflictScore: 42,
  relationshipName: "깊은 끌림을 조율하는 안괴",
  relationshipCategoryReadings: [
    { title: "감정 호흡", score: 88, reading: "하린님은 감정의 깊이를 먼저 느끼고 도윤님은 반응의 타이밍을 통해 안정감을 찾습니다." },
    { title: "대화 회복", score: 76, reading: "도윤님이 결론을 늦추고 하린님이 감정의 이름을 정확히 말할수록 오해가 빠르게 풀립니다." },
  ],
  relationshipRiskRoutines: [
    { title: "말의 간격", routine: "감정이 오른 날에는 결론보다 다음 대화 시간을 먼저 정합니다." },
  ],
  relationshipTiming: [
    { title: "가까워지는 시기", reading: "약속을 작게 지키는 달에 관계의 신뢰가 빠르게 붙습니다." },
  ],
  enhanced: {
    relationshipName: "깊은 끌림을 조율하는 안괴",
    relationshipCategoryReadings: [
      { title: "감정 호흡", score: 88, reading: "하린님과 도윤님의 감정 속도 차이가 관계의 중요한 조율점입니다." },
    ],
  },
};

const result = await generateSukyoPremiumReport(env, seed, { requestId: "verify-sukuyo-premium-llm-pdf" });
assert(result.ok === true, "숙요 PDF 생성이 ok=true를 반환해야 합니다.");
assert(result.chapters.length === 15, "15챕터가 모두 생성되어야 합니다.", result.chapters.length);
assert(promptChecks.length === 15, "15개 LLM 프롬프트가 호출되어야 합니다.", promptChecks.length);
const initialPromptCount = promptChecks.length;
assert(
  promptChecks.every((item) => item.modelInUrl && item.chapterCategory && item.sectionCategories && item.chapterFocus && item.forbiddenTone && item.nameInstruction && item.noSubjectAB),
  "모든 프롬프트가 Gemini 모델, 챕터 카테고리, 섹션 카테고리, 전문 초점, 이름 기반 상담 지시, 금지 문체를 포함해야 합니다.",
  promptChecks,
);
assert(SUKYO_PDF_CONFIG.provider === "gemini-primary-workers-ai-fallback", "숙요 PDF provider 설정은 Gemini 우선이어야 합니다.", SUKYO_PDF_CONFIG.provider);
assert(result.llmAssembly?.provider === "gemini", "검증 생성은 Gemini provider로 완료되어야 합니다.", result.llmAssembly);
assert(result.llmAssembly?.modelName === geminiModel, "llmAssembly.modelName이 PREMIUM_GEMINI_MODEL 기준이어야 합니다.", result.llmAssembly);
assert(SUKYO_PDF_CHAPTERS.every((chapter) => chapter.categoryKey && chapter.categoryTitle), "챕터 manifest에 카테고리가 있어야 합니다.");
assert(
  result.chapters.every((chapter) => chapter.categoryKey && chapter.categoryTitle && chapter.sections.every((section) => section.categoryKey && section.categoryTitle)),
  "생성 payload의 모든 챕터와 섹션에 카테고리가 있어야 합니다.",
);

assertSukyoCompatibilityPdfComplete({ chapters: result.chapters });
const completion = validateSukyoPdfCompletionPayload({ pdfReady: result.pdfReady, chapters: result.chapters });
assert(completion.ok === true, "PDF 완료 payload 검증이 통과해야 합니다.", completion.issues);

const html = String(result.pdfReady.html || "");
const requiredMarkers = [
  'class="calculation-dashboard"',
  'class="distance-graph"',
  'class="metric-grid"',
  'class="base-sukuyo-chart-table"',
  'class="chapter-header__basis"',
  'class="score-summary-table"',
  "계산축",
  "제공 계산 지표",
  "감정 호흡",
  "대화 회복",
  "끌림",
  "소통",
  "긴장 완화",
];
const missingMarkers = requiredMarkers.filter((marker) => !html.includes(marker));
assert(missingMarkers.length === 0, "계산 기반 시각화 마커가 누락되지 않아야 합니다.", missingMarkers);

const exactValueMarkers = [
  'data-relation="안괴"',
  'data-distance-label="근거리"',
  'data-forward-distance="3"',
  'data-reverse-distance="24"',
  'data-shortest-distance="3"',
  'data-metric="overall" data-score="83"',
  'data-metric="magnetism" data-score="91"',
  'data-metric="temperature" data-score="86"',
  'data-metric="stability" data-score="72"',
  'data-metric="growth" data-score="84"',
  'data-metric="communication" data-score="76"',
  'data-metric="tensionRelief" data-score="58"',
  'data-distance="3" data-fill="12"',
  'data-distance="24" data-fill="92"',
  'data-chapter-no="1" data-chapter-score="83" data-score-basis="종합 점수"',
  'data-chapter-no="4" data-chapter-score="91" data-score-basis="끌림"',
  'data-chapter-no="6" data-chapter-score="76" data-score-basis="소통"',
  'data-chapter-no="7" data-chapter-score="58" data-score-basis="긴장 완화"',
];
const missingExactValues = exactValueMarkers.filter((marker) => !html.includes(marker));
assert(missingExactValues.length === 0, "시각화 data 값이 입력 계산값과 정확히 일치해야 합니다.", missingExactValues);
assert(html.includes("하린님") && html.includes("도윤님"), "PDF 본문은 입력 이름을 사용해야 합니다.");
assert(!/(^|[\s\"'“‘])(?:A|B)\s*[:：]/.test(html), "PDF 본문에 A/B speaker 표기가 남지 않아야 합니다.");

const badCompletion = validateSukyoPdfCompletionPayload({
  pdfReady: { ...result.pdfReady, html: `${html}<p>localdraft 템플릿</p>` },
  chapters: result.chapters,
});
assert(
  badCompletion.issues.some((issue) => issue.includes("pdfReady.forbidden-token") && issue.includes("localdraft") && issue.includes("템플릿")),
  "로컬/제작 흔적 금칙어가 완료 검증에서 차단되어야 합니다.",
  badCompletion.issues,
);

const badToneCompletion = validateSukyoPdfCompletionPayload({
  pdfReady: { ...result.pdfReady, html: `${html}<p>A: 마음을 더 열어야 합니다.</p>` },
  chapters: result.chapters,
});
assert(
  badToneCompletion.issues.some((issue) => issue.includes("pdfReady.forbidden-token") || issue.includes("pdfReady.tone")),
  "A/B 호칭은 완료 검증에서 차단되어야 합니다.",
  badToneCompletion.issues,
);

promptChecks.length = 0;
const repeatResult = await generateSukyoPremiumReport(env, {
  ...seed,
  reportId: "verify-sukuyo-premium-llm-repeat",
  requestId: "verify-sukuyo-premium-llm-repeat",
});
const repeatPromptCount = promptChecks.length;
assert(repeatResult.ok === true, "반복 생성도 ok=true를 반환해야 합니다.");
assert(repeatResult.chapters.length === 15, "반복 생성도 15챕터가 모두 생성되어야 합니다.", repeatResult.chapters.length);
assert(repeatPromptCount === 15, "장 캐시가 있어도 기본 생성은 15개 LLM 프롬프트를 다시 호출해야 합니다.", repeatPromptCount);
assert(
  repeatResult.chapters.every((chapter) => chapter.cached === false),
  "기본 생성 결과는 캐시 챕터가 아니라 실시간 LLM 챕터여야 합니다.",
  repeatResult.chapters.map((chapter) => ({ order: chapter.order, cached: chapter.cached })),
);
assert(repeatResult.llmAssembly?.cachedChapterCount === 0, "llmAssembly.cachedChapterCount는 기본 생성에서 0이어야 합니다.", repeatResult.llmAssembly);
assert(repeatResult.llmAssembly?.liveChapterCount === 15, "llmAssembly.liveChapterCount는 기본 생성에서 15여야 합니다.", repeatResult.llmAssembly);

fetchMode = "fail";
promptChecks.length = 0;
let failureError = null;
try {
  await generateSukyoPremiumReport({
    ...env,
    SUKYO_PREMIUM_LLM_REPAIR_LIMIT: 0,
    SUKYO_PREMIUM_DISABLE_WORKERS_AI_FALLBACK: "true",
  }, {
    ...seed,
    reportId: "verify-sukuyo-premium-llm-failure",
    requestId: "verify-sukuyo-premium-llm-failure",
  });
} catch (error) {
  failureError = error;
}
const failurePromptCount = promptChecks.length;
fetchMode = "success";
assert(failurePromptCount > 0, "LLM 실패 검증은 실제 LLM 호출 후 실패해야 합니다.", failurePromptCount);
assert(failureError?.code === "SUKUYO_PREMIUM_GENERATION_FAILED", "LLM 실패 시 로컬 원고로 대체하지 않고 생성 실패를 반환해야 합니다.", {
  code: failureError?.code,
  message: failureError?.message,
});
assert(Number(failureError?.chapterCount || 0) === 0, "LLM 실패 시 부분/로컬 챕터를 완료 payload로 만들지 않아야 합니다.", {
  chapterCount: failureError?.chapterCount,
  failedChapters: failureError?.failedChapters,
});

console.log("[verify-sukuyo-premium-llm-pdf] ok", {
  chapters: result.chapters.length,
  htmlLength: html.length,
  provider: result.llmAssembly?.provider,
  modelName: result.llmAssembly?.modelName,
  promptChecks: initialPromptCount,
  repeatPromptChecks: repeatPromptCount,
  failurePromptChecks: failurePromptCount,
});
