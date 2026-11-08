/**
 * 연애 비책 전문가 상담 — "필수 절"(6개 그룹 전원 성공) 품질 게이트 계약 테스트.
 *
 * 이 파일이 지키는 것은 하나다: **한 그룹만 실패해도 조립본은 degraded 로 남고, 이슈는
 * 그 그룹에만 매핑되어 나머지 5개 그룹은 다시 쓰지 않는다.** 이게 깨지면 부분 성공한
 * 상담이 결제 후 전체 재생성(비용 2배) 되거나, 반대로 결손을 안은 채 완료 처리된다.
 * 순수 함수만 검증하므로 모킹이 필요 없다.
 */
import { createHash } from "node:crypto";
import {
  LOVE_SECRET_AI_GROUPS,
  LOVE_SECRET_AI_GROUPS_V1,
  LOVE_SECRET_AI_GROUP_PLAN_VERSION,
  LOVE_SECRET_AI_SECTION_TITLES,
  buildLoveSecretGroupPrompt,
  dedupeLoveSecretSections,
  loveSecretGroupsForPlan,
  LOVE_SECRET_AI_GROUP_MIN_CHARS,
  LOVE_SECRET_AI_MIN_TOTAL_BODY_CHARS,
  LOVE_SPEAKER_BY_GROUP,
  assembleLoveSecretConsultation,
  buildLoveSecretGroupSystemPrompt,
  validateLoveSecretConsultation,
  mapLoveSecretIssuesToGroups,
  countLoveSecretConsultationBodyChars,
  parseLoveSecretGroupResponse,
  __loveSecretAiPromptTestUtils,
} from "../../worker/lib/love-secret-ai-prompt.js";
import { buildLoveSecretGroupFacts } from "../../worker/lib/love-secret-ai-facts.js";

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

describe("정밀지표 영문 키 0건", () => {
  const METRIC_KEYS = /attraction|stability|communication|conflict|confidence/;
  const sajuResult = {
    myChart: { loveReference: { precisionMetrics: { attraction: 74, stability: 58, communication: 49, conflict: 31, confidence: 82 } } },
  };

  test("self·partner 팩트는 영문 키와 점수 대신 한국어 라벨과 등급을 넘긴다", () => {
    const self = buildLoveSecretGroupFacts(sajuResult, "self");
    const partner = buildLoveSecretGroupFacts(sajuResult, "partner");
    const expected = { 끌림: "높음", 안정성: "보통", 소통: "낮음", "갈등 신호": "낮음", "해석 신뢰도": "높음" };
    expect(self.정밀지표).toEqual(expected);
    expect(partner.끌림지표).toEqual(expected);
    expect(JSON.stringify([self, partner])).not.toMatch(METRIC_KEYS);
  });

  test("본문에 남은 '한국어(영문 키)' 꼬리는 파싱에서 지운다", () => {
    const group = LOVE_SECRET_AI_GROUPS[0];
    const body = "매력(attraction)은 높은 편이고 안정성(stability)도 무난합니다. 소통은 천천히 열립니다.".repeat(40);
    const text = JSON.stringify({ sections: group.sections.map((section) => ({ title: section.title, body })) });
    const result = parseLoveSecretGroupResponse(text, group);
    expect(result.sections.length).toBeGreaterThan(0);
    result.sections.forEach((section) => {
      expect(section.body).not.toMatch(METRIC_KEYS);
      expect(section.body).toContain("매력은 높은 편이고 안정성도 무난합니다.");
    });
  });
});

describe("공동 마스터(연이·서한비) 화자 배정", () => {
  test("7개 그룹 모두 화자가 있고, 상대·위험·시기는 서한비, 나머지는 연이다", () => {
    expect(Object.keys(LOVE_SPEAKER_BY_GROUP).sort()).toEqual(LOVE_SECRET_AI_GROUPS.map((group) => group.key).sort());
    expect(LOVE_SPEAKER_BY_GROUP).toEqual({ nature: "yeoni", core: "yeoni", self: "yeoni", partner: "hanbi", risk: "hanbi", timing: "hanbi", action: "yeoni" });
  });

  test("페르소나가 없으면 그룹 시스템 프롬프트는 예전과 바이트 단위로 같다", () => {
    const group = LOVE_SECRET_AI_GROUPS[0];
    const legacy = [
      "BASE",
      "",
      `이번 응답에서는 상담의 한 부분 — "${group.label}" — 만 씁니다. 나머지 부분은 같은 상담의 다른 곳에서 이미 다루므로 여기서 반복하지 않습니다.`,
      "계산되지 않은 날짜·간지·신살을 만들어 쓰지 않습니다. 제공된 계산 확정값 안에서만 해석합니다.",
    ].join("\n");
    expect(buildLoveSecretGroupSystemPrompt("BASE", group)).toBe(legacy);
    expect(buildLoveSecretGroupSystemPrompt("BASE", group, "")).toBe(legacy);
  });

  test("페르소나는 base 와 범위 지시 사이에 들어가고, 그 그룹의 화자 이름을 밝힌다", () => {
    const partner = LOVE_SECRET_AI_GROUPS.find((group) => group.key === "partner");
    const prompt = buildLoveSecretGroupSystemPrompt("BASE", partner, "[서한비 페르소나]");
    expect(prompt.startsWith("BASE\n\n")).toBe(true);
    expect(prompt).toContain("이번 부는 서한비가 씁니다.");
    expect(prompt.indexOf("[서한비 페르소나]")).toBeLessThan(prompt.indexOf("이번 응답에서는 상담의 한 부분"));
    const action = LOVE_SECRET_AI_GROUPS.find((group) => group.key === "action");
    expect(buildLoveSecretGroupSystemPrompt("BASE", action, "[연이 페르소나]")).toContain("이번 부는 연이가 씁니다.");
  });
});

