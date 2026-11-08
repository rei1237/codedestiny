// 자미두수 상담(무성) 배달 판 2 — 새 상담에만 llmMeta.groupPlanVersion = 2 로 고정된다.
// 판 1 상담(진행 중 포함)은 routes/ziwei-ai.js 의 SECTION_GROUP_SPECS·프롬프트를 그대로 쓴다.
// ⚠️ 여기 있는 점검은 전달을 막지 않는다. 첫 시도에서는 다시 쓰기 힌트로, 마지막에는 문장 다듬기로만 쓴다.
import { countPaidReportBodyChars, dropRepeatedReportSentences } from "./paid-report-quality.js";
import { isBanmalSentence, musungRegisterDrift } from "./expert-character-persona-text.js";

export const ZIWEI_AI_GROUP_PLAN_VERSION = 2;

/** 끄는 스위치: ZIWEI_AI_DELIVERY_V2_ENABLED=false 면 새 상담도 판 1로 만든다. */
export function ziweiAiDeliveryV2Enabled(env) {
  return String(env?.ZIWEI_AI_DELIVERY_V2_ENABLED ?? "").trim().toLowerCase() !== "false";
}

// 판 2: 첫 묶음(nature)이 타고난 본성·공감과 질문의 답을 맡고, 질문 원문은 이 묶음만 받는다.
// 목표 합계 28,500자·하한 합계 22,590자는 판 1과 같다.
export const ZIWEI_V2_GROUP_SPECS = Object.freeze([
  {
    id: "nature",
    sections: ["personality_profile", "essence", "core_answer"],
    minChars: 4050,
    targetChars: 5100,
    questionOwner: true,
    focus: "이 상담의 첫 대목 — 질문을 꺼낸 마음을 먼저 받아 주고, 명반 전체가 말하는 타고난 본성과 명궁·신궁의 본질을 실제 생활 장면으로 공감하며 연 뒤, 질문에 대한 별궁의 답을 결론부터 전하는 흐름",
  },
  {
    id: "foundation",
    sections: ["reading_guide", "structure_core", "influence_factors", "evidence_basis"],
    minChars: 3600,
    targetChars: 4500,
    focus: "이 명반을 읽는 순서와 판단의 근거, 이번 흐름을 만드는 핵심 구조·영향 요인",
  },
  {
    id: "flow",
    sections: ["flow", "triad_axis", "twelve_palaces"],
    minChars: 3960,
    targetChars: 5000,
    focus: "사화의 흐름, 삼방사정이 여는 축, 12궁이 서로 주고받는 연결 구조",
  },
  {
    id: "achievement",
    sections: ["career", "wealth", "domain_matrix"],
    minChars: 3960,
    targetChars: 5000,
    focus: "사회적 성취와 금전 — 관록궁·재백궁을 중심으로 한 현실 영역",
  },
  {
    id: "relation",
    sections: ["relationship", "dayun_now", "timing_strategy"],
    minChars: 3780,
    targetChars: 4800,
    focus: "인연과 환경 — 부부궁·천이궁을 중심으로 한 관계, 그리고 현재 대운과 세운의 시기 전략",
  },
  {
    id: "closing",
    sections: ["caution", "action_plan", "prescription"],
    minChars: 3240,
    targetChars: 4100,
    focus: "반복되는 함정과 전환점, 지금 실행할 처방",
  },
]);

// 판 2에서만 바뀌는 섹션 규칙. 나머지 섹션은 판 1 규칙을 그대로 쓴다.
export const ZIWEI_V2_SECTION_RULES = Object.freeze({
  personality_profile: "personality_profile은 이 상담의 첫 문단입니다. 질문을 꺼낸 마음을 한두 문장으로 먼저 받아 준 뒤, [핵심 성향 Context]에 따라 이 명반 전체를 종합해 '이 사람은 기본적으로 어떤 사람인가'를 서술하세요. 명궁 주성·강약을 출발점으로 신궁·명궁 삼방사정·사화에서 같은 방향으로 반복되는 신호와 서로 다른 욕구를 우선하여, 핵심 성격 → 겉과 속의 차이 → 장점이 그림자로 뒤집히는 조건 → 인간관계를 맺는 방식과 화났을 때·상처받았을 때의 반응 → 사고방식과 결정 속도 → 에너지를 회복하는 방식 순으로 자연스럽게 엮으세요. '이런 순간이 있지 않았나요'처럼 실제 생활에서 확인할 수 있는 서로 다른 장면을 2~3개 넣어 공감하고, 마지막에는 계산 근거를 압축한 한 문장 요약을 붙이세요. 개별 별의 사전적 정의 나열이나 다른 명반에도 붙는 일반론으로 마무리하지 마세요.",
  core_answer: "core_answer는 사용자의 질문을 한 번만 짧게 받아, 앞의 성향과 명궁 근거로 결론부터 답하세요. 질문 문장을 인용하는 곳은 이 상담 전체에서 여기 한 곳뿐입니다. 이후 대목은 이 답을 근거별로 넓혀 가므로, 여기서는 답과 그 이유의 뼈대를 분명히 세우세요.",
  reading_guide: "reading_guide는 3~4문장입니다. 질문의 답은 앞 대목에서 이미 전했으니 다시 옮겨 적지 말고, 실제 명궁 주성·신궁 위치·현재 대운궁을 직접 짚어 '먼저 명궁의 OO별로 타고난 성향을, 신궁으로 후천의 힘을 보고, 주제와 가까운 OO궁과 삼방사정으로 이어 읽으세요'처럼 이 사람의 명반에 맞춘 구체적 길잡이로 쓰세요. '한 폭의 그림처럼'류의 상투적 도입은 쓰지 않습니다. 이 문단만은 3단 구조를 적용하지 않습니다.",
  essence: "essence는 personality_profile에서 정리한 핵심 성향을 전제로, 명궁 주성과 강약을 첫 흐름에 자연스럽게 밝히고 신궁·보성·살성의 영향까지 통합하세요. 앞 문단의 장면을 되풀이하지 말고 새 장면이나 새 근거로 넓히세요.",
});

