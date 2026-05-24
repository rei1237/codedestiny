describe("Premium PDF v2 service", () => {
  let createPremiumPdfJob;

  beforeAll(async () => {
    ({ createPremiumPdfJob } = await import("../../worker/lib/pdf-v2/premium-pdf.service.js"));
  });

  function makeBaseDeps(overrides = {}) {
    const statuses = [];
    const payment = {
      hold: jest.fn(async () => ({ ok: true, holdId: "hold-1" })),
      capture: jest.fn(async () => ({ ok: true })),
      release: jest.fn(async () => ({ ok: true })),
    };

    const deps = {
      createJobId: () => "job-fixed-1",
      updateJobStatus: async (payload) => { statuses.push(payload); },
      resolvePricing: async () => ({ priceCoins: 390, featureKey: "premium_pdf_vedic" }),
      payment,
      resolveAdapter: async () => ({
        pdfType: "vedicPremium",
        async runEngine() { return { ok: true }; },
        async normalize() {
          return {
            chart: {
              lagna: "Aries",
              nakshatra: "Ashwini",
              atmakaraka: "Sun",
              planets: [{ name: "Sun", sign: "Aries", degree: 10, house: 1 }],
              houses: [{ house: 1, sign: "Aries" }],
            },
            dasha: { timeline: [{ mahadasha: "Sun" }] },
            analysis: { personality: "핵심 성향", career: "커리어", wealth: "재물", relationship: "관계", karmaTheme: "카르마", spiritualGrowth: "성장" },
          };
        },
        getChapterPlan() {
          return [{
            chapterId: "vedic-ch-01",
            title: "CH.01 테스트",
            requiredFields: ["chart.lagna", "chart.planets", "dasha.timeline"],
            minChars: 10,
            maxChars: 50,
            promptTemplateId: "vedic-ch-01",
            order: 1,
          }];
        },
        validate() { return { ok: true, missingByChapter: [] }; },
      }),
      resolvePromptTemplates: async () => ([{
        promptTemplateId: "vedic-ch-01",
        purpose: "테스트 목적",
        systemPrompt: "system",
      }]),
      generateChapter: jest.fn(async () => "이 문장은 제공된 데이터만 근거로 한 베다 해석입니다."),
      renderPdf: jest.fn(async () => ({ status: "completed" })),
      savePdf: jest.fn(async () => ({ fileUrl: "https://example.com/file.pdf" })),
      logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
      ...overrides,
    };

    return { deps, payment, statuses };
  }

  test("성공 시 hold/capture 수행, featureKey/price 유지", async () => {
    const { deps, payment, statuses } = makeBaseDeps();
    const result = await createPremiumPdfJob({
      userId: "user-1",
      featureKey: "premium_pdf_vedic",
      pdfType: "vedicPremium",
      input: { mode: "personal" },
    }, deps);

    expect(result.ok).toBe(true);
    expect(result.featureKey).toBe("premium_pdf_vedic");
    expect(result.priceCoins).toBe(390);
    expect(payment.hold).toHaveBeenCalledTimes(1);
    expect(payment.capture).toHaveBeenCalledTimes(1);
    expect(payment.release).toHaveBeenCalledTimes(0);
    expect(deps.renderPdf).toHaveBeenCalledTimes(1);
    expect(statuses.map((s) => s.code)).toEqual(expect.arrayContaining(["PDF_V2_STARTED", "PDF_V2_COMPLETED"]));
  });

  test("requiredFields 누락 시 복구 모드로 Gemini/렌더링을 계속 진행", async () => {
    const { deps, payment } = makeBaseDeps({
      resolveAdapter: async () => ({
        pdfType: "lifeBook",
        async runEngine() { return {}; },
        async normalize() { return { profile: {} }; },
        getChapterPlan() {
          return [{
            chapterId: "life-ch-01",
            title: "CH.01",
            requiredFields: ["chart.dayMaster"],
            minChars: 10,
            maxChars: 50,
            promptTemplateId: "life-ch-01",
            order: 1,
          }];
        },
        validate() { return { ok: false, missingByChapter: [{ chapterId: "life-ch-01", missingFields: ["chart.dayMaster"] }] }; },
      }),
    });

    const result = await createPremiumPdfJob({
      userId: "user-1",
      featureKey: "premium_pdf_saju_life_book",
      pdfType: "lifeBook",
      input: {},
    }, deps);

    expect(result.ok).toBe(true);
    expect(result.recoveryApplied).toBe(true);
    expect(deps.generateChapter).toHaveBeenCalledTimes(1);
    expect(deps.renderPdf).toHaveBeenCalledTimes(1);
    expect(payment.release).toHaveBeenCalledTimes(0);
  });

  test("Gemini 실패 시 챕터 fallback으로 PDF 렌더링 계속", async () => {
    const { deps, payment } = makeBaseDeps({
      generateChapter: jest.fn(async () => {
        throw Object.assign(new Error("gemini timeout"), { code: "GEMINI_TIMEOUT" });
      }),
    });

    const result = await createPremiumPdfJob({
      userId: "user-1",
      featureKey: "premium_pdf_vedic",
      pdfType: "vedicPremium",
      input: {},
    }, deps);

    expect(result.ok).toBe(true);
    expect(result.recoveryApplied).toBe(true);
    expect(deps.generateChapter).toHaveBeenCalledTimes(1);
    expect(deps.renderPdf).toHaveBeenCalledTimes(1);
    expect(payment.release).toHaveBeenCalledTimes(0);
  });

  test("동일 jobId 재요청 시 idempotency 기반 중복 차감 방지", async () => {
    let deductionCount = 0;
    const seen = new Set();
    const { deps } = makeBaseDeps({
      createJobId: () => "same-job-id",
      payment: {
        hold: jest.fn(async ({ idempotencyKey }) => {
          if (!seen.has(idempotencyKey)) {
            seen.add(idempotencyKey);
            deductionCount += 1;
            return { ok: true, holdId: "hold-same" };
          }
          return { ok: true, holdId: "hold-same", idempotent: true };
        }),
        capture: jest.fn(async () => ({ ok: true })),
        release: jest.fn(async () => ({ ok: true })),
      },
    });

    const params = {
      userId: "user-1",
      featureKey: "premium_pdf_western_astrology",
      pdfType: "westernAstrologyPremium",
      input: {},
    };

    const first = await createPremiumPdfJob(params, deps);
    const second = await createPremiumPdfJob(params, deps);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(deductionCount).toBe(1);
  });

  test("코인 부족(hold 실패) 시 즉시 실패", async () => {
    const { deps } = makeBaseDeps({
      payment: {
        hold: jest.fn(async () => ({ ok: false, code: "INSUFFICIENT_COINS", message: "코인 부족" })),
        capture: jest.fn(async () => ({ ok: true })),
        release: jest.fn(async () => ({ ok: true })),
      },
      resolveAdapter: jest.fn(async () => ({
        async runEngine() { return {}; },
        async normalize() { return {}; },
        getChapterPlan() { return []; },
        validate() { return { ok: true, missingByChapter: [] }; },
      })),
    });

    const result = await createPremiumPdfJob({
      userId: "user-1",
      featureKey: "premium_pdf_ziwei",
      pdfType: "ziweiPremium",
      input: {},
    }, deps);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INSUFFICIENT_COINS");
    expect(deps.resolveAdapter).toHaveBeenCalledTimes(0);
  });

  test("베다점 본문에 서양 점성술 용어가 섞이면 fallback으로 정리", async () => {
    const { deps } = makeBaseDeps({
      generateChapter: jest.fn(async () => "이 챕터는 Ascendant와 Solar Return을 기준으로 설명합니다."),
    });

    const result = await createPremiumPdfJob({
      userId: "user-1",
      featureKey: "premium_pdf_vedic",
      pdfType: "vedicPremium",
      input: {},
    }, deps);

    expect(result.ok).toBe(true);
    expect(result.recoveryApplied).toBe(true);
    expect(deps.renderPdf).toHaveBeenCalledTimes(1);
  });

  test("Gemini가 카테고리 헤딩을 바꿔도 로컬 스키마 제목으로 고정된다", async () => {
    const captured = { chapters: [] };
    const { deps } = makeBaseDeps({
      resolveAdapter: async () => ({
        pdfType: "lifeBook",
        async runEngine() { return { ok: true }; },
        async normalize() { return { chart: { dayMaster: "갑" }, elements: { scores: { wood: 3 } }, luckCycles: { daewoon: ["갑자"] } }; },
        getChapterPlan() {
          return [{
            chapterId: "life-ch-01",
            title: "사주 원국 완전 해설",
            requiredFields: ["chart.dayMaster"],
            minChars: 10,
            maxChars: 3000,
            promptTemplateId: "life-ch-01",
            categories: [
              { id: "a", type: "structure", title: "팔자 8글자가 만드는 인생의 기본 골격", minChars: 100 },
              { id: "b", type: "structure", title: "일간이 세상을 버티는 방식", minChars: 100 },
            ],
          }];
        },
        validate() { return { ok: true, missingByChapter: [] }; },
      }),
      generateChapter: jest.fn(async () => [
        "### 핵심 요약",
        "모델이 임의 헤딩을 쓴 문장입니다.",
        "### 구조 해석",
        "또 다른 임의 섹션입니다.",
      ].join("\n\n")),
      renderPdf: jest.fn(async ({ chapters }) => {
        captured.chapters = chapters;
        return { status: "completed" };
      }),
    });

    const result = await createPremiumPdfJob({
      userId: "user-1",
      featureKey: "premium_pdf_saju_life_book",
      pdfType: "lifeBook",
      input: { mode: "solo" },
    }, deps);

    expect(result.ok).toBe(true);
    const content = String(captured.chapters?.[0]?.content || "");
    expect(content).toContain("### 팔자 8글자가 만드는 인생의 기본 골격");
    expect(content).toContain("### 일간이 세상을 버티는 방식");
    expect(content).not.toContain("### 핵심 요약");
    expect(content).not.toContain("### 구조 해석");
  });
});
