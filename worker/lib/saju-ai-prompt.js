import { buildFortuneQuestionPromptPackage } from "./fortune-question-prompt.js";
import {
  SAJU_PROMPT_TEMPLATES,
  getSajuPromptTemplate,
  classifyQuestionToSajuDomain,
} from "./saju-ai-prompt-templates.mjs";

const DEFAULT_TEXT = "제공되지 않음";

export const SAJU_AI_PROMPT_FEATURE_KEY = "saju_ai_question_prompt";
export const SAJU_AI_PROMPT_PRICE = 100;
export { SAJU_PROMPT_TEMPLATES, getSajuPromptTemplate, classifyQuestionToSajuDomain };

const QUESTION_TYPE_RULES = Object.freeze({
  love: ["연애", "결혼", "재회", "상대", "배우자", "인연", "썸"],
  career: ["직업", "진로", "회사", "이직", "사업", "창업", "커리어"],
  money: ["돈", "재물", "수익", "매출", "투자", "부자"],
  relationship: ["인간관계", "친구", "가족", "동료", "고객", "갈등"],
  health: ["건강", "몸", "멘탈", "불안", "스트레스", "질병"],
  life_direction: ["인생", "방향", "미래", "운명", "목표", "성공"],
});

const QUESTION_TYPE_LABELS = Object.freeze({
  love: "연애/결혼",
  career: "직업/진로",
  money: "돈/재물",
  relationship: "인간관계",
  health: "건강/멘탈",
  life_direction: "인생 방향",
  general: "일반",
});

const SAJU_SPECIAL_ANGLES = Object.freeze([
  "일간의 강약과 재성/관성/식상 수용력",
  "월지 중심의 계절성 및 조후 균형",
  "격국 성립 여부와 일반격/특수격의 실전 의미",
  "용신/희신/기신이 질문 주제에 작동하는 방식",
  "십성 구조(재성·관성·식상·인성·비겁)의 역할 분담",
  "천간/지지의 흐름과 합·충·형·파·해의 변동성",
  "지장간의 잠재 자원과 표면 행동의 불일치",
  "대운·세운·월운의 타이밍에서 기회/리스크 분리",
  "신살/공망의 보조적 해석과 과대해석 방지",
  "종격 가능성(전왕격·종재격·종관격·종살격·종아격) 검토",
  "신강/신약 판정 불확실성 구간과 대안 시나리오",
  "반복되는 인생 패턴과 현재 시점의 전략 전환 포인트",
]);

const SAJU_MONEY_ANGLES = Object.freeze([
  "재성을 단순 보유가 아니라 실제 작동 구조(유통/회수/축적)로 해석",
  "식상생재 구조의 유무와 지속 가능한 매출화 경로",
  "관성과 재성의 연결로 사회적 성취가 현금흐름으로 이어지는지 점검",
  "비겁 과다 시 재탈/동업 리스크와 경쟁 소모 구조 분석",
  "인성 과다 시 실행력 저하/의사결정 지연 리스크 분석",
  "대운·세운에서 재성이 열리는 시기와 현금흐름 강화 시점 제시",
  "십성 구조와 용신 흐름 기반으로 적합 수익 모델 3~5개 추천",
  "직접사업형/콘텐츠지식형/상담교육형/기술자동화형/투자운용형/영업브랜딩형/전문직형/구독플랫폼형 적합도 비교",
  "피해야 할 돈 버는 방식(투자 습관·동업 구조·소비 패턴) 명시",
]);

const SAJU_AI_PROMPT_MASTERY_ANGLES = Object.freeze([
  "외부 AI에게 그대로 물어볼 수 있도록 역할·원국 근거·질문 의도·답변 형식을 한 번에 묶기",
  "최고 수준의 명리학자 관점에서 일간·월령·조후·격국·용신·십성·합충형파해·대운·세운을 우선순위화",
  "확정 근거와 추정 영역을 나누어 단정 대신 확인 질문과 선택지로 돌리기",
  "AI 답변이 사주 전용 상담 흐름으로 열리도록 금지할 단정과 원하는 답변 구조를 분명히 남기기",
]);

