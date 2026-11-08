// 숙요점 궁합(서한비) 배달 판 2 — 새 상담에만 llmMeta.groupPlanVersion = 2 로 고정된다.
// 판 1 상담(진행 중 포함)은 routes/sukuyo-compatibility-ai.js 의 SUKUYO_SECTION_GROUPS·프롬프트를 그대로 쓴다.
// ⚠️ 여기 있는 점검은 전달을 막지 않는다. 마지막 시도 전에는 다시 쓰기 힌트로, 마지막에는 문장 걷어 내기로만 쓴다.
import { countPaidReportBodyChars, dropRepeatedReportSentences } from "./paid-report-quality.js";
import { hanbiRegisterDrift, isBanmalSentence } from "./expert-character-persona-text.js";

export const SUKUYO_COMPAT_GROUP_PLAN_VERSION = 2;
/** 묶음 하나가 쓸 수 있는 최대 시도(첫 생성 포함). 한 요청에 한 번만 부른다. */
export const SUKUYO_V2_GROUP_MAX_ATTEMPTS = 3;
/** 상담 전체에서 분량 때문에 다시 쓰는 횟수의 상한. 넘으면 짧아도 받는다. */
export const SUKUYO_V2_LENGTH_REPAIR_LIMIT = 2;
/** 요약부 시도 횟수. 다 실패하면 확정 점수로 만든 요약을 쓴다. */
export const SUKUYO_V2_SUMMARY_MAX_ATTEMPTS = 2;

/** 끄는 스위치: SUKUYO_COMPAT_AI_DELIVERY_V2_ENABLED=false 면 새 상담도 판 1로 만든다. 이미 판 2로 시작한 상담은 판 2로 끝낸다. */
export function sukuyoCompatDeliveryV2Enabled(env) {
  return String(env?.SUKUYO_COMPAT_AI_DELIVERY_V2_ENABLED ?? "").trim().toLowerCase() !== "false";
}

export function isSukuyoCompatPlanV2(planVersion) {
  return Number(planVersion) === SUKUYO_COMPAT_GROUP_PLAN_VERSION;
}

// 판 2: 첫 묶음(nature)이 두 사람의 타고난 본성·공감과 질문의 답을 맡고, 질문 원문은 이 묶음만 받는다.
// 섹션 키는 판 1과 같다(저장본·화면 아이콘·보관함이 키에 물려 있다). 바뀌는 것은 묶음과 읽는 순서다.
export const SUKUYO_V2_SECTION_GROUPS = Object.freeze([
  { id: "nature", keys: ["twoStars", "overview", "evidence_basis"], questionOwner: true },
  { id: "attraction", keys: ["attraction", "emotionalDirection", "communication"] },
  { id: "flow", keys: ["energyFlow", "conflict", "caution"] },
  { id: "karma", keys: ["karma", "mutualGrowth", "radiantMoment"] },
  { id: "outlook", keys: ["domains", "outlook", "closingLetter"] },
]);
export const SUKUYO_V2_SECTION_ORDER = Object.freeze(SUKUYO_V2_SECTION_GROUPS.flatMap((group) => group.keys));

// 판 2에서만 바뀌는 장 요구 사항. 나머지 장은 판 1 guide 를 그대로 쓴다.
export const SUKUYO_V2_SECTION_GUIDES = Object.freeze({
  twoStars: "이 상담의 첫 장입니다. 첫 문단에서 질문을 꺼낸 마음을 한두 문장으로 먼저 받아 주고(질문 문장을 그대로 옮겨 적는 것은 이 장의 첫 문단 한 번뿐입니다), 이어서 각 본명숙이 그 사람의 타고난 성향·감정 처리 방식·인간관계 태도·사고방식·사랑하는 방식을 어떻게 만드는지 다섯 갈래로 나눠 서술합니다. 오행·음양·수호신이 실제 생활 장면에서 드러나는 모습을 각각 붙이고, '이런 순간이 있지 않았나요'처럼 두 사람이 알아볼 수 있는 장면으로 공감하며 씁니다",
  overview: "앞 장의 본성을 전제로, 첫머리에 두 사람이 각각 어느 자리(역할)에 서는지를 이름과 함께 한 줄로 못 박고, 질문에 대한 답을 결론부터 전합니다(질문 문장은 다시 옮겨 적지 않습니다). 이어서 운명인연도, 기질조화도, 감정공명도, 성장시너지, 장기안정도를 각각 원국 요소와 연결해 풀이합니다. 좋은 점만 쓰지 말고 이 관계가 실제로 취약한 지점도 같은 무게로 밝힙니다",
});

