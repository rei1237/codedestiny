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

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
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

function buildLoveFallbackExpansion(cards) {
  const lines = (Array.isArray(cards) ? cards : []).map((card, idx) => {
    const name = safeText(card?.nameKr) || safeText(card?.name) || `카드 ${idx + 1}`;
    const pos = safeText(card?.position) || `position_${idx + 1}`;
    const orientation = card?.orientation === "reversed" ? "역방향" : "정방향";
    return `- ${pos}: ${name}(${orientation})의 메시지는 감정의 사실을 확인하고, 경계를 존중하며, 작은 약속의 반복으로 신뢰를 복원하라는 방향을 강조합니다.`;
  }).join("\n");

  return [
    "[전문가 보강 코멘트]",
    "지금 관계에서 가장 중요한 것은 상대의 마음을 단정하기 전에, 서로의 표현 방식과 정서적 안전지대를 먼저 합의하는 것입니다.",
    "감정은 강도보다 전달 방식에서 갈등이 발생하므로, 질문을 추궁형에서 확인형으로 전환하면 불필요한 방어 반응을 줄일 수 있습니다.",
    "연애는 정답 찾기가 아니라 리듬 맞추기입니다. 대화 빈도, 연락 시간대, 갈등 시 회복 루틴을 구체적으로 정하면 관계 안정도가 빠르게 올라갑니다.",
    "카드별 핵심 실행 포인트:",
    lines,
    "이번 리딩의 핵심은 상대를 바꾸려는 시도보다, 내 소통 패턴을 더 명료하고 부드럽게 조정하는 데 있습니다. 이 변화가 결국 관계 전체의 결을 바꿉니다.",
  ].join("\n");
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

  const expansion = buildLoveFallbackExpansion(cards);
  while (totalLoveReadingChars(out) < LOVE_READING_MIN_TOTAL_CHARS) {
    realityAndFuture += `\n\n${expansion}`;
    out.realityAndFuture = realityAndFuture;
  }

  return out;
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
        engine.createSelfEsteemLevelupReading({ drawnCards }).reading,
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
    return {
      opening: "이 리딩을 선택한 것 자체가 자신을 돌보려는 의지입니다.",
      pastDebuff: "과거의 데버프를 인식하는 것만으로도 영향력이 줄어듭니다.",
      innerMonster: "내면의 몬스터는 인정하고 주도권을 넘기지 않는 것이 핵심입니다.",
      currentDamage: "손상 지점을 파악한 것 자체가 회복의 시작입니다.",
      mindShield: "당신에게는 이미 내면의 방어막이 있습니다.",
      levelupMastery: "어제의 나와 오늘의 나를 비교하는 습관이 레벨업 마스터리입니다.",
      levelupGuidance: "매일 자신에게 친절한 말 한 마디를 실천하세요.",
      positionInsights: [],
      actionPlan: ["거울 앞에서 '나는 충분히 가치있어'라고 3번 말하세요.", "잘한 것 한 가지를 노트에 적으세요.", "자기 비판이 올라올 때 멈추고 인정하세요."],
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

  // 1. Try Express server proxy (best quality if available)
  try {
    upstreamResponse = await proxyLegacyApi(request);
    if (upstreamResponse?.ok) return upstreamResponse;
  } catch {
    // fall through to engine
  }

  const body = await fallbackClone.json().catch(() => ({}));

  // 2. Use tarot engine directly
  try {
    const reading = await runEngineReading(body);
    return NextResponse.json(
      { ok: true, reading, source: "engine" },
      { status: 200 }
    );
  } catch {
    // 3. Static fallback
    return NextResponse.json(
      {
        ok: true,
        reading: buildLocalFallback(body),
        source: "local-fallback",
        upstreamStatus: upstreamResponse?.status || null,
      },
      { status: 200 }
    );
  }
}