const SAJU_AI_PROMPT_ENGINE_CONTEXT_MARKER = "saju-ai-question-prompt-context-v20260617";

const SAJU_QUESTION_FOCUS_GUIDE = Object.freeze({
  career: [
    "관성으로 직함·조직 압력·평판 운을 먼저 가늠하기",
    "식상으로 기획력·표현력·성과 생산성을 나누기",
    "인성으로 학습력·자격·문서 운의 받침을 살피기",
    "대운의 용신/기신 흐름으로 이직·승진·독립 타이밍을 가르기",
  ],
  money: [
    "재성의 위치와 투출 여부로 돈이 머무는 그릇을 살피기",
    "식상생재 흐름으로 매출화·현금화 통로를 가르기",
    "비겁 과다/약세로 동업·경쟁·분산 지출의 흔들림을 짚기",
    "대운에서 재성·식상이 열리는 구간과 기신 충돌 구간을 분리하기",
  ],
  love: [
    "일지와 배우자성으로 끌림·안정·거리감의 결을 살피기",
    "관성/재성의 맑음과 탁함으로 장기 관계의 압력선을 가르기",
    "합·충·형·파·해로 만남과 갈등의 반복 리듬을 짚기",
    "대운에서 관계성이 강해지는 시기와 피로가 쌓이는 시기를 나누기",
  ],
  relationship: [
    "비겁·관성·식상으로 주도권, 경계선, 말의 날을 나누기",
    "월지와 일지의 긴장으로 가족·동료·고객 관계의 압력선을 살피기",
    "합충형파해로 가까워지는 사람과 소모되는 사람의 신호를 가르기",
    "대운 변화가 관계 선택에 어떤 거리를 여는지 짚기",
  ],
  health: [
    "오행 편중과 조후로 몸의 열·냉·습·건 리듬을 먼저 살피기",
    "인성·식상 흐름으로 회복력, 수면, 소화, 긴장 방식을 나누기",
    "기신이 강해지는 대운에서 과로와 생활 리듬 붕괴 신호를 짚기",
    "의료 판단은 배제하고 컨디션 관리와 생활 루틴으로만 돌리기",
  ],
  life_direction: [
    "일간과 월령으로 타고난 기질의 중심축을 세우기",
    "격국·용신·십성 배치로 삶의 무대와 성장 방식을 가르기",
    "대운의 상승/조정 구간으로 지금 붙잡을 일과 내려놓을 일을 나누기",
    "퀀텀 오행 판정으로 현재 운의 문이 어느 원소에 열리는지 짚기",
  ],
  general: [
    "질문 속 핵심 욕구를 십성으로 옮긴 뒤 원국에서 먼저 확인하기",
    "일간·월지·조후·용신·대운을 한 줄로 묶어 상담 초점을 세우기",
    "확정 문장보다 선택지, 확인 질문, 실행 순서로 흐름을 열기",
  ],
});

const SAJU_DOMAIN_FOCUS_GUIDE = Object.freeze({
  litigation: [
    "관성·칠살·상관의 긴장으로 문서, 규칙, 충돌의 압력선을 살피기",
    "합충형파해가 강한 구간은 감정 대응보다 증거·기록·절차로 돌리기",
  ],
});

