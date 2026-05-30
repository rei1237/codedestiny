import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { callGeminiText } from "../lib/gemini.js";
import { buildImageCandidates, getTarotCardByAnyId, TAROT_CARDS } from "../../lib/tarot/tarot-cards.mjs";
import { buildMindscanReadingPayload } from "../../lib/tarot/mindscan-reading.mjs";
import { buildLoveConsultingHighlights, normalizeLoveReadingPayload } from "../../lib/tarot/love-reading-normalizer.mjs";
import { expectedCardCount, listSpreadIds, normalizeSpreadType, getSpreadDefinition } from "../../lib/tarot/spreads.mjs";
import {
  buildGeminiPrompt,
  buildFallbackInterpretation,
  buildNumerologyContext,
  normalizeCardInput,
  normalizeInterpretation,
  normalizeTopic,
  parseJsonCandidate,
  selectCards,
} from "../../lib/tarot/numerology-tarot.mjs";
import {
  TarotInterpretationError,
  buildConsultingHighlights,
  buildLegacyReadingPayload,
  drawTarotCardsForSpread,
  inferQuestionType,
  interpretTarotReading,
  normalizeDrawnCardsForSpread,
} from "../../lib/tarot/tarot-interpretation-engine.mjs";

function asText(value) {
  return String(value || "").trim();
}

const CRYSTAL_MEANINGS = {
  "tigers-eye": {
    id: "tigers-eye",
    nameKo: "호안석",
    nameEn: "Tiger's Eye",
    categoryAffinity: ["wealth", "career", "move"],
    keywords: ["결단", "보호", "현실 판단", "사업 감각"],
    meaning: "감정 과열을 낮추고 현실 데이터를 기준으로 선택하도록 돕는 원석입니다.",
    adviceTone: "기준을 정하고 실행",
    cautionTone: "승부욕 과열 경계",
  },
  "rose-quartz": {
    id: "rose-quartz",
    nameKo: "로즈 쿼츠",
    nameEn: "Rose Quartz",
    categoryAffinity: ["love", "reunion", "relation"],
    keywords: ["애정", "치유", "수용", "관계 회복"],
    meaning: "자기방어로 굳은 감정을 부드럽게 풀고 대화의 온도를 회복시키는 원석입니다.",
    adviceTone: "감정 표현의 진정성",
    cautionTone: "감정 의존 경계",
  },
  amethyst: {
    id: "amethyst",
    nameKo: "애머지스트",
    nameEn: "Amethyst",
    categoryAffinity: ["reunion", "health", "relation"],
    keywords: ["통찰", "정화", "직관", "균형"],
    meaning: "복잡한 감정과 생각을 정리해 핵심 진실을 보게 하는 원석입니다.",
    adviceTone: "본질 파악 후 행동",
    cautionTone: "고립적 판단 경계",
  },
  citrine: {
    id: "citrine",
    nameKo: "시트린",
    nameEn: "Citrine",
    categoryAffinity: ["wealth", "move", "health"],
    keywords: ["풍요", "활력", "매출", "자기표현"],
    meaning: "현실 실행력과 자신감을 끌어올려 기회를 실제 성과로 연결시키는 원석입니다.",
    adviceTone: "작은 실행의 축적",
    cautionTone: "낙관 과신 경계",
  },
  lapis: {
    id: "lapis",
    nameKo: "라피스 라줄리",
    nameEn: "Lapis Lazuli",
    categoryAffinity: ["wealth", "career", "move"],
    keywords: ["통찰", "전략", "진실", "판단력"],
    meaning: "겉으로 보이지 않는 패턴을 읽어 장기 전략으로 연결하게 돕는 원석입니다.",
    adviceTone: "구조를 읽는 전략",
    cautionTone: "분석 마비 경계",
  },
  "black-tourmaline": {
    id: "black-tourmaline",
    nameKo: "블랙 토르말린",
    nameEn: "Black Tourmaline",
    categoryAffinity: ["relation", "health", "move"],
    keywords: ["보호", "경계", "정리", "차단"],
    meaning: "불필요한 소모와 외부 잡음을 걸러내 관계와 에너지 경계를 세우게 하는 원석입니다.",
    adviceTone: "경계 설정과 정리",
    cautionTone: "과도한 단절 경계",
  },
  "green-fluorite": {
    id: "green-fluorite",
    nameKo: "그린 플로라이트",
    nameEn: "Green Fluorite",
    categoryAffinity: ["career", "health", "wealth"],
    keywords: ["정리", "균형", "회복", "판단 정돈"],
    meaning: "흩어진 선택지를 구조화해 우선순위를 세우고 회복 루틴을 만들게 하는 원석입니다.",
    adviceTone: "정돈 후 집중 실행",
    cautionTone: "과도한 검토 지연 경계",
  },
};

