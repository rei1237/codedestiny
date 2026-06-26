import assert from "node:assert/strict";

const unique = Date.now();
const { generateLifeBookPremiumPdfV2 } = await import(`../worker/lib/pdf-v2/life-book/create-life-book-premium-pdf-job.js?verify=${unique}`);
const { lifeBookPremiumChapterPlanV1 } = await import(`../worker/lib/pdf-v2/life-book/life-book-premium.chapter-plan.js?verify=${unique}`);
const { validateLifeBookPremiumChapterHtml } = await import(`../worker/lib/pdf-v2/life-book/life-book-premium.validator.js?verify=${unique}`);
const { handleSajuLifebookRoutes } = await import(`../worker/routes/saju-lifebook.js?verify=${unique}`);
const { signJwt } = await import(`../worker/lib/jwt.js?verify=${unique}`);
const { createPremiumAccessToken } = await import(`../worker/lib/premium-access-token.js?verify=${unique}`);

const originalFetch = globalThis.fetch;
let geminiFetchCount = 0;
let forceInvalidFirstResponse = false;

function readPrompt(init = {}) {
  const body = JSON.parse(String(init.body || "{}"));
  return body.contents?.[0]?.parts?.[0]?.text || "";
}

function makeChapterHtml(prompt = "") {
  const id = (prompt.match(/chapterId:\s*([^\n]+)/) || [])[1]?.trim() || "life-01";
  const title = (prompt.match(/chapterTitle:\s*([^\n]+)/) || [])[1]?.trim() || "인생의 큰 지도";
  const summary = [
    `${title}에서는 사주 원국과 일간, 월령의 기운이 삶의 방향을 어떻게 비추는지 차분히 짚습니다.`,
    "오행과 십성의 흐름은 타고난 감각과 반복되는 선택 습관을 함께 드러냅니다.",
    "대운과 세운은 지금 집중해야 할 현실의 과제를 보여 주며, 중요한 선택은 현실 자료와 전문가 상담, 본인의 판단을 함께 고려해야 합니다.",
  ].join(" ");
  const body = [
    `이 장의 핵심은 사주 팔자 안에서 일간이 어떤 중심을 잡고 월령이 그 힘을 어떻게 밀어 주는지 살피는 데 있습니다. 원국의 오행 균형과 십성 배치는 성향을 단정하기보다 삶에서 반복되는 반응의 결을 드러냅니다. 그래서 ${title}의 흐름은 타고난 기질을 현실의 선택 기준으로 번역하는 과정으로 읽어야 합니다. 특히 강한 기운은 자신감으로 쓰일 때 길이 열리고, 약한 기운은 생활 습관과 관계의 조율 속에서 천천히 보완될 수 있습니다.`,
    `지장간과 합충의 움직임은 겉으로 보이는 사건보다 마음이 먼저 흔들리는 지점을 비춥니다. 사주 구조에서 강한 기운은 장점으로 열리지만, 지나치면 고집이나 지연으로 나타날 수 있습니다. 이 흐름을 이해하면 같은 상황에서도 서두를 때와 기다릴 때를 구분하기 쉬워집니다. 사용자는 운의 압박을 두려워하기보다 자신의 반응을 관찰하며 선택의 속도를 다듬을수록 안정감을 얻습니다.`,
    `장점은 분명합니다. 오행 중 살아 있는 기운과 십성의 작용이 잘 맞물릴 때 사용자는 자신의 역할을 빠르게 감지하고 필요한 책임을 떠안는 힘이 살아납니다. 대운이 받쳐 주는 시기에는 배움, 일, 관계의 선택이 서로 이어지며 성취의 폭을 넓힐 수 있습니다. 이때 중요한 것은 한 번에 모든 것을 바꾸려 하기보다, 잘 맞는 환경을 알아보고 꾸준히 밀고 가는 태도입니다.`,
    `주의할 점도 함께 보입니다. 세운이 원국의 약한 부분을 건드릴 때는 감정적 판단, 관계의 거리 조절, 돈과 시간의 사용에서 반복되는 숙제가 떠오를 수 있습니다. 이때 사주를 불안의 근거로 삼기보다, 내 리듬을 조절하는 지도처럼 받아들이는 태도가 중요합니다. 흔들림이 큰 시기일수록 말과 계약, 금전 결정은 한 번 더 확인하고 기록으로 남기는 편이 좋습니다.`,
    `실전 조언은 단순합니다. 지금의 선택이 일간의 중심을 살리는지, 월령과 대운의 흐름에 맞는 속도인지, 현실 자료와 주변 전문가의 조언으로 확인할 수 있는지를 함께 보세요. 그렇게 하면 운은 막연한 예언이 아니라 오늘의 행동을 정돈하는 기준으로 열립니다. 작은 루틴을 정하고, 몸의 리듬과 사람과의 약속을 안정적으로 지키는 일이 결국 좋은 운을 받아들이는 그릇이 됩니다.`,
  ];
  return `<section class="life-book-chapter" data-chapter-id="${id}">
  <h2>${title}</h2>
  <div class="chapter-summary"><p>${summary}</p></div>
  <div class="chapter-body">${body.map((paragraph) => `<p>${paragraph}</p>`).join("")}</div>
  <div class="chapter-advice">
    <h3>인생 처방</h3>
    <ul>
      <li>사주 원국의 강한 기운을 먼저 쓰고, 부족한 오행은 생활 리듬으로 보완하세요.</li>
      <li>대운이 밀어 주는 일은 자료를 모아 작게 시작하고, 세운이 흔드는 일은 속도를 낮추세요.</li>
      <li>중요한 결정은 감정만으로 정하지 말고 현실 정보와 전문가 상담, 본인의 판단을 함께 놓고 보세요.</li>
    </ul>
  </div>
</section>`;
}