function toText(value, fallback = DEFAULT_TEXT) {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function toArrayText(values, fallback = DEFAULT_TEXT) {
  if (!Array.isArray(values)) return fallback;
  const normalized = values
    .map((item) => String(item == null ? "" : item).trim())
    .filter(Boolean);
  return normalized.length ? normalized.join(", ") : fallback;
}

function toGenderLabel(gender) {
  const v = String(gender || "").trim().toUpperCase();
  if (v === "M") return "남성";
  if (v === "F") return "여성";
  return DEFAULT_TEXT;
}

function normalizeBirthInfo(profile, snapshot) {
  const p = profile && typeof profile === "object" ? profile : {};
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const pb = p.birth && typeof p.birth === "object" ? p.birth : {};
  const sb = s.birth && typeof s.birth === "object" ? s.birth : {};
  const birth = {
    year: Number(pb.year || sb.year || 0) || null,
    month: Number(pb.month || sb.month || 0) || null,
    day: Number(pb.day || sb.day || 0) || null,
    hour: Number(pb.hour || sb.hour || 0) || null,
    minute: Number(pb.minute || sb.minute || 0) || null,
    calType: String(pb.calType || "solar").trim() || "solar",
  };

  const location = p.location && typeof p.location === "object" ? p.location : {};
  return {
    name: toText(p.name, "사용자"),
    gender: toGenderLabel(p.gender || s.gender),
    birthDate: (birth.year && birth.month && birth.day)
      ? `${String(birth.year).padStart(4, "0")}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")}`
      : DEFAULT_TEXT,
    birthTime: Number.isFinite(birth.hour) && Number.isFinite(birth.minute)
      ? `${String(Math.trunc(birth.hour)).padStart(2, "0")}:${String(Math.trunc(birth.minute)).padStart(2, "0")}`
      : DEFAULT_TEXT,
    calendarType: birth.calType === "lunar" || birth.calType === "lunar_leap" ? "음력" : "양력",
    birthPlace: toText(location.label, DEFAULT_TEXT),
    timezone: toText(location.tz, DEFAULT_TEXT),
  };
}

function normalizePillars(pillars) {
  const p = pillars && typeof pillars === "object" ? pillars : {};
  const y = p.y && typeof p.y === "object" ? p.y : {};
  const m = p.m && typeof p.m === "object" ? p.m : {};
  const d = p.d && typeof p.d === "object" ? p.d : {};
  const h = p.h && typeof p.h === "object" ? p.h : {};

  const yearPillar = `${toText(y.g, "-")}${toText(y.j, "-")}`;
  const monthPillar = `${toText(m.g, "-")}${toText(m.j, "-")}`;
  const dayPillar = `${toText(d.g, "-")}${toText(d.j, "-")}`;
  const hourPillar = `${toText(h.g, "-")}${toText(h.j, "-")}`;

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayStem: toText(d.g, DEFAULT_TEXT),
    dayStemElement: toText(d.gE, DEFAULT_TEXT),
  };
}

function normalizeElementWeights(sajuResult, snapshot) {
  const result = sajuResult && typeof sajuResult === "object" ? sajuResult : {};
  const natal = result.natal && typeof result.natal === "object" ? result.natal : {};
  const counts = natal.counts && typeof natal.counts === "object" ? natal.counts : {};
  const fromSnapshot = snapshot && snapshot.elementWeights && typeof snapshot.elementWeights === "object"
    ? snapshot.elementWeights
    : {};

  const wood = Number(counts.wood || fromSnapshot.wood || 0) || 0;
  const fire = Number(counts.fire || fromSnapshot.fire || 0) || 0;
  const earth = Number(counts.earth || fromSnapshot.earth || 0) || 0;
  const metal = Number(counts.metal || fromSnapshot.metal || 0) || 0;
  const water = Number(counts.water || fromSnapshot.water || 0) || 0;
  const dominant = toText(natal.dominant || snapshot?.analysis?.dayStemElement, DEFAULT_TEXT);

  return {
    wood,
    fire,
    earth,
    metal,
    water,
    dominant,
  };
}

function ensureValidQuestion(question) {
  const normalized = String(question || "").trim();
  if (!normalized || normalized.length < 5 || normalized.length > 1000) {
    throw new Error("INVALID_QUESTION");
  }
  return normalized;
}

function ensureSajuResultPresence(sajuResult) {
  if (!sajuResult || typeof sajuResult !== "object") {
    throw new Error("MISSING_SAJU_RESULT");
  }
  const pillars = sajuResult.pillars;
  if (!pillars || typeof pillars !== "object" || !pillars.d) {
    throw new Error("MISSING_SAJU_RESULT");
  }
}

export function classifySajuPromptQuestionType(question) {
  const text = String(question || "").trim().toLowerCase();
  if (!text) return "general";

  const ordered = ["career", "money", "love", "relationship", "health", "life_direction"];
  for (let i = 0; i < ordered.length; i += 1) {
    const type = ordered[i];
    const keywords = QUESTION_TYPE_RULES[type] || [];
    if (keywords.some((keyword) => text.includes(String(keyword).toLowerCase()))) {
      return type;
    }
  }
  return "general";
}

