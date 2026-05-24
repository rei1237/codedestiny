/**
 * @jest-environment node
 */

let handleLifebookRoutes;
let handleLoveSecretRoutes;
let handleSajuNewYearRoutes;
let signJwt;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  handleLifebookRoutes = mod.handleLifebookRoutes;
  handleLoveSecretRoutes = mod.handleLoveSecretRoutes;
  handleSajuNewYearRoutes = mod.handleSajuNewYearRoutes;
  signJwt = jwtMod.signJwt;
});

function makeSajuData() {
  return [
    "【분석 대상 정보】",
    "이름: 테스트A",
    "성별: 여성",
    "생년월일: 1992년 6월 15일",
    "출생 시각: 12시 30분",
    "",
    "【사주 원국(四柱)】",
    "년주(年柱): 壬申",
    "월주(月柱): 丁巳",
    "일주(日柱): 辛酉",
    "시주(時柱): 甲午",
    "",
    "【오행(五行) 분포】",
    "목(木):22.2 화(火):11.1 토(土):22.2 금(金):33.3 수(水):11.1",
    "용신(用神): fire, wood",
    "기신(忌神): metal",
    "일간(日干): 辛",
    "신강/신약: 신강",
    "",
    "【십성(十星) 분포】",
    "비견: 3",
    "겁재: 1",
    "식신: 2",
    "상관: 1",
    "편재: 1",
    "정재: 2",
    "편관: 1",
    "정관: 2",
    "편인: 0",
    "정인: 1",
    "",
    "【신살(神殺) 계산 결과 — 정확한 로직으로 도출】",
    "보유 신살: 도화살(桃花殺), 홍염살(紅艶殺), 화개살(華蓋殺), 역마살(驛馬殺)",
    "",
    "【대운(大運) 흐름】",
    "23세: 丙辰",
    "33세: 乙卯",
    "43세: 甲寅",
  ].join("\n");
}

function makePartnerData() {
  return [
    "【분석 대상 정보】",
    "이름: 테스트B",
    "성별: 남성",
    "생년월일: 1991년 2월 21일",
    "출생 시각: 08시 15분",
    "",
    "【사주 원국(四柱)】",
    "년주(年柱): 辛未",
    "월주(月柱): 丙寅",
    "일주(日柱): 甲寅",
    "시주(時柱): 丁卯",
    "",
    "【오행(五行) 분포】",
    "목(木):33.3 화(火):22.2 토(土):11.1 금(金):22.2 수(水):11.1",
    "용신(用神): water, wood",
    "기신(忌神): fire",
    "일간(日干): 甲",
    "신강/신약: 신약",
    "",
    "【십성(十星) 분포】",
    "비견: 2",
    "겁재: 1",
    "식신: 2",
    "상관: 1",
    "편재: 1",
    "정재: 1",
    "편관: 2",
    "정관: 1",
    "편인: 1",
    "정인: 1",
  ].join("\n");
}

async function makeAuthToken() {
  return signJwt({
    userId: "507f1f77bcf86cd799439011",
    email: "premium-prepare@example.com",
    role: "user",
  }, "dev-secret", {
    issuer: "code-destiny-api",
    audience: "code-destiny-web",
    expiresIn: "30m",
  });
}

describe("Saju premium prepareOnly routes", () => {
  test("lifeBook prepareOnly returns canonical 13-chapter plan", async () => {
    const authToken = await makeAuthToken();
    const req = new Request("https://example.com/api/lifebook/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        prepareOnly: true,
        name: "테스트A",
        gender: "F",
        year: 1992,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
        sajuData: makeSajuData(),
      }),
    });

    const res = await handleLifebookRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.prepared).toBe(true);
    expect(data.totalChapters).toBe(13);
    expect(data.chapterPlan).toHaveLength(13);
    expect(data.chapterPlan[0].title).toContain("사주 원국 완전 해설");
  });

  test("loveSecret compatibility prepareOnly returns canonical 13-chapter couple plan", async () => {
    const authToken = await makeAuthToken();
    const req = new Request("https://example.com/api/love-secret/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        prepareOnly: true,
        mode: "compatibility",
        name: "테스트A",
        gender: "F",
        year: 1992,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
        partnerName: "테스트B",
        partnerGender: "M",
        partnerYear: 1991,
        partnerMonth: 2,
        partnerDay: 21,
        partnerHour: 8,
        partnerMinute: 15,
        sajuData: makeSajuData(),
        partnerData: makePartnerData(),
      }),
    });

    const res = await handleLoveSecretRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.prepared).toBe(true);
    expect(data.mode).toBe("couple");
    expect(data.totalChapters).toBe(13);
    expect(data.chapterPlan).toHaveLength(13);
    expect(data.chapterPlan[0].title).toContain("Chapter I. 두 사람의 관계 자아 진단");
    expect(data.chapterPlan[12].title).toContain("Chapter XIII. 커플 사랑 마스터플랜");
  });

  test("sajuNewYear prepareOnly returns canonical 10-chapter plan", async () => {
    const authToken = await makeAuthToken();
    const req = new Request("https://example.com/api/saju-new-year/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        prepareOnly: true,
        targetYear: 2026,
        name: "테스트A",
        gender: "F",
        year: 1992,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
        sajuData: makeSajuData(),
      }),
    });

    const res = await handleSajuNewYearRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.prepared).toBe(true);
    expect(data.totalChapters).toBe(10);
    expect(data.chapterPlan).toHaveLength(10);
    expect(data.chapterPlan[0].title).toBe("연간 파동 총론 - 올해의 기본 기조");
    expect(data.chapterPlan[9].title).toBe("최종 실행 로드맵 - 연말 회수 전략");
  });

  test("sajuNewYear chapter generation falls back locally with source marker when Gemini is unavailable", async () => {
    const authToken = await makeAuthToken();
    const req = new Request("https://example.com/api/saju-new-year/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        reportId: "saju-new-year-test-report",
        sessionId: 1,
        chapter: 1,
        targetYear: 2026,
        name: "테스트A",
        gender: "F",
        year: 1992,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
        sajuData: makeSajuData(),
      }),
    });

    const res = await handleSajuNewYearRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.reportType).toBe("sajuNewYear");
    expect(data.featureType).toBe("saju_new_year_pdf");
    expect(data.chapter).toBe(1);
    expect(data.source).toBe("local");
    expect(data.usedFallback).toBe(true);
    expect(data.engineSource).toBeTruthy();
    expect(typeof data.text).toBe("string");
    expect(data.text.length).toBeGreaterThanOrEqual(3200);
    expect(Array.isArray(data.sections)).toBe(true);
    expect(data.sections.length).toBeGreaterThan(0);
    expect(data.storage).toMatchObject({
      sessionKey: expect.stringContaining("saju-new-year-test-report"),
      storedChapterCount: expect.any(Number),
    });
    expect(data.dataQuality).toMatchObject({
      engineSource: expect.any(String),
    });
  });
});
