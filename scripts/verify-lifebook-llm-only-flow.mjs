import assert from "node:assert/strict";

const unique = Date.now();
const { generateLifeBookPremiumPdfV2 } = await import(`../worker/lib/pdf-v2/life-book/create-life-book-premium-pdf-job.js?verify=${unique}`);
const { lifeBookPremiumChapterPlanV1 } = await import(`../worker/lib/pdf-v2/life-book/life-book-premium.chapter-plan.js?verify=${unique}`);
const { validateLifeBookPremiumChapterHtml } = await import(`../worker/lib/pdf-v2/life-book/life-book-premium.validator.js?verify=${unique}`);
const { handleSajuLifebookRoutes } = await import(`../worker/routes/saju-lifebook.js?verify=${unique}`);
const { signJwt } = await import(`../worker/lib/jwt.js?verify=${unique}`);
const { createPremiumAccessToken } = await import(`../worker/lib/premium-access-token.js?verify=${unique}`);

function makeMockChapterHtml(prompt = "") {
  const id = (prompt.match(/data-chapter-id="([^"]+)"/) || [])[1] || "01";
  const title = (prompt.match(/<h1>([^<]+)<\/h1>/) || [])[1] || "사주 인생의 책";
  const sections = [...prompt.matchAll(/<section><h2>([^<]+)<\/h2><p>/g)].map((match) => match[1]);
  const tones = ["기본 구조", "생활 리듬", "관계 감각", "선택 기준", "회복 방향", "실행 전략"];
  const body = sections.map((section, index) => {
    const tone = tones[index % tones.length];
    const p1 = `${section}에서는 ${tone}와 사주 원국의 중심 기운이 맞물리는 방식을 섬세하게 살피며 ${title} 안에서 이 대목이 어떤 선택의 기준으로 드러나는지 이어서 풀이합니다 ${section}의 흐름은 타고난 성향을 단정하지 않고 반복해서 나타나는 마음의 결을 비추며 현실에서 붙잡을 수 있는 기준을 선명하게 세워 줍니다 ${index + 1}번째 장면은 생활의 속도와 관계의 온도를 함께 조율하라는 고유한 신호로 읽힙니다`;
    const p2 = `${section}의 ${tone}을 살릴 때는 이미 드러난 기운을 안정적으로 쓰는 태도가 중요하며 이 부분은 다른 섹션과 달리 ${section}만의 선택 감각을 중심에 둡니다 ${section}에서 강하게 흐르는 기운은 실행력으로 살리고 부족하게 느껴지는 부분은 사람과 습관의 보완으로 채우면 좋습니다 ${section}의 조언은 다음 계절로 넘어갈 때 흔들림을 줄이고 오늘의 선택이 오래 남는 방향으로 이어지게 합니다`;
    return `<section><h2>${section}</h2><p>${p1}</p><p>${p2}</p></section>`;
  }).join("");
  return `<article data-chapter-id="${id}"><h1>${title}</h1>${body}</article>`;
}

const env = {
  AI: {
    async run(model, payload) {
      const prompt = payload.messages?.find((message) => message.role === "user")?.content || "";
      return { response: makeMockChapterHtml(prompt) };
    },
  },
};

const runId = Date.now().toString(36);
const generated = await generateLifeBookPremiumPdfV2({
  userId: "507f1f77bcf86cd799439011",
  reportId: `saju-lifebook-verify-${runId}`,
  sessionId: `life-book:verify:${runId}`,
  requestUrl: "https://example.com/api/premium/saju-lifebook/prepare",
  env,
  input: {
    name: "테스트",
    gender: "female",
    birthDate: "1990-01-02",
    birthTime: "08:30",
    birthTimeKnown: true,
    targetYear: 2026,
    localSajuJson: {
      pillars: { year: "gyeongo", month: "jeongchuk", day: "gabin", hour: "mujin" },
      elementBalance: { wood: 2, fire: 3, earth: 2, metal: 1, water: 1 },
      tenGods: { resource: 2, wealth: 1, officer: 1, output: 2 },
      daewoon: { current: { ganji: "gapsul", summary: "turning flow" } },
      yearly: { ganji: "byeongo" },
    },
    analysisSignals: { usefulGod: "water", targetYear: 2026, verificationRunId: runId },
  },
});

