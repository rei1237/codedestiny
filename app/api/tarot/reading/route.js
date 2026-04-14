import { NextResponse } from "next/server";
import { proxyLegacyApi } from "../../_lib/legacyApiProxy";
import { createRequire } from "module";

export const runtime = "nodejs";

// Load the CJS tarot engine. The module's own __dirname (server/services/)
// correctly resolves DB_PATH to server/data/tarot-cards.db.json.
const _require = createRequire(import.meta.url);
let _engine = null;
function getEngine() {
  if (!_engine) {
    _engine = _require("../../../../server/services/tarot-engine.service.js");
  }
  return _engine;
}

const LOVE_READING_MIN_TOTAL_CHARS = 3200;
const LOVE_SECTION_MIN_CHARS = 700;
const LOVE_POSITION_MIN_CHARS = 220;

const MAX_PARAGRAPH_REPEAT = 1;
const MAX_SENTENCE_REPEAT = 1;

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function splitParagraphs(text) {
  return safeText(text)
    .split(/\n{2,}/)
    .map((line) => safeText(line))
    .filter(Boolean);
}

function splitSentences(text) {
  const src = safeText(text);
  if (!src) return [];
  const normalized = src
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!normalized) return [];
  const parts = normalized.match(/[^.!?。！？\n]+[.!?。！？]?/g);
  return (parts || [normalized])
    .map((part) => safeText(part))
    .filter(Boolean);
}

function dedupeText(text, options = {}) {
  const paragraphLimit = Number.isFinite(options.paragraphLimit)
    ? options.paragraphLimit
    : MAX_PARAGRAPH_REPEAT;
  const sentenceLimit = Number.isFinite(options.sentenceLimit)
    ? options.sentenceLimit
    : MAX_SENTENCE_REPEAT;

  const paragraphs = splitParagraphs(text);
  const paragraphSeen = new Map();
  const dedupedParagraphs = [];

  for (const paragraph of paragraphs) {
    const key = paragraph.toLowerCase();
    const count = paragraphSeen.get(key) || 0;
    if (count >= paragraphLimit) continue;
    paragraphSeen.set(key, count + 1);

    const sentences = splitSentences(paragraph);
    const sentenceSeen = new Map();
    const dedupedSentences = [];
    for (const sentence of sentences) {
      const sentenceKey = sentence.toLowerCase();
      const sentenceCount = sentenceSeen.get(sentenceKey) || 0;
      if (sentenceCount >= sentenceLimit) continue;
      sentenceSeen.set(sentenceKey, sentenceCount + 1);
      dedupedSentences.push(sentence);
    }
    if (dedupedSentences.length) {
      dedupedParagraphs.push(dedupedSentences.join(" "));
    }
  }

  return dedupedParagraphs.join("\n\n");
}

function dedupeStringArray(items) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    const text = dedupeText(item);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function dedupeLoveReadingContent(reading) {
  const src = reading && typeof reading === "object" ? reading : {};
  const out = {
    ...src,
    overallVibe: dedupeText(src.overallVibe),
    deepReading: dedupeText(src.deepReading),
    realityAndFuture: dedupeText(src.realityAndFuture),
    advice: dedupeStringArray(src.advice),
  };

  if (Array.isArray(src.positionBreakdown)) {
    out.positionBreakdown = src.positionBreakdown.map((item) => ({
      ...item,
      title: safeText(item?.title),
      card: safeText(item?.card),
      summary: dedupeText(item?.summary),
    }));
  }

  return out;
}

function dedupeReunionReadingContent(reading) {
  const src = reading && typeof reading === "object" ? reading : {};
  return {
    ...src,
    opening: dedupeText(src.opening),
    pastBond: dedupeText(src.pastBond),
    theirNow: dedupeText(src.theirNow),
    outsideFactor: dedupeText(src.outsideFactor),
    theirHeart: dedupeText(src.theirHeart),
    reunionOutcome: dedupeText(src.reunionOutcome),
    lighthouseGuidance: dedupeText(src.lighthouseGuidance),
    actionPlan: dedupeStringArray(src.actionPlan),
  };
}

