/**
 * @jest-environment node
 */

let handleDreamRoutes;
let setGeminiCaller;
let resetGeminiCaller;

beforeAll(async () => {
  const mod = await import("../../worker/routes/dream.js");
  handleDreamRoutes = mod.handleDreamRoutes;
  setGeminiCaller = mod.__setDreamGeminiCallerForTest;
  resetGeminiCaller = mod.__resetDreamGeminiCallerForTest;
});

afterEach(() => {
  if (typeof resetGeminiCaller === "function") {
    resetGeminiCaller();
  }
});

describe("worker /api/dream/psycho-analysis", () => {
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

  test("LLM 성공 시 intake를 포함해 gemini 소스로 반환한다", async () => {
    const captured = { prompt: "", options: null };
    setGeminiCaller(async (_env, prompt, options) => {
      captured.prompt = String(prompt || "");
      captured.options = options || null;
      return {
        ok: true,
        model: "gemini-2.5-flash",
        text: [
          "## 핵심 상징",
          "핵심 상징 분석 본문",
          "",
          "## 무의식의 갈등",
          "갈등 분석 본문",
          "",
          "## 감정 패턴",
          "감정 패턴 본문",
          "",
          "## 현재 삶과 연결",
          "현재 삶 연결 본문",
          "",
          "## 7일 실천 가이드",
          "- 1일차 실행",
          "",
          "## 상담 질문 3개",
          "- 오늘 가장 먼저 다루고 싶은 감정은 무엇인가요?",
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
    expect(String(payload.record.markdown || "")).toMatch(/상담 질문 3개/);

    expect(captured.prompt).toMatch(/\[상담 인테이크\]/);
    expect(captured.prompt).toMatch(/불안과 죄책감/);
    expect(captured.prompt).toMatch(/관계에서 같은 갈등 반복/);
    expect(captured.prompt).toMatch(/업무 과부하와 수면 부족/);
    expect(captured.prompt).toMatch(/감정 조절과 대화 전략/);
    expect(Array.isArray(captured.options.modelEnvKeys)).toBe(true);
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
    expect(String(payload.record.markdown || "")).toMatch(/상담 질문 3개/);
  });
});