const html = String(generated.pdfReady?.html || "");
assert.equal(generated.ok, true, "life book LLM PDF job must complete");
assert.equal(generated.status, "completed", "status must be completed");
assert.equal(generated.generationMode, "llm-only", "generation mode must be llm-only");
assert.equal(generated.manuscriptSource, "life-book-llm-v1", "manuscript source must be life-book-llm-v1");
assert.equal(generated.writingPipeline, "saju-calculation-to-llm-authored-pdf", "writing pipeline must match public contract");
assert.equal(generated.pdfReady?.generationMode, "llm-only", "pdfReady generation mode must be llm-only");
assert.equal(generated.pdfReady?.manuscriptSource, "life-book-llm-v1", "pdfReady manuscript source must match");
assert.equal(generated.pdfReady?.writingPipeline, "saju-calculation-to-llm-authored-pdf", "pdfReady writing pipeline must match");
assert.equal(generated.llmAssembly?.externalGeneration, true, "LLM assembly must be externally generated");
assert.equal(generated.llmAssembly?.fallbackUsed, false, "fallback must not be used");
assert.equal(generated.llmAssembly?.chapterCount, lifeBookPremiumChapterPlanV1.chapters.length, "LLM assembly chapter count must match plan");
assert.equal(generated.llmAssembly?.expectedChapterCount, lifeBookPremiumChapterPlanV1.chapters.length, "LLM assembly expected count must match plan");
assert.ok(generated.downloadUrl, "downloadUrl must exist");
assert.ok(generated.htmlUrl, "htmlUrl must exist");
assert.ok(html, "pdfReady.html must exist");

assert.equal(generated.chapters.length, lifeBookPremiumChapterPlanV1.chapters.length, "all 13 chapters must be generated");
generated.chapters.forEach((chapter, index) => {
  const expected = lifeBookPremiumChapterPlanV1.chapters[index];
  assert.equal(chapter.id, expected.id, `chapter ${index + 1} id must match plan`);
  assert.equal(chapter.title, expected.title, `chapter ${index + 1} title must match plan`);
  assert.equal(chapter.sectionCount, expected.sections.length, `chapter ${index + 1} section count must match plan`);
  assert.deepEqual(chapter.sections.map((section) => section.title), expected.sections, `chapter ${index + 1} sections must match plan`);
});

assert.match(html, /class="[^"]*visual-summary/, "visual summary section must render");
assert.match(html, /class="lb-table"/, "tables must render");
assert.match(html, /class="[^"]*element-bars/, "element bar graph must render");
assert.match(html, /class="[^"]*cycle-timeline/, "cycle timeline must render");
assert.match(html, /class="[^"]*chapter-flow/, "chapter visual flow must render");
assert.match(html, /class="[^"]*chapter-flow-bars/, "chapter visual bars must render");
assert.equal((html.match(/data-chapter-flow=/g) || []).length, lifeBookPremiumChapterPlanV1.chapters.length, "each chapter must render one visual flow");
for (const label of ["사주 네 기둥", "오행 균형 그래프", "십성 분포", "운의 흐름"]) {
  assert.ok(html.includes(label), `visual label must render: ${label}`);
}
for (const chapter of lifeBookPremiumChapterPlanV1.chapters) {
  assert.ok(html.includes(`data-chapter-flow="${chapter.id}"`), `chapter visual flow must render: ${chapter.id}`);
}
assert.ok(html.includes("장별 흐름표"), "chapter flow table label must render");
assert.doesNotMatch(html, /local-assembled|localAssembly|undefined|null|NaN|\[object Object\]/i, "final HTML must not leak local/debug/empty values");
assert.doesNotMatch(html, /\uFFFD|\?{3,}/, "final HTML must not contain replacement or mojibake placeholders");

