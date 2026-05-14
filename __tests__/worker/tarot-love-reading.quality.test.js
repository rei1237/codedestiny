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

const POSITIONS = [
  "position_1",
  "position_2",
  "position_3",
  "position_4",
  "position_5",
  "position_6",
];

const DEFAULT_CARDS = [
  { cardId: "M07", position: "position_1", orientation: "upright" },
  { cardId: "M06", position: "position_2", orientation: "reversed" },
  { cardId: "C02", position: "position_3", orientation: "upright" },
  { cardId: "S07", position: "position_4", orientation: "reversed" },
  { cardId: "P04", position: "position_5", orientation: "upright" },
  { cardId: "M14", position: "position_6", orientation: "reversed" },
];

beforeAll(async () => {
  const tarotMod = await import("../../worker/routes/tarot.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  handleTarotRoutes = tarotMod.handleTarotRoutes;
  signJwt = jwtMod.signJwt;
});

function normalizeSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?。！？]|입니다\.|세요\.|합니다\.)\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function uniqueKeywordCount(text) {
  const keywords = ["연락", "만남", "속도", "부담", "호감", "거리감", "오해", "대화", "약속", "행동 패턴"];
  const source = String(text || "");
  return keywords.filter((word) => source.includes(word)).length;
}

async function callLoveReading(cards = DEFAULT_CARDS) {
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

  const request = new Request("https://example.com/api/tarot/love-reading", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ cards }),
  });

  const response = await handleTarotRoutes(request, env);
  const payload = await response.json();
  return { response, payload };
}

describe("worker /api/tarot/love-reading quality", () => {
  test("인증 없이는 접근할 수 없어야 한다", async () => {
    const request = new Request("https://example.com/api/tarot/love-reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cards: DEFAULT_CARDS }),
    });
    const response = await handleTarotRoutes(request, env);
    expect(response.status).toBe(401);
  });

  test("카드명 placeholder와 카드(정/역방향) 문구가 나오지 않아야 한다", async () => {
    const { response, payload } = await callLoveReading();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);

    const positions = Array.isArray(payload?.reading?.positionBreakdown)
      ? payload.reading.positionBreakdown
      : [];
    expect(positions).toHaveLength(6);

    positions.forEach((item) => {
      const cardName = String(item?.cardName || "");
      const cardLine = String(item?.card || "");
      expect(cardName).not.toBe("이름이 확인되지 않은 카드");
      expect(cardName).not.toMatch(/^카드$/);
      expect(cardLine).not.toMatch(/카드\(정방향\)|카드\(역방향\)/);
    });
  });

  test("같은 문장이 한 포지션 안에서 반복되면 안 된다", async () => {
    const { payload } = await callLoveReading();
    const positions = payload?.reading?.positionBreakdown || [];

    positions.forEach((item) => {
      const merged = [item?.headline, item?.summary, item?.detail, item?.relationshipInsight, item?.advice, item?.caution]
        .map((line) => String(line || ""))
        .join(" ");
      const sentences = normalizeSentences(merged);
      const unique = new Set(sentences);
      expect(unique.size).toBe(sentences.length);
    });
  });

  test("포지션 1과 3 해석은 서로 목적이 다르게 나와야 한다", async () => {
    const { payload } = await callLoveReading();
    const positions = payload?.reading?.positionBreakdown || [];

    const p1 = positions[0];
    const p3 = positions[2];
    expect(String(p1?.positionTitle || "")).not.toBe(String(p3?.positionTitle || ""));

    const p1Text = [p1?.headline, p1?.detail, p1?.relationshipInsight].join(" ");
    const p3Text = [p3?.headline, p3?.detail, p3?.relationshipInsight].join(" ");
    expect(p1Text).not.toBe(p3Text);
  });

  test("같은 카드라도 정방향/역방향 해석이 달라야 한다", async () => {
    const uprightCards = POSITIONS.map((position) => ({ cardId: "M07", position, orientation: "upright" }));
    const reversedCards = POSITIONS.map((position) => ({ cardId: "M07", position, orientation: "reversed" }));

    const up = await callLoveReading(uprightCards);
    const rev = await callLoveReading(reversedCards);

    const upP1 = up.payload?.reading?.positionBreakdown?.[0];
    const revP1 = rev.payload?.reading?.positionBreakdown?.[0];

    expect(String(upP1?.orientationLabel || "")).toBe("정방향");
    expect(String(revP1?.orientationLabel || "")).toBe("역방향");
    expect(String(upP1?.headline || "")).not.toBe(String(revP1?.headline || ""));
    expect(String(upP1?.detail || "")).not.toBe(String(revP1?.detail || ""));
  });

  test("각 포지션 텍스트에는 구체성 키워드가 최소 2개 이상 포함되어야 한다", async () => {
    const { payload } = await callLoveReading();
    const positions = payload?.reading?.positionBreakdown || [];

    positions.forEach((item) => {
      const merged = [item?.summary, item?.detail, item?.relationshipInsight, item?.advice]
        .map((line) => String(line || ""))
        .join(" ");
      expect(uniqueKeywordCount(merged)).toBeGreaterThanOrEqual(2);
    });
  });
});
