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

beforeAll(async () => {
  const tarotMod = await import("../../worker/routes/tarot.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  handleTarotRoutes = tarotMod.handleTarotRoutes;
  signJwt = jwtMod.signJwt;
});

async function makeAuthedRequest(body) {
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

  return new Request("https://example.com/api/tarot/numerology-reading", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

describe("worker /api/tarot/numerology-reading", () => {
  test("질문이 없으면 400을 반환해야 한다", async () => {
    const req = await makeAuthedRequest({
      birthDate: "1992-08-17",
      topic: "love",
      question: "",
    });

    const res = await handleTarotRoutes(req, env);
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(String(payload?.error?.message || payload?.message || "")).toMatch(/상담 질문/);
  });

  test("질문이 있으면 fallback 또는 gemini 결과를 반환해야 한다", async () => {
    const req = await makeAuthedRequest({
      birthDate: "1992-08-17",
      topic: "career",
      question: "올해 이직 타이밍과 준비 순서를 알고 싶어요.",
      name: "테스터",
    });

    const res = await handleTarotRoutes(req, env);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(["fallback", "gemini", "gemini_text_fallback"]).toContain(String(payload.source || ""));
    expect(typeof payload?.interpretation?.numerologyReading).toBe("string");
    expect(typeof payload?.interpretation?.topicReading?.topicLabel).toBe("string");
    expect(Array.isArray(payload?.interpretation?.cardReadings)).toBe(true);
    expect(payload?.interpretation?.cardReadings).toHaveLength(5);
    expect(Array.isArray(payload?.interpretation?.conclusion?.sevenDayPlan)).toBe(true);
    expect(payload?.interpretation?.conclusion?.sevenDayPlan).toHaveLength(7);
  });
});