const originalFetch = globalThis.fetch;
let geminiFetchCount = 0;
globalThis.fetch = async (url, init = {}) => {
  geminiFetchCount += 1;
  const body = JSON.parse(String(init.body || "{}"));
  const prompt = body.contents?.[0]?.parts?.[0]?.text || "";
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: makeMockChapterHtml(prompt) }] } }],
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
try {
  const fallbackGenerated = await generateLifeBookPremiumPdfV2({
    userId: "507f1f77bcf86cd799439011",
    reportId: `saju-lifebook-gemini-alt-${runId}`,
    sessionId: `life-book:gemini-alt:${runId}`,
    requestUrl: "https://example.com/api/premium/saju-lifebook/prepare",
    env: {
      LIFE_BOOK_PREMIUM_LLM_REPAIR_LIMIT: 0,
      LIFE_BOOK_PREMIUM_LLM_PROVIDERS: "workers-ai,gemini",
      LIFE_BOOK_PREMIUM_GEMINI_MODEL: "gemini-test",
      GEMINI_API_KEY: "AIzaTestGeminiFallbackKey000000000000",
      GEMINI_USE_SDK: "false",
      PREMIUM_GEMINI_USE_SDK: "false",
      AI: {
        async run() {
          throw new Error("workers_ai_forced_failure");
        },
      },
    },
    input: {
      name: "테스트",
      gender: "female",
      birthDate: "1990-01-02",
      birthTime: "08:30",
      birthTimeKnown: true,
      targetYear: 2026,
      localSajuJson: {
        pillars: { year: "gyeongo", month: "jeongchuk", day: "gabin", hour: "mujin" },
        elementBalance: { wood: 2, fire: 3, earth: 2, metal: 1, water: 1 },
        tenGods: { resource: 2, wealth: 1, officer: 1, output: 2 },
      },
    },
  });
  assert.equal(fallbackGenerated.ok, true, "Gemini fallback PDF job must complete");
  assert.equal(fallbackGenerated.provider, "gemini", "provider must fall back to Gemini");
  assert.equal(fallbackGenerated.chapters.length, lifeBookPremiumChapterPlanV1.chapters.length, "Gemini fallback must generate all chapters");
  assert.ok(geminiFetchCount >= lifeBookPremiumChapterPlanV1.chapters.length, "Gemini fallback must call Gemini for each chapter");
} finally {
  globalThis.fetch = originalFetch;
}

