/**
 * @jest-environment node
 */

describe("Ziwei PDF flow guards", () => {
  let pipeline;

  beforeAll(async () => {
    pipeline = await import("../../worker/lib/ziwei-pdf-pipeline.js");
  });

  test("mapZiweiStrengthSymbol 매핑이 명세와 일치한다", () => {
    expect(pipeline.mapZiweiStrengthSymbol("묘")).toBe("◎");
    expect(pipeline.mapZiweiStrengthSymbol("왕")).toBe("◎");
    expect(pipeline.mapZiweiStrengthSymbol("득")).toBe("O");
    expect(pipeline.mapZiweiStrengthSymbol("리")).toBe("▲");
    expect(pipeline.mapZiweiStrengthSymbol("평")).toBe("△");
    expect(pipeline.mapZiweiStrengthSymbol("함")).toBe("X");
    expect(pipeline.mapZiweiStrengthSymbol("실")).toBe("X");
    expect(pipeline.mapZiweiStrengthSymbol("알수없음")).toBe("△");
  });

  test("validateZiweiPdfPayload 필수 필드 누락을 검출한다", () => {
    const valid = {
      chart: {
        mingPalace: "ming",
        shenPalace: "career",
        palaces: Array.from({ length: 12 }, (_, idx) => ({ key: `p${idx + 1}` })),
      },
      chapters: [
        {
          id: "ch_1",
          title: "chapter",
          categories: [
            {
              id: "cat_1",
              title: "category",
              sourceData: {
                stars: [{ name: "자미", brightness: "묘", strengthSymbol: "◎" }],
              },
            },
          ],
        },
      ],
    };

    expect(pipeline.validateZiweiPdfPayload(valid).ok).toBe(true);

    const noPalaces = JSON.parse(JSON.stringify(valid));
    noPalaces.chart.palaces = [];
    expect(pipeline.validateZiweiPdfPayload(noPalaces).ok).toBe(false);

    const noMing = JSON.parse(JSON.stringify(valid));
    noMing.chart.mingPalace = "";
    expect(pipeline.validateZiweiPdfPayload(noMing).ok).toBe(false);

    const noShen = JSON.parse(JSON.stringify(valid));
    noShen.chart.shenPalace = "";
    expect(pipeline.validateZiweiPdfPayload(noShen).ok).toBe(false);

    const noSource = JSON.parse(JSON.stringify(valid));
    noSource.chapters[0].categories[0].sourceData = {};
    expect(pipeline.validateZiweiPdfPayload(noSource).ok).toBe(false);

    const noStarField = JSON.parse(JSON.stringify(valid));
    noStarField.chapters[0].categories[0].sourceData.stars = [{ name: "", brightness: "", strengthSymbol: "" }];
    expect(pipeline.validateZiweiPdfPayload(noStarField).ok).toBe(false);
  });

  test("assertNoZiweiPdfFallbackText 금지어를 차단한다", () => {
    expect(() => pipeline.assertNoZiweiPdfFallbackText("정상 상담문 본문입니다.")).not.toThrow();
    expect(() => pipeline.assertNoZiweiPdfFallbackText("이 섹션은 기본 골격입니다")).toThrow();
    expect(() => pipeline.assertNoZiweiPdfFallbackText("자동 복구 생성 완료")) .toThrow();
    expect(() => pipeline.assertNoZiweiPdfFallbackText("서버 응답이 불안정하여")) .toThrow();
  });

  test("buildZiweiPdfPayload dry-run: sourceData를 포함한 payload를 생성한다", () => {
    const context = {
      userProfile: {
        name: "테스터",
        gender: "F",
        birthDate: "1992-06-15",
        birthTime: "12:30",
      },
      chartMeta: {
        mingPalaceKey: "ming",
        bodyPalaceKey: "career",
      },
      palaces: Array.from({ length: 12 }, (_, idx) => ({
        key: idx === 0 ? "ming" : idx === 8 ? "career" : `p${idx + 1}`,
        name: `궁${idx + 1}`,
        branch: "자",
        mainStars: [{ name: "자미", strength: "묘", symbol: "◎" }],
        assistantStars: [],
        minorStars: [],
        maleficStars: [],
        sihua: [{ star: "자미", type: "화록" }],
      })),
      stars: {},
      cycles: {
        annual: { year: 2026 },
        monthly: [{ month: 1 }],
        daXian: [{ range: "20-29" }],
      },
      relationships: {
        sanfangsazheng: "삼방사정",
      },
    };

    const payload = pipeline.buildZiweiPdfPayload({ context, user: context.userProfile });
    expect(payload.chart.palaces.length).toBe(12);
    expect(payload.chapters.length).toBeGreaterThan(0);
    expect(payload.chapters[0].categories.length).toBeGreaterThan(0);
    expect(payload.chapters[0].categories[0].sourceData).toBeTruthy();
    expect(pipeline.validateZiweiPdfPayload(payload).ok).toBe(true);
  });
});
