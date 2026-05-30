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

const SAMPLE_PAIRS = [
  { slot: 1, positionLabel: "위", positionMeaning: "겉으로 보이는 태도", mainCardId: 6, subCardId: 4 },
  { slot: 2, positionLabel: "좌", positionMeaning: "실제 속마음", mainCardId: 18, subCardId: 9 },
  { slot: 3, positionLabel: "중앙", positionMeaning: "다가오지 않는 이유", mainCardId: 7, subCardId: 15 },
  { slot: 4, positionLabel: "우", positionMeaning: "숨겨진 욕구", mainCardId: 2, subCardId: 11 },
  { slot: 5, positionLabel: "아래", positionMeaning: "관계에 대한 판단", mainCardId: 14, subCardId: 20 },
];
const SAMPLE_QUESTION = "그 사람이 먼저 다시 연락할 가능성이 있는지, 있다면 어떤 태도로 기다려야 하는지 알고 싶어요.";

beforeAll(async () => {
  const tarotMod = await import("../../worker/routes/tarot.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  handleTarotRoutes = tarotMod.handleTarotRoutes;
  signJwt = jwtMod.signJwt;
});

async function callMindscan(pairs = SAMPLE_PAIRS, question = SAMPLE_QUESTION) {
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

  const req = new Request("https://example.com/api/tarot/mindscan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pairs, question }),
  });

  const res = await handleTarotRoutes(req, env);
  const payload = await res.json();
  return { res, payload };
}

describe("worker /api/tarot/mindscan quality", () => {
  test("인증 없이도 로컬 속마음 리딩이 생성되어야 한다", async () => {
    const req = new Request("https://example.com/api/tarot/mindscan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs: SAMPLE_PAIRS, question: SAMPLE_QUESTION }),
    });
    const res = await handleTarotRoutes(req, env);
    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
  });

  test("질문이 없으면 400을 반환해야 한다", async () => {
    const req = new Request("https://example.com/api/tarot/mindscan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs: SAMPLE_PAIRS, question: "" }),
    });
    const res = await handleTarotRoutes(req, env);
    const payload = await res.json();
    expect(res.status).toBe(400);
    expect(String(payload?.message || "")).toMatch(/상담 질문/);
  });

  test("결과 구조에 필수 섹션/요약/메시지 3개가 포함되어야 한다", async () => {
    const { res, payload } = await callMindscan();
    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);

    const sections = Array.isArray(payload.sections) ? payload.sections : [];
    expect(sections).toHaveLength(7);

    const mergedTitles = sections.map((s) => String(s?.title || "")).join(" ");
    expect(mergedTitles).toMatch(/상대의 현재 마음/);
    expect(mergedTitles).toMatch(/겉으로 보이는 태도/);
    expect(mergedTitles).toMatch(/숨겨진 진짜 속마음/);
    expect(mergedTitles).toMatch(/상대가 망설이는 이유/);
    expect(mergedTitles).toMatch(/앞으로의 연락 흐름/);
    expect(mergedTitles).toMatch(/내가 취해야 할 태도/);
    expect(mergedTitles).toMatch(/관계의 최종 흐름/);

    const summary = payload.summaryCard || {};
    expect(typeof summary.corePsychology).toBe("string");
    expect(typeof summary.contactChance).toBe("string");
    expect(typeof summary.relationFlow).toBe("string");
    expect(Number(summary.emotionalTemperature || 0)).toBeGreaterThanOrEqual(1);
    expect(Number(summary.emotionalTemperature || 0)).toBeLessThanOrEqual(5);

    const messages = Array.isArray(payload.suggestedMessages) ? payload.suggestedMessages : [];
    expect(messages).toHaveLength(3);
    messages.forEach((item) => {
      expect(String(item?.text || "").length).toBeGreaterThan(10);
    });
  });

  test("금지 표현이 결과에 포함되면 안 된다", async () => {
    const { payload } = await callMindscan();
    const text = JSON.stringify(payload || {});

    expect(text).not.toMatch(/당신의\s*영혼/);
    expect(text).not.toMatch(/당신의\s*내면/);
    expect(text).not.toMatch(/사회적\s*페르소나/);
    expect(text).not.toMatch(/당신의\s*진정한\s*자아/);
    expect(text).not.toMatch(/삶의\s*균형/);
    expect(text).not.toMatch(/새로운\s*지평/);
    expect(text).not.toMatch(/우주의\s*흐름/);
  });

  test("메인/보조 카드명이 섹션에 반영되어야 한다", async () => {
    const { payload } = await callMindscan();
    const sections = payload.sections || [];

    sections.forEach((section) => {
      const mainName = String(section?.mainCardName || "");
      const subName = String(section?.subCardName || "");
      const summary = String(section?.summary || section?.content || "");

      expect(mainName.length).toBeGreaterThan(0);
      expect(subName.length).toBeGreaterThan(0);
      expect(mainName).not.toMatch(/^Card\s+\d+$/);
      expect(subName).not.toMatch(/^Card\s+\d+$/);
      expect(summary).toContain(mainName);
      expect(summary).toContain(subName);
    });
  });

  test("카드가 바뀌면 같은 포지션 해석도 달라져야 한다", async () => {
    const base = await callMindscan(SAMPLE_PAIRS);

    const alteredPairs = SAMPLE_PAIRS.map((pair, idx) => (
      idx === 0 ? { ...pair, mainCardId: 13, subCardId: 16 } : pair
    ));
    const changed = await callMindscan(alteredPairs);

    const before = base.payload?.sections?.[0];
    const after = changed.payload?.sections?.[0];

    expect(String(before?.summary || "")).not.toBe(String(after?.summary || ""));
    expect(String(before?.mainCardName || "")).not.toBe(String(after?.mainCardName || ""));
  });

  test("페어 데이터가 없으면 400을 반환해야 한다", async () => {
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

    const req = new Request("https://example.com/api/tarot/mindscan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pairs: [], question: SAMPLE_QUESTION }),
    });

    const res = await handleTarotRoutes(req, env);
    expect(res.status).toBe(400);
  });
});