function dedupeSelfEsteemReadingContent(reading) {
  const src = reading && typeof reading === "object" ? reading : {};
  return {
    ...src,
    opening: dedupeText(src.opening),
    pastDebuff: dedupeText(src.pastDebuff),
    innerMonster: dedupeText(src.innerMonster),
    currentDamage: dedupeText(src.currentDamage),
    mindShield: dedupeText(src.mindShield),
    levelupMastery: dedupeText(src.levelupMastery),
    levelupGuidance: dedupeText(src.levelupGuidance),
    actionPlan: dedupeStringArray(src.actionPlan),
  };
}

function dedupeReadingPayload(reading, spreadType, category) {
  const type = String(spreadType || "").trim();
  const cat = String(category || "").trim().toLowerCase();

  if (type === "relationship_six_card" || cat === "love") {
    return dedupeLoveReadingContent(reading);
  }
  if (type === "reunion_lighthouse_five_card" || cat === "reunion") {
    return dedupeReunionReadingContent(reading);
  }
  if (type === "self_esteem_levelup_five_card") {
    return dedupeSelfEsteemReadingContent(reading);
  }

  if (reading && typeof reading === "object") {
    const out = { ...reading };
    for (const [key, value] of Object.entries(out)) {
      if (typeof value === "string") out[key] = dedupeText(value);
      else if (Array.isArray(value)) out[key] = dedupeStringArray(value);
    }
    return out;
  }

  if (typeof reading === "string") return dedupeText(reading);
  return reading;
}

const SELF_ESTEEM_SECTION_MIN_CHARS = 500;

function ensureSelfEsteemMinLength(text, seed) {
  let out = safeText(text);
  if (!out) out = safeText(seed);
  while (out.length < SELF_ESTEEM_SECTION_MIN_CHARS && seed) {
    out += "\n\n" + safeText(seed);
  }
  return out;
}

function ensureMinSectionLength(text, minChars, fallbackText) {
  let out = safeText(text);
  const fallback = safeText(fallbackText);
  if (!out) out = fallback;

  while (out.length < minChars && fallback) {
    out += `\n\n${fallback}`;
  }

  return out;
}

