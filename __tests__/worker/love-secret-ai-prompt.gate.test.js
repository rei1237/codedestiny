/**
 * 연애 비책 전문가 상담 — "필수 절"(6개 그룹 전원 성공) 품질 게이트 계약 테스트.
 *
 * 이 파일이 지키는 것은 하나다: **한 그룹만 실패해도 조립본은 degraded 로 남고, 이슈는
 * 그 그룹에만 매핑되어 나머지 5개 그룹은 다시 쓰지 않는다.** 이게 깨지면 부분 성공한
 * 상담이 결제 후 전체 재생성(비용 2배) 되거나, 반대로 결손을 안은 채 완료 처리된다.
 * 순수 함수만 검증하므로 모킹이 필요 없다.
 */
import {
  LOVE_SECRET_AI_GROUPS,
  LOVE_SECRET_AI_GROUP_MIN_CHARS,
  LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS,
  assembleLoveSecretConsultation,
  validateLoveSecretConsultation,
  mapLoveSecretIssuesToGroups,
  countLoveSecretConsultationBodyChars,
  __loveSecretAiPromptTestUtils,
} from "../../worker/lib/love-secret-ai-prompt.js";

const { countSectionBodyChars } = __loveSecretAiPromptTestUtils;

// 장(그룹)을 넘나드는 문장이 겹치면 REPEATED_PASSAGE 에 걸리므로 전역 카운터로 문장마다 다르게 만든다.
let sentenceSeq = 0;
function filler(rawLength) {
  let text = "";
  while (text.length < rawLength) {
    sentenceSeq += 1;
    text += `문장 ${sentenceSeq}: 일간과 월지, 오행과 조후, 십성의 흐름을 근거로 관계의 태도를 짚습니다. `;
  }
  return text.slice(0, rawLength);
}

// 공백 제거 후 집계이므로 그룹 최소치(5,000자)를 넉넉히 넘기도록 원문 분량에 여유를 둔다.
const RAW_CHARS_PER_GROUP = 7200;

function buildGroupResult(group) {
  const perSection = Math.ceil(RAW_CHARS_PER_GROUP / group.sections.length);
  const sections = group.sections.map((section) => ({ title: section.title, body: filler(perSection) }));
  const extras = {};
  if (group.emits.includes("header")) {
    Object.assign(extras, {
      keywords: ["계수 일간", "정관 관계", "재회 흐름"],
      strategy: "지금은 속도를 늦추고 관계의 온도를 확인하는 시기입니다.",
      summaryTitle: "연애 비책 상담",
      oneLineDiagnosis: "지금은 관망보다 작은 확인이 필요한 때입니다.",
      relationshipTemperature: "미온 — 서서히 데워지는 중입니다.",
    });
  }
  if (group.emits.includes("timing")) {
    Object.assign(extras, { monthlyHighlights: { best: ["3월"], caution: ["7월"] }, luckyDates: [] });
  }
  if (group.emits.includes("actions")) {
    Object.assign(extras, { actionSecrets: [], sevenDayGuide: [] });
  }
  if (group.emits.includes("closing")) {
    Object.assign(extras, { finalMessage: filler(80) });
  }
  return {
    key: group.key,
    ok: true,
    sections,
    extras,
    chars: countSectionBodyChars(sections),
    reason: "",
    provider: "mock-provider",
    model: "mock-model",
    startedAt: 1,
    endedAt: 2,
    issues: [],
  };
}

function buildFullGroupResults() {
  return LOVE_SECRET_AI_GROUPS.map((group) => buildGroupResult(group));
}

const totalSectionCount = LOVE_SECRET_AI_GROUPS.reduce((sum, group) => sum + group.sections.length, 0);
const emptyContext = { input: {}, sajuResult: {} };