/** 질문을 받지 않는 묶음이 받는 줄. */
export const SUKUYO_V2_NO_QUESTION_LINE = "질문 처리: 사용자의 질문은 첫 장에서 이미 받아 답했습니다. 질문 문장을 다시 옮겨 적거나 풀어 쓰지 말고, 관계 유형과 상담 주제, 이번 장의 관점으로만 비추십시오.";
/** 질문을 받는 묶음이 받는 줄. */
export const SUKUYO_V2_QUESTION_OWNER_LINE = "질문 처리: 사용자의 질문(user_input.question)은 이 요청의 장들만 받습니다. twoStars 첫 문단에서 질문을 꺼낸 마음을 공감하며 받아 주고, overview 에서 결론부터 답하십시오. 질문 문장을 그대로 옮겨 적는 곳은 상담 전체에서 twoStars 첫 문단 한 곳뿐입니다.";

export function sukuyoPlanGroups(planVersion, v1Groups) {
  return isSukuyoCompatPlanV2(planVersion) ? SUKUYO_V2_SECTION_GROUPS : v1Groups;
}

/** 판 2 분량 줄. 판 1의 "늘리는 것보다 밀도를 높이는 쪽이 낫다"를 빼고 넉넉하게 쓰도록 연다. */
export function sukuyoV2LengthLine(spec) {
  const min = Number(spec.targetMinChars).toLocaleString("ko-KR");
  const max = Number(spec.targetMaxChars).toLocaleString("ko-KR");
  return `   분량: 제목·공백·마크다운을 제외한 본문 ${min}자 이상, ${max}자 안팎까지 넉넉하게 씁니다. 분량이 모자라지 않게 장면·근거·대화 예시로 채우되, 같은 내용을 되풀이해 늘리지 마십시오.`;
}