function normalizeEnhancedSelfEsteemReading(candidate) {
  const src = candidate && typeof candidate === "object" ? candidate : {};
  const fallbackOpening = "이 리딩을 선택한 것 자체가 자신을 돌보려는 강한 의지입니다. 5장의 카드가 당신의 내면 패턴을 정리하고, 회복 가능한 지점을 발견하도록 안내합니다.";
  const out = {
    ...src,
    opening: safeText(src.opening) || fallbackOpening,
    pastDebuff: ensureSelfEsteemMinLength(
      src.pastDebuff,
      "과거의 상처는 당신의 결함이 아니라 생존을 위한 적응의 흔적입니다. 그 패턴을 인식하는 순간 영향력은 줄어들고, 현재의 선택권은 다시 당신에게 돌아옵니다."
    ),
    innerMonster: ensureSelfEsteemMinLength(
      src.innerMonster,
      "내면의 비판 목소리는 당신을 보호하려는 오래된 습관일 수 있습니다. 그 목소리를 없애기보다 관찰하고 이름 붙이면, 감정의 파도에 휩쓸리지 않고 주도권을 되찾을 수 있습니다."
    ),
    currentDamage: ensureSelfEsteemMinLength(
      src.currentDamage,
      "눈치 보기와 자기 검열은 에너지를 조용히 소모시킵니다. 지금 손상 지점을 구체적으로 확인하면 회복 우선순위를 세울 수 있고, 작은 실천이 일상을 다시 안정시킵니다."
    ),
    mindShield: ensureSelfEsteemMinLength(
      src.mindShield,
      "타인의 감정과 내 책임을 분리하는 연습은 강한 마음의 방패가 됩니다. 설명은 하되 과잉 설득을 멈추고, 나를 소진시키지 않는 경계를 반복해 보세요."
    ),
    levelupMastery: ensureSelfEsteemMinLength(
      src.levelupMastery,
      "자존감의 마스터리는 완벽함이 아니라 반복되는 자기존중 선택입니다. 하루 하나의 작은 선택을 일관되게 지키면, 시간이 지날수록 내면의 안정감이 확실히 커집니다."
    ),
    levelupGuidance:
      safeText(src.levelupGuidance) ||
      "오늘부터 하나씩 실천하세요. 작은 변화의 누적이 자존감의 체력을 만들고, 그 체력이 관계와 일상의 방향까지 바꿉니다.",
    positionInsights: Array.isArray(src.positionInsights) ? src.positionInsights : [],
    actionPlan: Array.isArray(src.actionPlan) && src.actionPlan.length
      ? src.actionPlan
      : [
          "오늘 하루, 한 번은 내 감정을 먼저 확인한 뒤 대답하기",
          "거절이 필요한 상황에서 짧고 분명하게 경계 표현하기",
          "잘한 행동 1가지를 기록하고 스스로 인정하기",
          "타인의 반응을 통제하려는 생각이 들면 숨 고르고 멈추기",
          "리딩에서 가장 와닿은 문장을 오늘의 기준 문장으로 사용하기",
        ],
  };

  return out;
}


function totalLoveReadingChars(reading) {
  const main = [
    safeText(reading?.overallVibe),
    safeText(reading?.deepReading),
    safeText(reading?.realityAndFuture),
  ].join("\n").length;
  const positions = (Array.isArray(reading?.positionBreakdown) ? reading.positionBreakdown : [])
    .map((item) => safeText(item?.summary))
    .join("\n").length;
  const advice = (Array.isArray(reading?.advice) ? reading.advice : [])
    .map((item) => safeText(item))
    .join("\n").length;
  return main + positions + advice;
}

function buildLoveFallbackExpansionBlocks(cards) {
  const lines = (Array.isArray(cards) ? cards : []).map((card, idx) => {
    const name = safeText(card?.nameKr) || safeText(card?.name) || `카드 ${idx + 1}`;
    const pos = safeText(card?.position) || `position_${idx + 1}`;
    const orientation = card?.orientation === "reversed" ? "역방향" : "정방향";
    return `- ${pos}: ${name}(${orientation})의 메시지는 감정의 사실을 확인하고, 경계를 존중하며, 작은 약속의 반복으로 신뢰를 복원하라는 방향을 강조합니다.`;
  }).join("\n");

  return [
    [
      "[전문가 보강 코멘트 A]",
      "지금 관계에서 가장 중요한 것은 상대의 마음을 단정하기 전에, 서로의 표현 방식과 정서적 안전지대를 먼저 합의하는 것입니다.",
      "감정은 강도보다 전달 방식에서 갈등이 발생하므로, 질문을 추궁형에서 확인형으로 전환하면 불필요한 방어 반응을 줄일 수 있습니다.",
      "카드별 핵심 실행 포인트:",
      lines,
    ].join("\n"),
    [
      "[전문가 보강 코멘트 B]",
      "연애는 정답 찾기가 아니라 리듬 맞추기입니다. 대화 빈도, 연락 시간대, 갈등 시 회복 루틴을 구체적으로 정하면 관계 안정도가 빠르게 올라갑니다.",
      "상대를 설득하려고 급히 결론을 내리기보다, 같은 사실을 두 번 확인하는 신중함이 장기적으로 신뢰를 키웁니다.",
      "이번 리딩의 핵심은 상대를 바꾸려는 시도보다, 내 소통 패턴을 더 명료하고 부드럽게 조정하는 데 있습니다.",
    ].join("\n"),
    [
      "[전문가 보강 코멘트 C]",
      "관계의 갈등 포인트는 대부분 감정의 부재가 아니라 전달 순서의 문제에서 발생합니다.",
      "사실 확인 -> 감정 표현 -> 요청 제안의 순서로 대화하면 충돌 가능성을 낮출 수 있습니다.",
      "작은 약속의 반복 여부를 관찰하면 관계 체력을 더 정확히 진단할 수 있습니다.",
    ].join("\n"),
  ];
}