const CRYSTAL_BY_NAME = Object.values(CRYSTAL_MEANINGS).reduce((acc, item) => {
  acc[item.nameKo] = item;
  return acc;
}, {});

const CATEGORY_DEFS = {
  wealth: {
    id: "wealth",
    name: "재물 · 사업",
    spread: [
      { order: 1, title: "현재 재물운", question: "지금 돈과 사업의 흐름은 어떤 상태인가?" },
      { order: 2, title: "기회·가능성", question: "어디에서 수익과 성장의 기회가 열리는가?" },
      { order: 3, title: "방해 요소", question: "돈의 흐름을 막는 습관이나 외부 변수는 무엇인가?" },
      { order: 4, title: "조언의 방향", question: "현실적으로 어떤 선택을 해야 하는가?" },
      { order: 5, title: "최종 결과", question: "이 흐름이 어떤 재물·사업 결과로 이어질 가능성이 큰가?" },
    ],
    focus: "수익 구조, 지출, 계약, 경쟁, 리스크를 숫자 기반 실행으로 연결합니다.",
  },
  love: {
    id: "love",
    name: "연애 · 감정",
    spread: [
      { order: 1, title: "현재 감정 상태", question: "내 마음 또는 관계의 감정 온도는 어떤가?" },
      { order: 2, title: "상대 또는 인연의 기류", question: "상대나 인연의 에너지는 어떻게 흐르는가?" },
      { order: 3, title: "감정의 방해 요소", question: "사랑을 어렵게 만드는 내면의 패턴은 무엇인가?" },
      { order: 4, title: "마음의 조언", question: "지금 어떤 태도로 사랑을 바라봐야 하는가?" },
      { order: 5, title: "관계의 가능성", question: "앞으로 감정 흐름은 어디로 향하는가?" },
    ],
    focus: "끌림, 불안, 표현 방식, 관계의 균형을 감정 언어로 해석합니다.",
  },
  reunion: {
    id: "reunion",
    name: "재회 · 인연",
    spread: [
      { order: 1, title: "남아 있는 인연의 온도", question: "두 사람 사이에 아직 남은 감정은 무엇인가?" },
      { order: 2, title: "상대의 숨은 마음", question: "상대가 겉으로 드러내지 않는 속마음은 무엇인가?" },
      { order: 3, title: "재회를 막는 이유", question: "다시 이어지기 어려운 핵심 원인은 무엇인가?" },
      { order: 4, title: "다가갈 방법", question: "지금 내가 취해야 할 태도는 무엇인가?" },
      { order: 5, title: "재회 가능성", question: "이 인연은 다시 연결될 가능성이 있는가?" },
    ],
    focus: "미련, 거리감, 오해, 재접근 조건을 현실적인 소통 기준으로 정리합니다.",
  },
  move: {
    id: "move",
    name: "이동수 · 변화",
    spread: [
      { order: 1, title: "현재 변화의 기운", question: "지금 내 삶은 움직일 준비가 되어 있는가?" },
      { order: 2, title: "이동의 기회", question: "이사, 여행, 환경 변화의 좋은 흐름은 어디에 있는가?" },
      { order: 3, title: "변화를 막는 요소", question: "움직임을 지연시키는 현실적·심리적 이유는 무엇인가?" },
      { order: 4, title: "움직임의 조언", question: "지금은 기다려야 하는가, 움직여야 하는가?" },
      { order: 5, title: "변화 이후의 흐름", question: "움직인 뒤 삶은 어떤 방향으로 바뀌는가?" },
    ],
    focus: "타이밍, 준비도, 환경 변수, 이동 후 정착 전략을 함께 점검합니다.",
  },
  career: {
    id: "career",
    name: "직업 · 진로",
    spread: [
      { order: 1, title: "현재 직업운", question: "현재 일과 진로의 에너지는 어떤가?" },
      { order: 2, title: "성장 가능성", question: "어떤 방향에서 커리어 기회가 열리는가?" },
      { order: 3, title: "진로의 장애물", question: "내 직업 흐름을 막는 가장 큰 요인은 무엇인가?" },
      { order: 4, title: "선택의 조언", question: "지금 어떤 선택과 준비가 필요한가?" },
      { order: 5, title: "진로의 결과", question: "이 흐름은 어떤 커리어 결과로 이어지는가?" },
    ],
    focus: "이직, 직무 적합성, 성장 포인트, 평가 구조를 실행 계획으로 연결합니다.",
  },
  health: {
    id: "health",
    name: "건강 · 에너지",
    spread: [
      { order: 1, title: "현재 에너지 상태", question: "몸과 마음의 에너지는 어떤 상태인가?" },
      { order: 2, title: "회복 가능성", question: "어디에서 회복의 힘이 생기는가?" },
      { order: 3, title: "에너지 소모 원인", question: "나를 지치게 만드는 핵심 원인은 무엇인가?" },
      { order: 4, title: "몸과 마음의 조언", question: "지금 어떤 회복 방식이 필요한가?" },
      { order: 5, title: "회복의 흐름", question: "앞으로 에너지는 어떻게 회복될 가능성이 큰가?" },
    ],
    focus: "의료 진단이 아닌 생활 리듬, 휴식, 스트레스 조절 중심으로 안내합니다.",
  },
  relation: {
    id: "relation",
    name: "대인관계",
    spread: [
      { order: 1, title: "현재 관계의 기류", question: "주변 인간관계의 에너지는 어떤가?" },
      { order: 2, title: "도움이 되는 인연", question: "나에게 힘이 되는 사람이나 관계는 무엇인가?" },
      { order: 3, title: "갈등의 씨앗", question: "관계를 어렵게 만드는 말, 태도, 오해는 무엇인가?" },
      { order: 4, title: "관계 조율의 조언", question: "어떻게 말하고 행동해야 관계가 정리되는가?" },
      { order: 5, title: "관계의 최종 흐름", question: "이 인간관계는 어떤 방향으로 흘러갈 가능성이 큰가?" },
    ],
    focus: "신뢰, 경계, 대화 온도, 협력의 균형점을 실천 중심으로 제시합니다.",
  },
};

