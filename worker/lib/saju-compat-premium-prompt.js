/**
 * 사주 고급 궁합(saju-compat-premium) LLM 4장 프롬프트·파서·조립.
 *
 * - 명식·궁합 사실은 saju-compat-premium-facts.js 가 결정적으로 계산한다. LLM 은 그 사실만 해석한다.
 * - 신뢰·이성 기질 장은 partnerTemperament.evidence 에 있는 근거만 풀어 쓴다. 단정·비난 표현은 거부 대신
 *   해당 문장을 결정적으로 덜어 낸다(규칙 17: 형식 위반은 교정).
 * - 분량: 그룹 목표 2,400~3,200자, 받는 하한은 목표 하한의 60%(≤80% 규칙). 출력 토큰은 상한+머리말+thinking 몫.
 * - 레거시 saju-compat-schema/prompts 를 참조하지 않는다(2026-11-20 사용자 지시).
 */
import { salvageTruncatedJsonObject } from "../../lib/llm-text.js";
import { jsonSchemaFromExample } from "./json-text-repair.js";
import { countPaidReportBodyChars, dropRepeatedReportSentences, hasRepeatedReportPassage } from "./paid-report-quality.js";

export const SAJU_COMPAT_PREMIUM_PROMPT_VERSION = "saju-compat-premium-prompt-v1";
export const SAJU_COMPAT_PREMIUM_GROUP_MIN_CHARS = 2400;
export const SAJU_COMPAT_PREMIUM_GROUP_MAX_CHARS = 3200;
/** 받는 하한 = 목표 하한 × 0.6. 목표만 올리고 하한은 목표의 80% 이하로 둔다(규칙 17). */
export const SAJU_COMPAT_PREMIUM_ACCEPT_RATIO = 0.6;
/** 3,200자 상한(≈2,400토큰) + JSON 머리말 + thinking 여유. */
export const SAJU_COMPAT_PREMIUM_MAX_OUTPUT_TOKENS = 8192;
/** 문단이 이보다 길면 문장 경계에서 결정적으로 나눈다. */
export const SAJU_COMPAT_PREMIUM_PARAGRAPH_MAX_CHARS = 420;

// 단정·비난·공포 조장. /g 를 쓰지 않는다(RegExp.test lastIndex 함정).
const FORBIDDEN_SENTENCE_PATTERN = /바람둥이|외도(를|할|한다|했|하는)|불륜|배신(한다|할 것|했)|반드시\s*(바람|헤어|이별|배신)|틀림없|100\s*%|무조건\s*(헤어|이별|바람)|이혼(한다|할 것)|저주|액운이\s*낀/u;
const META_PATTERN = /(JSON|프롬프트|계산값\s*키|evidence|partnerTemperament|axisScores|AI\s*로서|언어\s*모델)/u;

export const SAJU_COMPAT_PREMIUM_SYSTEM_PROMPT = `당신은 30년 경력의 사주 명리학자이자 관계 상담사입니다.
두 사람의 명식에서 이미 계산된 사실만 근거로 궁합을 풀어 씁니다. 계산되지 않은 신살·용신·날짜를 새로 지어내지 않습니다.
말투는 따뜻하고 단정한 존댓말입니다. 겁주거나 단정하지 않고, 상대를 비난하지 않습니다.
상대의 실제 행동(외도·배신 등)을 판정하거나 예언하지 않습니다. 명식은 경향일 뿐이며 대화와 신뢰가 더 중요한 근거라고 안내합니다.
출생 시각을 모르는 사람이 있으면 시주를 쓰지 않고, 그 한계를 한 번만 짧게 밝힙니다.
코드·키 이름·JSON·영어 용어를 본문에 쓰지 않습니다. 각 섹션은 3~5개 문단, 문단은 3~5문장으로 씁니다.
응답은 지정한 JSON 형식 하나만 돌려줍니다.`;

const section = (title, field, guide) => Object.freeze({ title, field, guide });