function normalizeEnhancedLoveReading(candidate, baseReading, cards) {
  const base = baseReading && typeof baseReading === "object" ? baseReading : {};
  const parsed = candidate && typeof candidate === "object" ? candidate : {};

  const overallVibe = ensureMinSectionLength(parsed.overallVibe, LOVE_SECTION_MIN_CHARS, base.overallVibe);
  const deepReading = ensureMinSectionLength(parsed.deepReading, LOVE_SECTION_MIN_CHARS, base.deepReading);
  let realityAndFuture = ensureMinSectionLength(parsed.realityAndFuture, LOVE_SECTION_MIN_CHARS, base.realityAndFuture);

  const basePositions = Array.isArray(base.positionBreakdown) ? base.positionBreakdown : [];
  const rawPositions = Array.isArray(parsed.positionBreakdown) ? parsed.positionBreakdown : [];
  const positionBreakdown = (rawPositions.length ? rawPositions : basePositions)
    .slice(0, 6)
    .map((item, idx) => {
      const fallback = basePositions[idx] || {};
      return {
        title: safeText(item?.title) || safeText(fallback.title) || `포지션 ${idx + 1}`,
        card: safeText(item?.card) || safeText(fallback.card) || `카드 ${idx + 1}`,
        summary: ensureMinSectionLength(item?.summary, LOVE_POSITION_MIN_CHARS, fallback.summary),
      };
    });

  while (positionBreakdown.length < 6) {
    const idx = positionBreakdown.length;
    const card = Array.isArray(cards) ? cards[idx] : null;
    const cardName = safeText(card?.nameKr) || safeText(card?.name) || `카드 ${idx + 1}`;
    positionBreakdown.push({
      title: `포지션 ${idx + 1}`,
      card: cardName,
      summary: `${cardName}의 메시지는 현재 감정 반응을 서두르지 말고 사실 확인을 통해 관계의 안전한 대화 구조를 세우라는 조언입니다. 작은 약속을 반복하고 관찰하면 관계의 신뢰가 안정적으로 회복됩니다.`,
    });
  }

  let advice = Array.isArray(parsed.advice) ? parsed.advice.map((item) => safeText(item)).filter(Boolean) : [];
  if (!advice.length && Array.isArray(base.advice)) {
    advice = base.advice.map((item) => safeText(item)).filter(Boolean);
  }
  const adviceSeed = [
    "감정이 올라온 직후 결론을 내리지 말고, 10분 텀 후 사실과 해석을 분리해 대화하세요.",
    "질문은 추궁형 대신 확인형 문장으로 바꿔 상대의 방어 반응을 줄이세요.",
    "이번 주에 15분짜리 진심 대화 1회를 예약하고, 대화 목적을 미리 공유하세요.",
    "갈등이 생기면 문제 인물화 대신 문제 구조화로 접근하세요.",
    "연락 빈도보다 일관성을 우선 체크해 관계 체력을 판단하세요.",
    "상대의 속도와 나의 속도 차이를 인정하고 중간 리듬을 합의하세요.",
    "불안한 날에는 관계 결론보다 자기 루틴(수면/식사/업무)을 먼저 회복하세요.",
    "관계의 기준 3가지를 글로 정리해, 감정 기복 때 의사결정 기준으로 사용하세요.",
  ];
  for (const item of adviceSeed) {
    if (advice.length >= 8) break;
    advice.push(item);
  }
  advice = advice.slice(0, 12);

  const out = {
    overallVibe,
    deepReading,
    realityAndFuture,
    positionBreakdown,
    advice,
  };

  const expansionBlocks = buildLoveFallbackExpansionBlocks(cards);
  let expansionIdx = 0;
  while (totalLoveReadingChars(out) < LOVE_READING_MIN_TOTAL_CHARS) {
    const block =
      expansionBlocks[expansionIdx]
      || `[전문가 보강 코멘트 ${expansionIdx + 1}] 현재 관계의 핵심은 감정의 진위를 추측하기보다, 행동의 일관성과 대화의 안전성을 확인하는 것입니다.`;
    realityAndFuture += `\n\n${block}`;
    out.realityAndFuture = realityAndFuture;
    expansionIdx += 1;
  }

  return dedupeLoveReadingContent(out);
}