const CARD_MEANING_OVERRIDES = {
  "Five of Pentacles": "결핍감, 재정 압박, 소외감, 부족함에 대한 두려움",
  "Five of Wands": "경쟁, 충돌, 실력 겨루기, 시장의 소란, 의견 차이",
  "Page of Cups": "순수한 감정, 상상력, 미숙한 제안, 감정적 기대",
  Temperance: "균형, 조율, 절제, 혼합, 속도 조절",
  "Ace of Pentacles": "새로운 현실 기회, 돈의 씨앗, 사업의 시작, 실질적 기반",
};

function hashSeed(text) {
  const base = String(text || "");
  let hash = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function resolveOrientation(cardName, idx, provided) {
  const explicit = Array.isArray(provided) ? provided[idx] : "";
  if (explicit === "upright" || explicit === "reversed") return explicit;
  const seed = hashSeed(`${cardName}:${idx}`);
  return seed % 4 === 0 ? "reversed" : "upright";
}

function findCrystalByAssignment(idx, body = {}, fallbackGemName = "") {
  const assignment = body?.assignments && typeof body.assignments === "object" ? body.assignments : {};
  const gemId = asText(assignment[idx]);
  if (gemId && CRYSTAL_MEANINGS[gemId]) return CRYSTAL_MEANINGS[gemId];
  if (fallbackGemName && CRYSTAL_BY_NAME[fallbackGemName]) return CRYSTAL_BY_NAME[fallbackGemName];
  return CRYSTAL_MEANINGS["green-fluorite"];
}

function cardSuite(cardName) {
  const name = asText(cardName);
  if (/Wands/i.test(name)) return "완드";
  if (/Cups/i.test(name)) return "컵";
  if (/Swords/i.test(name)) return "소드";
  if (/Pentacles/i.test(name)) return "펜타클";
  return "메이저";
}

function orientationMeaning(orientation) {
  if (orientation === "reversed") {
    return "역방향이므로 에너지가 막히거나 지연되며, 같은 문제가 반복될 가능성을 경고합니다.";
  }
  return "정방향이므로 흐름은 비교적 열려 있으며, 행동을 붙이면 현실 변화로 이어질 가능성이 큽니다.";
}

function buildCardMeaning(cardName, orientation, tarotKeywords = []) {
  const base = CARD_MEANING_OVERRIDES[cardName] || `${cardSuite(cardName)} 계열의 핵심 주제를 드러내는 카드로, 상황의 본질을 선명하게 보여줍니다.`;
  const keywordLine = tarotKeywords.length ? `핵심 키워드는 ${tarotKeywords.slice(0, 4).join(", ")}입니다.` : "";
  return `${base}. ${orientationMeaning(orientation)} ${keywordLine}`.trim();
}

function sanitizeCrystalSoulText(text) {
  return String(text || "")
    .replace(/[\t\r]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeRepeatedCrystalSoulPhrases(text) {
  const lines = String(text || "").split("\n");
  const seen = new Set();
  const kept = [];
  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) {
      kept.push(line);
      continue;
    }
    if (normalized.length >= 20) {
      if (seen.has(normalized)) continue;
      seen.add(normalized);
    }
    kept.push(line);
  }
  return kept.join("\n");
}

function buildCrystalSoulSection(cardName, crystal, position, category, orientation, idx) {
  const card = getTarotCardByAnyId(cardName);
  const cardNameKo = asText(card?.nameKo) || asText(cardName) || `카드 ${idx + 1}`;
  const cardNameEn = asText(card?.nameEn) || asText(cardName) || `Card ${idx + 1}`;
  const imageCandidates = card ? buildImageCandidates(card.code) : [];
  const tarotKeywords = Array.isArray(card?.keywords) && card.keywords.length
    ? card.keywords.slice(0, 5)
    : [cardSuite(cardName), orientation === "reversed" ? "지연" : "진행", "핵심 전환", "행동 필요"];

  const cardMeaning = buildCardMeaning(cardNameEn, orientation, tarotKeywords);
  const crystalMeaning = `${crystal.meaning} 이 원석의 조언 톤은 "${crystal.adviceTone}"이며, 주의 톤은 "${crystal.cautionTone}"입니다.`;
  const positionInterpretation = `${position.title} 자리의 질문은 "${position.question}"입니다. ${cardNameKo} 카드가 이 자리에 놓였다는 것은 ${category.focus} 라는 카테고리 핵심 안에서 지금 반드시 점검할 우선순위가 분명하다는 신호입니다.`;
  const categoryReading = `${category.name} 관점에서 ${cardNameKo}${orientation === "reversed" ? "(역방향)" : "(정방향)"}은(는) 단순한 분위기 묘사가 아니라 실제 선택 기준을 요구합니다. ${cardMeaning} 특히 ${crystal.nameKo}의 기운이 결합되면 감정적 즉흥보다 근거 중심의 해석으로 전환되어, 현재 위치에서 무엇을 줄이고 무엇을 늘려야 하는지가 선명해집니다.`;
  const opportunity = `${tarotKeywords.slice(0, 2).join(" · ")} 신호를 살리면 ${position.title}에서 작지만 현실적인 기회가 열립니다. 이번 주에는 추상적 기대보다 확인 가능한 지표 1개를 정해 진척을 추적해 보세요.`;
  const caution = `${orientation === "reversed" ? "같은 패턴의 반복" : "과속 실행"}이 가장 큰 리스크입니다. ${crystal.cautionTone}를 기억하고, 감정 과열 상태에서 결정을 확정하지 않는 것이 안전합니다.`;
  const action = `오늘의 행동: ${position.title}와 연결된 결정 1개를 문장으로 적고, 실행 전후 기준(숫자·대화·시간)을 체크리스트로 남기세요. 이 기록이 다음 카드 흐름의 기준점이 됩니다.`;

  return {
    order: position.order,
    positionTitle: position.title,
    question: position.question,
    cardNameKo,
    cardNameEn,
    cardImageUrl: imageCandidates[0] || "",
    orientation,
    crystalName: crystal.nameKo,
    crystalKeywords: crystal.keywords.slice(0, 5),
    tarotKeywords,
    cardMeaning,
    crystalMeaning,
    positionInterpretation,
    categoryReading,
    opportunity,
    caution,
    action,
  };
}

function buildCrystalSoulSummary(category, sections, coreCrystal) {
  const strongest = sections[2] || sections[0];
  const practicalActions = [
    "핵심 문제를 한 줄로 정의하고 오늘 기준으로 점수화한다.",
    "이번 주 실행 1개와 중단 1개를 동시에 결정한다.",
    "관찰 지표(숫자/감정/대화)를 3일 단위로 기록한다.",
    "외부 변수와 내적 패턴을 분리해 판단 메모를 남긴다.",
  ];
  return {
    category: category.name,
    coreCrystal: coreCrystal.nameKo,
    overallFlow: `${category.name}의 5장 흐름은 초반의 현재 진단에서 중반의 방해 요인 노출, 후반의 실행 조정과 결과 가시화로 이어집니다. 즉 지금의 핵심은 단기 감정 반응이 아니라 구조를 재정렬하는 일입니다. 카드군은 문제를 과장하기보다 "무엇을 당장 실행하면 흐름이 바뀌는가"를 반복해서 묻고 있으며, 원석 결합은 그 실행을 오래 유지할 수 있는 심리적 균형을 제공합니다.`,
    strongestSignal: `${strongest.cardNameKo} · ${strongest.positionTitle} 조합이 가장 강한 신호입니다. 이 조합은 현재 상황을 회피하지 말고 구체적인 기준을 세워 바로 검증하라는 메시지를 강조합니다.`,
    opportunity: `기회는 ${sections[1]?.positionTitle || "두 번째 자리"}에서 드러납니다. 카드가 제시한 핵심 키워드를 행동 단위로 잘게 쪼개면, 과장된 목표 없이도 체감 가능한 전환이 가능합니다.`,
    risk: `주의할 점은 ${sections[2]?.positionTitle || "세 번째 자리"}의 경고를 가볍게 넘기는 것입니다. 같은 말투·같은 의사결정 습관이 반복되면 결과 카드의 잠재력이 줄어들 수 있습니다.`,
    timingAdvice: "지금은 즉흥 확장보다 14~30일 검증 구간을 먼저 확보하는 타이밍입니다. 준비와 실행을 분리하지 말고, 작은 실행을 하면서 동시에 데이터를 수집하는 방식이 유리합니다.",
    practicalActions,
    oracleMessage: `${coreCrystal.nameKo}의 오라클: "지금 당신에게 필요한 기적은 거대한 반전이 아니라, 흐린 직감을 기준 있는 결단으로 바꾸는 첫 번째 실행이다."`,
  };
}

function readingSectionLength(section) {
  return [
    section.cardMeaning,
    section.crystalMeaning,
    section.positionInterpretation,
    section.categoryReading,
    section.opportunity,
    section.caution,
    section.action,
  ].join(" ").length;
}

function validateCrystalSoulReading(reading) {
  const issues = [];
  const sections = Array.isArray(reading?.sections) ? reading.sections : [];
  const summary = reading?.summary || {};

  if (sections.length !== 5) issues.push("카드 섹션 수가 5장이 아닙니다.");
  sections.forEach((section, idx) => {
    if (!asText(section.cardMeaning)) issues.push(`${idx + 1}번 카드 기본 의미 누락`);
    if (!asText(section.crystalMeaning)) issues.push(`${idx + 1}번 카드 원석 의미 누락`);
    if (!asText(section.categoryReading)) issues.push(`${idx + 1}번 카드 카테고리 상담 누락`);
    if (readingSectionLength(section) < 350) issues.push(`${idx + 1}번 카드 섹션 길이 부족`);
  });

  const summaryText = [
    summary.overallFlow,
    summary.strongestSignal,
    summary.opportunity,
    summary.risk,
    summary.timingAdvice,
    summary.oracleMessage,
  ].join(" ");
  if (summaryText.length < 500) issues.push("종합 리딩 길이 부족");
  if (!Array.isArray(summary.practicalActions) || summary.practicalActions.length < 3) {
    issues.push("실행 체크리스트 최소 개수 미달");
  }

  return { ok: issues.length === 0, issues };
}

function crystalReadingToText(reading) {
  const lines = [];
  lines.push(`🔮 ${reading.category} 크리스탈 소울 리딩`);
  lines.push(`핵심 원석: ${reading.coreCrystal}`);
  lines.push("");
  for (const section of reading.sections) {
    lines.push(`${section.order}. ${section.positionTitle} (${section.question})`);
    lines.push(`카드: ${section.cardNameKo} / ${section.orientation === "reversed" ? "역방향" : "정방향"}`);
    lines.push(`원석: ${section.crystalName}`);
    lines.push(`타로 키워드: ${section.tarotKeywords.join(", ")}`);
    lines.push(`원석 키워드: ${section.crystalKeywords.join(", ")}`);
    lines.push(`기본 의미: ${section.cardMeaning}`);
    lines.push(`원석의 기운: ${section.crystalMeaning}`);
    lines.push(`위치 해석: ${section.positionInterpretation}`);
    lines.push(`카테고리 상담: ${section.categoryReading}`);
    lines.push(`기회: ${section.opportunity}`);
    lines.push(`주의점: ${section.caution}`);
    lines.push(`오늘의 행동: ${section.action}`);
    lines.push("");
  }
  lines.push("종합 리딩");
  lines.push(`전체 흐름: ${reading.summary.overallFlow}`);
  lines.push(`가장 강한 신호: ${reading.summary.strongestSignal}`);
  lines.push(`기회: ${reading.summary.opportunity}`);
  lines.push(`주의할 점: ${reading.summary.risk}`);
  lines.push(`타이밍 조언: ${reading.summary.timingAdvice}`);
  lines.push("실행 체크리스트:");
  (reading.summary.practicalActions || []).forEach((item, idx) => lines.push(`${idx + 1}. ${item}`));
  lines.push(`크리스탈 오라클: ${reading.summary.oracleMessage}`);
  return removeRepeatedCrystalSoulPhrases(sanitizeCrystalSoulText(lines.join("\n")));
}

function ensureCardCountOrThrow(spreadType, cards) {
  const expected = expectedCardCount(spreadType);
  if (!expected) {
    throw createHttpError(400, `Unsupported spreadType: ${spreadType}`);
  }
  if (!Array.isArray(cards) || cards.length !== expected) {
    throw createHttpError(400, `${spreadType}은(는) ${expected}장의 카드가 필요합니다.`, {
      expectedCardCount: expected,
      receivedCardCount: Array.isArray(cards) ? cards.length : 0,
    });
  }
}

function toUiCard(drawn, spreadType, idx) {
  const spread = getSpreadDefinition(spreadType);
  const position = spread?.positions?.[idx];
  const card = getTarotCardByAnyId(drawn.cardId);
  if (!card) {
    throw new TarotInterpretationError(
      "CARD_DATA_MISSING",
      `Card data missing for ${drawn.cardId}`,
      "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      { drawn },
    );
  }

  const images = buildImageCandidates(card.code);
  return {
    cardId: card.code,
    id: card.id,
    name: card.nameEn,
    nameEn: card.nameEn,
    nameKr: card.nameKo,
    nameKo: card.nameKo,
    position: drawn.positionKey || drawn.position || position?.key || `position_${idx + 1}`,
    orientation: drawn.orientation === "reversed" ? "reversed" : "upright",
    imageKey: card.imageKey || card.code.toLowerCase(),
    imageUrl: images[0],
    imageCandidates: images,
    proxyImageUrl: "",
    localImageUrl: images[0],
    keywords: card.keywords.slice(0, 5),
  };
}

function buildCrystalSoulReading(body = {}) {
  const categoryId = asText(body?.topic?.id) || "wealth";
  const category = CATEGORY_DEFS[categoryId] || CATEGORY_DEFS.wealth;
  const cards = Array.isArray(body?.cards) ? body.cards.slice(0, 5) : [];
  const coreCrystal = findCrystalByAssignment(0, body, asText(body?.gem?.name));

  const sections = category.spread.map((position, idx) => {
    const cardName = asText(cards[idx]) || `Card ${idx + 1}`;
    const orientation = resolveOrientation(cardName, idx, body?.orientations);
    const crystal = findCrystalByAssignment(idx, body, asText(body?.gem?.name));
    return buildCrystalSoulSection(cardName, crystal, position, category, orientation, idx);
  });

  const summary = buildCrystalSoulSummary(category, sections, coreCrystal);
  const readingData = {
    category: category.name,
    categoryId: category.id,
    coreCrystal: coreCrystal.nameKo,
    sections,
    summary,
  };

  const validation = validateCrystalSoulReading(readingData);
  return {
    reading: crystalReadingToText(readingData),
    readingData,
    validation,
  };
}

function buildReadingPayload({ spreadType, category, cards, serviceKey, userQuestion, userContext }) {
  ensureCardCountOrThrow(spreadType, cards);

  const normalizedDrawnCards = normalizeDrawnCardsForSpread(spreadType, cards);
  const uiCards = normalizedDrawnCards.map((drawn, idx) => toUiCard(drawn, spreadType, idx));
  const questionType = inferQuestionType({ category, spreadId: spreadType, serviceKey });

  const interpreted = interpretTarotReading({
    serviceKey: serviceKey || `tarot:${spreadType}`,
    questionType,
    spreadId: spreadType,
    drawnCards: normalizedDrawnCards,
    userQuestion,
    userContext,
  });

  const reading = buildLegacyReadingPayload(interpreted, {
    spreadId: spreadType,
    questionType,
    drawnCards: normalizedDrawnCards,
  });

  return {
    ok: true,
    category: asText(category) || "general",
    spreadType,
    cards: uiCards,
    reading,
    consultingHighlights: buildConsultingHighlights(reading),
    engineMeta: {
      source: "lib/tarot/*",
      spreadType,
      questionType,
      cardCount: uiCards.length,
      cardDbCount: TAROT_CARDS.length,
      deterministic: true,
      qualityEnhanced: spreadType === "reunion_lighthouse_five_card",
    },
  };
}

function mapInterpretationErrorToHttp(error) {
  if (error instanceof TarotInterpretationError) {
    if (error.code === "INVALID_CARD_COUNT") {
      return json({ ok: false, message: error.userMessage, errorCode: error.code, meta: error.meta }, { status: 400 });
    }

    if (error.code === "CARD_DATA_MISSING") {
      console.error("[tarot] CARD_DATA_MISSING", error.meta || {});
      return json({ ok: false, message: error.userMessage, errorCode: error.code }, { status: 422 });
    }

    return json({ ok: false, message: error.userMessage, errorCode: error.code }, { status: 400 });
  }

  return null;
}

async function buildNumerologyReadingPayload(body = {}, env = {}) {
  const birthDate = asText(body?.birthDate);
  if (!birthDate) {
    throw createHttpError(400, "생년월일을 입력해 주세요.");
  }

  const topic = normalizeTopic(body?.topic);
  const numerology = buildNumerologyContext({
    birthDate,
    topic,
  });

  let cards = normalizeCardInput(body?.cards, topic);
  if (cards.length < 3) {
    cards = selectCards({
      birthDate,
      topic,
      name: asText(body?.name),
      numerology,
    });
  }
  cards = normalizeCardInput(cards, topic).slice(0, 3);

  const fallback = buildFallbackInterpretation({
    numerology,
    cards,
    topic,
    name: asText(body?.name),
    question: asText(body?.question),
  });

  const prompt = buildGeminiPrompt({
    numerology,
    cards,
    topic,
    question: asText(body?.question),
    name: asText(body?.name),
  });

  const aiResult = await callGeminiText(env, prompt, {
    modelEnvKeys: ["NUMEROLOGY_TAROT_GEMINI_MODEL", "TAROT_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
    maxOutputTokens: 2048,
    timeoutMs: 12000,
    totalTimeoutMs: 22000,
  });

  if (!aiResult?.ok || !asText(aiResult?.text)) {
    return {
      ok: true,
      source: "fallback",
      topic,
      numerology,
      cards,
      interpretation: fallback,
      model: asText(aiResult?.model),
      warning: asText(aiResult?.message) || "gemini_unavailable",
    };
  }

  const parsed = parseJsonCandidate(aiResult.text);
  const interpretation = normalizeInterpretation(parsed, fallback, cards, topic, asText(body?.question));

  return {
    ok: true,
    source: parsed ? "gemini" : "gemini_text_fallback",
    topic,
    numerology,
    cards,
    interpretation,
    model: asText(aiResult.model),
  };
}

export async function handleTarotRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/tarot");

    if (method === "GET" && path === "/meta") {
      return json({
        ok: true,
        engine: {
          spreads: listSpreadIds(),
          cardCount: TAROT_CARDS.length,
        },
      });
    }

    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    // Mindscan reading is finalized by coin-gate and must not fail at result generation
    // due to auth token drift between runtime environments.
    if (path !== "/mindscan") {
      await requireAuth(request, env);
    }
    const body = await readJson(request);

    if (path === "/draw") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const drawnCards = drawTarotCardsForSpread(spreadType);
      return json({ ok: true, spreadType, cards: drawnCards });
    }

    if (path === "/reading") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const category = asText(body?.category) || "general";
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      const payload = buildReadingPayload({
        spreadType,
        category,
        cards,
        serviceKey: asText(body?.serviceKey) || "tarot-reading",
        userQuestion: asText(body?.userQuestion),
        userContext: body?.userContext,
      });
      return json(payload);
    }

    if (path === "/love-reading") {
      const spreadType = "relationship_six_card";
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      const payload = buildReadingPayload({
        spreadType,
        category: "love",
        cards,
        serviceKey: "tarot-love-relationship",
        userQuestion: asText(body?.userQuestion),
        userContext: body?.userContext,
      });
      payload.reading = normalizeLoveReadingPayload(payload?.reading, payload?.cards || []);
      payload.consultingHighlights = buildLoveConsultingHighlights(payload.reading);
      payload.isRelationshipReading = true;
      payload.api = "love-reading";
      return json(payload);
    }

    if (path === "/crystal-soul") {
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      if (!cards.length) {
        return json({ ok: false, message: "카드 데이터가 필요합니다." }, { status: 400 });
      }
      const crystal = buildCrystalSoulReading(body);
      return json({
        ok: true,
        source: "worker/routes/tarot.js",
        reading: crystal.reading,
        readingData: crystal.readingData,
        validation: crystal.validation,
      });
    }

    if (path === "/mindscan") {
      const pairs = Array.isArray(body?.pairs) ? body.pairs : [];
      if (!pairs.length) {
        return json({ ok: false, message: "카드 페어 데이터가 필요합니다." }, { status: 400 });
      }

      const reading = buildMindscanReadingPayload(pairs);
      if (!reading?.ok) {
        return json(
          {
            ok: false,
            message: reading?.message || "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
          },
          { status: 422 },
        );
      }
      return json(reading);
    }

    if (path === "/numerology-reading") {
      const payload = await buildNumerologyReadingPayload(body, env);
      return json(payload);
    }

    return notFound();
  } catch (error) {
    const mapped = mapInterpretationErrorToHttp(error);
    if (mapped) return mapped;
    return handleRouteError(error);
  }
}