export const SAJU_COMPAT_PREMIUM_GROUPS = Object.freeze([
  Object.freeze({
    key: "overview",
    label: "관계 총론",
    emits: Object.freeze(["header"]),
    sections: Object.freeze([
      section("두 사람이 만나는 자리", "relationshipCore", "두 일간의 생극 관계와 서로에게 어떤 십성으로 비치는지로 관계의 첫 결을 확정한다. 관계 유형(연애·결혼 등)에 맞춰 지금 이 관계가 어떤 자리에 서 있는지 말한다."),
      section("궁합 네 축의 큰 그림", "axisOverview", "끌림·안정·소통·지구력 네 점수의 높고 낮음을 생활 장면으로 번역한다. 점수는 경향이며 노력으로 바뀌는 부분을 함께 짚는다."),
    ]),
  }),
  Object.freeze({
    key: "temperament",
    label: "성향·소통",
    emits: Object.freeze([]),
    sections: Object.freeze([
      section("오행으로 보는 서로의 빈자리", "elementComplement", "오행 보완 사실(누가 누구의 부족한 기운을 채우는지, 함께 넘치거나 함께 비는 기운)을 감정 온도와 생활 습관으로 풀어 쓴다."),
      section("말이 엇갈리는 지점과 풀리는 방식", "communication", "지지의 합·충·형·해 목록과 서로를 비추는 십성으로 갈등이 생기는 장면과 대화가 풀리는 순서를 구체적으로 쓴다."),
    ]),
  }),
  Object.freeze({
    key: "trust",
    label: "신뢰·이성 기질",
    emits: Object.freeze([]),
    sections: Object.freeze([
      section("상대의 이성 기질 — 계산된 근거로 읽기", "partnerTemperament", "제공된 이성 기질 등급과 근거 항목만 하나씩 풀어 쓴다. 근거 목록에 없는 신살이나 사실을 더하지 않는다. 행동을 판정하거나 단정하지 않고, 이것이 경향일 뿐임을 분명히 한다."),
      section("신뢰를 지키는 두 사람의 방식", "trustPractice", "그 경향이 관계에서 불안으로 번지지 않게 하는 대화 방식·약속·거리 조절을 배우자궁과 일지 관계 근거로 제안한다. 감시나 통제를 권하지 않는다."),
    ]),
  }),
  Object.freeze({
    key: "timing",
    label: "시기·실천",
    emits: Object.freeze(["actions", "closing"]),
    sections: Object.freeze([
      section("앞으로 3년, 관계의 흐름", "timingFlow", "두 사람의 현재 대운과 제공된 세운 3년 간지·십성만으로 해마다 관계에 열리는 기회와 조심할 결을 쓴다. 날짜를 지어내지 않는다."),
      section("두 사람을 위한 실천 비책", "practice", "앞선 근거를 묶어 이번 주·이번 달·올해 해 볼 실천을 구체적으로 제안한다."),
    ]),
  }),
]);

export function findSajuCompatPremiumGroup(key) {
  return SAJU_COMPAT_PREMIUM_GROUPS.find((group) => group.key === key) || null;
}

function clean(value, max = 0) {
  const text = String(value ?? "").replace(/\u0000/g, "").trim();
  return max > 0 && text.length > max ? text.slice(0, max) : text;
}

function groupJsonSkeleton(group) {
  const example = {};
  if (group.emits.includes("header")) {
    example.summaryTitle = "궁합 상담 제목";
    example.oneLine = "두 사람 관계의 한 줄 요약";
    example.keywords = ["키워드1", "키워드2", "키워드3"];
  }
  if (group.emits.includes("actions")) example.actionTips = ["이번 주 실천", "이번 달 실천", "올해 실천"];
  if (group.emits.includes("closing")) example.finalMessage = "마지막 한마디";
  example.sections = group.sections.map((item) => ({ title: item.title, body: "상담 본문" }));
  return example;
}

export function buildSajuCompatPremiumResponseSchema(group) {
  return jsonSchemaFromExample(groupJsonSkeleton(group));
}

const elementLine = (counts = {}) => ["목", "화", "토", "금", "수"].map((key) => `${key}${Number(counts[key] || 0)}`).join(" ");
const pillarLine = (pillars = {}) => ["year", "month", "day", "hour"].map((key) => pillars[key] || "모름").join(" · ");