/** 질문을 받지 않는 묶음의 헤더 줄(판 1의 '현재 가장 궁금한 질문' 줄 자리). */
export const ZIWEI_V2_NO_QUESTION_LINE = "질문 처리: 사용자의 질문은 첫 대목에서 이미 받아 답했습니다. 질문 문장을 다시 옮겨 적거나 풀어 쓰지 말고, 상담 주제와 이번 대목의 관점으로만 비추세요.";
/** 질문을 받지 않는 묶음의 공통 규칙 줄(판 1의 '자유 질문을 먼저 붙잡고' 줄 자리). */
export const ZIWEI_V2_NO_QUESTION_RULE = "- 상담 주제에 직접 닿는 궁과 별을 우선순위로 삼으세요. 사용자의 질문 문장은 다시 인용하지 마세요.";

export function ziweiPlanSpecs(planVersion, v1Specs) {
  return Number(planVersion) === ZIWEI_AI_GROUP_PLAN_VERSION ? ZIWEI_V2_GROUP_SPECS : v1Specs;
}

const sectionBody = (sections) => Object.values(sections || {}).map((row) => String(row?.body || "")).join("\n");
const splitSentences = (text) => String(text || "").split(/(?<=[.!?。！？])\s+/u).map((row) => row.trim()).filter(Boolean);
const compact = (text) => String(text || "").replace(/[\s.,!?·…"'“”‘’()[\]「」『』~\-]/g, "");

/**
 * REGISTER_DRIFT    무성 말투 이탈(반말 비율·원작 설정어·애칭). 첫 문장 판결문 검사는 하지 않는다.
 * QUESTION_REQUOTED 질문 담당이 아닌 묶음이 질문 문장을 다시 옮겨 적었다(질문 6글자 조각 3개 이상을 한 문장이 품음).
 */
export function detectZiweiSoftIssues(sections, { questionOwner = false, question = "" } = {}) {
  const issues = [];
  const drift = [];
  for (const row of Object.values(sections || {})) {
    const body = String(row?.body || "");
    const codes = musungRegisterDrift(body).filter((code) => code !== "verdict-opening");
    if (!codes.length) continue;
    const banmal = codes.includes("banmal");
    drift.push(...splitSentences(body).filter((sentence) => (banmal && isBanmalSentence(sentence))
      || musungRegisterDrift(sentence).some((code) => code.startsWith("lore:") || code.startsWith("intimacy:"))));
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

export function ziweiSoftIssueHint(issues = []) {
  return issues.map((issue) => issue.code === "QUESTION_REQUOTED"
    ? "직전 시도는 사용자의 질문 문장을 다시 옮겨 적었습니다. 질문은 첫 대목에서 이미 답했으니 다시 인용하지 말고 이 대목의 주제로만 비추세요."
    : "직전 시도는 무성의 말투에서 벗어났습니다. 반말·애칭·원작 설정 단어를 쓰지 말고, 첫 문장은 합니다체 판결로, 이어지는 근거와 처방은 해요체로 쓰세요.").join("\n");
}

/** 걸린 문장을 걷어 낸다. 묶음 본문이 85% 아래로 줄면 원문을 그대로 둔다(분량이 전달보다 앞서지 않게). */
export function scrubZiweiSoftIssues(sections, issues = []) {
  const offending = new Set(issues.flatMap((issue) => issue.sentences));
  if (!offending.size) return sections;
  const next = Object.fromEntries(Object.entries(sections || {}).map(([key, row]) => [key, {
    ...row,
    body: String(row?.body || "").split(/\n\s*\n/u)
      .map((paragraph) => splitSentences(paragraph).filter((sentence) => !offending.has(sentence)).join(" "))
      .filter(Boolean).join("\n\n"),
  }]));
  return countPaidReportBodyChars(sectionBody(next)) >= countPaidReportBodyChars(sectionBody(sections)) * 0.85 ? next : sections;
}

/**
 * 마지막 시도가 끝났는데도 묶음이 반복·섹션 간 중복으로 걸렸을 때 쓰는 구제.
 * 다른 묶음 본문(prior)과 이 묶음의 앞 섹션에 이미 나온 문장을 걷어 내고, 40자 이상 남은 섹션만 남긴다.
 * 남는 섹션이 없으면 빈 객체를 돌려준다(그 묶음은 건너뛴다).
 */
export function salvageZiweiGroup(draft, keys, prior = "") {
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

/** 메타 소개 두 번이 모두 실패했을 때 쓰는 결정적 소개. 명반 사실 칸은 enforceZiweiChartFacts 가 덮어쓴다. */
export function buildZiweiFallbackMeta(input = {}, chart = {}) {
  const birth = input.birthInfo || {};
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const life = palaces.find((item) => item?.name === "명궁");
  const stars = (life?.mainStars || []).filter(Boolean);
  const bodyLine = chart?.bodyPalace ? ` 신궁은 ${chart.bodyPalace}에 놓여 후천의 힘을 실어 줍니다.` : "";
  const description = stars.length
    ? `명궁에 ${stars.join("·")}이 자리한 명반입니다.${bodyLine}`
    : `명궁에 주성이 비어 맞은편 궁의 별을 빌려 읽는 명반입니다.${bodyLine}`;
  return {
    name: birth.name || "",
    gender: birth.gender || "",
    mingong: { description },
    dayun: { theme: "지금 대운의 흐름을 명반 기준으로 살핍니다." },
    fallback: true,
  };
}
