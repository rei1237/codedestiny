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
  { cardId: "M11", position: "past_debuff", orientation: "reversed" },
  { cardId: "M14", position: "inner_monster", orientation: "reversed" },
  { cardId: "W09", position: "current_damage", orientation: "upright" },
  { cardId: "W14", position: "mind_shield", orientation: "upright" },
  { cardId: "W06", position: "levelup_mastery", orientation: "reversed" },
];

const FORBIDDEN = [
  "전체적으로 지연 신호가 있으니 점검이 우선입니다.",
  "전체적으로 순환이 열려 있어 전진하기 좋은 흐름입니다.",
];

beforeAll(async () => {
  const tarotMod = await import("../../worker/routes/tarot.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  handleTarotRoutes = tarotMod.handleTarotRoutes;
  signJwt = jwtMod.signJwt;
});

async function callSelfEsteemReading(cards = SAMPLE_CARDS) {
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
      category: "general",
      spreadType: "self_esteem_levelup_five_card",
      cards,
    }),
  });

  const res = await handleTarotRoutes(req, env);
  const payload = await res.json();
  return { res, payload };
}

function mergedPositionText(pos) {
  return [pos?.interpretation, pos?.advice, pos?.actionStep]
    .map((line) => String(line || ""))
    .join(" ");
}

describe("worker /api/tarot/reading self-esteem quality", () => {
  test("정의 역방향은 불공정/자기판단/기준 왜곡/죄책감 의미를 반영해야 한다", async () => {
    const { res, payload } = await callSelfEsteemReading();
    expect(res.status).toBe(200);
    const pos = payload?.reading?.positionReadings?.[0] || {};
    const text = mergedPositionText(pos);
    expect(/불공정|자기판단|기준|죄책감/.test(text)).toBe(true);
  });

  test("절제 역방향은 감정 조절 어려움/균형 붕괴/경계선 약화를 반영해야 한다", async () => {
    const { payload } = await callSelfEsteemReading();
    const pos = payload?.reading?.positionReadings?.[1] || {};
    const text = mergedPositionText(pos);
    expect(/감정 조절|균형|경계선|거절/.test(text)).toBe(true);
  });

  test("완드 나인은 방어/지침/버팀/경계 태세를 반영해야 한다", async () => {
    const { payload } = await callSelfEsteemReading();
    const pos = payload?.reading?.positionReadings?.[2] || {};
    const text = mergedPositionText(pos);
    expect(/방어|지침|버티|경계/.test(text)).toBe(true);
  });

  test("완드 킹은 자기주도권/건강한 권위/단호함/리더십을 반영해야 한다", async () => {
    const { payload } = await callSelfEsteemReading();
    const pos = payload?.reading?.positionReadings?.[3] || {};
    const text = mergedPositionText(pos);
    expect(/자기주도|권위|단호|리더십/.test(text)).toBe(true);
  });

  test("완드 식스 역방향은 외부 인정 의존/자신감 흔들림/자기승인 회복을 반영해야 한다", async () => {
    const { payload } = await callSelfEsteemReading();
    const pos = payload?.reading?.positionReadings?.[4] || {};
    const text = mergedPositionText(pos);
    expect(/외부 인정|자신감|자기승인|비교/.test(text)).toBe(true);
  });

  test("금지 문구 '전체적으로 지연 신호...'가 결과에 나오지 않아야 한다", async () => {
    const { payload } = await callSelfEsteemReading();
    const text = JSON.stringify(payload?.reading || {});
    expect(text).not.toContain(FORBIDDEN[0]);
  });

  test("금지 문구 '순환이 열려...'가 결과에 나오지 않아야 한다", async () => {
    const { payload } = await callSelfEsteemReading();
    const text = JSON.stringify(payload?.reading || {});
    expect(text).not.toContain(FORBIDDEN[1]);
  });

  test("각 포지션 결과는 서로 다른 내용이어야 한다", async () => {
    const { payload } = await callSelfEsteemReading();
    const positions = payload?.reading?.positionReadings || [];
    expect(positions).toHaveLength(5);
    const interpretations = positions.map((p) => String(p?.interpretation || ""));
    expect(new Set(interpretations).size).toBe(5);
  });

  test("Level Up 가이드는 카드 흐름을 2장 이상 실제로 연결해야 한다", async () => {
    const { payload } = await callSelfEsteemReading();
    const guide = payload?.reading?.levelupGuide || {};
    const flow = String(guide?.flow || payload?.reading?.levelupGuidance || "");
    expect(/정의|절제|완드/.test(flow)).toBe(true);
    expect(flow).toContain("|");
  });

  test("자존감 가이드는 중복 접두사 대신 파이프형 카테고리로 정리되어야 한다", async () => {
    const { payload } = await callSelfEsteemReading();
    const guide = payload?.reading?.levelupGuide || {};
    const top = payload?.reading?.topSummary || {};
    expect(String(guide?.summaryPattern || "")).toContain("|");
    expect(String(guide?.summaryPattern || "")).not.toMatch(/현재 자존감 패턴 요약:\s*현재 자존감 패턴 요약:/);
    expect(String(top?.flow || "")).toContain("|");
  });

  test("역방향 카드는 역방향 의미로 해석되어야 한다", async () => {
    const reversed = await callSelfEsteemReading([
      { cardId: "M11", position: "past_debuff", orientation: "reversed" },
      { cardId: "M11", position: "inner_monster", orientation: "reversed" },
      { cardId: "M11", position: "current_damage", orientation: "reversed" },
      { cardId: "M11", position: "mind_shield", orientation: "reversed" },
      { cardId: "M11", position: "levelup_mastery", orientation: "reversed" },
    ]);
    const upright = await callSelfEsteemReading([
      { cardId: "M11", position: "past_debuff", orientation: "upright" },
      { cardId: "M11", position: "inner_monster", orientation: "upright" },
      { cardId: "M11", position: "current_damage", orientation: "upright" },
      { cardId: "M11", position: "mind_shield", orientation: "upright" },
      { cardId: "M11", position: "levelup_mastery", orientation: "upright" },
    ]);

    const revPos = reversed?.payload?.reading?.positionReadings?.[0] || {};
    const upPos = upright?.payload?.reading?.positionReadings?.[0] || {};
    expect(String(revPos?.orientation || "")).toBe("reversed");
    expect(String(upPos?.orientation || "")).toBe("upright");
    expect(String(revPos?.interpretation || "")).not.toBe(String(upPos?.interpretation || ""));
  });

  test("슈트 우세 문구가 개별 카드 해석을 대체하면 안 된다", async () => {
    const { payload } = await callSelfEsteemReading();
    const positions = payload?.reading?.positionReadings || [];
    positions.forEach((pos) => {
      const text = mergedPositionText(pos);
      expect(text).toContain(String(pos?.cardName || ""));
      expect(text).not.toMatch(/슈트 우세/);
    });
  });

  test("다른 스프레드에서도 카드별 기본 의미를 사용해야 하며 공통 fallback만 노출되면 안 된다", async () => {
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
        category: "general",
        spreadType: "one_card",
        cards: [{ cardId: "M11", position: "today", orientation: "reversed" }],
      }),
    });

    const res = await handleTarotRoutes(req, env);
    const payload = await res.json();
    expect(res.status).toBe(200);
    const story = JSON.stringify(payload?.reading || {});
    expect(story).toContain("정의");
    expect(story).not.toContain(FORBIDDEN[0]);
    expect(story).not.toContain(FORBIDDEN[1]);
  });
});
