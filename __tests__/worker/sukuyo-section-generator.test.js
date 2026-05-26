/**
 * @jest-environment node
 */

import {
  buildSukuyoPremiumReportObject,
  validateSukuyoSectionDraft,
} from "../../worker/lib/sukuyo-premium-section-generator.js";

describe("Sukuyo section generator", () => {
  const payload = {
    personA: {
      name: "Neo",
      mansion: "류",
      mansionHanja: "柳",
      keywordSummary: "따뜻하지만 경계가 분명한 유형",
    },
    personB: {
      name: "Mina",
      mansion: "성",
      mansionHanja: "星",
      keywordSummary: "즉각 반응하지만 마음이 오래 남는 유형",
    },
    compatibility: {
      relationType: "영친",
      relationTypeHan: "榮親",
      distanceLabel: "근거리",
      distanceType: "near",
    },
  };

  test("compatibility section validation passes when A/B mansions and relation anchors are present", () => {
    const text = [
      "류와 성의 조합은 영친 관계에서도 근거리 특유의 즉시성 때문에 감정 반응이 빠르게 연결됩니다.",
      "Neo의 류는 먼저 정서를 정리해 방향을 잡고, Mina의 성은 반응 속도가 빨라 서로의 체온을 빠르게 확인합니다.",
      "이 영친 근거리 궁합은 친밀감이 빨리 올라오지만, 그만큼 말 한마디의 압력도 강하게 체감된다는 점을 두 사람이 함께 이해해야 합니다.",
      "류와 성이 같은 장면을 바라보더라도 원하는 안전감의 형태가 다르므로, 초반에는 감정 확인과 일정 조율을 동시에 해 주는 방식이 가장 안정적입니다.",
      "두 사람 모두 상대의 애정 표현을 당연하게 넘기지 않고 즉시 피드백할 때 이 관계의 장점이 살아납니다.",
    ].join(" ");

    const result = validateSukuyoSectionDraft({
      mode: "compatibility",
      text,
      payload,
      previousTexts: [],
      sectionTitle: "관계 유형의 본질",
      minChars: 220,
    });

    expect(result.ok).toBe(true);
  });

  test("compatibility section validation fails when relation anchors are missing", () => {
    const text = "두 사람은 서로 다정하지만 때때로 감정 표현의 속도가 달라 오해가 생길 수 있습니다. 서로의 차이를 인정하는 태도가 중요합니다.";

    const result = validateSukuyoSectionDraft({
      mode: "compatibility",
      text,
      payload,
      previousTexts: [],
      sectionTitle: "관계 유형의 본질",
      minChars: 80,
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain("MISSING_PERSON_A_MANSION");
    expect(result.violations).toContain("MISSING_PERSON_B_MANSION");
    expect(result.violations).toContain("MISSING_RELATION_TYPE");
    expect(result.violations).toContain("MISSING_DISTANCE");
  });

  test("report object builder returns chapter -> sections -> content structure", () => {
    const report = buildSukuyoPremiumReportObject({
      mode: "compatibility",
      payload,
      chapters: [{
        key: "compat_ch_01",
        title: "1장. 두 사람의 본명숙과 첫 끌림의 구조",
        sections: [
          { heading: "A의 본명숙과 관계 반응", body: "Neo의 류는 가까운 관계일수록 조심스럽게 마음을 연다." },
          { heading: "B의 본명숙과 관계 반응", body: "Mina의 성은 감정이 움직이면 즉시 반응하는 편이다." },
        ],
      }],
    });

    expect(report.title).toContain("숙요 궁합 리포트");
    expect(Array.isArray(report.chapters)).toBe(true);
    expect(report.chapters).toHaveLength(1);
    expect(report.chapters[0].title).toBe("1장. 두 사람의 본명숙과 첫 끌림의 구조");
    expect(report.chapters[0].sections[0]).toEqual(expect.objectContaining({
      title: "A의 본명숙과 관계 반응",
      content: expect.any(String),
    }));
  });
});
