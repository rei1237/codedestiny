/**
 * @jest-environment node
 */

let sibylUtils;
let handleKasiRoutes;

beforeAll(async () => {
  const sibylMod = await import("../../worker/routes/sibyl.js");
  sibylUtils = sibylMod.__sibylReportTestUtils;

  const kasiMod = await import("../../worker/routes/kasi.js");
  handleKasiRoutes = kasiMod.handleKasiRoutes;
});

describe("Sibyl flow and KASI smoke", () => {
  test("무료 결과용 canonical 정규화가 온건한 모드 타이틀을 반환한다", () => {
    const canonical = sibylUtils.normalizeCanonicalSibylData({
      riskScore: 82,
      dominantEl: "water",
      dominantTenStar: "편재",
      profile: {
        gender: "F",
        birth: { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
      },
      pillars: {
        year: { g: "임", j: "신" },
        month: { g: "정", j: "오" },
        day: { g: "갑", j: "인" },
        hour: { g: "기", j: "유" },
      },
    });

    expect(canonical.classification.title).toBe("집중 재정비 모드");
    expect(canonical.sibyl.modeTitle).toBe("집중 재정비 모드");
    expect(canonical.classification.title).not.toMatch(/완전 해체|파괴|긴급 경보/);
  });

  test("유료 결과용 fallback chapterMap이 10개 모두 기준 길이를 충족한다", () => {
    const canonical = sibylUtils.normalizeCanonicalSibylData({
      riskScore: 58,
      dominantEl: "wood",
      dominantTenStar: "정관",
      profile: {
        gender: "M",
        birth: { year: 1990, month: 4, day: 3, hour: 9, minute: 0 },
      },
    });

    const mapped = sibylUtils.mapToSibylChapters([], canonical);
    expect(mapped.chapterList).toHaveLength(10);
    expect(Object.keys(mapped.chapterMap)).toHaveLength(10);
    expect(mapped.chapterList[8].title).toBe("CH.09 시스템 리스크 가이드");
    expect(mapped.chapterList[9].title).toBe("CH.10 최종 실행 가이드");
    expect(() => sibylUtils.validateSibylReport(mapped.chapterMap)).not.toThrow();
  });

  test("핵심 사주값이 누락되어도 기둥 기반 계산으로 canonical 필드를 보강한다", () => {
    const canonical = sibylUtils.normalizeCanonicalSibylData({
      riskScore: 63,
      profile: {
        gender: "F",
        birth: { year: 1994, month: 11, day: 4, hour: 8, minute: 15 },
      },
      pillars: {
        year: { g: "갑", j: "술" },
        month: { g: "병", j: "자" },
        day: { g: "을", j: "묘" },
        hour: { g: "경", j: "진" },
      },
    });

    expect(canonical.saju.dayMaster).toBe("을");
    expect(canonical.saju.dominantElement).toMatch(/wood|fire|earth|metal|water/);
    expect(canonical.saju.tenGodSummary.dominantTenGod).not.toBe("미상");
    expect(canonical.sibyl.dominantTenGod).not.toBe("미상");
    expect(canonical.yearlyFlow[0].pillar).toBeTruthy();
  });

  test("KASI 업스트림 장애 시 200 local fallback 응답을 반환한다", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => {
      const payload = {
        response: {
          header: {
            resultCode: "99",
            resultMsg: "SERVICE ERROR",
          },
        },
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    try {
      const req = new Request("http://localhost/api/kasi/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "getLunCalInfo",
          params: { solYear: "2026", solMonth: "05", solDay: "13" },
        }),
      });

      const res = await handleKasiRoutes(req, {
        KASI_SERVICE_KEY: "dummy-key",
      });
      const payload = await res.json();

      expect(res.status).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.source).toBe("local");
      expect(Array.isArray(payload.warnings)).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
