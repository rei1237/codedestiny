/**
 * 사주 고급 궁합 프롬프트 모듈 계약.
 * 그룹 파싱·결정적 교정(단정 문장 제거, 긴 문단 분할), 완성 판정, 완성본만 조립을 지킨다.
 */
import {
  SAJU_COMPAT_PREMIUM_GROUPS,
  SAJU_COMPAT_PREMIUM_PARAGRAPH_MAX_CHARS,
  assembleSajuCompatPremiumResult,
  buildSajuCompatPremiumGroupPrompt,
  findSajuCompatPremiumGroup,
  isSajuCompatPremiumComplete,
  isSajuCompatPremiumGroupUsable,
  parseSajuCompatPremiumGroupResponse,
  scrubSajuCompatPremiumSentences,
  splitLongParagraphs,
} from "../../worker/lib/saju-compat-premium-prompt.js";
import {
  calculateSajuCompatPremiumFacts,
  normalizeSajuCompatPremiumInput,
} from "../../worker/lib/saju-compat-premium-facts.js";

const NORMALIZED = normalizeSajuCompatPremiumInput({
  self: { birthDate: "1990-05-15", birthTime: "14:30", gender: "male" },
  partner: { birthDate: "1992-11-03", birthTimeUnknown: true, gender: "female" },
  relationType: "dating",
});
const FACTS = calculateSajuCompatPremiumFacts(NORMALIZED.input, { nowMs: Date.UTC(2026, 10, 20) });

const TOPICS = ["햇살", "강물", "바람", "흙길", "별빛", "새벽", "노을", "숲길", "파도", "달빛", "봄비", "들꽃"];
function body(seed, count = 20) {
  return Array.from({ length: count }, (_, index) => {
    const topic = TOPICS[(seed + index) % TOPICS.length];
    return `${seed}번째 장의 ${index + 1}번 문장은 ${topic}처럼 두 사람이 서로의 속도를 맞추는 장면을 차분하게 그려 보입니다.`;
  }).reduce((acc, sentence, index) => acc + (index && index % 4 === 0 ? "\n\n" : index ? " " : "") + sentence, "");
}

function groupResponse(group, seed) {
  const payload = { sections: group.sections.map((item, index) => ({ title: item.title, body: body(seed * 10 + index) })) };
  if (group.emits.includes("header")) Object.assign(payload, { summaryTitle: "물과 쇠의 궁합", oneLine: "서로를 식히고 다듬는 관계입니다.", keywords: ["보완", "대화"] });
  if (group.emits.includes("actions")) payload.actionTips = ["이번 주에는 하루 10분 대화합니다."];
  if (group.emits.includes("closing")) payload.finalMessage = "천천히 함께 가면 됩니다.";
  return JSON.stringify(payload);
}

describe("saju-compat-premium prompt", () => {
  test("그룹은 4장이고 신뢰 장 프롬프트는 단정·비난 금지와 이름 없는 사실만 싣는다", () => {
    expect(SAJU_COMPAT_PREMIUM_GROUPS.map((group) => group.label)).toEqual(["관계 총론", "성향·소통", "신뢰·이성 기질", "시기·실천"]);
    const prompt = buildSajuCompatPremiumGroupPrompt(FACTS, findSajuCompatPremiumGroup("trust"));
    expect(prompt).toMatch(/단정·비난 표현은 쓰지 않는다/);
    expect(prompt).toMatch(/\[상대 이성 기질\] 등급/);
    expect(prompt).toMatch(/시주 미사용/);
  });

  test("정상 응답은 계획 제목으로 고정되고 완성으로 판정된다", () => {
    const group = findSajuCompatPremiumGroup("overview");
    const row = parseSajuCompatPremiumGroupResponse(`\`\`\`json\n${groupResponse(group, 1)}\n\`\`\``, group);
    expect(row.issues).toEqual([]);
    expect(row.ok).toBe(true);
    expect(row.sections.map((item) => item.title)).toEqual(group.sections.map((item) => item.title));
    expect(row.extras.summaryTitle).toBe("물과 쇠의 궁합");
    expect(isSajuCompatPremiumGroupUsable(row, group)).toBe(true);
  });

  test("짧은 응답과 파싱 실패는 거부 사유를 남긴다", () => {
    const group = findSajuCompatPremiumGroup("temperament");
    const short = parseSajuCompatPremiumGroupResponse(JSON.stringify({ sections: [{ title: group.sections[0].title, body: "짧습니다." }] }), group);
    expect(short.ok).toBe(false);
    expect(short.issues).toEqual(expect.arrayContaining(["REQUIRED_SECTIONS_INCOMPLETE", "LENGTH_SHORT"]));
    expect(parseSajuCompatPremiumGroupResponse("응답 없음", group).reason).toBe("PARSE_FAILED");
  });

  test("단정·비난·메타 문장만 덜어 내고 긴 문단은 문장 경계에서 나눈다", () => {
    const scrubbed = scrubSajuCompatPremiumSentences("상대는 따뜻합니다. 상대는 바람둥이입니다. 대화가 중요합니다. JSON 으로 답합니다.");
    expect(scrubbed).toEqual({ body: "상대는 따뜻합니다. 대화가 중요합니다.", dropped: 2 });
    const long = Array.from({ length: 20 }, (_, index) => `${index}번째 문장은 관계를 천천히 돌아보는 내용입니다.`).join(" ");
    const parts = splitLongParagraphs(long).split("\n\n");
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((part) => part.length <= SAJU_COMPAT_PREMIUM_PARAGRAPH_MAX_CHARS)).toBe(true);
  });

  test("네 그룹이 모두 완성돼야만 결과를 조립한다", () => {
    const rows = SAJU_COMPAT_PREMIUM_GROUPS.map((group, index) => parseSajuCompatPremiumGroupResponse(groupResponse(group, index + 1), group));
    expect(rows.every((row) => row.ok)).toBe(true);
    expect(isSajuCompatPremiumComplete(rows.slice(0, 3))).toBe(false);
    expect(assembleSajuCompatPremiumResult(rows.slice(0, 3), FACTS)).toBeNull();
    const result = assembleSajuCompatPremiumResult(rows, FACTS);
    expect(result.chapters.map((chapter) => chapter.key)).toEqual(["overview", "temperament", "trust", "timing"]);
    expect(result.actionTips).toHaveLength(1);
    expect(result.staticCards.partner.timeUnknown).toBe(true);
    expect(result.staticCards.pastLife.title).toBe(FACTS.pastLife.title);
    expect(result.temperamentCaution).toBe(FACTS.partnerTemperament.caution);
  });
});
