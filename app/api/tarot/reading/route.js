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

function runEngineReading(body) {
  const engine = getEngine();
  const spreadType = engine.normalizeSpreadType(body?.spreadType || "one_card");
  const category = String(body?.category || "general").trim();
  const drawnCards = Array.isArray(body?.cards) ? body.cards : [];

  switch (spreadType) {
    case "relationship_six_card":
      return engine.createRelationshipReading({ drawnCards }).reading;
    case "healing_rising_four_card":
      return engine.createHealingRisingReading({ drawnCards }).reading;
    case "reunion_lighthouse_five_card":
      return engine.createReunionLighthouseReading({ drawnCards }).reading;
    case "self_esteem_levelup_five_card":
      return engine.createSelfEsteemLevelupReading({ drawnCards }).reading;
    case "yearly_twelve_card":
      return engine.createYearlyTwelveCardReading({ drawnCards }).reading;
    case "yearly_three_card":
      return engine.createYearlyFromThreeCardReading({ drawnCards }).reading;
    case "job_change_seven_card":
      return engine.createJobChangeTarotReading({ drawnCards }).reading;
    default: {
      const result = engine.createReading({ category, spreadType, drawnCards });
      return { story: result.story, advice: result.advice };
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
    const reading = runEngineReading(body);
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