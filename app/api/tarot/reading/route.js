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

const MAX_PARAGRAPH_REPEAT = 1;
const MAX_SENTENCE_REPEAT = 1;
const MASTER_MAX_SENTENCES_DEFAULT = 2;

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

function removeMechanicalLead(text) {
  let out = safeText(text);
  if (!out) return "";
  const patterns = [
    /^당신이\s*뽑은\s*카드는[^.?!。！？]*[.?!。！？]?\s*/i,
    /^카드의\s*의미를\s*보면[^.?!。！？]*[.?!。！？]?\s*/i,
    /^앞서\s*말씀드렸듯이[^.?!。！？]*[.?!。！？]?\s*/i,
    /^결론부터\s*말하면[^.?!。！？]*[.?!。！？]?\s*/i,
    /^요약하면[^.?!。！？]*[.?!。！？]?\s*/i,
  ];
  for (const re of patterns) {
    out = out.replace(re, "");
  }
  return safeText(out);
}

function toMasterSentence(text, maxSentences = MASTER_MAX_SENTENCES_DEFAULT) {
  const deduped = dedupeText(removeMechanicalLead(text));
  const sentences = splitSentences(deduped);
  if (!sentences.length) return "";
  return sentences.slice(0, Math.max(1, maxSentences)).join(" ");
}

function normalizeAdviceList(items, fallback) {
  const base = dedupeStringArray(items).map((item) => toMasterSentence(item, 1)).filter(Boolean);
  if (base.length) return base.slice(0, 3);
  return dedupeStringArray(fallback).slice(0, 3);
}

function cardNameFrom(card, idx) {
  return safeText(card?.nameKr) || safeText(card?.name) || `카드 ${idx + 1}`;
}

function normalizeEnhancedLoveReading(candidate, baseReading, cards) {
  const src = candidate && typeof candidate === "object" ? candidate : {};
  const base = baseReading && typeof baseReading === "object" ? baseReading : {};

  const positionSource = Array.isArray(src.positionBreakdown) && src.positionBreakdown.length
    ? src.positionBreakdown
    : (Array.isArray(base.positionBreakdown) ? base.positionBreakdown : []);

  const positionBreakdown = positionSource.slice(0, 6).map((item, idx) => ({
    title: safeText(item?.title) || `포지션 ${idx + 1}`,
    card: safeText(item?.card) || cardNameFrom(cards?.[idx], idx),
    summary: toMasterSentence(
      item?.summary || "핵심은 감정 추측이 아니라 행동의 일관성입니다. 확인형 대화로 관계의 결과를 바꾸세요.",
      2,
    ),
  }));

  while (positionBreakdown.length < 6) {
    const idx = positionBreakdown.length;
    positionBreakdown.push({
      title: `포지션 ${idx + 1}`,
      card: cardNameFrom(cards?.[idx], idx),
      summary: "판단을 서두르지 말고 사실 확인을 먼저 하세요. 행동 패턴을 확인하면 관계의 방향이 선명해집니다.",
    });
  }

  const firstCard = safeText(positionBreakdown[0]?.card);
  const overallVibe = toMasterSentence(
    src.overallVibe || src.deepReading || base.overallVibe || "정체된 관계 에너지가 재정렬되며, 결론보다 검증이 먼저 필요한 시기입니다.",
    1,
  );
  const deepReadingCore = toMasterSentence(
    src.deepReading || src.realityAndFuture || base.deepReading || "감정의 강도보다 전달 방식이 결과를 결정합니다. 확인형 질문으로 오해를 줄이면 관계의 기류가 바뀝니다.",
    2,
  );
  const deepReading = firstCard ? `${firstCard}: ${deepReadingCore}` : deepReadingCore;
  const realityAndFuture = toMasterSentence(
    src.realityAndFuture || "지금 필요한 행동은 단순합니다. 짧고 명확한 질문 하나로 사실을 확인하고, 작은 약속을 지키는지 관찰하세요.",
    2,
  );

  const advice = normalizeAdviceList(src.advice || base.advice, [
    "오늘 결론을 내리지 말고 사실 확인 질문 1개만 하세요.",
    "연락 빈도보다 일관성을 기준으로 관계를 판단하세요.",
    "감정이 올라오면 10분 멈춘 뒤 문장 하나로 핵심만 전달하세요.",
  ]);

  return {
    overallVibe,
    deepReading,
    realityAndFuture,
    positionBreakdown,
    advice,
  };
}