const firstPlan = lifeBookPremiumChapterPlanV1.chapters[0];
const firstSection = firstPlan.sections[0];
function makeValidatorArticle(chapter, headings = chapter.sections) {
  const sections = headings.map((heading, index) => {
    const body = `${heading} validator section ${index + 1} keeps the chapter plan exact with a long enough authored passage that names the heading, follows the intended reading order, and prevents hidden extra sections from slipping into the final manuscript. The paragraph stays distinct for this heading so repetition checks continue to exercise meaningful content.`;
    return `<section><h2>${heading}</h2><p>${body}</p></section>`;
  }).join("");
  return `<article data-chapter-id="${chapter.id}"><h1>${chapter.title}</h1>${sections}</article>`;
}
const invalidCases = {
  rawJson: "{\"chapters\":[]}",
  codeFence: "```html\n<article data-chapter-id=\"01\"></article>\n```",
  undefinedLeak: `<article data-chapter-id="${firstPlan.id}"><h1>${firstPlan.title}</h1><section><h2>${firstSection}</h2><p>undefined</p></section></article>`,
  internalKey: `<article data-chapter-id="${firstPlan.id}"><h1>${firstPlan.title}</h1><section><h2>${firstSection}</h2><p>payload debug prompt</p></section></article>`,
  mojibakePlaceholder: `<article data-chapter-id="${firstPlan.id}"><h1>${firstPlan.title}</h1><section><h2>${firstSection}</h2><p>??? ??? ???</p></section></article>`,
  extraSection: makeValidatorArticle(firstPlan, [...firstPlan.sections, "Unexpected section"]),
  wrongSectionOrder: makeValidatorArticle(firstPlan, [firstPlan.sections[1], firstPlan.sections[0], ...firstPlan.sections.slice(2)]),
};
for (const [name, value] of Object.entries(invalidCases)) {
  assert.equal(validateLifeBookPremiumChapterHtml(value, lifeBookPremiumChapterPlanV1.chapters[0]).ok, false, `${name} must be rejected`);
}
assert.ok(
  validateLifeBookPremiumChapterHtml(invalidCases.extraSection, firstPlan).issues.some((issue) => issue.startsWith("section.unexpected.") || issue.startsWith("section.count.")),
  "extra sections must be rejected by exact chapter plan validation",
);
assert.ok(
  validateLifeBookPremiumChapterHtml(invalidCases.wrongSectionOrder, firstPlan).issues.some((issue) => issue.startsWith("section.order.")),
  "section order must be rejected by exact chapter plan validation",
);

const missingProviderGenerated = await generateLifeBookPremiumPdfV2({
  userId: "507f1f77bcf86cd799439011",
  reportId: `saju-lifebook-no-provider-${runId}`,
  sessionId: `life-book:no-provider:${runId}`,
  requestUrl: "https://example.com/api/premium/saju-lifebook/prepare",
  env: {
    LIFE_BOOK_PREMIUM_LLM_REPAIR_LIMIT: 0,
    LIFE_BOOK_PREMIUM_LLM_PROVIDERS: "workers-ai",
    LIFE_BOOK_PREMIUM_DISABLE_GEMINI_FALLBACK: "true",
    LIFE_BOOK_PREMIUM_WORKERS_AI_MODEL: `workers-ai-missing-provider-${runId}`,
  },
  input: {
    name: "No Provider",
    gender: "female",
    birthDate: "1991-03-04",
    birthTime: "06:10",
    birthTimeKnown: true,
    targetYear: 2027,
    localSajuJson: {
      pillars: { year: "sinmi", month: "gyeongin", day: "eulsa", hour: "gichuk" },
      elementBalance: { wood: 1, fire: 2, earth: 3, metal: 1, water: 1 },
      tenGods: { resource: 1, wealth: 2, officer: 1, output: 1 },
    },
  },
});
assert.equal(missingProviderGenerated.ok, false, "missing provider must fail instead of assembling locally");
assert.equal(missingProviderGenerated.code, "LIFE_BOOK_CHAPTER_GENERATION_FAILED", "missing provider must fail at LLM chapter generation");
assert.equal(missingProviderGenerated.status, "failed", "missing provider result must be failed");
assert.equal(missingProviderGenerated.details?.attempts?.[0]?.errorCode, "workers_ai_not_configured", "missing provider failure must expose provider configuration issue");
assert.doesNotMatch(JSON.stringify(missingProviderGenerated), /local-assembled|localAssembly|LIFEBOOK_LOCAL_ASSEMBLY_REMOVED/i, "missing provider failure must not leak local assembly");