function includesAny(text, keywords) {
  const normalized = String(text || "").toLowerCase();
  return keywords.some((keyword) => normalized.includes(String(keyword).toLowerCase()));
}

function buildSajuAnalysisAngles(questionType, question) {
  const angles = SAJU_SPECIAL_ANGLES.slice();

  if (questionType === "money" || includesAny(question, ["재물", "돈", "수익", "사업", "창업", "부자", "투자"])) {
    return angles.concat(SAJU_MONEY_ANGLES);
  }

  if (questionType === "career") {
    angles.push(
      "관성/식상/인성 배치로 조직형·전문직형·자영업형 커리어 적합도 비교",
      "이직/전환 시기에서 손실 최소화 전략",
      "직업 선택 시 피해야 할 업무 환경과 관계 패턴",
    );
  }

  if (questionType === "love" || questionType === "relationship") {
    angles.push(
      "일지/배우자성/관성·재성의 관계 패턴과 감정 반응 분석",
      "갈등 유발 트리거와 회복을 위한 소통 프로토콜 제안",
      "결혼/동거/장기관계에서 안정성과 리스크 분리",
    );
  }

  if (questionType === "health") {
    angles.push(
      "오행 편중과 생활 리듬 불균형의 신호 해석",
      "대운·세운 변화 시기별 컨디션 관리 포인트",
      "과로/수면/스트레스 관리 우선순위 제안",
    );
  }

  return angles;
}

function buildSajuFollowUps(questionType) {
  const common = [
    "현재 대운 10년 구간에서 가장 강한 기회 테마는 무엇인가요?",
    "실패 확률을 줄이기 위해 먼저 검증해야 할 선택지는 무엇인가요?",
    "지금부터 90일 동안 실행할 우선순위 3가지를 제안해주세요.",
  ];

  if (questionType === "money") {
    return common.concat([
      "제 사주에서 현금흐름을 가장 빨리 만드는 수익모델 3가지는 무엇인가요?",
      "동업/투자/레버리지 중 가장 위험한 선택은 무엇이며 이유는 무엇인가요?",
      "재물운이 열리는 시기에 맞춰 준비해야 할 역량은 무엇인가요?",
    ]);
  }

  if (questionType === "career") {
    return common.concat([
      "조직 내 성장과 독립형 커리어 중 어떤 축이 더 유리한가요?",
      "이직 타이밍을 판단할 핵심 신호 3가지를 알려주세요.",
    ]);
  }

  if (questionType === "love" || questionType === "relationship") {
    return common.concat([
      "관계에서 반복되는 갈등 패턴을 끊기 위한 행동 교정 포인트는 무엇인가요?",
      "장기적으로 안정적인 관계를 위해 피해야 할 선택은 무엇인가요?",
    ]);
  }

  return common;
}

function uniqueStringArray(values) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const text = String(value == null ? "" : value).trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function compactSajuPromptText(value, maxLength = 260) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  const max = Math.max(80, Number(maxLength || 0) || 260);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function buildSajuQuestionFocusAngles(questionType, domain) {
  const typeKey = SAJU_QUESTION_FOCUS_GUIDE[questionType] ? questionType : "general";
  return uniqueStringArray([
    ...(SAJU_QUESTION_FOCUS_GUIDE[typeKey] || []),
    ...(SAJU_DOMAIN_FOCUS_GUIDE[domain] || []),
  ]);
}

