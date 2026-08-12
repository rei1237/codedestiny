/**
 * @jest-environment node
 */

let handleDreamRoutes;
let setGeminiCaller;
let resetGeminiCaller;
let setAccessVerifier;
let resetAccessVerifier;

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({
    callGeminiText: jest.fn(async () => ({ ok: false, error: "mocked" })),
  }));
  const mod = await import("../../worker/routes/dream.js");
  handleDreamRoutes = mod.handleDreamRoutes;
  setGeminiCaller = mod.__setDreamGeminiCallerForTest;
  resetGeminiCaller = mod.__resetDreamGeminiCallerForTest;
  setAccessVerifier = mod.__setDreamPsychoAccessVerifierForTest;
  resetAccessVerifier = mod.__resetDreamPsychoAccessVerifierForTest;
});

beforeEach(() => {
  if (typeof setAccessVerifier === "function") {
    setAccessVerifier(async () => ({ ok: true, accessType: "test" }));
  }
});

afterEach(() => {
  if (typeof resetGeminiCaller === "function") {
    resetGeminiCaller();
  }
  if (typeof resetAccessVerifier === "function") {
    resetAccessVerifier();
  }
});

describe("worker /api/dream/psycho-analysis", () => {
  function expectFiveChapterShape(markdown) {
    const text = String(markdown || "");
    expect(text).toMatch(/Chapter 1\. 꿈의 장면과 핵심 상징/);
    expect(text).toMatch(/Chapter 2\. 정신분석적 해석 — 무의식의 소망과 갈등/);
    expect(text).toMatch(/Chapter 3\. 융 심리학적 해석 — 내면의 원형과 통합/);
    expect(text).toMatch(/Chapter 4\. 영적 상징 해몽 — 꿈이 전하는 신비한 메시지/);
    expect(text).toMatch(/Chapter 5\. 현실 조언과 치유의 방향/);

    expect(text).toMatch(/꿈의 핵심 장면 요약/);
    expect(text).toMatch(/프로이트식 소망 충족 관점/);
    expect(text).toMatch(/그림자와 아니마\/아니무스의 작용/);
    expect(text).toMatch(/이 꿈이 건네는 신비로운 문장/);
    expect(text).toMatch(/오늘 할 수 있는 작은 행동/);
  }

  test("꿈 본문이 비어 있으면 400을 반환한다", async () => {
    const req = new Request("https://example.com/api/dream/psycho-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dreamText: "" }),
    });

    const res = await handleDreamRoutes(req, {});
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.ok).toBe(false);
  });

  test("payment access is required before psycho LLM generation", async () => {
    setAccessVerifier(async () => ({
      ok: false,
      status: 402,
      code: "PAYMENT_REQUIRED",
      message: "payment required",
      detail: { reason: "PAYMENT_REQUIRED" },
    }));

    const req = new Request("https://example.com/api/dream/psycho-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dreamText: "A quiet dream with a closed door and a long hallway." }),
    });

    const res = await handleDreamRoutes(req, {});
    const payload = await res.json();

    expect(res.status).toBe(402);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("PAYMENT_REQUIRED");
    expect(payload.detail.requiredFeatureKey).toBe("dream-psycho-analysis");
  });

  test("LLM 성공 시 intake를 포함해 gemini 소스로 반환한다", async () => {
    const captured = { prompt: "", options: null };
    setGeminiCaller(async (_env, prompt, options) => {
      captured.prompt = String(prompt || "");
      captured.options = options || null;
      return {
        ok: true,
        model: "gemini-2.5-flash",
        text: [
          "## Chapter 1. 꿈의 장면과 핵심 상징",
          "### 1. 꿈의 핵심 장면 요약",
          "사랑하는 사람과 결혼해서 행복했던 장면이 핵심입니다.",
          "### 2. 가장 강한 상징",
          "결혼은 관계의 결합과 안정의 상징입니다.",
          "### 3. 꿈속 감정의 색깔",
          "행복과 안도감이 중심입니다.",
          "### 4. 현실의 어떤 마음과 연결되는가",
          "관계의 확신과 선택받고 싶은 마음과 연결됩니다.",
          "### 5. 이 꿈이 남긴 첫 메시지",
          "내면의 회복 가능성이 살아 있다는 메시지입니다.",
          "",
          "## Chapter 2. 정신분석적 해석 — 무의식의 소망과 갈등",
          "### 1. 프로이트식 소망 충족 관점",
          "소망 충족적 성격이 뚜렷합니다.",
          "### 2. 애착 욕구와 결핍의 신호",
          "안정 애착에 대한 욕구를 보여줍니다.",
          "### 3. 억눌린 감정 또는 말하지 못한 마음",
          "표현되지 못한 바람이 꿈에서 형상화되었습니다.",
          "### 4. 반복되는 관계 패턴과의 연결",
          "확정된 관계를 바라는 패턴과 연결될 수 있습니다.",
          "### 5. 무의식이 이 장면을 선택한 이유",
          "안전한 결합의 이미지를 통해 정서를 회복하려는 선택입니다.",
          "",
          "## Chapter 3. 융 심리학적 해석 — 내면의 원형과 통합",
          "### 1. 꿈속 인물이 상징하는 내면의 일부",
          "사랑받고 싶은 자기 부분을 비춥니다.",
          "### 2. 결혼·만남·이별·죽음 등 주요 원형의 의미",
          "결혼은 내면 통합의 원형입니다.",
          "### 3. 그림자와 아니마/아니무스의 작용",
          "관계 안에서 감정과 이성이 화해하는 흐름이 보입니다.",
          "### 4. 내면 통합의 가능성",
          "통합 가능성이 높은 꿈입니다.",
          "### 5. 이 꿈이 보여주는 성장 방향",
          "조급함보다 안정의 확장을 선택하는 방향입니다.",
          "",
          "## Chapter 4. 영적 상징 해몽 — 꿈이 전하는 신비한 메시지",
          "### 1. 영혼의 언어로 본 꿈의 의미",
          "마음의 약속을 비추는 장면으로 읽힙니다.",
          "### 2. 인연과 카르마의 상징",
          "깊은 인연의 감각을 환기합니다.",
          "### 3. 꿈속 감정이 가진 영적 진동",
          "따뜻하고 안정적인 진동이 강합니다.",
          "### 4. 현실에서 주의 깊게 볼 신호",
          "행복의 감각을 일상 회복 루틴으로 연결하세요.",
          "### 5. 이 꿈이 건네는 신비로운 문장",
          "당신의 마음은 아직 사랑을 회복의 힘으로 기억합니다.",
          "",
          "## Chapter 5. 현실 조언과 치유의 방향",
          "### 1. 이 꿈을 현실에서 어떻게 받아들일 것인가",
          "결론보다 감정의 결을 보존하며 받아들이세요.",
          "### 2. 지금 내 마음이 원하는 것",
          "확신과 안정을 원하고 있습니다.",
          "### 3. 관계에서 조심해야 할 태도",
          "충동적 확정 시도를 피하세요.",
          "### 4. 오늘 할 수 있는 작은 행동",
          "행복했던 장면을 3줄로 기록하고, 안정 루틴 1개를 실행하세요.",
          "### 5. 마지막 치유 메시지",
          "당신의 내면에는 다시 연결될 힘이 충분합니다.",
        ].join("\n"),
      };
    });

    const req = new Request("https://example.com/api/dream/psycho-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dreamText: "낯선 복도를 헤매다가 오래된 집 문 앞에서 멈췄고 갑자기 울음이 났습니다.",
        intake: {
          emotionalState: "불안과 죄책감",
          recurringConcern: "관계에서 같은 갈등 반복",
          recentStressContext: "업무 과부하와 수면 부족",
          desiredOutcome: "감정 조절과 대화 전략",
        },
      }),
    });

    const res = await handleDreamRoutes(req, {});
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.record.source).toBe("gemini");
    expect(payload.llm.used).toBe(true);
    expect(payload.llm.source).toBe("gemini");
    expectFiveChapterShape(payload.record.markdown || "");
    expect(payload.tone && payload.tone.primary).toBeTruthy();
    expect(payload.quality && payload.quality.ok).toBe(true);

    expect(captured.prompt).toMatch(/\[\uC0C1\uB2F4 \uBA54\uD0C0\]/);
    expect(captured.prompt).toMatch(/\[\uAFC8 \uAC10\uC815 \uCD94\uC815\]/);
    expect(captured.prompt).toMatch(/불안과 죄책감/);
    expect(captured.prompt).toMatch(/관계에서 같은 갈등 반복/);
    expect(captured.prompt).toMatch(/업무 과부하와 수면 부족/);
    expect(captured.prompt).toMatch(/감정 조절과 대화 전략/);
    // callGeminiText 가 실제로 읽는 옵션만 넘긴다(modelEnvKeys/totalTimeoutMs 는 무시되던 죽은 옵션).
    expect(typeof captured.options.model).toBe("string");
    expect(captured.options.totalTimeoutMs).toBeUndefined();
    expect(captured.options.timeoutMs).toBeGreaterThan(0);
  });

  test("LLM 실패 시 fallback과 오류 메타를 반환한다", async () => {
    setGeminiCaller(async () => ({
      ok: false,
      message: "quota exceeded",
    }));

    const req = new Request("https://example.com/api/dream/psycho-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dreamText: "높은 곳에서 떨어질 듯한 느낌으로 계속 도망치는 꿈을 꿨습니다.",
      }),
    });

    const res = await handleDreamRoutes(req, {});
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.record.source).toBe("fallback");
    expect(payload.llm.used).toBe(false);
    expect(payload.llm.error).toMatch(/quota exceeded/);
    expect(payload.message).toBe("해몽 결과를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    expectFiveChapterShape(payload.record.markdown || "");
    expect(payload.quality && payload.quality.ok).toBe(true);
  });

  test("행복한 결혼 꿈은 happy/healing 톤으로 해석되고 불안 템플릿을 강제하지 않는다", async () => {
    setGeminiCaller(async () => ({
      ok: false,
      message: "timeout",
    }));

    const req = new Request("https://example.com/api/dream/psycho-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dreamText: "사랑하는 사람과 결혼할 수 있어서 행복한 꿈을 꾸었어",
        emotion: "행복",
        relationshipContext: "재회를 고민 중",
        peopleInDream: ["사랑하는 사람"],
      }),
    });

    const res = await handleDreamRoutes(req, {});
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(["happy", "healing", "mixed"]).toContain(payload.tone && payload.tone.primary);
    const text = String(payload.record && payload.record.markdown || "");
    expect(text).toMatch(/사랑하는 사람/);
    expect(text).toMatch(/결혼/);
    expect(text).toMatch(/행복/);
    expect(text).toMatch(/소망|회복|결합|희망/);
    expect(text).not.toMatch(/정신분석 데이터 분석|fallback|payload|JSON|LLM|API|데이터 부족/i);
    expectFiveChapterShape(text);
  });

  test("happy 꿈에서 LLM이 불안 템플릿만 반환하면 품질 게이트로 fallback 치환한다", async () => {
    setGeminiCaller(async () => ({
      ok: true,
      model: "gemini-2.5-flash",
      text: [
        "## Chapter 1. 꿈의 장면과 핵심 상징",
        "### 1. 꿈의 핵심 장면 요약",
        "이 꿈은 위험 신호입니다.",
        "### 2. 가장 강한 상징",
        "회피와 공포가 핵심입니다.",
        "### 3. 꿈속 감정의 색깔",
        "불안과 공포입니다.",
        "### 4. 현실의 어떤 마음과 연결되는가",
        "통제를 잃을 위기입니다.",
        "### 5. 이 꿈이 남긴 첫 메시지",
        "파국을 경고합니다.",
        "",
        "## Chapter 2. 정신분석적 해석 — 무의식의 소망과 갈등",
        "### 1. 프로이트식 소망 충족 관점",
        "소망보다 공포입니다.",
        "### 2. 애착 욕구와 결핍의 신호",
        "공포만 있습니다.",
        "### 3. 억눌린 감정 또는 말하지 못한 마음",
        "불안뿐입니다.",
        "### 4. 반복되는 관계 패턴과의 연결",
        "회피가 심합니다.",
        "### 5. 무의식이 이 장면을 선택한 이유",
        "위협을 알리기 위함입니다.",
        "",
        "## Chapter 3. 융 심리학적 해석 — 내면의 원형과 통합",
        "### 1. 꿈속 인물이 상징하는 내면의 일부",
        "위기 자아입니다.",
        "### 2. 결혼·만남·이별·죽음 등 주요 원형의 의미",
        "붕괴입니다.",
        "### 3. 그림자와 아니마/아니무스의 작용",
        "공포의 그림자입니다.",
        "### 4. 내면 통합의 가능성",
        "없습니다.",
        "### 5. 이 꿈이 보여주는 성장 방향",
        "경계만 해야 합니다.",
        "",
        "## Chapter 4. 영적 상징 해몽 — 꿈이 전하는 신비한 메시지",
        "### 1. 영혼의 언어로 본 꿈의 의미",
        "위협의 징조입니다.",
        "### 2. 인연과 카르마의 상징",
        "단절의 신호입니다.",
        "### 3. 꿈속 감정이 가진 영적 진동",
        "공포 진동입니다.",
        "### 4. 현실에서 주의 깊게 볼 신호",
        "위기입니다.",
        "### 5. 이 꿈이 건네는 신비로운 문장",
        "붕괴를 대비하세요.",
        "",
        "## Chapter 5. 현실 조언과 치유의 방향",
        "### 1. 이 꿈을 현실에서 어떻게 받아들일 것인가",
        "위험으로 받아들이세요.",
        "### 2. 지금 내 마음이 원하는 것",
        "회피입니다.",
        "### 3. 관계에서 조심해야 할 태도",
        "도망치세요.",
        "### 4. 오늘 할 수 있는 작은 행동",
        "불안을 기록하세요.",
        "### 5. 마지막 치유 메시지",
        "경고입니다.",
      ].join("\n"),
    }));

    const req = new Request("https://example.com/api/dream/psycho-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dreamText: "사랑하는 사람과 결혼할 수 있어서 행복한 꿈을 꾸었어",
        emotion: "행복",
      }),
    });

    const res = await handleDreamRoutes(req, {});
    const payload = await res.json();
    const text = String(payload.record && payload.record.markdown || "");

    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.record.source).toBe("gemini");
    expect(payload.quality && payload.quality.ok).toBe(true);
    expect(text).toMatch(/사랑하는 사람/);
    expect(text).toMatch(/결혼/);
    expect(text).toMatch(/행복/);
    expect(text).toMatch(/회복|소망|결합|희망/);
    expect(text).not.toMatch(/파국|붕괴/);
    expectFiveChapterShape(text);
  });
});
