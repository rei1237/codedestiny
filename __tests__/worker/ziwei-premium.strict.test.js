/**
 * @jest-environment node
 *
 * 실행 예시:
 * npx jest __tests__/worker/ziwei-premium.strict.test.js --testEnvironment node
 */

let __ziweiTestUtils;
let handleZiweiBookRoutes;

let buildCanonicalZiweiChart;
let validateCanonicalZiweiChartStrict;
let buildZiweiReportPayloadFromBasicResult;
let buildZiweiPdfReportPayload;
let validateZiweiPdfPayload;
let hasZiweiBannedSummaryExpression;
let hasInvalidZiweiSummaryTable;
let detectCrossChapterRepeatedSentences;
let hasRequiredZiweiSpecificCoverage;
let signJwt;

const PALACES = [
  "명궁",
  "형제궁",
  "부처궁",
  "자녀궁",
  "재백궁",
  "질액궁",
  "천이궁",
  "교우궁",
  "관록궁",
  "전택궁",
  "복덕궁",
  "부모궁",
];

const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

function makeStructuredPayload() {
  return {
    yearGan: "갑자",
    meng: "자",
    shen: "오",
    juInfo: "화6국",
    sihuaData: {
      자미: { type: "화록", palaceName: "명궁" },
      무곡: { type: "화권", palaceName: "관록궁" },
    },
    palaceStarData: PALACES.map((palace, idx) => ({
      palace,
      branch: BRANCHES[idx],
      dahan: `${idx * 10}-${idx * 10 + 9}`,
      stars: [{ name: idx % 2 === 0 ? "자미" : "무곡", strength: idx % 2 === 0 ? "묘" : "득", symbol: idx % 2 === 0 ? "◎" : "O" }],
      auxStars: [{ name: "문창", strength: "리", symbol: "▲" }],
      badStars: [{ name: "경양", strength: "함", symbol: "X" }],
    })),
    annualLuck: { year: 2026, palace: "명궁" },
    monthlyLuck: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, palace: PALACES[i] })),
  };
}

function makeInput() {
  return {
    name: "테스터",
    gender: "F",
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    timezone: "Asia/Seoul",
  };
}

function makeBody() {
  return {
    name: "테스터",
    gender: "F",
    targetYear: 2026,
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    timezone: "Asia/Seoul",
    annualLuck: { year: 2026, palace: "명궁" },
    monthlyLuck: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, palace: PALACES[i] })),
  };
}

function makeQuality() {
  return {
    missingFields: [],
    supplementedFields: [],
    warnings: [],
    canonicalSummary: null,
  };
}

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  __ziweiTestUtils = mod.__ziweiTestUtils;
  handleZiweiBookRoutes = mod.handleZiweiBookRoutes;
  signJwt = jwtMod.signJwt;

  ({
    buildCanonicalZiweiChart,
    validateCanonicalZiweiChartStrict,
    buildZiweiReportPayloadFromBasicResult,
    buildZiweiPdfReportPayload,
    validateZiweiPdfPayload,
    hasZiweiBannedSummaryExpression,
    hasInvalidZiweiSummaryTable,
    detectCrossChapterRepeatedSentences,
    hasRequiredZiweiSpecificCoverage,
  } = __ziweiTestUtils);
});