async function runEngineReading(body) {
  const engine = getEngine();
  const spreadType = engine.normalizeSpreadType(body?.spreadType || "one_card");
  const category = String(body?.category || "general").trim();
  const drawnCards = Array.isArray(body?.cards) ? body.cards : [];

  function withQuality(reading, cardReadings) {
    try {
      if (typeof engine.enhanceTarotReadingPayload === "function") {
        return (
          engine.enhanceTarotReadingPayload({
            spreadType,
            reading,
            cardReadings,
          }) || reading
        );
      }
    } catch {
      // fall through with original reading
    }
    return reading;
  }

  switch (spreadType) {
    case "relationship_six_card": {
      const relationship = engine.createRelationshipReading({ drawnCards });
      const readingForUi = normalizeEnhancedLoveReading(
        relationship.reading,
        relationship.reading,
        relationship.cardReadings,
      );
      return withQuality(
        readingForUi,
        relationship.cardReadings,
      );
    }
    case "healing_rising_four_card":
      return withQuality(
        engine.createHealingRisingReading({ drawnCards }).reading,
        drawnCards,
      );
    case "reunion_lighthouse_five_card":
      return withQuality(
        engine.createReunionLighthouseReading({ drawnCards }).reading,
        drawnCards,
      );
    case "self_esteem_levelup_five_card":
      return withQuality(
        normalizeEnhancedSelfEsteemReading(
          engine.createSelfEsteemLevelupReading({ drawnCards }).reading,
        ),
        drawnCards,
      );
    case "yearly_twelve_card":
      return withQuality(
        engine.createYearlyTwelveCardReading({ drawnCards }).reading,
        drawnCards,
      );
    case "yearly_three_card":
      return withQuality(
        engine.createYearlyFromThreeCardReading({ drawnCards }).reading,
        drawnCards,
      );
    case "job_change_seven_card":
      return withQuality(
        engine.createJobChangeTarotReading({ drawnCards }).reading,
        drawnCards,
      );
    default: {
      const result = engine.createReading({ category, spreadType, drawnCards });
      return withQuality({ story: result.story, advice: result.advice }, result.cardReadings || drawnCards);
    }
  }
}
// Minimal static fallback - only used if engine catastrophically fails to load
function buildLocalFallback(body) {
  const spreadType = String(body?.spreadType || "");
  const category = String(body?.category || "general").toLowerCase();

  if (spreadType === "healing_rising_four_card" || category === "healing") {
    return {
      opening: "잠시 멈추고 자신에게 따뜻한 눈길을 보내 주세요.",
      hiddenTruth: "마음 깊은 곳의 이야기를 천천히 바라봐 주세요.",
      embracePain: "그 아픔은 당신이 진지하게 살았다는 증거입니다.",
      silverLining: "이 터널이 끝나는 곳에서 당신은 더 단단해질 것입니다.",
      stepForward: "오늘 딱 하나, 자신에게 친절한 행동을 실천하세요.",
      integrationMessage: "당신은 충분히 강하고 가치 있는 사람입니다.",
      actionPlan: ["오늘 내 감정을 노트에 적어 보세요.", "자신에게 수고했다고 말해 보세요.", "나를 위한 작은 선물을 준비하세요."],
    };
  }
  if (spreadType === "relationship_six_card" || category === "love") {
    return {
      overallVibe: "두 사람 사이에 끌림과 조심스러움이 공존하는 시기입니다.",
      deepReading: "표현의 타이밍이 관계의 핵심입니다.",
      realityAndFuture: "솔직한 확인이 관계의 방향을 분명하게 합니다.",
      positionBreakdown: [],
      advice: ["비언어 신호를 함께 보세요.", "결론 내리기보다 대화 텀을 두세요.", "확인형 질문을 사용하세요.", "진심 있는 대화를 목표하세요."],
    };
  }
  if (spreadType === "reunion_lighthouse_five_card" || category === "reunion") {
    return {
      opening: "재회의 등대가 조용히 빛을 보내고 있습니다.",
      pastBond: "두 사람 사이에는 쉽게 지워지지 않는 인연이 있습니다.",
      theirNow: "상대는 나름의 방식으로 균형을 잡고 있습니다.",
      outsideFactor: "외부 장애물은 내부의 의지가 명확해지면 돌파할 수 있습니다.",
      theirHeart: "상대의 마음 안에는 당신에 대한 기억이 살아있습니다.",
      reunionOutcome: "재회의 가능성은 열려 있지만 성숙이 전제되어야 합니다.",
      lighthouseGuidance: "진심 있는 한 번의 시도가 긴 침묵보다 낫습니다.",
    };
  }
  if (spreadType === "self_esteem_levelup_five_card") {
    const pastDebuffSeed = "과거에 당신의 자존감을 낮추었던 경험들—누군가에게 무시당한 기억, 끊임없이 비교당한 환경, 혹은 완벽하지 않으면 인정받지 못한다고 느꼈던 순간들—이 모두 지금의 당신을 만들어 온 조각들입니다. 카드는 말합니다. 그 경험들은 당신의 결함이 아니라, 당시 당신이 처한 상황에서 살아남기 위해 선택한 적응의 방식이었다고. 눈치를 보는 습관, 확인을 반복하는 불안, 먼저 사과하는 패턴—이것들은 상처의 흔적이지 성격의 결핍이 아닙니다. 지금부터 이 패턴들을 인식하는 것이 첫 번째 레벨업입니다. 과거를 바꿀 수는 없지만, 과거가 현재의 나를 정의하는 힘을 점점 줄여 나갈 수 있습니다. 오늘 이 리딩이 그 시작점이 되어줄 것입니다. 당신이 이 자리에 앉아 내면을 들여다볼 용기를 낸 것 자체가 이미 성장의 증거입니다.";
    const innerMonsterSeed = "내면의 몬스터는 종종 '나는 충분하지 않아', '이 정도면 됐어', '어차피 나는 안 돼'라는 목소리로 나타납니다. 이 목소리는 외부에서 들어온 판단이 내면화된 것입니다. 카드는 이 몬스터를 억압하거나 없애려 하지 말고, 먼저 인정하라고 말합니다. '아, 지금 그 목소리가 왔구나'라고 관찰하는 순간, 그 목소리는 절반의 힘을 잃습니다. 이 몬스터가 가장 시끄럽게 말하는 상황을 떠올려 보세요. 발표할 때? 거절해야 할 때? 관계에서 먼저 연락할 때? 그 순간이 바로 당신이 경계를 배워야 할 영역입니다. 인정은 동의가 아닙니다. 나에게는 이런 불안이 있고, 그것은 과거 경험에서 왔다—나는 지금 다르게 선택할 수 있다는 인식이 자존감 회복의 핵심 공식입니다.";
    const currentDamageSeed = "지금 이 순간, 눈치 보는 습관과 자기 검열은 당신의 에너지를 조용히 빼앗고 있습니다. 매일 타인의 반응을 스캔하고, 내 감정보다 분위기를 먼저 읽고, 말하기 전에 여러 번 필터링하는 일—이것들이 반복되면 자연스럽게 지칩니다. 카드는 이 피로가 나약함이 아니라, 지나치게 많은 에너지를 타인 관리에 쓰고 있다는 신호라고 말합니다. 회복의 첫 단계는 이 소진 패턴을 인식하는 것입니다. 하루에 딱 한 번, '오늘 내가 정말 원한 것은 무엇이었나?'를 스스로에게 묻는 연습을 시작해 보세요. 그 질문이 현재의 손상 지점을 회복시키는 단순하지만 강력한 루틴이 됩니다. 완벽한 회복을 기대하지 않아도 됩니다. 방향만 바꾸면 지금부터 달라집니다.";
    const mindShieldSeed = "타인이 실망하거나 화내는 상황에서도 당신이 흔들리지 않으려면, 가장 먼저 타인의 감정과 내 책임의 경계를 구분하는 연습이 필요합니다. 카드는 당신이 이미 그 방어막을 가지고 있다고 말합니다—다만, 아직 충분히 사용하지 않았을 뿐입니다. 상대가 실망했을 때 내가 잘못해서라는 전제보다 먼저, 이 상황이 실망스럽게 느껴졌을 수 있다고 구분해 보세요. 설명은 하되, 과잉 해명으로 자신을 소진시키지 않아도 됩니다. 마음의 방어막은 벽이 아닙니다. 자신과 타인의 감정 모두를 존중하면서, 내가 통제할 수 없는 타인의 반응에 과잉 책임지지 않는 연습—이것이 진짜 마음의 방패입니다. 오늘 한 번, 상대가 실망했을 때 나는 최선을 다했다고 스스로에게 말해 주세요.";
    const levelupMasterySeed = "자존감 레벨업의 마스터리는 나를 1순위로 두는 선택을 반복하는 데 있습니다. 한 번에 크게 바뀔 필요는 없습니다. 오늘 하루, 불편해도 솔직하게 NO라고 말한 한 번이 중요합니다. 카드는 말합니다—당신은 타인의 기대를 충족시키기 위해 존재하지 않습니다. 나를 돌보는 것이 이기적인 게 아니라, 나를 소진시키지 않아야 진짜로 타인을 도울 수 있다고. 마스터리는 완벽함이 아니라 일관성입니다. 실패하는 날이 있어도 다음에 다시 선택하면 된다는 유연함이 자존감을 지속 가능하게 만듭니다. 이번 리딩을 계기로, 하루에 하나씩 나를 위한 선택을 늘려 나가세요. 작은 루틴이 쌓여, 6개월 뒤의 나는 지금과 다른 단단함을 가지게 됩니다.";
    return {
      opening: "자존감 레벨업 타로에 오신 것을 환영합니다. 지금 이 순간 당신이 자신의 내면을 들여다볼 용기를 냈다는 것 자체가 이미 한 단계 성장했다는 증거입니다. 5장의 카드는 당신이 지나온 상처와 그 안에 숨어 있는 힘, 그리고 앞으로 나아갈 방향을 사랑을 담아 안내할 것입니다. 천천히 읽어 주세요. 모든 메시지는 지금의 당신을 위한 것입니다.",
      pastDebuff: ensureSelfEsteemMinLength("", pastDebuffSeed),
      innerMonster: ensureSelfEsteemMinLength("", innerMonsterSeed),
      currentDamage: ensureSelfEsteemMinLength("", currentDamageSeed),
      mindShield: ensureSelfEsteemMinLength("", mindShieldSeed),
      levelupMastery: ensureSelfEsteemMinLength("", levelupMasterySeed),
      levelupGuidance: "5장의 카드가 완성되었습니다. 당신의 자존감 레벨업 퀘스트는 오늘부터 시작됩니다. 과거의 상처를 인식하고, 내면의 목소리와 협상하며, 에너지를 회복하고, 마음의 방패를 세우고, 나를 우선으로 선택하는 연습—이 5가지를 한꺼번에 완벽하게 할 필요는 없습니다. 오늘 하나만 시작하세요. 그것으로 충분합니다. 매일 작은 레벨업이 쌓여 당신은 반드시 변화합니다.",
      positionInsights: [],
      actionPlan: [
        "오늘 하루 'NO'라고 말해도 괜찮은 상황 한 가지를 찾아 실행해 보세요.",
        "타인의 시선 대신 '내가 진짜 원하는 것'을 한 문장으로 적어 보세요.",
        "눈치 보느라 참았던 감정이 있다면, 오늘 안전한 사람에게 한 번 말해 보세요.",
        "매일 아침 거울을 보며 '나는 충분히 가치 있어'라고 3번 말해 보세요.",
        "이 리딩에서 가장 마음에 와닿은 카드 한 장의 메시지를 메모해 두고, 힘들 때 꺼내 읽어 보세요.",
      ],
    };
  }
  if (spreadType === "yearly_twelve_card") {
    return {
      summary: "12개월의 운명의 수레바퀴가 열렸습니다. 각 월을 눌러 운세를 확인하세요.",
      finalAdvice: "매월의 카드 메시지를 따라 작은 결심이 큰 행운으로 이어집니다.",
      monthlyReadings: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        flow: `${i + 1}월의 흐름을 카드가 안내합니다. 꾸준히 실천하면 결과가 따라옵니다.`,
        money: "꾸준한 관리와 현명한 선택이 재물 흐름을 안정시킵니다.",
        love: "진심 어린 표현이 관계를 따뜻하게 만드는 달입니다.",
        relationship: "솔직한 소통이 인간관계를 풍요롭게 합니다.",
        exam: "집중력과 꾸준한 노력이 좋은 결과로 이어집니다.",
      })),
    };
  }
  return {
    story: "카드의 흐름을 통해 현재 상황의 핵심을 읽을 수 있습니다.",
    advice: "오늘 우선순위 1개를 실행하고 결과를 기록하세요.",
  };
}