function normalizeEnhancedReunionReading(candidate) {
  const src = candidate && typeof candidate === "object" ? candidate : {};
  return {
    opening: toMasterSentence(src.opening || src.reunionOutcome || "재회의 흐름은 열려 있지만, 속도보다 정확성이 중요한 구간입니다.", 1),
    pastBond: toMasterSentence(src.pastBond || "과거의 인연은 아직 작동합니다. 다만 같은 패턴으로 돌아가면 같은 결말이 반복됩니다.", 2),
    theirNow: toMasterSentence(src.theirNow || "상대는 감정을 정리하는 중입니다. 반응을 재촉하면 거리가 더 벌어집니다.", 2),
    outsideFactor: toMasterSentence(src.outsideFactor || "외부 변수보다 핵심은 신뢰 회복 방식입니다. 불확실한 추측을 줄이세요.", 2),
    theirHeart: toMasterSentence(src.theirHeart || "감정의 흔적은 남아 있습니다. 다만 확신보다 경계가 먼저 작동하고 있습니다.", 2),
    reunionOutcome: toMasterSentence(src.reunionOutcome || "재회 가능성은 행동 품질에 달려 있습니다. 짧고 명확한 소통이 결과를 바꿉니다.", 2),
    lighthouseGuidance: toMasterSentence(src.lighthouseGuidance || "지금은 감정 호소보다 사실 확인 중심의 한 번의 대화를 실행하세요.", 1),
    actionPlan: normalizeAdviceList(src.actionPlan, [
      "48시간 안에 질문 1개만 담은 짧은 메시지를 보내세요.",
      "과거 해명보다 앞으로의 소통 규칙 1개를 먼저 제안하세요.",
      "상대 반응이 애매하면 재촉하지 말고 72시간 관찰하세요.",
    ]),
  };
}

function normalizeEnhancedSelfEsteemReading(candidate) {
  const src = candidate && typeof candidate === "object" ? candidate : {};
  return {
    ...src,
    opening: toMasterSentence(src.opening || "자존감 회복의 핵심은 감정 억제가 아니라 경계 설정입니다.", 1),
    pastDebuff: toMasterSentence(src.pastDebuff || "과거 패턴은 결함이 아니라 생존 전략이었습니다. 이제 전략을 바꿀 시점입니다.", 2),
    innerMonster: toMasterSentence(src.innerMonster || "내면 비판은 사실이 아니라 습관입니다. 이름 붙여 분리하면 통제할 수 있습니다.", 2),
    currentDamage: toMasterSentence(src.currentDamage || "현재 손상은 과잉 자기검열에서 발생합니다. 반응 전에 감정 확인을 먼저 하세요.", 2),
    mindShield: toMasterSentence(src.mindShield || "타인의 감정과 내 책임을 분리하세요. 과잉 해명은 중단하세요.", 2),
    levelupMastery: toMasterSentence(src.levelupMastery || "자존감은 큰 결심보다 작은 자기존중 선택의 반복으로 완성됩니다.", 2),
    levelupGuidance: toMasterSentence(src.levelupGuidance || "오늘 하나의 경계를 실행하세요. 실행이 회복 속도를 결정합니다.", 1),
    positionInsights: Array.isArray(src.positionInsights) ? src.positionInsights : [],
    actionPlan: normalizeAdviceList(src.actionPlan, [
      "오늘 한 번은 불필요한 요청에 단호하게 거절하세요.",
      "잠들기 전에 오늘 지킨 경계 1가지를 기록하세요.",
      "불안이 올라오면 즉시 답장하지 말고 10분 멈추세요.",
    ]),
  };
}