/** 프롬프트에 싣는 사실 요약. 이름 대신 '본인'·'상대'만 쓴다(개인정보 최소화). */
export function buildSajuCompatPremiumFactLines(facts = {}) {
  const person = (label, row = {}) => [
    `[${label}] 명식(년·월·일·시): ${pillarLine(row.pillars)}${row.timeUnknown ? " (출생 시각 모름 — 시주 미사용)" : ""}`,
    `- 일간 ${row.dayMasterLabel || row.dayMaster || ""}, ${clean(row.strength)}`,
    `- 오행 ${elementLine(row.fiveElements)}`,
    `- 희용신 후보: ${clean(row.usefulGod)} / 기신 후보: ${clean(row.unfavorableGod)}`,
    row.currentMajorLuck ? `- 현재 대운 ${row.currentMajorLuck.pillar}(${row.currentMajorLuck.startYear}~${row.currentMajorLuck.endYear}, 천간 십성 ${row.currentMajorLuck.stemTenGod || "-"})` : "",
    Array.isArray(row.yearlyLuck) && row.yearlyLuck.length
      ? `- 세운: ${row.yearlyLuck.map((item) => `${item.year} ${item.pillar}(${item.stemTenGod || "-"})`).join(", ")}`
      : "",
  ].filter(Boolean);
  const day = facts.harmonyClash?.dayStem || {};
  const relations = (facts.harmonyClash?.relations || []).map((row) => `본인 ${row.selfPillar} ${row.selfBranch}–상대 ${row.partnerPillar} ${row.partnerBranch} ${row.type}${row.element ? `(${row.element})` : ""}`);
  const temperament = facts.partnerTemperament || {};
  const axis = facts.axisScores || {};
  return [
    `관계 유형: ${clean(facts.relationLabel) || "-"} / 기준 연도 ${facts.baseYear || ""}`,
    ...person("본인", facts.self),
    ...person("상대", facts.partner),
    `[일간 관계] ${clean(day.relationLabel)}. 상대는 본인에게 ${day.partnerAsMyTenGod || "-"}, 본인은 상대에게 ${day.meAsPartnerTenGod || "-"}${day.stemCombination ? ", 천간합" : ""}${day.stemClash ? ", 천간충" : ""}`,
    `[궁합 네 축 0~100] 끌림 ${axis.attraction ?? "-"} · 안정 ${axis.stability ?? "-"} · 소통 ${axis.communication ?? "-"} · 지구력 ${axis.endurance ?? "-"}`,
    `[오행 보완] ${(facts.elementComplement?.lines || []).join(" ") || "두드러진 보완 없음"}`,
    `[지지 관계] 도움 ${facts.harmonyClash?.supportCount ?? 0}개, 긴장 ${facts.harmonyClash?.tensionCount ?? 0}개: ${relations.join("; ") || "없음"}`,
    `[상대 이성 기질] 등급 ${temperament.grade || "-"} (${temperament.score ?? 0}/${temperament.maxScore ?? 0}), 이성 십성 ${temperament.oppositeTenGod?.label || "-"} ${temperament.oppositeTenGod?.total ?? 0}`,
    ...(temperament.evidence || []).map((row) => `  · ${row.label}: ${clean(row.detail)}`),
    `  · 주의: ${clean(temperament.caution)}`,
    (facts.uncertainty || []).length ? `[불확실성] 출생 시각을 모르는 사람이 있어 시주 관련 판단은 하지 않습니다.` : "",
  ].filter(Boolean);
}

export function buildSajuCompatPremiumGroupPrompt(facts = {}, group, options = {}) {
  const repairLines = Array.isArray(options.repairLines) ? options.repairLines.filter(Boolean) : [];
  const others = SAJU_COMPAT_PREMIUM_GROUPS.filter((item) => item.key !== group.key).map((item) => item.label).join(" / ");
  return [
    `# 사주 고급 궁합 — 이번에 쓸 부분: ${group.label}`,
    "## 계산된 사실(이 범위 밖의 사실을 만들지 않는다)",
    ...buildSajuCompatPremiumFactLines(facts),
    "## 쓸 섹션",
    ...group.sections.map((item, index) => `${index + 1}. "${item.title}" — ${item.guide}`),
    `## 분량: 이 부분 전체 ${SAJU_COMPAT_PREMIUM_GROUP_MIN_CHARS.toLocaleString("ko-KR")}~${SAJU_COMPAT_PREMIUM_GROUP_MAX_CHARS.toLocaleString("ko-KR")}자(공백 제외), 섹션마다 비슷하게 나눈다.`,
    `## 다른 부분(${others})이 다루는 내용은 되풀이하지 않는다.`,
    group.key === "trust" ? "## 이 부분은 근거 항목을 하나씩 해석한다. '바람둥이', '외도한다', '반드시', '틀림없이' 같은 단정·비난 표현은 쓰지 않는다." : "",
    ...(repairLines.length ? ["## 지난 시도에서 고칠 점", ...repairLines.map((line) => `- ${line}`)] : []),
    "## 응답 형식(JSON 하나만)",
    JSON.stringify(groupJsonSkeleton(group), null, 2),
  ].filter(Boolean).join("\n");
}

