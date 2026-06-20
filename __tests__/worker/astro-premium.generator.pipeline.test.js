/**
 * @jest-environment node
 */

const { execFileSync } = require("child_process");

function runEsm(code) {
  const output = execFileSync(process.execPath, ["--input-type=module", "-"], {
    cwd: process.cwd(),
    input: code,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  const jsonLine = output.trim().split(/\r?\n/).reverse().find((line) => line.trim().startsWith("{"));
  return JSON.parse(jsonLine);
}

function makeLocalAstroChartJson() {
  return {
    birthInput: {
      name: "테스트",
      gender: "female",
      birthDate: "1991-02-20",
      birthTime: "07:00",
      timezone: "Asia/Seoul",
      birthPlace: "서울",
      latitude: 37.5665,
      longitude: 126.978,
    },
    calculationMode: "swiss-wasm-local",
    chartSource: "swiss-wasm-local",
    engineQuality: "swiss",
    houseSystem: "Placidus",
    chart: {
      zodiacType: "tropical",
      houseSystem: "Placidus",
      sunSign: "물고기자리",
      moonSign: "천칭자리",
      ascendantSign: "천칭자리",
      midheavenSign: "게자리",
      elementBalance: { fire: 2, earth: 1, air: 3, water: 4 },
      modalityBalance: { cardinal: 4, fixed: 2, mutable: 4 },
      planets: [
        { name: "Sun", sign: "물고기자리", house: 5, degree: 1.2 },
        { name: "Moon", sign: "천칭자리", house: 1, degree: 12.3 },
        { name: "Mercury", sign: "물병자리", house: 4, degree: 22.1 },
        { name: "Venus", sign: "양자리", house: 7, degree: 4.4 },
        { name: "Mars", sign: "쌍둥이자리", house: 9, degree: 18.2 },
        { name: "Jupiter", sign: "사자자리", house: 11, degree: 7.8 },
        { name: "Saturn", sign: "염소자리", house: 4, degree: 28.5 },
      ],
      houses: Array.from({ length: 12 }, (_, index) => ({
        house: index + 1,
        sign: ["천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리", "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리"][index],
        cuspDegree: `${index * 30}도`,
      })),
      aspects: [
        { planetA: "Sun", planetB: "Moon", type: "trine", orb: 2.1 },
        { planetA: "Venus", planetB: "Mars", type: "opposition", orb: 1.4 },
      ],
    },
    timingInsights: {
      calculated: true,
      source: "western-transit-swiss",
      baseDate: "2026-06-20",
      currentSummary: "목성의 흐름이 관계와 사회적 확장에 닿습니다.",
      ninetyDaySummary: "토성의 흐름이 생활 리듬을 정돈하게 합니다.",
      threeYearSummary: "장기적으로 책임과 확장이 함께 열립니다.",
      snapshots: [
        { label: "현재", outerPlanets: ["목성 게자리"], aspects: [{ text: "목성-태양 트라인" }] },
      ],
    },
  };
}

function fixtureLiteral() {
  return JSON.stringify(makeLocalAstroChartJson());
}

function mockArticleSource() {
  return String.raw`
function buildMockArticle(prompt) {
  const chapterId = (prompt.match(/<article data-chapter-id="([^"]+)"/) || [])[1] || "ch01";
  const title = (prompt.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || "점성술 챕터";
  const grounding = ((prompt.match(/필수 근거 용어: ([^\n]+)/) || [])[1] || "태양 / 달 / 상승궁")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");
  const outputFormat = prompt.slice(Math.max(0, prompt.lastIndexOf("[출력 형식]")));
  const sections = Array.from(outputFormat.matchAll(/<h2>([\s\S]*?)<\/h2>/g)).map((match) => match[1]);
  const body = sections.map((section, index) => {
    const marker = " [장" + chapterId.replace("ch", "") + "-" + (index + 1) + "]";
    const paragraphA = section + marker + "에서는 " + grounding + "의 근거와 함께 태양, 달, 상승궁, 하우스와 애스펙트가 만드는 흐름을 차분히 읽습니다. " + section + marker + "의 핵심은 계산된 차트에 있는 행성 배치와 현재 트랜짓을 현실의 감각으로 번역하는 데 있습니다. " + section + marker + "은 사용자가 반복해 선택하는 기준, 감정이 먼저 반응하는 방향, 관계 안에서 자연스럽게 취하는 태도를 하나씩 밝혀 줍니다.";
    const paragraphB = section + marker + "의 조언은 단정적인 예언이 아니라 자기이해를 돕는 안내입니다. " + section + marker + "은 제공된 점성술 계산 결과를 기준으로 확인되는 신호만 다루며, 부족한 정보는 신중하게 제한을 밝힙니다. " + section + marker + "의 흐름은 관계, 일, 돈, 생활 리듬에서 지금 조정할 수 있는 행동을 부드럽게 가리킵니다.";
    const paragraphC = section + marker + "을 현실에 적용할 때는 행성의 위치와 하우스의 무대가 겹치는 부분을 먼저 봅니다. " + section + marker + "은 당장 바꿀 수 있는 습관, 더 지켜봐야 할 변화, 타인과 대화로 풀어야 할 주제를 구분하게 합니다. " + section + marker + "의 마지막 조언은 오늘의 작은 선택을 차트의 큰 방향과 맞추는 데 있습니다.";
    return "<section><h2>" + section + "</h2><p>" + paragraphA + "</p><p>" + paragraphB + "</p><p>" + paragraphC + "</p></section>";
  }).join("");
  return "<article data-chapter-id=\"" + chapterId + "\"><h1>" + title + "</h1>" + body + "</article>";
}
`;
}

describe("Astrology premium LLM-only PDF pipeline", () => {
  test("chapter plan has the configured 15 chapters", () => {
    const result = runEsm(`
      import { astrologyPremiumChapterPlanV2, assertAstrologyPremiumChapterPlan } from "./worker/lib/pdf-v2/astrology/astrology-premium.chapter-plan.js";
      console.log(JSON.stringify({
        ok: assertAstrologyPremiumChapterPlan(astrologyPremiumChapterPlanV2),
        count: astrologyPremiumChapterPlanV2.chapters.length
      }));
    `);
    expect(result.ok).toBe(true);
    expect(result.count).toBe(15);
  });

  test("normalizer compacts astrology calculation input without unsafe values", () => {
    const result = runEsm(`
      import { normalizeAstrologyPremiumInput } from "./worker/lib/pdf-v2/astrology/astrology-premium.normalizer.js";
      const input = normalizeAstrologyPremiumInput({ progressions: [] }, ${fixtureLiteral()});
      console.log(JSON.stringify({
        planets: input.chart.planets.length,
        houses: input.chart.houses.length,
        aspects: input.chart.aspects.length,
        unsafe: /undefined|NaN|\\[object Object\\]/.test(JSON.stringify(input)),
        warnings: input.warnings
      }));
    `);
    expect(result.planets).toBeGreaterThanOrEqual(7);
    expect(result.houses).toBe(12);
    expect(result.aspects).toBe(2);
    expect(result.unsafe).toBe(false);
    expect(result.warnings).toContain("프로그레션 정보가 제공되지 않았습니다.");
  });

  test("validator rejects generic chapter copy without astrology grounding", () => {
    const result = runEsm(`
      import { validateAstrologyPremiumChapterHtml } from "./worker/lib/pdf-v2/astrology/astrology-premium.validator.js";
      import { astrologyPremiumChapterPlanV2 } from "./worker/lib/pdf-v2/astrology/astrology-premium.chapter-plan.js";
      const chapter = astrologyPremiumChapterPlanV2.chapters[0];
      const sections = chapter.sections.map((section) => "<section><h2>" + section + "</h2><p>이 문단은 충분히 길지만 구체적인 차트 근거 없이 좋은 선택과 마음의 균형만 반복해서 말합니다. 오늘의 태도와 관계의 방향을 부드럽게 살피라는 일반적인 안내를 이어 갑니다.</p><p>이 문단도 충분히 길지만 실제 행성이나 하우스 근거를 쓰지 않습니다. 그래서 프리미엄 리포트의 정확한 점성술 해석으로 보기 어렵습니다.</p></section>").join("");
      const html = "<article data-chapter-id=\\"" + chapter.id + "\\"><h1>" + chapter.title + "</h1>" + sections + "</article>";
      const validation = validateAstrologyPremiumChapterHtml(html, chapter);
      console.log(JSON.stringify({ ok: validation.ok, issues: validation.issues }));
    `);
    expect(result.ok).toBe(false);
    expect(result.issues).toContain("body.astrology_terms");
  });

  test("validator rejects a chapter that misses its required focus terms", () => {
    const result = runEsm(`
      import { validateAstrologyPremiumChapterHtml } from "./worker/lib/pdf-v2/astrology/astrology-premium.validator.js";
      import { astrologyPremiumChapterPlanV2 } from "./worker/lib/pdf-v2/astrology/astrology-premium.chapter-plan.js";
      const chapter = astrologyPremiumChapterPlanV2.chapters.find((item) => item.id === "ch09");
      const sections = chapter.sections.map((section, index) => {
        const marker = " [재정초점누락-" + (index + 1) + "]";
        return "<section><h2>" + section + "</h2><p>" + section + marker + "에서는 태양, 달, 상승궁, 애스펙트, 트랜짓의 일반 흐름을 충분히 길게 설명합니다. " + section + marker + "의 문장은 계산된 출생 차트를 바탕으로 자기이해를 돕는 상담처럼 이어지지만, 이 챕터가 요구하는 재정과 자원 중심의 핵심 근거는 의도적으로 제외합니다. " + section + marker + "은 독자가 현재의 선택을 차분히 바라보게 하는 일반적인 조언을 덧붙입니다.</p><p>" + section + marker + "의 두 번째 문단은 하우스라는 표현을 쓰지 않고 관계와 감정의 균형만 말합니다. " + section + marker + "은 충분한 길이를 채우되, 해당 챕터에 필요한 구체 근거가 없으면 통과하면 안 됩니다. " + section + marker + "은 프리미엄 리포트가 챕터마다 정확한 초점을 가져야 한다는 점을 검증합니다.</p></section>";
      }).join("");
      const html = "<article data-chapter-id=\\"" + chapter.id + "\\"><h1>" + chapter.title + "</h1>" + sections + "</article>";
      const validation = validateAstrologyPremiumChapterHtml(html, chapter);
      console.log(JSON.stringify({ ok: validation.ok, issues: validation.issues }));
    `);
    expect(result.ok).toBe(false);
    expect(result.issues).toContain("body.chapter_grounding_terms");
  });

  test("validator rejects unexpected foreign tokens inside chapter paragraphs", () => {
    const result = runEsm(`
      import { validateAstrologyPremiumChapterHtml } from "./worker/lib/pdf-v2/astrology/astrology-premium.validator.js";
      import { astrologyPremiumChapterPlanV2 } from "./worker/lib/pdf-v2/astrology/astrology-premium.chapter-plan.js";
      const chapter = astrologyPremiumChapterPlanV2.chapters[0];
      const sections = chapter.sections.map((section, index) => {
        const marker = " [외국어혼입-" + (index + 1) + "]";
        return "<section><h2>" + section + "</h2><p>" + section + marker + "에서는 출생 차트, 태양, 달, 상승궁, 하우스와 애스펙트의 흐름을 충분히 구체적으로 읽습니다. " + section + marker + "은 원소와 모달리티가 만드는 기질의 균형을 차분히 살피며, 현재 트랜짓까지 함께 비춥니다. 그런데 이 문장에는 excellent strategy라는 외국어 표현이 섞여 있습니다.</p><p>" + section + marker + "의 두 번째 문단은 점성술 계산 결과를 바탕으로 현실적인 자기이해를 돕습니다. " + section + marker + "은 제공된 근거만 사용하고 부족한 정보는 신중하게 제한을 밝히며, 문단 길이도 충분히 유지합니다. " + section + marker + "은 한국어 리포트 안에 불필요한 외국어가 남으면 실패해야 함을 확인합니다.</p></section>";
      }).join("");
      const html = "<article data-chapter-id=\\"" + chapter.id + "\\"><h1>" + chapter.title + "</h1>" + sections + "</article>";
      const validation = validateAstrologyPremiumChapterHtml(html, chapter);
      console.log(JSON.stringify({ ok: validation.ok, issues: validation.issues }));
    `);
    expect(result.ok).toBe(false);
    expect(result.issues).toContain("body.foreign_tokens");
  });

  test("LLM report generation validates every chapter and marks no fallback", () => {
    const result = runEsm(`
      import { generateAstrologyPremiumReport } from "./worker/lib/pdf-v2/astrology/generate-astrology-premium-report.js";
      ${mockArticleSource()}
      let callCount = 0;
      const env = { AI: { run: async (_model, request) => {
        callCount += 1;
        return { response: buildMockArticle(request.messages[1].content) };
      } } };
      const generated = await generateAstrologyPremiumReport({
        userId: "user-1",
        jobId: "astro-test-job",
        env,
        input: { localAstroChartJson: ${fixtureLiteral()} }
      });
      console.log(JSON.stringify({
        chapterCount: generated.chapterCount,
        chapters: generated.chapters.length,
        manuscriptSource: generated.manuscriptSource,
        llmEnabled: generated.llmAssembly.enabled,
        fallbackUsed: generated.llmAssembly.fallbackUsed,
        callCount
      }));
    `);
    expect(result.chapterCount).toBe(15);
    expect(result.chapters).toBe(15);
    expect(result.manuscriptSource).toBe("astrology-premium-llm-only");
    expect(result.llmEnabled).toBe(true);
    expect(result.fallbackUsed).toBe(false);
    expect(result.callCount).toBe(15);
  });

  test("LLM repair stores only validated chapter HTML and later reuses cache", () => {
    const result = runEsm(`
      import { generateAstrologyPremiumReport } from "./worker/lib/pdf-v2/astrology/generate-astrology-premium-report.js";
      ${mockArticleSource()}
      const attemptsByChapter = new Map();
      let callCount = 0;
      const env = { AI: { run: async (_model, request) => {
        callCount += 1;
        const prompt = request.messages[1].content;
        const chapterId = (prompt.match(/<article data-chapter-id="([^"]+)"/) || [])[1] || "unknown";
        const seen = attemptsByChapter.get(chapterId) || 0;
        attemptsByChapter.set(chapterId, seen + 1);
        if (seen === 0) {
          return { response: JSON.stringify({ chapterId, html: "invalid local fallback payload" }) };
        }
        return { response: buildMockArticle(prompt) };
      } } };
      const first = await generateAstrologyPremiumReport({
        userId: "user-1",
        jobId: "astro-repair-job",
        env,
        input: { localAstroChartJson: ${fixtureLiteral()} }
      });
      const afterFirst = callCount;
      const second = await generateAstrologyPremiumReport({
        userId: "user-1",
        jobId: "astro-cache-job",
        env,
        input: { localAstroChartJson: ${fixtureLiteral()} }
      });
      console.log(JSON.stringify({
        firstChapters: first.chapters.length,
        secondChapters: second.chapters.length,
        firstSources: first.chapters.map((chapter) => chapter.source),
        secondSources: second.chapters.map((chapter) => chapter.source),
        afterFirst,
        afterSecond: callCount,
        repairedChapters: Array.from(attemptsByChapter.values()).filter((count) => count === 2).length,
        fallbackUsed: first.llmAssembly.fallbackUsed || second.llmAssembly.fallbackUsed
      }));
    `);
    expect(result.firstChapters).toBe(15);
    expect(result.secondChapters).toBe(15);
    expect(result.firstSources.every((source) => source === "llm")).toBe(true);
    expect(result.secondSources.every((source) => source === "llm-cache")).toBe(true);
    expect(result.afterFirst).toBe(30);
    expect(result.afterSecond).toBe(30);
    expect(result.repairedChapters).toBe(15);
    expect(result.fallbackUsed).toBe(false);
  });

  test("LLM provider failure does not fall back to local manuscript assembly", () => {
    const result = runEsm(`
      import { generateAstrologyPremiumReport } from "./worker/lib/pdf-v2/astrology/generate-astrology-premium-report.js";
      let callCount = 0;
      const env = {
        ASTROLOGY_PREMIUM_LLM_PROVIDERS: "workers-ai",
        ASTROLOGY_PREMIUM_DISABLE_GEMINI_FALLBACK: "true",
        AI: { run: async () => {
          callCount += 1;
          return { response: "" };
        } }
      };
      try {
        await generateAstrologyPremiumReport({
          userId: "user-1",
          jobId: "astro-no-fallback-job",
          env,
          input: { localAstroChartJson: ${fixtureLiteral()} }
        });
        console.log(JSON.stringify({ ok: true, callCount }));
      } catch (error) {
        console.log(JSON.stringify({
          ok: false,
          code: error.code,
          message: error.message,
          failedChapterCount: error.failedChapters?.length || 0,
          callCount
        }));
      }
    `);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ASTROLOGY_PREMIUM_CHAPTER_GENERATION_FAILED");
    expect(result.failedChapterCount).toBe(1);
    expect(result.callCount).toBeGreaterThanOrEqual(1);
  });

  test("PDF job returns archive download URL and LLM-only completion evidence", () => {
    const result = runEsm(`
      import { generateAstrologyPremiumPdfV2 } from "./worker/lib/pdf-v2/astrology/create-astrology-premium-pdf-job.js";
      ${mockArticleSource()}
      const env = { AI: { run: async (_model, request) => ({ response: buildMockArticle(request.messages[1].content) }) } };
      const generated = await generateAstrologyPremiumPdfV2({
        userId: "user-1",
        env,
        input: { localAstroChartJson: ${fixtureLiteral()} },
        requestUrl: "https://example.test/api/astro/premium/prepare",
        reportId: "astro-report-test",
        sessionId: "astro-session-test",
        paymentContext: { reportId: "astro-report-test", sessionId: "astro-session-test" }
      });
      console.log(JSON.stringify({
        ok: generated.ok,
        status: generated.status,
        downloadUrl: generated.downloadUrl,
        llmOnly: generated.pdfReady.llmAssemblyOnly,
        completionOk: generated.pdfCompletionValidation.ok,
        hasPlanetTable: generated.pdfReady.html.includes("astro-planet-table"),
        hasHouseTable: generated.pdfReady.html.includes("astro-house-table"),
        hasAspectTable: generated.pdfReady.html.includes("astro-aspect-table"),
        hasBalanceBars: generated.pdfReady.html.includes("astro-balance-bars"),
        hasTransitTimeline: generated.pdfReady.html.includes("astro-transit-timeline")
      }));
    `);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.downloadUrl).toBe("https://example.test/api/premium/pdf-archive/astro-report-test?format=pdf");
    expect(result.llmOnly).toBe(true);
    expect(result.completionOk).toBe(true);
    expect(result.hasPlanetTable).toBe(true);
    expect(result.hasHouseTable).toBe(true);
    expect(result.hasAspectTable).toBe(true);
    expect(result.hasBalanceBars).toBe(true);
    expect(result.hasTransitTimeline).toBe(true);
  });
});