function installGeminiMockFetch() {
  let invalidUsed = false;
  globalThis.fetch = async (_url, init = {}) => {
    geminiFetchCount += 1;
    const prompt = readPrompt(init);
    const text = forceInvalidFirstResponse && !invalidUsed
      ? (() => {
        invalidUsed = true;
        return `<section class="life-book-chapter" data-chapter-id="life-01"><h2>짧은 응답</h2></section>`;
      })()
      : makeChapterHtml(prompt);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text }] } }],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

installGeminiMockFetch();

const env = {
  LIFE_BOOK_PREMIUM_GEMINI_MODEL: "gemini-test",
  GEMINIF_API_KEY: "AIzaTestGeminiPrimaryKey000000000000",
  GEMINI_USE_SDK: "false",
  PREMIUM_GEMINI_USE_SDK: "false",
};

function makeInput(extra = {}) {
  return {
    name: "테스트",
    gender: "female",
    birthDate: "1990-01-02",
    birthTime: "08:30",
    birthTimeKnown: true,
    calendarType: "solar",
    targetYear: 2026,
    localSajuJson: {
      pillars: { year: "경오", month: "정축", day: "갑인", hour: "무진" },
      elementBalance: { wood: 2, fire: 3, earth: 2, metal: 1, water: 1 },
      tenGods: { 인성: 2, 재성: 1, 관성: 1, 식상: 2 },
      hiddenStems: { month: ["계", "신", "기"], day: ["갑", "병", "무"] },
      twelveGrowthStages: ["장생", "관대"],
      combinations: { 합: ["갑기합"] },
      clashes: { 충: ["자오충"] },
      usefulGod: { yongsin: "수", support: "목" },
      daewoon: { current: { ganji: "갑술", summary: "전환의 운" } },
      yearly: { ganji: "병오", summary: "표현과 실행의 해" },
    },
    analysisSignals: { usefulGod: "수", targetYear: 2026 },
    ...extra,
  };
}

const runId = Date.now().toString(36);
const generated = await generateLifeBookPremiumPdfV2({
  userId: "507f1f77bcf86cd799439011",
  reportId: `saju-lifebook-verify-${runId}`,
  sessionId: `life-book:verify:${runId}`,
  requestUrl: "https://example.com/api/premium/saju-lifebook/prepare",
  env,
  input: makeInput(),
});