function normalizeEnhancedYearlyReading(candidate) {
  const src = candidate && typeof candidate === "object" ? candidate : {};
  const monthlySource = Array.isArray(src.monthlyReadings) ? src.monthlyReadings : [];
  const monthlyReadings = monthlySource.slice(0, 12).map((item, idx) => ({
    month: Number(item?.month) || (idx + 1),
    flow: toMasterSentence(item?.flow || `${idx + 1}월은 우선순위 하나를 명확히 정하면 흐름이 열립니다.`, 1),
    money: toMasterSentence(item?.money || "지출 기준을 먼저 정하고 계획 외 소비를 차단하세요.", 1),
    love: toMasterSentence(item?.love || "감정 추측을 멈추고 확인형 대화를 실행하세요.", 1),
    relationship: toMasterSentence(item?.relationship || "관계는 선의보다 경계와 일관성으로 안정됩니다.", 1),
    exam: toMasterSentence(item?.exam || "짧은 반복 루틴을 고정하면 성과가 올라갑니다.", 1),
  }));

  return {
    ...src,
    summary: toMasterSentence(src.summary || "올해의 핵심은 속도보다 정확성입니다. 월별 흐름을 쪼개 실행하면 운이 따라옵니다.", 1),
    finalAdvice: toMasterSentence(src.finalAdvice || "한 달에 한 가지 행동 코드만 확실히 실행하세요.", 1),
    monthlyReadings,
  };
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

function dedupeReadingPayload(reading, spreadType, category, cards = []) {
  const type = String(spreadType || "").trim();
  const cat = String(category || "").trim().toLowerCase();

  if (type === "relationship_six_card" || cat === "love") {
    return dedupeLoveReadingContent(normalizeEnhancedLoveReading(reading, reading, cards));
  }
  if (type === "reunion_lighthouse_five_card" || cat === "reunion") {
    return dedupeReunionReadingContent(normalizeEnhancedReunionReading(reading));
  }
  if (type === "self_esteem_levelup_five_card") {
    return dedupeSelfEsteemReadingContent(normalizeEnhancedSelfEsteemReading(reading));
  }
  if (type === "yearly_twelve_card" || type === "yearly_three_card") {
    return normalizeEnhancedYearlyReading(reading);
  }

  if (reading && typeof reading === "object") {
    const out = { ...reading };
    for (const [key, value] of Object.entries(out)) {
      if (typeof value === "string") out[key] = toMasterSentence(value, 2);
      else if (Array.isArray(value)) out[key] = dedupeStringArray(value);
    }
    return out;
  }

  if (typeof reading === "string") return toMasterSentence(reading, 2);
  return reading;
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
        normalizeEnhancedReunionReading(
          engine.createReunionLighthouseReading({ drawnCards }).reading,
        ),
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
        normalizeEnhancedYearlyReading(
          engine.createYearlyTwelveCardReading({ drawnCards }).reading,
        ),
        drawnCards,
      );
    case "yearly_three_card":
      return withQuality(
        normalizeEnhancedYearlyReading(
          engine.createYearlyFromThreeCardReading({ drawnCards }).reading,
        ),
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
    return {
      opening: "회복의 핵심은 감정 억제가 아니라 경계 설정입니다.",
      pastDebuff: "과거 반응은 결함이 아니라 생존 전략이었습니다. 이제 전략을 바꾸세요.",
      innerMonster: "내면 비판은 습관입니다. 이름 붙여 분리하면 통제할 수 있습니다.",
      currentDamage: "지금의 소진은 과잉 자기검열에서 발생합니다. 반응 전에 감정 확인부터 하세요.",
      mindShield: "타인의 감정과 내 책임을 분리하세요. 과잉 해명은 중단하세요.",
      levelupMastery: "자존감은 큰 결심보다 작은 자기존중 선택의 반복으로 올라갑니다.",
      levelupGuidance: "오늘 경계 하나를 실행하세요. 실행이 회복 속도를 결정합니다.",
      positionInsights: [],
      actionPlan: [
        "오늘 불필요한 요청 1개를 단호하게 거절하세요.",
        "잠들기 전에 오늘 지킨 경계 1가지를 기록하세요.",
        "불안할 때 즉시 답장하지 말고 10분 멈춘 뒤 답하세요.",
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
            body?.cards,
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
      body?.cards,
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
        reading: dedupeReadingPayload(buildLocalFallback(body), spreadType, category, body?.cards),
        source: "local-fallback",
        upstreamStatus: upstreamResponse?.status || null,
      },
      { status: 200 }
    );
  }
}