const routeUserId = "507f1f77bcf86cd799439011";
const routeReportId = `saju-lifebook-route-${runId}`;
const routeSessionId = `life-book:route:${runId}`;
const routeEnv = {
  ...env,
  LIFE_BOOK_PREMIUM_TEST_BYPASS_DB: "true",
  JWT_ACCESS_SECRET: "lifebook-test-secret",
  PREMIUM_ACCESS_TOKEN_SECRET: "lifebook-premium-test-secret",
};
const authToken = await signJwt({
  userId: routeUserId,
  email: "lifebook-route@example.test",
  role: "user",
  name: "테스트",
}, routeEnv.JWT_ACCESS_SECRET, {
  expiresIn: "30m",
  issuer: "code-destiny-api",
  audience: "code-destiny-web",
});
const premiumAccessToken = await createPremiumAccessToken(routeEnv, {
  userId: routeUserId,
  reportType: "lifeBook",
  featureKey: "saju_life_book_pdf",
  transactionId: `lifebook-route-token-${runId}`,
  purchaseId: `lifebook-route-purchase-${runId}`,
  reportId: routeReportId,
  sessionId: routeSessionId,
  chargedCoins: 500,
});
const routeResponse = await handleSajuLifebookRoutes(new Request("https://example.com/api/premium/saju-lifebook/prepare", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "authorization": `Bearer ${authToken}`,
    "x-premium-access-token": premiumAccessToken,
    "x-lifebook-sync": "1",
  },
  body: JSON.stringify({
    name: "테스트",
    gender: "female",
    birthDate: "1990-01-02",
    birthTime: "08:30",
    birthTimeKnown: true,
    calendarType: "solar",
    targetYear: 2026,
    reportId: routeReportId,
    sessionId: routeSessionId,
    featureKey: "saju_life_book_pdf",
    generationMode: "llm-only",
    authoringMode: "llm-only",
  }),
}), routeEnv, null);
const routeBody = await routeResponse.json();
assert.equal(routeResponse.status, 200, "prepare route success smoke must return 200");
assert.equal(routeBody.ok, true, "prepare route success smoke must be ok");
assert.equal(routeBody.status, "completed", "prepare route success smoke must complete");
assert.equal(routeBody.generationMode, "llm-only", "prepare route must stay llm-only");
assert.equal(routeBody.manuscriptSource, "life-book-llm-v1", "prepare route manuscript source must match");
assert.equal(routeBody.writingPipeline, "saju-calculation-to-llm-authored-pdf", "prepare route writing pipeline must match");
assert.equal(routeBody.chapters?.length, lifeBookPremiumChapterPlanV1.chapters.length, "prepare route must return all 13 chapters");
assert.ok(routeBody.downloadUrl, "prepare route must return downloadUrl");
assert.ok(routeBody.htmlUrl, "prepare route must return htmlUrl");
assert.ok(routeBody.pdfReady?.html, "prepare route must return pdfReady.html");
assert.equal(routeBody.llmAssembly?.enabled, true, "prepare route LLM assembly must be enabled");
assert.equal(routeBody.llmAssembly?.externalGeneration, true, "prepare route LLM assembly must be external");
assert.equal(routeBody.llmAssembly?.fallbackUsed, false, "prepare route must not use fallback");
assert.equal(routeBody.llmAssembly?.chapterCount, lifeBookPremiumChapterPlanV1.chapters.length, "prepare route LLM assembly count must match");
assert.doesNotMatch(JSON.stringify(routeBody), /local-assembled|localAssembly|LIFEBOOK_LOCAL_ASSEMBLY_REMOVED/i, "prepare route response must not leak local assembly");

const unauthResponse = await handleSajuLifebookRoutes(new Request("https://example.com/api/premium/saju-lifebook/prepare", {
  method: "POST",
  headers: { "content-type": "application/json", "x-lifebook-sync": "1" },
  body: JSON.stringify({ birthDate: "1990-01-02", birthTime: "08:30", gender: "female" }),
}), {}, null);
const unauthBody = await unauthResponse.json();
assert.equal(unauthResponse.status, 401, "prepare route must require auth before generation");
assert.notEqual(unauthResponse.status, 410, "prepare route must not return removed-local-assembly status");
assert.notEqual(unauthBody.code, "LIFEBOOK_LOCAL_ASSEMBLY_REMOVED", "legacy local assembly removal code must not surface");

console.log("[verify-lifebook-llm-only-flow] PASS");