const html = String(generated.pdfReady?.html || "");
if (!generated.ok) {
  console.error(JSON.stringify({
    code: generated.code,
    error: generated.error,
    details: generated.details,
  }, null, 2));
}
assert.equal(generated.ok, true, "life book LLM PDF job must complete");
assert.equal(generated.status, "completed", "status must be completed");
assert.equal(generated.generationMode, "llm-only", "generation mode must be llm-only");
assert.equal(generated.manuscriptSource, "life-book-llm-v1", "manuscript source must be life-book-llm-v1");
assert.equal(generated.writingPipeline, "saju-calculation-to-llm-authored-pdf", "writing pipeline must match public contract");
assert.equal(generated.chapterCount, 13, "default plan must generate 13 chapters");
assert.equal(generated.expectedChapterCount, 13, "default plan expected count must be 13");
assert.equal(generated.llmAssembly?.fallbackUsed, false, "fallback must not be used");
assert.equal(generated.chapters.length, lifeBookPremiumChapterPlanV1.chapters.length, "all default chapters must be generated");
assert.equal(generated.chapters[0].id, "life-01", "default chapter ids must use life-01 format");
assert.ok(html.includes("사주 팔자 핵심 표"), "saju pillar table must render");
assert.ok(html.includes("오행 균형 요약"), "five elements summary must render");
assert.ok(html.includes("십성 요약"), "ten gods summary must render");
assert.ok(html.includes("대운·세운 요약"), "luck summary must render");
assert.ok(html.includes("본 리포트는 사주 명리학을 바탕으로 한 자기이해와 엔터테인먼트 목적의 콘텐츠입니다."), "disclaimer must render");
assert.doesNotMatch(html, /mock|fallback|placeholder|Lorem ipsum|```|rawJson|prompt|undefined|null|NaN|\[object Object\]/i, "final HTML must not leak forbidden text");

for (const [index, chapter] of generated.chapters.entries()) {
  const expected = lifeBookPremiumChapterPlanV1.chapters[index];
  assert.equal(chapter.id, expected.id, `chapter ${index + 1} id must match plan`);
  assert.equal(chapter.title, expected.title, `chapter ${index + 1} title must match plan`);
  assert.equal(validateLifeBookPremiumChapterHtml(chapter.html, expected).ok, true, `chapter ${index + 1} html must validate`);
}

const customGenerated = await generateLifeBookPremiumPdfV2({
  userId: "507f1f77bcf86cd799439011",
  reportId: `saju-lifebook-custom-${runId}`,
  sessionId: `life-book:custom:${runId}`,
  requestUrl: "https://example.com/api/premium/saju-lifebook/prepare",
  env,
  input: makeInput({
    lifeBookChapterConfig: {
      version: "custom-two-chapters",
      chapters: [
        { id: "life-custom-01", category: "총론", title: "맞춤 큰 흐름", purpose: "맞춤 총론을 해석한다." },
        { id: "life-custom-02", category: "실천", title: "맞춤 실천 처방", purpose: "맞춤 실천 방향을 해석한다." },
      ],
    },
  }),
});
assert.equal(customGenerated.ok, true, "custom chapter config must generate");
assert.equal(customGenerated.chapterCount, 2, "custom chapter config must be preferred");
assert.equal(customGenerated.chapters[0].id, "life-custom-01", "custom chapter id must be preserved");

forceInvalidFirstResponse = true;
const repairedGenerated = await generateLifeBookPremiumPdfV2({
  userId: "507f1f77bcf86cd799439011",
  reportId: `saju-lifebook-repair-${runId}`,
  sessionId: `life-book:repair:${runId}`,
  requestUrl: "https://example.com/api/premium/saju-lifebook/prepare",
  env,
  input: makeInput({ question: `repair-${runId}` }),
});
forceInvalidFirstResponse = false;
assert.equal(repairedGenerated.ok, true, "invalid first LLM response must be repaired");

const missingProviderGenerated = await generateLifeBookPremiumPdfV2({
  userId: "507f1f77bcf86cd799439011",
  reportId: `saju-lifebook-no-provider-${runId}`,
  sessionId: `life-book:no-provider:${runId}`,
  requestUrl: "https://example.com/api/premium/saju-lifebook/prepare",
  env: {
    LIFE_BOOK_LLM_REPAIR_LIMIT: 0,
    LIFE_BOOK_PREMIUM_LLM_PROVIDERS: "workers-ai",
    LIFE_BOOK_PREMIUM_DISABLE_GEMINI_FALLBACK: "true",
    LIFE_BOOK_PREMIUM_WORKERS_AI_MODEL: `workers-ai-missing-provider-${runId}`,
  },
  input: makeInput({ question: `missing-provider-${runId}` }),
});
assert.equal(missingProviderGenerated.ok, false, "missing provider must fail");
assert.equal(missingProviderGenerated.status, "failed", "missing provider result must be failed");
assert.equal(missingProviderGenerated.code, "LIFE_BOOK_CHAPTER_GENERATION_FAILED", "missing provider must fail at LLM chapter generation");
assert.doesNotMatch(JSON.stringify(missingProviderGenerated), /local-assembled|localAssembly|mock|placeholder/i, "missing provider failure must not use local assembly");

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
    authorization: `Bearer ${authToken}`,
    "x-premium-access-token": premiumAccessToken,
    "x-lifebook-sync": "1",
  },
  body: JSON.stringify({
    ...makeInput(),
    reportId: routeReportId,
    sessionId: routeSessionId,
    featureKey: "saju_life_book_pdf",
  }),
}), routeEnv, null);
const routeBody = await routeResponse.json();
assert.equal(routeResponse.status, 200, "prepare route success smoke must return 200");
assert.equal(routeBody.ok, true, "prepare route success smoke must be ok");
assert.equal(routeBody.status, "completed", "prepare route success smoke must complete");
assert.equal(routeBody.chapters?.length, 13, "prepare route must return all 13 chapters");
assert.equal(routeBody.llmAssembly?.externalGeneration, true, "prepare route LLM assembly must be external");
assert.equal(routeBody.llmAssembly?.fallbackUsed, false, "prepare route must not use fallback");
assert.ok(routeBody.downloadUrl, "prepare route must return downloadUrl");
assert.ok(routeBody.pdfReady?.html, "prepare route must return pdfReady.html");
assert.doesNotMatch(JSON.stringify(routeBody), /local-assembled|localAssembly|mock|placeholder/i, "prepare route response must not leak local assembly");

const unauthResponse = await handleSajuLifebookRoutes(new Request("https://example.com/api/premium/saju-lifebook/prepare", {
  method: "POST",
  headers: { "content-type": "application/json", "x-lifebook-sync": "1" },
  body: JSON.stringify({ birthDate: "1990-01-02", birthTime: "08:30", gender: "female" }),
}), {}, null);
const unauthBody = await unauthResponse.json();
assert.equal(unauthResponse.status, 401, "prepare route must require auth before generation");
assert.notEqual(unauthBody.code, "LIFEBOOK_LOCAL_ASSEMBLY_REMOVED", "legacy local assembly removal code must not surface");

globalThis.fetch = originalFetch;
console.log("[verify-lifebook-llm-only-flow] PASS");