describe("6개 그룹이 전부 성공하면 품질 게이트를 통과한다", () => {
  test("조립본은 degraded 가 아니고, 이슈 없이 하한을 넘긴다", () => {
    const groupResults = buildFullGroupResults();
    const assembled = assembleLoveSecretConsultation(groupResults, emptyContext);

    expect(assembled.degraded).toBe(false);
    expect(assembled.sections).toHaveLength(totalSectionCount);
    expect(assembled.keywords).toHaveLength(3);
    expect(assembled.groupStatus.every((status) => status.ok)).toBe(true);

    const quality = validateLoveSecretConsultation(assembled, emptyContext);
    expect(quality.issues).toEqual([]);
    expect(quality.totalChars).toBeGreaterThanOrEqual(LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS);
    expect(quality.totalChars).toBe(countLoveSecretConsultationBodyChars(assembled));
  });
});

describe("한 그룹만 실패하면 결손이 그 그룹에만 매핑된다", () => {
  test("SECTION_EMPTY 이슈는 실패한 그룹 하나만 가리키고, 수리 대상도 그 그룹뿐이다", () => {
    const groupResults = buildFullGroupResults().map((result) =>
      result.key === "partner"
        ? { key: "partner", ok: false, sections: [], extras: {}, chars: 0, reason: "NO_SECTIONS", provider: "", model: "", startedAt: 1, endedAt: 2, issues: ["SECTION_EMPTY"] }
        : result
    );
    const partnerGroup = LOVE_SECRET_AI_GROUPS.find((group) => group.key === "partner");
    const assembled = assembleLoveSecretConsultation(groupResults, emptyContext);

    expect(assembled.degraded).toBe(true);
    expect(assembled.sections).toHaveLength(totalSectionCount - partnerGroup.sections.length);
    expect(assembled.groupStatus.find((status) => status.key === "partner").ok).toBe(false);
    // 실패하지 않은 5개 그룹은 여전히 정상으로 남아야 한다 — 전체가 오염되지 않는다.
    expect(assembled.groupStatus.filter((status) => status.key !== "partner").every((status) => status.ok)).toBe(true);

    const quality = validateLoveSecretConsultation(assembled, emptyContext);
    expect(quality.issues).toEqual(["SECTION_EMPTY:partner"]);

    const targets = mapLoveSecretIssuesToGroups(quality, groupResults);
    expect([...targets.keys()]).toEqual(["partner"]);
    expect(targets.get("partner").length).toBeGreaterThan(0);
  });

  test("그룹 분량이 자기 최소치의 70% 미만이면 SECTION_MIN_CHARS 로 그 그룹만 지목된다", () => {
    const groupResults = buildFullGroupResults().map((result) => {
      if (result.key !== "timing") return result;
      const thin = { title: result.sections[0].title, body: filler(200) };
      return { ...result, sections: [thin], chars: countSectionBodyChars([thin]) };
    });
    expect(groupResults.find((r) => r.key === "timing").chars).toBeLessThan(LOVE_SECRET_AI_GROUP_MIN_CHARS * 0.7);

    const assembled = assembleLoveSecretConsultation(groupResults, emptyContext);
    const quality = validateLoveSecretConsultation(assembled, emptyContext);
    expect(quality.issues).toContain("SECTION_MIN_CHARS:timing");
    expect(quality.issues).not.toEqual(expect.arrayContaining([expect.stringMatching(/^SECTION_(EMPTY|MIN_CHARS):(?!timing)/)]));

    const targets = mapLoveSecretIssuesToGroups(quality, groupResults);
    expect([...targets.keys()]).toEqual(["timing"]);
  });
});

describe("countLoveSecretConsultationBodyChars", () => {
  test("pdfSections → sections → answer 순으로 우선한다", () => {
    const withPdf = { pdfSections: [{ body: "가".repeat(100) }], sections: [{ body: "나".repeat(10) }], answer: "다".repeat(10) };
    expect(countLoveSecretConsultationBodyChars(withPdf)).toBe(100);

    const sectionsOnly = { pdfSections: [], sections: [{ body: "나".repeat(50) }], answer: "다".repeat(10) };
    expect(countLoveSecretConsultationBodyChars(sectionsOnly)).toBe(50);

    const answerOnly = { pdfSections: [], sections: [], answer: "다".repeat(30) };
    expect(countLoveSecretConsultationBodyChars(answerOnly)).toBe(30);
  });
});