describe("Ziwei Premium Strict Tests (A~G)", () => {
  test("A. canonical JSON은 12궁/명궁/신궁을 보존해야 한다", () => {
    const q = makeQuality();
    const chart = buildCanonicalZiweiChart(makeBody(), makeInput(), makeStructuredPayload(), "personal", "", q);
    const result = validateCanonicalZiweiChartStrict(chart, q);

    expect(chart.palaces).toHaveLength(12);
    expect(chart.chartMeta.mingGong).toBe("자");
    expect(chart.chartMeta.shenGong).toBe("오");
    expect(result.isValid).toBe(true);
  });

  test("B. 주성 강약/기호 누락 입력은 canonical builder에서 자동 보강되어야 한다", () => {
    const payload = makeStructuredPayload();
    payload.palaceStarData[0].stars = [{ name: "자미" }];

    const q = makeQuality();
    const chart = buildCanonicalZiweiChart(makeBody(), makeInput(), payload, "personal", "", q);
    const result = validateCanonicalZiweiChartStrict(chart, q);

    expect(result.isValid).toBe(true);
    expect(chart.palaces[0].mainStars[0].brightness).toBeTruthy();
    expect(chart.palaces[0].mainStars[0].symbol).toBeTruthy();
    expect(q.supplementedFields.some((f) => f.includes("mainStars[0].brightness"))).toBe(true);
    expect(q.supplementedFields.some((f) => f.includes("mainStars[0].symbol"))).toBe(true);
  });

  test("B4. legacy 왕 강약은 canonical 기호를 ◎로 보강해야 한다", () => {
    const payload = makeStructuredPayload();
    payload.palaceStarData[0].stars = [{ name: "자미", strength: "왕" }];

    const q = makeQuality();
    const chart = buildCanonicalZiweiChart(makeBody(), makeInput(), payload, "personal", "", q);
    const result = validateCanonicalZiweiChartStrict(chart, q);
    const star = chart.palaces[0].mainStars[0];
    const strength = String(star?.brightnessKo || star?.brightness || star?.strength || "");

    expect(result.isValid).toBe(true);
    expect(["왕", "득"]).toContain(strength);
    expect(star?.symbol).toBe("◎");
  });

  test("B2. basic 결과 기반 어댑터는 reportPayload 핵심 필드를 복구해야 한다", () => {
    const q = makeQuality();
    const chart = buildCanonicalZiweiChart(makeBody(), makeInput(), makeStructuredPayload(), "personal", "", q);
    const basicResult = {
      input: {
        name: "테스터",
        gender: "F",
        birthDate: "1992-06-15",
        birthTime: "12:30",
        timezone: "Asia/Seoul",
      },
      chart,
    };

    const payloadFromBasic = buildZiweiReportPayloadFromBasicResult(basicResult, q);
    const mergedPayload = buildZiweiPdfReportPayload({
      basicZiweiResult: basicResult,
      userProfile: { name: "테스터", gender: "F", birthDate: "1992-06-15", birthTime: "12:30" },
      birthInput: { name: "테스터", gender: "F", birthDate: "1992-06-15", birthTime: "12:30", timezone: "Asia/Seoul" },
      existingReportPayload: null,
      canonicalZiweiChart: chart,
      dataQuality: q,
    });

    const validation = validateZiweiPdfPayload(mergedPayload, {
      birthDate: "1992-06-15",
      birthTime: "12:30",
    });

    expect(String(payloadFromBasic?.chartMeta?.mingGong || "")).toBeTruthy();
    expect(String(payloadFromBasic?.chartMeta?.shenGong || "")).toBeTruthy();
    expect(Array.isArray(payloadFromBasic?.palaces)).toBe(true);
    expect(validation.canGenerate).toBe(true);
    expect(validation.missingCriticalFields).toHaveLength(0);
  });

  test("B3. preferBasicEngine=true면 기본 엔진 chartMeta를 우선 반영해야 한다", () => {
    const q = makeQuality();
    const canonical = buildCanonicalZiweiChart(makeBody(), makeInput(), makeStructuredPayload(), "personal", "", q);
    const basicChart = JSON.parse(JSON.stringify(canonical));
    basicChart.chartMeta = {
      ...(basicChart.chartMeta || {}),
      mingGong: "해",
      shenGong: "축",
      yearStemBranch: "을축",
    };
    basicChart.sourcePayload = {
      ...(basicChart.sourcePayload || {}),
      meng: "해",
      shen: "축",
      yearGan: "을축",
    };

    const merged = buildZiweiPdfReportPayload({
      basicZiweiResult: {
        input: {
          name: "테스터",
          gender: "F",
          birthDate: "1992-06-15",
          birthTime: "12:30",
          timezone: "Asia/Seoul",
        },
        chart: basicChart,
      },
      userProfile: { name: "테스터", gender: "F", birthDate: "1992-06-15", birthTime: "12:30" },
      birthInput: { name: "테스터", gender: "F", birthDate: "1992-06-15", birthTime: "12:30", timezone: "Asia/Seoul" },
      existingReportPayload: null,
      canonicalZiweiChart: canonical,
      dataQuality: q,
      preferBasicEngine: true,
    });

    expect(merged.chartMeta.mingGong).toBe("해");
    expect(merged.chartMeta.shenGong).toBe("축");
    expect(merged.diagnostics.source).toMatch(/basicZiweiResult/);
    expect(merged.sourcePayload && typeof merged.sourcePayload).toBe("object");
  });

  test("C. 요약표에 '-' 결측 셀이 있으면 invalid table로 감지해야 한다", () => {
    const invalidTableText = [
      "### 12궁 전체 요약표",
      "| 궁위 | 지지 | 주성 |",
      "| --- | --- | --- |",
      "| 명궁 | - | 자미(묘,◎) |",
    ].join("\n");

    expect(hasInvalidZiweiSummaryTable(invalidTableText)).toBe(true);
  });

  test("D. 금지된 일반론 보완 문구를 탐지해야 한다", () => {
    const bannedText = "명반 데이터가 부족해 일반론으로 보완합니다.";
    expect(hasZiweiBannedSummaryExpression(bannedText)).toBe(true);
  });

  test("E. 이전 챕터와 동일한 장문 문장을 반복하면 감지해야 한다", () => {
    const repeated = "명궁과 신궁의 삼방사정 흐름을 기준으로 대궁 전개를 분리해 해석해야 실제 행동 전략이 선명해집니다.";
    const previousTexts = [repeated + "\n추가 문장입니다."];
    const candidate = repeated + "\n이번 챕터의 다른 문장입니다.";

    const duplicates = detectCrossChapterRepeatedSentences(candidate, previousTexts, 30);
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0]).toContain("명궁과 신궁");
  });

  test("F. 챕터 텍스트는 자미두수 근거 토큰 커버리지를 만족해야 한다", () => {
    const denseText = "명궁 신궁 삼방사정 사화를 기준으로 각 궁의 주성·보성·살성을 비교하고 대한/유년/유월 타이밍과 ◎ O △ 기호를 함께 제시합니다.";
    expect(hasRequiredZiweiSpecificCoverage(denseText)).toBe(true);
  });

  test("G. strict 모드에서 canonical 필수값 누락이면 /api/ziwei-book/session은 422를 유지해야 한다", async () => {
    const authToken = await signJwt({
      userId: "507f1f77bcf86cd799439011",
      email: "strict-test@example.com",
      role: "user",
    }, "dev-secret", {
      issuer: "code-destiny-api",
      audience: "code-destiny-web",
      expiresIn: "30m",
    });

    const req = new Request("https://example.com/api/ziwei-book/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        _premiumStrictValidation: true,
        sessionId: 1,
        chapter: 1,
        name: "테스터",
        gender: "F",
        year: 1992,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
        ziweiStructured: {
          meng: "",
          shen: "",
          palaceStarData: [
            {
              palace: "명궁",
              branch: "",
              stars: [{ name: "자미" }],
              auxStars: [],
              badStars: [],
            },
          ],
        },
      }),
    });

    const res = await handleZiweiBookRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.ok).toBe(false);
    expect(data.recovered).toBeUndefined();
    expect(data.code).toBe("ZIWEI_CORE_CHART_MISSING");
    expect(Array.isArray(data.missingFields)).toBe(true);
    expect(data.message).toMatch(/자미두수 명반 데이터를 서버에서 구성/);
  });

  test("H. ziweiStructured가 없어도 ziweiData 원문으로 canonical 복구가 가능해야 한다", async () => {
    const authToken = await signJwt({
      userId: "507f1f77bcf86cd799439011",
      email: "strict-test@example.com",
      role: "user",
    }, "dev-secret", {
      issuer: "code-destiny-api",
      audience: "code-destiny-web",
      expiresIn: "30m",
    });

    const ziweiLines = [
      "【자미두수 12궁 배치】",
      ...PALACES.map((palace, idx) => `${palace} [${BRANCHES[idx]}] → 주성: 자미·무곡 | 보성: 문창 | 살성: 경양`),
      "명궁(命宮) 지지: 자",
      "신궁(身宮) 지지: 오",
    ].join("\n");

    const req = new Request("https://example.com/api/ziwei-book/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        prepareOnly: true,
        _premiumStrictValidation: true,
        name: "테스터",
        gender: "F",
        year: 1992,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
        targetYear: 2026,
        ziweiData: ziweiLines,
      }),
    });

    const res = await handleZiweiBookRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.prepared).toBe(true);
    expect(Array.isArray(data.canonicalZiweiChart?.palaces)).toBe(true);
    expect(data.canonicalZiweiChart.palaces).toHaveLength(12);
    expect(data.validation?.isValid).toBe(true);
  });

  test("I. 성별이 없어도 생년월일 기반으로 prepareOnly가 성공해야 한다", async () => {
    const authToken = await signJwt({
      userId: "507f1f77bcf86cd799439011",
      email: "strict-test@example.com",
      role: "user",
    }, "dev-secret", {
      issuer: "code-destiny-api",
      audience: "code-destiny-web",
      expiresIn: "30m",
    });

    const ziweiLines = [
      "【자미두수 12궁 배치】",
      ...PALACES.map((palace, idx) => `${palace} [${BRANCHES[idx]}] → 주성: 자미·무곡 | 보성: 문창 | 살성: 경양`),
      "명궁(命宮) 지지: 자",
      "신궁(身宮) 지지: 오",
    ].join("\n");

    const req = new Request("https://example.com/api/ziwei-book/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        prepareOnly: true,
        name: "테스터",
        year: 1992,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
        targetYear: 2026,
        ziweiData: ziweiLines,
      }),
    });

    const res = await handleZiweiBookRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.prepared).toBe(true);
    expect(data.code).toBeUndefined();
  });

  test("J. 프로필 카드 birthData/profileId만으로도 strict prepare가 성공해야 한다", async () => {
    const authToken = await signJwt({
      userId: "507f1f77bcf86cd799439011",
      email: "strict-test@example.com",
      role: "user",
    }, "dev-secret", {
      issuer: "code-destiny-api",
      audience: "code-destiny-web",
      expiresIn: "30m",
    });

    const req = new Request("https://example.com/api/ziwei-book/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        prepareOnly: true,
        _premiumStrictPayload: true,
        _premiumStrictValidation: true,
        profileId: "card-profile-001",
        profile: {
          profileId: "card-profile-001",
          name: "카드유저",
          gender: "F",
          birthDate: "1992-06-15",
          birthTime: "12:30",
          calendarType: "solar",
          timezone: "Asia/Seoul",
        },
        birthData: {
          profileId: "card-profile-001",
          name: "카드유저",
          gender: "F",
          birthDate: "1992-06-15",
          birthTime: "12:30",
          calendarType: "solar",
          timezone: "Asia/Seoul",
        },
        ziweiStructured: makeStructuredPayload(),
      }),
    });

    const res = await handleZiweiBookRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.prepared).toBe(true);
    expect(data.validation?.isValid).toBe(true);
    expect(Number(data.totalChapters || 0)).toBe(10);
    expect(Array.isArray(data.chapterPlan)).toBe(true);
    expect(data.chapterPlan.length).toBe(Number(data.totalChapters || 0));
    expect(String(data?.reportPayload?.profile?.birth?.solarDate || "")).toBe("1992-06-15");
    expect(String(data?.reportPayload?.profile?.birth?.time || "")).toBe("12:30");
    expect(String(data?.basicZiweiResult?.input?.profileId || "")).toBe("card-profile-001");
  });

  test("K. ziweiData/ziweiStructured 없이도 birthData만으로 prepareOnly가 성공해야 한다", async () => {
    const authToken = await signJwt({
      userId: "507f1f77bcf86cd799439011",
      email: "strict-test@example.com",
      role: "user",
    }, "dev-secret", {
      issuer: "code-destiny-api",
      audience: "code-destiny-web",
      expiresIn: "30m",
    });

    const req = new Request("https://example.com/api/ziwei-book/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        prepareOnly: true,
        profile: {
          name: "서버독립",
          gender: "M",
          birthDate: "1988-03-21",
          birthTime: "09:20",
          calendarType: "solar",
          timezone: "Asia/Seoul",
        },
        birthData: {
          year: 1988,
          month: 3,
          day: 21,
          hour: 9,
          minute: 20,
        },
      }),
    });

    const res = await handleZiweiBookRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.prepared).toBe(true);
    expect(Number(data.totalChapters || 0)).toBe(10);
    expect(Array.isArray(data.canonicalZiweiChart?.palaces)).toBe(true);
    expect(data.canonicalZiweiChart.palaces).toHaveLength(12);
    expect(data.validation?.isValid).toBe(true);
  });
});