function normalizeSajuEngineContext(sajuResult) {
  const context = sajuResult?.engineContext && typeof sajuResult.engineContext === "object"
    ? sajuResult.engineContext
    : {};
  const quantum = context.quantumMyeongli && typeof context.quantumMyeongli === "object"
    ? context.quantumMyeongli
    : {};
  const bazi = context.bazi && typeof context.bazi === "object" ? context.bazi : {};
  const elementMap = Array.isArray(quantum.elementMap)
    ? quantum.elementMap.map((item) => ({
      element: toText(item?.element, ""),
      label: toText(item?.label, ""),
      verdict: toText(item?.verdict, ""),
    })).filter((item) => item.element || item.label || item.verdict)
    : [];
  const daewun = Array.isArray(quantum.daewun)
    ? quantum.daewun.map((row) => ({
      age: Number(row?.age || 0) || null,
      gan: toText(row?.gan, ""),
      zhi: toText(row?.zhi, ""),
      ganElement: toText(row?.ganElement, ""),
      zhiElement: toText(row?.zhiElement, ""),
      score: Number.isFinite(Number(row?.score)) ? Number(row.score) : null,
      label: toText(row?.label, ""),
      className: toText(row?.className, ""),
      evalSummary: toText(row?.evalSummary, ""),
      jongStrength: toText(row?.jongStrength, ""),
      hasChungBonus: row?.hasChungBonus === true,
      hasChungPenalty: row?.hasChungPenalty === true,
      hasJiheBonus: row?.hasJiheBonus === true,
      hasSamhapBonus: row?.hasSamhapBonus === true,
    })).filter((row) => row.gan || row.zhi || row.age)
    : [];
  const featureDigests = Array.isArray(context.renderedFeatureDigests)
    ? context.renderedFeatureDigests.map((item) => ({
      id: toText(item?.id, ""),
      label: toText(item?.label, ""),
      text: compactSajuPromptText(item?.text, 420),
    })).filter((item) => item.text)
    : [];

  return {
    marker: toText(context.marker, ""),
    sourceLayers: Array.isArray(context.sourceLayers) ? context.sourceLayers.map((item) => toText(item, "")).filter(Boolean) : [],
    bazi,
    quantum: {
      dayStem: toText(quantum.dayStem, ""),
      monthBranch: toText(quantum.monthBranch, ""),
      currentAge: Number(quantum.currentAge || 0) || null,
      elementMap,
      daewun,
    },
    featureDigests,
  };
}

function buildSajuEngineContextLines(engineContext) {
  const lines = [];
  const layers = engineContext.sourceLayers.length ? engineContext.sourceLayers.join(", ") : DEFAULT_TEXT;
  lines.push(`엔진 참조층: ${layers}`);

  const elementText = engineContext.quantum.elementMap.length
    ? engineContext.quantum.elementMap.map((item) => `${item.label || item.element}:${item.verdict}`).join(" | ")
    : DEFAULT_TEXT;
  lines.push(`퀀텀 오행 판정: ${elementText}`);

  const daewunText = engineContext.quantum.daewun.length
    ? engineContext.quantum.daewun.slice(0, 8).map((row) => {
      const age = row.age ? `${row.age}세` : "나이 미상";
      const gz = `${row.gan}${row.zhi}`.trim() || "간지 미상";
      const score = row.score == null ? "점수 미상" : `${row.score}점`;
      const flags = [
        row.label,
        row.evalSummary,
        row.jongStrength,
        row.hasChungBonus ? "충 보너스" : "",
        row.hasChungPenalty ? "충 경계" : "",
        row.hasJiheBonus ? "육합 보정" : "",
        row.hasSamhapBonus ? "삼합 보정" : "",
      ].filter(Boolean).join("/");
      return `${age} ${gz} ${score}${flags ? ` ${flags}` : ""}`;
    }).join(" | ")
    : DEFAULT_TEXT;
  lines.push(`대운 퀀텀 흐름: ${daewunText}`);

  if (engineContext.featureDigests.length) {
    engineContext.featureDigests.slice(0, 6).forEach((item) => {
      lines.push(`${item.label || item.id}: ${item.text}`);
    });
  }

  return lines;
}