export async function POST(request) {
  const fallbackClone = request.clone();
  let upstreamResponse = null;
  const body = await fallbackClone.json().catch(() => ({}));
  const spreadType = String(body?.spreadType || "").trim();
  const category = String(body?.category || "general").trim().toLowerCase();

  // 1. Try Express server proxy (best quality if available)
  try {
    upstreamResponse = await proxyLegacyApi(request);
    if (upstreamResponse?.ok) {
      try {
        const upstreamPayload = await upstreamResponse.clone().json();
        if (upstreamPayload && typeof upstreamPayload === "object") {
          const normalizedReading = dedupeReadingPayload(
            upstreamPayload.reading,
            spreadType,
            category,
          );
          return NextResponse.json(
            { ...upstreamPayload, reading: normalizedReading },
            { status: upstreamResponse.status || 200 },
          );
        }
      } catch {
        return upstreamResponse;
      }
      return upstreamResponse;
    }
  } catch {
    // fall through to engine
  }

  // 2. Use tarot engine directly
  try {
    const reading = dedupeReadingPayload(
      await runEngineReading(body),
      spreadType,
      category,
    );
    return NextResponse.json(
      { ok: true, reading, source: "engine" },
      { status: 200 }
    );
  } catch {
    // 3. Static fallback
    return NextResponse.json(
      {
        ok: true,
        reading: dedupeReadingPayload(buildLocalFallback(body), spreadType, category),
        source: "local-fallback",
        upstreamStatus: upstreamResponse?.status || null,
      },
      { status: 200 }
    );
  }
}