const sectionBody = (sections) => Object.values(sections || {}).map((row) => String(row?.body || "")).join("\n");
const splitSentences = (text) => String(text || "").split(/(?<=[.!?。！？])\s+/u).map((row) => row.trim()).filter(Boolean);
const compact = (text) => String(text || "").replace(/[\s.,!?·…"'“”‘’()[\]「」『』~\-]/g, "");

/**
 * REGISTER_DRIFT    서한비 말투 이탈(반말 비율·다른 캐릭터 설정어).
 * QUESTION_REQUOTED 질문 담당이 아닌 묶음이 질문 문장을 다시 옮겨 적었다(질문 6글자 조각 3개 이상을 한 문장이 품음).
 */
export function detectSukuyoSoftIssues(sections, { questionOwner = false, question = "" } = {}) {
  const issues = [];
  const drift = [];
  for (const row of Object.values(sections || {})) {
    const body = String(row?.body || "");
    const codes = hanbiRegisterDrift(body);
    if (!codes.length) continue;
    const banmal = codes.includes("banmal");
    drift.push(...splitSentences(body).filter((sentence) => (banmal && isBanmalSentence(sentence))
      || hanbiRegisterDrift(sentence).some((code) => code !== "banmal")));
  }
  if (drift.length) issues.push({ code: "REGISTER_DRIFT", sentences: drift });
  const compactQuestion = compact(question);
  if (!questionOwner && compactQuestion.length >= 8) {
    const grams = new Set();
    for (let index = 0; index + 6 <= compactQuestion.length; index += 1) grams.add(compactQuestion.slice(index, index + 6));
    const offending = splitSentences(sectionBody(sections)).filter((sentence) => {
      const value = compact(sentence);
      let hits = 0;
      for (const gram of grams) if (value.includes(gram)) hits += 1;
      return hits >= 3;
    });
    if (offending.length) issues.push({ code: "QUESTION_REQUOTED", sentences: offending });
  }
  return issues;
}

export function sukuyoSoftIssueHint(issues = []) {
  return issues.map((issue) => issue.code === "QUESTION_REQUOTED"
    ? "직전 초안은 사용자의 질문 문장을 다시 옮겨 적었습니다. 질문은 첫 장에서 이미 답했으니 다시 인용하지 말고 이번 장의 주제로만 비추십시오."
    : "직전 초안은 서한비의 말투에서 벗어났습니다. 반말과 다른 인물의 설정 단어를 쓰지 말고, 느리고 단정한 존댓말로만 쓰십시오.").join("\n");
}

/** 분량이 모자란 장을 짚어 다시 쓰게 하는 힌트. */
export function sukuyoLengthRepairHint(shortRows = []) {
  if (!shortRows.length) return "";
  const list = shortRows.map((row) => `${row.key}(지금 ${row.chars.toLocaleString("ko-KR")}자 → ${row.target.toLocaleString("ko-KR")}자 이상)`).join(", ");
  return `직전 초안에서 ${list} 장의 분량이 모자랐습니다. 이 장들은 빠진 근거·장면·대화 예시·행동 지침을 더해 목표 분량을 넉넉히 채운 완결된 본문으로 다시 쓰고, 나머지 장도 같은 깊이로 씁니다. 같은 문장을 되풀이해 늘리지 마십시오.`;
}

/** 걸린 문장을 걷어 낸다. 묶음 본문이 85% 아래로 줄면 원문을 그대로 둔다(분량이 전달보다 앞서지 않게). */
export function scrubSukuyoSoftIssues(sections, issues = []) {
  const offending = new Set(issues.flatMap((issue) => issue.sentences));
  if (!offending.size) return sections;
  const next = Object.fromEntries(Object.entries(sections || {}).map(([key, row]) => [key, {
    ...row,
    body: String(row?.body || "").split(/\n\s*\n/u)
      .map((paragraph) => paragraph.split("\n").map((line) => splitSentences(line).filter((sentence) => !offending.has(sentence)).join(" ")).filter(Boolean).join("\n"))
      .filter(Boolean).join("\n\n"),
  }]));
  return countPaidReportBodyChars(sectionBody(next)) >= countPaidReportBodyChars(sectionBody(sections)) * 0.85 ? next : sections;
}

/**
 * 시도를 다 쓴 묶음의 구제. 다른 묶음 본문(prior)과 이 묶음의 앞 장에 이미 나온 문장을 걷어 내고,
 * 40자 이상 남은 장만 남긴다. 남는 장이 없으면 빈 객체(그 묶음은 건너뛴다).
 */
export function salvageSukuyoGroup(draft, keys, prior = "") {
  let seen = String(prior || "");
  const out = {};
  for (const key of keys) {
    const row = draft?.[key];
    if (typeof row?.body !== "string") continue;
    const body = dropRepeatedReportSentences(row.body, seen);
    if (countPaidReportBodyChars(body) < 40) continue;
    out[key] = { ...row, body };
    seen = `${seen}\n${body}`;
  }
  return out;
}

/** 판 2 읽는 순서대로 sections 키를 다시 놓는다(화면의 장 순서 = 키 순서). */
export function orderSukuyoV2Sections(sections = {}) {
  const ordered = {};
  for (const key of SUKUYO_V2_SECTION_ORDER) if (sections[key]) ordered[key] = sections[key];
  for (const [key, row] of Object.entries(sections)) if (!ordered[key]) ordered[key] = row;
  return ordered;
}

/**
 * 요약부 두 번이 모두 실패했을 때 쓰는 결정적 요약. 서버가 확정한 meta(사람·관계·8축 점수)만 쓴다.
 * @param {object} meta buildSukuyoCompatibilityJsonSchema(...).meta
 * @param {Array<{key:string,label:string,polarity:string}>} axisSpecs
 */
export function buildSukuyoFallbackSummary(meta = {}, axisSpecs = []) {
  const a = meta.person_a || {};
  const b = meta.person_b || {};
  const relation = meta.relation || {};
  const axes = meta.axes || {};
  const nameA = a.name || "나";
  const nameB = b.name || "상대";
  const scored = axisSpecs.filter((spec) => Number.isFinite(Number(axes[spec.key]?.score)));
  const effective = (spec) => spec.polarity === "inverse" ? 100 - Number(axes[spec.key].score) : Number(axes[spec.key].score);
  const strongest = [...scored].sort((x, y) => effective(y) - effective(x))[0];
  const weakest = [...scored].sort((x, y) => effective(x) - effective(y))[0];
  const roles = relation.type_a_to_b && relation.type_b_to_a ? `${nameA}님은 ${relation.type_a_to_b}, ${nameB}님은 ${relation.type_b_to_a}의 자리에 서는` : "서로 다른 자리에 서는";
  const headline = strongest && weakest && strongest.key !== weakest.key
    ? `${strongest.label} 축이 관계를 받치고, ${weakest.label} 축을 함께 다듬어 가야 하는 인연입니다.`
    : "두 사람의 자리가 서로 다르게 작동하는 인연입니다.";
  const starLine = a.sukuyo && b.sukuyo ? `${nameA}님의 본명숙은 ${a.sukuyo}, ${nameB}님의 본명숙은 ${b.sukuyo}입니다. ` : "";
  const distance = Number.isFinite(Number(relation.distance)) ? ` 두 별 사이의 거리는 ${relation.distance}칸으로, 끌림의 세기는 '${relation.intensity || "보통"}'에 가깝습니다.` : "";
  const insight = `${starLine}${roles} 관계입니다.${distance} ${strongest ? `${strongest.label}(${axes[strongest.key].score}점)이 가장 단단한 기둥이고, ` : ""}${weakest && weakest !== strongest ? `${weakest.label}(${axes[weakest.key].score}점)은 서두르지 않고 살펴야 할 자리입니다.` : ""} 자세한 결은 이어지는 장에서 하나씩 풀어 드립니다.`.replace(/\s+/g, " ").trim();
  const scoreNotes = {};
  for (const spec of scored) {
    const score = Number(axes[spec.key].score);
    const high = spec.polarity === "inverse" ? score < 50 : score >= 70;
    const low = spec.polarity === "inverse" ? score >= 65 : score < 50;
    scoreNotes[spec.key] = `${spec.label} ${score}점은 ${relation.type_a_to_b || "두 사람"}·${relation.type_b_to_a || "자리"} 조합에서 ${high ? "힘이 실리는 쪽" : low ? "조율이 필요한 쪽" : "고르게 흐르는 쪽"}으로 읽힙니다.`;
  }
  return { headline, insight, scoreNotes, fallback: true };
}