function buildSajuPromptBindingLines({ pillars, weights, johu, power, jong, engineContext }) {
  const marker = engineContext.marker || SAJU_AI_PROMPT_ENGINE_CONTEXT_MARKER;
  return [
    `명식 고정선: 이 질문문은 연주 ${pillars.yearPillar}, 월주 ${pillars.monthPillar}, 일주 ${pillars.dayPillar}, 시주 ${pillars.hourPillar}와 일간 ${pillars.dayStem}에 묶입니다.`,
    `재사용 경계: 다른 명식에는 그대로 옮기지 말고 일간·월지·조후·용신·기신·대운 퀀텀 흐름을 새로 맞춘 뒤 다시 세우세요.`,
    `핵심 결속값: 오행 목${weights.wood}/화${weights.fire}/토${weights.earth}/금${weights.metal}/수${weights.water}, 조후 ${toText(johu.type)}, 용신 ${toArrayText(power.yongshin)}, 기신 ${toArrayText(power.kijishin)}, 종격 ${jong.isJong ? toText(jong.name, "종격") : "일반격"}.`,
    `엔진 표식: ${marker}`,
  ];
}

function buildKeywordWeightLines(template) {
  const keywordWeights = template && typeof template.keywordWeights === "object"
    ? template.keywordWeights
    : {};
  const ranked = Object.entries(keywordWeights)
    .sort((a, b) => Number(b?.[1]?.weight || 0) - Number(a?.[1]?.weight || 0))
    .slice(0, 5);

  if (!ranked.length) return [DEFAULT_TEXT];

  return ranked.map(([keyword, meta]) => {
    const pct = Math.round(Number(meta?.weight || 0) * 100);
    const depth = toText(meta?.depth, "기본");
    const markers = Array.isArray(meta?.markers) ? meta.markers.slice(0, 4).join(", ") : DEFAULT_TEXT;
    return `${keyword} ${pct}% (${depth}) [${markers}]`;
  });
}

function fillPatternVariables(pattern, context) {
  return String(pattern || "")
    .replace(/\{\{\s*dayStem\s*\}\}/g, String(context?.dayStem || "일간"))
    .replace(/\{\{\s*questionType\s*\}\}/g, String(context?.questionTypeLabel || "질문 주제"));
}

function buildSajuPromptQualityChecks(prompt) {
  const text = String(prompt || "");
  const basisCount = ["일간", "월지", "십성", "오행", "조후"].reduce((count, token) => (
    text.includes(token) ? count + 1 : count
  ), 0);
  return {
    hasUserQuestion: text.includes("[사용자 질문]"),
    hasAnswerFormat: text.includes("[답변 형식]"),
    hasSajuBasis: basisCount >= 2,
    hasNoCertaintyRule: text.includes("단정") || text.includes("확정"),
    hasPrivacyRule: text.includes("개인정보") || text.includes("이름, 생년월일, 출생시간"),
    hasExternalAiPurpose: text.includes("외부 AI") || text.includes("붙여넣"),
  };
}

function ensureSajuPromptQuality(prompt) {
  const checks = buildSajuPromptQualityChecks(prompt);
  const additions = [];
  if (!checks.hasUserQuestion) additions.push("- 사용자의 원질문을 먼저 밝힌 뒤 질문문을 구성해 주세요.");
  if (!checks.hasAnswerFormat) additions.push("- 원하는 답변 형식을 번호 목록으로 분리해 주세요.");
  if (!checks.hasSajuBasis) additions.push("- 일간·월지·십성·오행·조후 중 최소 2개 근거를 질문문에 포함해 주세요.");
  if (!checks.hasNoCertaintyRule) additions.push("- 결혼, 이별, 투자, 법률, 의료 같은 고위험 결론은 확정하지 말고 확인 질문으로 바꿔 주세요.");
  if (!checks.hasPrivacyRule) additions.push("- 이름, 생년월일, 출생시간 같은 개인정보 원문은 반복하지 말고 명식 정보만 간결하게 사용해 주세요.");
  if (!checks.hasExternalAiPurpose) additions.push("- 외부 AI에 그대로 붙여넣을 질문문이라는 목적을 마지막에 분명히 남겨 주세요.");

  if (!additions.length) return { prompt, checks };
  const enhancedPrompt = `${prompt}\n\n[최종 품질 점검]\n${additions.join("\n")}`;
  return {
    prompt: enhancedPrompt,
    checks: buildSajuPromptQualityChecks(enhancedPrompt),
  };
}