function extractJsonObject(text) {
  const raw = String(text || "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : "";
}

const SENTENCE_SPLIT = /(?<=[.!?。？！]["'”’)\]」』]*)\s+/u;

function trimToLastCompleteSentence(text) {
  const value = clean(text);
  const match = value.match(/^[\s\S]*[.!?。？！]["'”’)\]」』]*/u);
  return match && match[0].length >= value.length * 0.6 ? match[0].trim() : value;
}

/** 단정·비난·메타 표현이 든 문장만 덜어 낸다. */
export function scrubSajuCompatPremiumSentences(text) {
  let dropped = 0;
  const body = String(text || "").split(/\n\s*\n/u).map((paragraph) => paragraph.split(SENTENCE_SPLIT).filter((sentence) => {
    const bad = FORBIDDEN_SENTENCE_PATTERN.test(sentence) || META_PATTERN.test(sentence);
    if (bad) dropped += 1;
    return !bad;
  }).join(" ").trim()).filter(Boolean).join("\n\n");
  return { body, dropped };
}

/** 문단 길이 상한을 넘는 문단을 문장 경계에서 나눈다(거부 대신 교정). */
export function splitLongParagraphs(text, max = SAJU_COMPAT_PREMIUM_PARAGRAPH_MAX_CHARS) {
  return String(text || "").split(/\n\s*\n/u).flatMap((paragraph) => {
    const value = paragraph.replace(/\s*\n\s*/gu, " ").trim();
    if (!value || value.length <= max) return value ? [value] : [];
    const out = [];
    let current = "";
    for (const sentence of value.split(SENTENCE_SPLIT)) {
      if (current && current.length + sentence.length + 1 > max) {
        out.push(current);
        current = sentence;
      } else current = current ? `${current} ${sentence}` : sentence;
    }
    if (current) out.push(current);
    return out;
  }).join("\n\n");
}

const bodyOf = (value) => (typeof value === "string" ? value : Array.isArray(value) ? value.filter((item) => typeof item === "string").join("\n\n") : "");

export function sajuCompatPremiumSectionFloor(group) {
  return Math.ceil((SAJU_COMPAT_PREMIUM_GROUP_MIN_CHARS * SAJU_COMPAT_PREMIUM_ACCEPT_RATIO) / Math.max(1, group?.sections?.length || 1) * 0.6);
}

/**
 * 그룹 응답을 파싱·교정한다. 반환 { key, ok, sections, extras, chars, issues, reason }.
 * 섹션 제목은 계획의 제목으로 고정한다(모델이 바꾼 제목은 순서로 매핑).
 */
export function parseSajuCompatPremiumGroupResponse(text, group) {
  const base = { key: group?.key || "", ok: false, sections: [], extras: {}, chars: 0, issues: [], reason: "" };
  const raw = clean(text);
  if (!raw || !group) return { ...base, reason: "EMPTY_RESPONSE", issues: ["EMPTY_LLM_RESPONSE"] };
  let parsed = null;
  const json = extractJsonObject(raw);
  try {
    parsed = json ? JSON.parse(json) : null;
  } catch {
    parsed = null;
  }
  if (!parsed) parsed = salvageTruncatedJsonObject(raw);
  if (!parsed || typeof parsed !== "object") return { ...base, reason: "PARSE_FAILED", issues: ["PARSE_FAILED"] };

  const list = Array.isArray(parsed.sections) ? parsed.sections : [];
  const seen = [];
  const sections = group.sections.map((planned, index) => {
    const byTitle = list.find((item) => clean(item?.title) === planned.title);
    const byIndex = list[index];
    const candidate = byTitle || (byIndex && !group.sections.some((other) => other.title === clean(byIndex?.title)) ? byIndex : null);
    const rawBody = bodyOf(candidate?.body ?? candidate?.content ?? candidate?.text) || bodyOf(parsed[planned.field]);
    const scrubbed = scrubSajuCompatPremiumSentences(trimToLastCompleteSentence(rawBody)).body;
    const body = splitLongParagraphs(dropRepeatedReportSentences(scrubbed, seen.join("\n")));
    seen.push(body);
    return { title: planned.title, body };
  });

  const floor = sajuCompatPremiumSectionFloor(group);
  const chars = sections.reduce((sum, item) => sum + countPaidReportBodyChars(item.body), 0);
  const issues = [];
  if (sections.some((item) => countPaidReportBodyChars(item.body) < floor)) issues.push("REQUIRED_SECTIONS_INCOMPLETE");
  if (chars < Math.round(SAJU_COMPAT_PREMIUM_GROUP_MIN_CHARS * SAJU_COMPAT_PREMIUM_ACCEPT_RATIO)) issues.push("LENGTH_SHORT");
  if (hasRepeatedReportPassage(sections.map((item) => item.body).join("\n"))) issues.push("REPEATED_PASSAGE");

  const extras = {};
  if (group.emits.includes("header")) {
    extras.summaryTitle = clean(parsed.summaryTitle, 80);
    extras.oneLine = scrubSajuCompatPremiumSentences(clean(parsed.oneLine, 200)).body;
    extras.keywords = (Array.isArray(parsed.keywords) ? parsed.keywords : []).map((item) => clean(item, 20)).filter(Boolean).slice(0, 5);
  }
  if (group.emits.includes("actions")) {
    extras.actionTips = (Array.isArray(parsed.actionTips) ? parsed.actionTips : [])
      .map((item) => scrubSajuCompatPremiumSentences(clean(item, 300)).body).filter(Boolean).slice(0, 5);
  }
  if (group.emits.includes("closing")) extras.finalMessage = scrubSajuCompatPremiumSentences(clean(parsed.finalMessage, 400)).body;

  const ok = issues.length === 0;
  return { ...base, ok, sections, extras, chars, issues, reason: ok ? "" : issues[0] };
}

/** 저장된 그룹 행이 완성본으로 쓸 수 있는지. 다시 시도는 이 판정이 true 인 행을 다시 생성하지 않는다. */
export function isSajuCompatPremiumGroupUsable(row, group = findSajuCompatPremiumGroup(row?.key)) {
  if (!group || !row?.ok || !Array.isArray(row.sections)) return false;
  return group.sections.every((planned) => row.sections.some((item) => item?.title === planned.title
    && typeof item.body === "string" && countPaidReportBodyChars(item.body) > 0));
}

export function isSajuCompatPremiumComplete(groupRows = []) {
  const rows = Array.isArray(groupRows) ? groupRows : [];
  return SAJU_COMPAT_PREMIUM_GROUPS.every((group) => isSajuCompatPremiumGroupUsable(rows.find((row) => row?.key === group.key), group));
}

/** 결정적 카드(계산값)만 추린다. 결과 화면이 LLM 없이 그리는 부분이다. */
export function buildSajuCompatPremiumStaticCards(facts = {}) {
  const pick = (row = {}) => ({ timeUnknown: Boolean(row.timeUnknown), pillars: row.pillars || {}, dayMasterLabel: row.dayMasterLabel || "", fiveElements: row.fiveElements || {} });
  return {
    relationLabel: facts.relationLabel || "",
    self: pick(facts.self),
    partner: pick(facts.partner),
    axisScores: facts.axisScores || {},
    elementComplement: { lines: facts.elementComplement?.lines || [] },
    harmonyClash: {
      dayStem: facts.harmonyClash?.dayStem || {},
      supportCount: facts.harmonyClash?.supportCount ?? 0,
      tensionCount: facts.harmonyClash?.tensionCount ?? 0,
      relations: facts.harmonyClash?.relations || [],
    },
    partnerTemperament: facts.partnerTemperament || null,
    pastLife: facts.pastLife || null,
    uncertainty: facts.uncertainty || [],
  };
}

/** 완성된 그룹만으로 결과를 조립한다. 미완성이면 null(완성본만 전달). */
export function assembleSajuCompatPremiumResult(groupRows = [], facts = {}) {
  if (!isSajuCompatPremiumComplete(groupRows)) return null;
  const rows = SAJU_COMPAT_PREMIUM_GROUPS.map((group) => ({ group, row: groupRows.find((item) => item?.key === group.key) }));
  const header = rows[0].row.extras || {};
  const closing = rows[rows.length - 1].row.extras || {};
  const temperament = facts.partnerTemperament || {};
  return {
    version: SAJU_COMPAT_PREMIUM_PROMPT_VERSION,
    summaryTitle: header.summaryTitle || "두 사람의 사주 고급 궁합",
    oneLine: header.oneLine || "",
    keywords: Array.isArray(header.keywords) ? header.keywords : [],
    chapters: rows.map(({ group, row }) => ({
      key: group.key,
      label: group.label,
      sections: group.sections.map((planned) => ({ title: planned.title, body: row.sections.find((item) => item.title === planned.title)?.body || "" })),
    })),
    actionTips: Array.isArray(closing.actionTips) ? closing.actionTips : [],
    finalMessage: closing.finalMessage || "",
    temperamentCaution: temperament.caution || "",
    staticCards: buildSajuCompatPremiumStaticCards(facts),
  };
}
