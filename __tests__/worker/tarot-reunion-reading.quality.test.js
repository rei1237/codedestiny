/**
 * @jest-environment node
 */

let handleTarotRoutes;
let signJwt;

const env = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
};

const SAMPLE_CARDS = [
  { cardId: "P14", position: "past_bond", orientation: "reversed" },
  { cardId: "W11", position: "their_now", orientation: "upright" },
  { cardId: "S02", position: "outside_factor", orientation: "reversed" },
  { cardId: "P13", position: "their_heart", orientation: "reversed" },
  { cardId: "S10", position: "reunion_outcome", orientation: "reversed" },
];

const CONTACT_HINTS = [
  "지금 가능",
  "1~2주 뒤",
  "먼저 연락 비추천",
  "짧은 안부만 추천",
  "자연스러운 계기 필요",
  "사과",
  "정리 메시지",
];

beforeAll(async () => {
  const tarotMod = await import("../../worker/routes/tarot.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  handleTarotRoutes = tarotMod.handleTarotRoutes;
  signJwt = jwtMod.signJwt;
});

function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?。！？]|입니다\.|해요\.|세요\.|합니다\.)\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

async function callReunionReading(cards = SAMPLE_CARDS) {
  const token = await signJwt(
    {
      userId: "64f0a1b2c3d4e5f678901234",
      email: "tester@example.com",
      role: "user",
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: "10m",
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },
  );

  const req = new Request("https://example.com/api/tarot/reading", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      category: "reunion",
      spreadType: "reunion_lighthouse_five_card",
      cards,
    }),
  });

  const res = await handleTarotRoutes(req, env);
  const payload = await res.json();
  return { res, payload };
}

describe("worker /api/tarot/reading reunion quality", () => {
  test("인증 없이 접근하면 401이어야 한다", async () => {
    const req = new Request("https://example.com/api/tarot/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "reunion",
        spreadType: "reunion_lighthouse_five_card",
        cards: SAMPLE_CARDS,
      }),
    });
    const res = await handleTarotRoutes(req, env);
    expect(res.status).toBe(401);
  });

  test("카드 placeholder 문구가 나오면 안 된다", async () => {
    const { res, payload } = await callReunionReading();
    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);

    const text = JSON.stringify(payload.reading || {});
    expect(text).not.toMatch(/카드\(정방향\)|카드\(역방향\)/);

    const positions = Array.isArray(payload?.reading?.positions) ? payload.reading.positions : [];
    expect(positions).toHaveLength(5);
    positions.forEach((pos) => {
      expect(String(pos?.cardName || "")).not.toBe("이름이 확인되지 않은 카드");
    });
  });

  test("반복 문장이 과도하게 중복되면 안 된다", async () => {
    const { payload } = await callReunionReading();
    const positions = Array.isArray(payload?.reading?.positions) ? payload.reading.positions : [];

    positions.forEach((pos) => {
      const merged = [pos?.headline, pos?.directAnswer, pos?.detailedReading, pos?.reunionPoint, pos?.advice]
        .map((line) => String(line || ""))
        .join(" ");
      const sentences = splitSentences(merged);
      const unique = new Set(sentences);
      expect(unique.size).toBe(sentences.length);
    });
  });

  test("어색/금지 표현이 나오면 안 된다", async () => {
    const { payload } = await callReunionReading();
    const text = JSON.stringify(payload.reading || {});

    expect(text).not.toMatch(/읽는\s*정확함/);
    expect(text).not.toMatch(/실전\s*읽는\s*정확함/);
    expect(text).not.toMatch(/포지션\s*핵심\s*의미/);
    expect(text).not.toMatch(/관계\s*상담\s*관점에서/);
    expect(text).not.toMatch(/다섯\s*장의\s*카드가\s*재회의\s*실마리를/);
  });

  test("상단 요약 5요소가 모두 존재해야 한다", async () => {
    const { payload } = await callReunionReading();
    const summary = payload?.reading?.summary || {};

    expect(typeof summary.reunionChanceLabel).toBe("string");
    expect(Number(summary.reunionChanceScore)).toBeGreaterThanOrEqual(0);
    expect(typeof summary.partnerState).toBe("string");
    expect(typeof summary.bestContactTiming).toBe("string");
    expect(typeof summary.mainObstacle).toBe("string");
    expect(typeof summary.oneLineAdvice).toBe("string");
  });

  test("포지션별 설명은 역할이 분리되어야 한다", async () => {
    const { payload } = await callReunionReading();
    const positions = payload?.reading?.positions || [];

    const titles = positions.map((p) => String(p?.positionTitle || ""));
    expect(new Set(titles).size).toBe(5);

    const directAnswers = positions.map((p) => String(p?.directAnswer || ""));
    expect(new Set(directAnswers).size).toBeGreaterThan(2);
  });

  test("연락 관련 실행 조언이 반드시 포함되어야 한다", async () => {
    const { payload } = await callReunionReading();
    const summary = payload?.reading?.summary || {};
    const finalGuide = payload?.reading?.finalGuide || {};
    const merged = [summary.bestContactTiming, summary.oneLineAdvice, finalGuide.shouldContactNow, finalGuide.messageExample]
      .map((line) => String(line || ""))
      .join(" ");

    expect(CONTACT_HINTS.some((hint) => merged.includes(hint))).toBe(true);
  });
});