function appendSajuExternalAiPurpose(prompt, template, questionTypeLabel) {
  const domainLabel = template?.domainKo || "사주";
  const typeLabel = questionTypeLabel || "질문 주제";
  const lines = [
    "[사주 전용 AI 질문문 목적]",
    "- 외부 AI에게 그대로 붙여넣으면 최고 수준의 명리 상담 답변을 청할 수 있는 사주 전용 질문문입니다.",
    "- 답변자는 명리학자로서 일간·월령·조후·격국·용신·십성·합충형파해·대운/세운을 교차해 흐름을 읽어주세요.",
    `- 주제는 ${domainLabel}/${typeLabel}에 맞추고, 사주 근거와 현실 선택지를 함께 비춰주세요.`,
    "- 확정 예언보다 가능성, 리스크, 확인 질문, 다음 행동 순서가 먼저 드러나게 해주세요.",
  ];
  return `${String(prompt || "").trim()}\n\n${lines.join("\n")}`.trim();
}

export function buildSajuAIPromptWithDomain({
  question,
  sajuResult,
  profile: profileOverride,
  compatibilityTarget,
  mode,
  domain,
} = {}) {
  const normalizedQuestion = ensureValidQuestion(question);
  ensureSajuResultPresence(sajuResult);

  const questionType = classifySajuPromptQuestionType(normalizedQuestion);
  const questionTypeLabel = QUESTION_TYPE_LABELS[questionType] || QUESTION_TYPE_LABELS.general;
  const resolvedDomain = String(domain || "").trim() || classifyQuestionToSajuDomain(normalizedQuestion);
  const template = getSajuPromptTemplate(resolvedDomain);
  if (!template) {
    throw new Error(`UNKNOWN_SAJU_DOMAIN:${resolvedDomain}`);
  }

  const analysisProfile =
    sajuResult && typeof sajuResult.analysisProfile === "object" && sajuResult.analysisProfile !== null
      ? sajuResult.analysisProfile
      : null;
  const normalizedProfile = normalizeBirthInfo(profileOverride || analysisProfile || sajuResult.profile, sajuResult.snapshot);
  const pillars = normalizePillars(sajuResult.pillars);
  const weights = normalizeElementWeights(sajuResult, sajuResult.snapshot);
  const johu = sajuResult.johu && typeof sajuResult.johu === "object" ? sajuResult.johu : {};
  const power = sajuResult.power && typeof sajuResult.power === "object" ? sajuResult.power : {};
  const jong = sajuResult.jong && typeof sajuResult.jong === "object" ? sajuResult.jong : {};
  const engineContext = normalizeSajuEngineContext(sajuResult);
  const questionFocusAngles = buildSajuQuestionFocusAngles(questionType, resolvedDomain);
  const engineContextLines = buildSajuEngineContextLines(engineContext);
  const bindingLines = buildSajuPromptBindingLines({ pillars, weights, johu, power, jong, engineContext });
  const analysisAngles = uniqueStringArray((template.analysisAngles || []).concat(
    SAJU_AI_PROMPT_MASTERY_ANGLES,
    buildSajuAnalysisAngles(questionType, normalizedQuestion),
    questionFocusAngles,
  ));

  const keywordWeightLines = buildKeywordWeightLines(template);

  const domainDataLines = [
    `도메인: ${template.domainKo}`,
    `질문 유형: ${questionTypeLabel}`,
    `이름/성별: ${normalizedProfile.name} / ${normalizedProfile.gender}`,
    `생년월일/시간: ${normalizedProfile.birthDate} ${normalizedProfile.birthTime}`,
    `사주 원국: 연주 ${pillars.yearPillar}, 월주 ${pillars.monthPillar}, 일주 ${pillars.dayPillar}, 시주 ${pillars.hourPillar}`,
    `일간/일간오행: ${pillars.dayStem} / ${pillars.dayStemElement}`,
    `오행 분포: 목 ${weights.wood}, 화 ${weights.fire}, 토 ${weights.earth}, 금 ${weights.metal}, 수 ${weights.water}`,
    `우세 오행: ${weights.dominant}`,
    `조후: ${toText(johu.type)} (점수 ${toText(johu.score)})`,
    `신강/신약: ${typeof power.isStrong === "boolean" ? (power.isStrong ? "신강" : "신약") : DEFAULT_TEXT}`,
    `용신/기신 후보: ${toArrayText(power.yongshin)} / ${toArrayText(power.kijishin)}`,
    `종격 여부: ${jong.isJong ? `예 (${toText(jong.name, "종격")})` : "아니오"}`,
    `핵심 키워드 가중치: ${keywordWeightLines.join(" | ")}`,
    `질문별 명리 관문: ${questionFocusAngles.join(" | ") || DEFAULT_TEXT}`,
    ...engineContextLines,
    ...bindingLines,
  ];

  const followUps = (Array.isArray(template.questionPatterns) ? template.questionPatterns : []).map((pattern) => fillPatternVariables(pattern, {
    dayStem: pillars.dayStem,
    questionTypeLabel,
  }));

  const promptPackage = buildFortuneQuestionPromptPackage({
    fortuneType: "saju",
    fortuneLabel: "사주",
    expertLabel: "최고 수준의 명리학자",
    userQuestion: normalizedQuestion,
    analysisResult: sajuResult,
    profile: normalizedProfile,
    compatibilityTarget,
    mode: mode || resolvedDomain,
    questionTypeLabel: `${template.domainKo}/${questionTypeLabel}`,
    analysisAngles,
    recommendedFollowUpQuestions: followUps.length ? followUps : buildSajuFollowUps(questionType),
    caution: "사주는 확률적 경향 해석이며 법률/의료/투자 결정을 대체하지 않습니다.",
    domainDataLines,
    minPromptLength: 1800,
  });

  const purposePrompt = appendSajuExternalAiPurpose(promptPackage.generatedPrompt, template, questionTypeLabel);
  const qualityResult = ensureSajuPromptQuality(purposePrompt);
  const generatedPrompt = qualityResult.prompt;

  const digestSource = [
    normalizedQuestion,
    resolvedDomain,
    questionType,
    normalizedProfile.gender,
    normalizedProfile.birthDate,
    normalizedProfile.birthTime,
    pillars.yearPillar,
    pillars.monthPillar,
    pillars.dayPillar,
    pillars.hourPillar,
    pillars.dayStem,
    pillars.dayStemElement,
    String(weights.wood),
    String(weights.fire),
    String(weights.earth),
    String(weights.metal),
    String(weights.water),
    weights.dominant,
    toText(johu.type),
    toText(johu.score),
    typeof power.isStrong === "boolean" ? (power.isStrong ? "strong" : "weak") : "unknown",
    toArrayText(power.yongshin, ""),
    toArrayText(power.kijishin, ""),
    jong.isJong ? "jong" : "normal",
    toText(jong.name, ""),
    questionFocusAngles.join("|"),
    engineContextLines.join("|"),
    bindingLines.join("|"),
    JSON.stringify(engineContext),
    promptPackage.summaryIntent,
    promptPackage.analysisAngles.join("|"),
    generatedPrompt,
  ].join("\n");

  return {
    prompt: generatedPrompt,
    generatedPrompt,
    title: promptPackage.title,
    summaryIntent: promptPackage.summaryIntent,
    analysisAngles: promptPackage.analysisAngles,
    recommendedFollowUpQuestions: promptPackage.recommendedFollowUpQuestions,
    caution: promptPackage.caution,
    questionType,
    domain: resolvedDomain,
    domainLabel: template.domainKo,
    keywordWeights: template.keywordWeights,
    questionFocusGuide: questionFocusAngles,
    engineContextSummary: {
      marker: engineContext.marker || SAJU_AI_PROMPT_ENGINE_CONTEXT_MARKER,
      sourceLayers: engineContext.sourceLayers,
      quantumElementCount: engineContext.quantum.elementMap.length,
      daewunCount: engineContext.quantum.daewun.length,
      featureDigestCount: engineContext.featureDigests.length,
    },
    qualityChecks: qualityResult.checks,
    digestSource,
  };
}

export function buildSajuAIPrompt({ question, sajuResult, profile: profileOverride, compatibilityTarget, mode } = {}) {
  return buildSajuAIPromptWithDomain({
    question,
    sajuResult,
    profile: profileOverride,
    compatibilityTarget,
    mode,
  });
}