describe("그룹 계획 V1/V2", () => {
  const input = { myInfo: { name: "가" }, relationshipStatus: "썸", topic: "연락", userQuestion: "언제 연락할까요?" };
  const saju = { facts: ["일간 병화"] };

  test("V2 는 타고난 연애 기질(nature, 연이)을 맨 앞에 둔 7개 그룹이고 V1 제목을 모두 품는다", () => {
    expect(LOVE_SECRET_AI_GROUP_PLAN_VERSION).toBe(2);
    expect(LOVE_SECRET_AI_GROUPS.map((group) => group.key)).toEqual(["nature", "core", "self", "partner", "risk", "timing", "action"]);
    expect(LOVE_SECRET_AI_GROUPS[0].sections.map((section) => section.field)).toEqual(["natureArchetype", "natureEmpathyScenes"]);
    expect(LOVE_SPEAKER_BY_GROUP.nature).toBe("yeoni");
    const v1Titles = LOVE_SECRET_AI_GROUPS_V1.flatMap((group) => group.sections.map((section) => section.title));
    expect(v1Titles.every((title) => LOVE_SECRET_AI_SECTION_TITLES.includes(title))).toBe(true);
    expect(LOVE_SECRET_AI_SECTION_TITLES).toHaveLength(30);
    expect(LOVE_SECRET_AI_SECTION_TITLES.join("")).not.toMatch(/PDF|챕터/i);
  });

  test("버전이 없는 예전 세션은 V1 계획을 쓴다", () => {
    expect(loveSecretGroupsForPlan(undefined)).toBe(LOVE_SECRET_AI_GROUPS_V1);
    expect(loveSecretGroupsForPlan(1)).toBe(LOVE_SECRET_AI_GROUPS_V1);
    expect(loveSecretGroupsForPlan(2)).toBe(LOVE_SECRET_AI_GROUPS);
  });

  test("V1 그룹 프롬프트는 2026-11-08 이전과 바이트 단위로 같다", () => {
    const joined = LOVE_SECRET_AI_GROUPS_V1.map((group) => buildLoveSecretGroupPrompt(input, saju, group)
      + "\n#SYS\n" + buildLoveSecretGroupSystemPrompt("BASE", group, "P")).join("\n=====\n");
    expect(createHash("sha256").update(joined).digest("hex")).toBe("f87e118c79bdb8bfff9c20798ff84c30c7740fbb3e98e4bed9dc000c91e95461");
  });

  test("V2 프롬프트: 관점·되풀이 금지가 붙고, 질문 인용은 core 첫 문장에서만 한다", () => {
    const prompts = Object.fromEntries(LOVE_SECRET_AI_GROUPS.map((group) => [group.key, buildLoveSecretGroupPrompt(input, saju, group)]));
    Object.values(prompts).forEach((prompt) => {
      expect(prompt).toContain("이 부분의 관점:");
      expect(prompt).toContain("'결국 중요한 것은', '다시 말해', '앞서 말했듯'");
      expect(prompt).toContain("같은 여는 문장이나 같은 맺는 문장을 되풀이하지 않습니다");
    });
    expect(prompts.core).toContain("첫 문장에서 한 번만 인용");
    expect(prompts.nature).toContain("질문에 답하지 않고 질문을 인용하지도 않습니다");
    ["self", "partner", "risk", "timing", "action"].forEach((key) => expect(prompts[key]).toContain("사용자의 질문을 다시 인용하지 않습니다"));
    expect(prompts.core).not.toContain("타고난 성향 총론을 먼저 짚는다");
  });

  test("분량: V2 그룹은 6000~7500자·섹션 최소 분량을, V1 그룹은 5000~6500자를 요구한다", () => {
    LOVE_SECRET_AI_GROUPS.forEach((group) => {
      const prompt = buildLoveSecretGroupPrompt(input, saju, group);
      expect(prompt).toContain("합계는 6000~7500자");
      expect(prompt).toContain("짧게 요약하고 끝내지 말고");
    });
    LOVE_SECRET_AI_GROUPS_V1.forEach((group) => expect(buildLoveSecretGroupPrompt(input, saju, group)).toContain("합계는 5000~6500자"));
  });
});

describe("그룹 사이 되풀이 문장 정리", () => {
  const repeated = "답장을 기다리는 밤마다 마음이 먼저 앞서 나가는 결이 반복됩니다.";
  test("뒤 섹션의 되풀이 문장만 지우고 answer·reading 을 맞춘다", () => {
    const assembled = {
      sections: [
        { title: "타고난 연애 기질 — 당신이 사랑하는 방식의 원형", body: `${repeated} 일간 병화의 결입니다.` },
        { title: "현재 관계의 자리와 질문의 핵심", body: `${repeated} 지금은 기다릴 때입니다.` },
      ],
      reading: { relationshipCore: `${repeated} 지금은 기다릴 때입니다.` },
      answer: "",
    };
    const result = dedupeLoveSecretSections(assembled);
    expect(result.sections[0].body).toContain(repeated);
    expect(result.sections[1].body).toBe("지금은 기다릴 때입니다.");
    expect(result.reading.relationshipCore).toBe("지금은 기다릴 때입니다.");
    expect(result.answer).toBe(`${assembled.sections[0].title}
${assembled.sections[0].body}

${assembled.sections[1].title}
지금은 기다릴 때입니다.`);
  });

  test("섹션이 통째로 지워지면 원문을 그대로 둔다", () => {
    const assembled = { sections: [{ title: "a", body: repeated }, { title: "b", body: repeated }], reading: {}, answer: "x" };
    expect(dedupeLoveSecretSections(assembled)).toBe(assembled);
  });
});
