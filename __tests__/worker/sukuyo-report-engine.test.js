/**
 * @jest-environment node
 */

import {
  buildCompatibilityContext,
  renderPremiumReport,
  validateReportText,
} from "../../worker/lib/sukyo-report-engine.js";

function buildInput({
  starA = "실숙",
  starB = "삼숙",
  relationType = "영친",
  distance = "중거리",
  score = 64,
} = {}) {
  return {
    personA: {
      displayName: "민서",
      syukuKorean: starA,
      element: "화",
      traits: ["신중함", "보호"],
    },
    personB: {
      displayName: "도윤",
      syukuKorean: starB,
      element: "수",
      traits: ["추진력", "움직임"],
    },
    relation: {
      typeKorean: relationType,
      distance,
      totalScore: score,
    },
    scores: {
      emotionalResonance: score,
    },
  };
}

function expectCleanChapters(input, chapterOrders = [1, 2, 3]) {
  const rendered = renderPremiumReport(input, { chapterOrders });
  const validation = validateReportText(rendered.chapters);
  const body = rendered.chapters
    .flatMap((chapter) => chapter.sections.map((section) => section.body))
    .join("\n");

  expect(rendered.chapters).toHaveLength(chapterOrders.length);
  expect(rendered.chapters.every((chapter) => chapter.sections.length === 5)).toBe(true);
  expect(validation.ok).toBe(true);
  expect(body).toContain(input.relation.typeKorean);
  expect(body).toContain(input.relation.distance);
  expect(body).not.toContain("A의");
  expect(body).not.toContain("B의");
  expect(body).not.toContain("실宿");
  expect(body).not.toContain("삼宿");
  expect(body).not.toContain("달빛을 한 번 짚으면");
  expect(rendered.chapters.every((chapter) => chapter.sections.every((section) => section.body.includes("예를 들어")))).toBe(true);
}

describe("sukuyo report local sentence engine", () => {
  test("normalizes compatibility context without long prose", () => {
    const ctx = buildCompatibilityContext(buildInput());

    expect(ctx.personAName).toBe("민서");
    expect(ctx.personBName).toBe("도윤");
    expect(ctx.starAName).toBe("실숙");
    expect(ctx.starBName).toBe("삼숙");
    expect(ctx.relationType).toBe("영친");
    expect(ctx.distance).toBe("중거리");
    expect(ctx.relationProfile.coreMeaning.length).toBeGreaterThan(10);
    expect(ctx.distanceProfile.coreMeaning.length).toBeGreaterThan(10);
  });

  test("renders chapters 1 to 3 for silsuk samsuk yeongchin middle distance", () => {
    expectCleanChapters(buildInput());
  });

  test("renders chapters 1 to 3 for angoe near distance", () => {
    expectCleanChapters(buildInput({
      starA: "묘숙",
      starB: "삼숙",
      relationType: "안괴",
      distance: "근거리",
      score: 58,
    }));
  });

  test("renders chapters 1 to 3 for yeongchin far distance", () => {
    expectCleanChapters(buildInput({
      relationType: "영친",
      distance: "원거리",
      score: 67,
    }));
  });

  test("renders chapters 1 to 3 for seongwi middle distance", () => {
    expectCleanChapters(buildInput({
      relationType: "성위",
      distance: "중거리",
      score: 61,
    }));
  });

  test("renders chapters 1 to 3 for myeong relationship", () => {
    expectCleanChapters(buildInput({
      relationType: "명",
      distance: "근거리",
      score: 72,
    }));
  });
});
