import { NextResponse } from "next/server";
import { proxyLegacyApi } from "../../_lib/legacyApiProxy";

export const runtime = "nodejs";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pickGeminiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINIF_API_KEY5,
    process.env.GEMINIF_API_KEY6,
    process.env.GEMINIF_API_KEY7,
    process.env.GEMINIF_API_KEY8,
    process.env.GEMINIF_API_KEY9,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

function pickModels() {
  const configured = String(
    process.env.TAROT_GEMINI_MODEL ||
      process.env.MINDSCAN_GEMINI_MODEL ||
      process.env.LIFEBOOK_GEMINI_MODEL ||
      "gemini-2.5-flash"
  )
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const defaults = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
  return Array.from(new Set([...configured, ...defaults]));
}

function parseTextFromGemini(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const c of candidates) {
    for (const part of c?.content?.parts || []) {
      if (typeof part?.text === "string" && part.text.trim()) return part.text.trim();
    }
  }
  return "";
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const unfenced = raw.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(unfenced.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function safeCardName(card, idx) {
  const name = String(card?.nameKr || card?.name || card?.cardId || "").trim();
  return name || `카드 ${idx + 1}`;
}

// ─────────────────────────────────────────────
// 카테고리/스프레드 감지
// ─────────────────────────────────────────────
function detectSchema(body) {
  const spreadType = String(body?.spreadType || "");
  const category = String(body?.category || "general").toLowerCase();
  if (spreadType === "yearly_twelve_card") return "yearly";
  if (spreadType === "healing_rising_four_card" || category === "healing") return "healing";
  if (spreadType === "relationship_six_card" || category === "love") return "love";
  if (spreadType === "reunion_lighthouse_five_card" || category === "reunion") return "reunion";
  if (spreadType === "self_esteem_levelup_five_card") return "self_esteem";
  if (spreadType === "three_card_cause_process_outcome") return "monthly";
  return "general";
}

function makeCardLines(body) {
  const cards = Array.isArray(body?.cards) ? body.cards : [];
  return (
    cards
      .map((c, i) => {
        const pos = String(c?.position || `position_${i + 1}`);
        const ori = c?.orientation === "reversed" ? "역방향" : "정방향";
        return `${i + 1}. ${safeCardName(c, i)} | 위치:${pos} | ${ori}`;
      })
      .join("\n") || "(카드 정보 없음)"
  );
}

// ─────────────────────────────────────────────
// 카테고리별 Gemini 프롬프트
// ─────────────────────────────────────────────
function buildPrompt(body, schema) {
  const cl = makeCardLines(body);
  const header =
    "너는 한국어 타로 리딩 마스터다. 각 필드는 최소 4문장 이상, 풍부하고 구체적이며 공감 가는 내용으로 작성하라. 반드시 JSON만 반환하고 코드펜스 금지.\n";

  switch (schema) {
    case "healing":
      return (
        header +
        'JSON 스키마: {"opening":"따뜻한 인사말 문단","hiddenTruth":"마음 깊은 곳에 숨겨진 이야기 문단","embracePain":"그 아픔을 품어주는 문단","silverLining":"희망의 빛이 보이는 곳 문단","stepForward":"한 걸음 나아가기 문단","integrationMessage":"따뜻한 마무리 문단","actionPlan":["오늘 할 수 있는 작은 행동 1","작은 행동 2","작은 행동 3"]}\n' +
        "각 문단은 감성적이고 따뜻하며 치유 중심으로 작성하라. actionPlan은 오늘 당장 실천 가능한 구체적 행동 3가지.\n---\ncards:\n" +
        cl
      );

    case "love":
      return (
        header +
        'JSON 스키마: {"overallVibe":"타로 마스터 전반 시선 문단","deepReading":"관계 심층 해석 문단","realityAndFuture":"현실과 미래 전망 문단","positionBreakdown":[{"title":"포지션 이름","card":"카드명(방향)","summary":"해당 포지션 상세 해석 문단"}],"advice":["즉시 실행 조언 1","조언 2","조언 3","조언 4"]}\n' +
        "positionBreakdown은 cards 배열의 각 카드 포지션을 순서대로 해석하라. advice는 관계 개선 실전 조언 4가지.\n---\ncards:\n" +
        cl
      );

    case "reunion":
      return (
        header +
        'JSON 스키마: {"opening":"재회 리딩 시작 서문 문단","pastBond":"과거의 인연 해석 문단","theirNow":"상대방의 현재 상황 문단","outsideFactor":"외부 방해 요소 문단","theirHeart":"상대의 속마음 문단","reunionOutcome":"재회 가능성과 결과 문단","lighthouseGuidance":"등대의 최종 조언 문단"}\n' +
        "각 포지션 카드를 정확히 반영하고 재회 주제에 맞게 감성적으로 작성하라.\n---\ncards:\n" +
        cl
      );

    case "yearly": {
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      const monthList = cards
        .map((c, i) => {
          const ori = c?.orientation === "reversed" ? "역방향" : "정방향";
          return `${i + 1}월: ${safeCardName(c, i)} (${ori})`;
        })
        .join("\n");
      return (
        header +
        'JSON 스키마: {"summary":"한 해 전반 운세 종합 문단(5문장 이상)","finalAdvice":"연말 마무리 조언 문단","monthlyReadings":[{"month":1,"flow":"1월 전반 운세(4문장)","money":"재물운(3문장)","love":"연애운(3문장)","relationship":"인간관계운(3문장)","exam":"합격/취업운(3문장)"},{"month":2,...},{"month":3,...},{"month":4,...},{"month":5,...},{"month":6,...},{"month":7,...},{"month":8,...},{"month":9,...},{"month":10,...},{"month":11,...},{"month":12,...}]}\n' +
        "monthlyReadings 배열은 반드시 1~12월 12개 항목이어야 한다. 각 월의 카드를 반영하여 구체적으로 작성하라.\n---\n월별 카드:\n" +
        (monthList || cl)
      );
    }

    case "monthly":
      return (
        header +
        'JSON 스키마: {"story":"세 장의 카드 흐름 스토리 문단(원인→과정→결과)","advice":"이 달 핵심 실행 조언 문단"}\n' +
        "원인·과정·결과 흐름으로 스토리를 이어가고 실전 조언은 구체적으로 작성하라.\n---\ncards:\n" +
        cl
      );

    case "self_esteem":
      return (
        header +
        'JSON 스키마: {"opening":"자존감 현황 진단 문단","pastDebuff":"과거의 데버프 요인 문단","innerMonster":"내면 비판자 분석 문단","currentDamage":"현재 자존감 손상 지점 문단","mindShield":"내면 방어막과 강점 문단","levelupMastery":"레벨업 마스터리 전략 문단","levelupGuidance":"최종 레벨업 가이던스 문단","positionInsights":[{"title":"포지션 이름","card":"카드명(방향)","insight":"해당 포지션 자존감 인사이트 문단"}],"actionPlan":["오늘 실천 행동 1","행동 2","행동 3"]}\n' +
        "자존감 성장 테마로 공감 중심, 실전 중심으로 작성하라.\n---\ncards:\n" +
        cl
      );

    default:
      return (
        header +
        'JSON 스키마: {"overall":"전반 흐름 문단","card_flow":"카드 흐름 해석 문단","relationship_or_context":"관계/맥락 문단","action_plan":"실행 계획 문단","timing":"타이밍 문단","warning_and_tip":"주의사항과 팁 문단"}\n' +
        `category: ${body?.category || "general"}\nspreadType: ${body?.spreadType || "one_card"}\n---\ncards:\n` +
        cl
      );
  }
}

// ─────────────────────────────────────────────
// 카테고리별 로컬 폴백
// ─────────────────────────────────────────────
function buildLocalReading(body, schema) {
  const cards = Array.isArray(body?.cards) ? body.cards : [];

  switch (schema) {
    case "healing":
      return {
        opening:
          "지금 이 순간 잠시 멈추고 자신에게 따뜻한 눈길을 보내 주세요. 당신이 느끼는 감정들은 모두 충분한 이유가 있습니다. 억누르지 말고, 그 감정들을 천천히 바라봐 주세요. 오늘의 타로는 당신 곁에 조용히 앉아 함께 숨을 고르려 합니다.",
        hiddenTruth:
          "마음 깊은 곳에는 아직 꺼내지 못한 이야기가 있습니다. 그 이야기는 약함이 아니라 당신이 얼마나 치열하게 살았는지를 보여주는 훈장입니다. 두려움과 상처는 회피할수록 커지지만, 한 번만 똑바로 바라보면 생각보다 작은 크기임을 알 수 있습니다. 지금 가장 피하고 싶은 감정이 가장 먼저 안아 줘야 할 마음입니다.",
        embracePain:
          "그 아픔은 당신이 진지하게 무언가를 사랑했거나, 열심히 원했다는 증거입니다. 괜찮지 않아도 됩니다. 억지로 괜찮은 척하지 않아도 됩니다. 눈물이 나오면 흘리고, 분노가 올라오면 인정하세요. 감정을 온전히 느끼고 나서야 진짜 치유가 시작됩니다.",
        silverLining:
          "어두운 구름 뒤에는 반드시 빛이 있습니다. 지금 힘든 이 터널이 끝나는 곳에서 당신은 더 단단하고 따뜻한 사람으로 나올 것입니다. 이 경험은 당신을 파괴하는 것이 아니라 재조립하는 과정입니다. 지금 이 순간의 고통은 미래의 당신에게 깊은 공감 능력과 회복탄력성이라는 선물이 됩니다.",
        stepForward:
          "한 걸음이면 충분합니다. 전부 해결하려 하지 않아도 됩니다. 오늘 딱 하나, 당신에게 친절한 행동 하나를 골라 실천해 보세요. 그 작은 한 걸음이 쌓여 오늘보다 나은 내일이 됩니다. 완벽하지 않아도 움직이는 것 자체가 이미 치유입니다.",
        integrationMessage:
          "당신은 이미 충분히 강하고 충분히 가치 있는 사람입니다. 이 리딩이 끝나도 이 따뜻함이 당신 곁에 남기를 바랍니다. 자신을 소중히 여기는 마음이 모든 치유의 출발점입니다. 오늘 하루도 정말 수고했어요. 당신의 여정을 진심으로 응원합니다.",
        actionPlan: [
          "오늘 10분 동안 조용히 앉아 내 감정을 노트에 적어 보세요.",
          "거울 앞에서 자신에게 '오늘도 수고했어'라고 한 마디 건네 보세요.",
          "나를 위한 작은 선물(짧은 산책, 좋아하는 음식, 좋아하는 음악)을 하나 준비하세요.",
        ],
      };

    case "love": {
      const LOVE_POSITIONS = {
        your_heart: "나의 마음",
        their_heart: "상대의 마음",
        current_dynamic: "현재 관계 역학",
        outside_influence: "외부 영향",
        potential: "관계 가능성",
        advice: "조언",
      };
      const breakdown = cards.map((card, idx) => {
        const rawPos = String(card?.position || `position_${idx + 1}`);
        const label = LOVE_POSITIONS[rawPos] || rawPos.replace(/_/g, " ");
        const cardName =
          safeCardName(card, idx) + (card?.orientation === "reversed" ? " (역방향)" : " (정방향)");
        const summary =
          card?.orientation === "reversed"
            ? "이 포지션에서 에너지가 막혀 있거나 표현되지 못한 감정이 쌓여 있을 수 있습니다. 결론을 서두르기보다 사실 확인과 감정 정리를 먼저 해주세요. 상대의 반응을 단정하기보다 맥락과 반복 패턴을 함께 살피는 것이 중요합니다. 솔직한 표현보다 경청이 더 효과적인 국면입니다."
            : "이 포지션은 긍정적이고 활성화된 에너지를 나타냅니다. 서로의 진심이 비교적 선명하게 드러나는 흐름입니다. 작은 신호를 놓치지 않고 일관된 대화를 이어가면 관계는 빠르게 안정될 수 있습니다. 진심 어린 표현 하나가 어떤 설명보다 효과적입니다.";
        return { title: label, card: cardName, summary };
      });
      return {
        overallVibe:
          "두 사람 사이에는 끌림과 조심스러움이 공존하는 과도기가 흐르고 있습니다. 감정 자체보다 감정을 전달하는 방식이 관계의 만족도를 크게 바꾸는 시기입니다. 이 흐름은 고정된 운명이 아니라, 대화의 태도와 경계 설정에 따라 충분히 더 따뜻한 방향으로 바뀔 수 있습니다. 지금 이 순간의 선택이 관계의 결을 만들어 갑니다.",
        deepReading:
          "핵심은 확신의 부족이 아니라 표현의 타이밍입니다. 상대의 반응을 시험하기보다, 내 감정을 간결하고 구체적으로 전달할 때 긴장이 풀리고 신뢰가 쌓입니다. 불안이 올라올수록 마음속 추측을 늘리기보다 '내가 확인한 사실'을 중심으로 대화를 이어가 보세요. 두 사람 모두 자신의 방식으로 감정을 처리하는 중임을 기억하면 오해가 줄어듭니다.",
        realityAndFuture:
          "단기적으로는 속도 조절이 필요하지만, 중요한 포인트를 솔직하게 확인하면 관계의 방향은 분명해집니다. 불필요한 추측을 줄이고 작은 약속을 지키는 반복이 생기면 관계는 생각보다 빠르게 안정됩니다. 지금의 선택이 3개월 뒤의 관계 결을 바꾼다는 점을 기억해 주세요. 감정의 파도가 가라앉으면 더 선명한 미래가 보일 것입니다.",
        positionBreakdown: breakdown,
        advice: [
          "상대의 말보다 말투와 반응 속도 같은 비언어 신호를 함께 보세요.",
          "오늘 안에 결론 내리기보다 1~2번의 대화 텀을 두고 확인하세요.",
          "질문은 추궁형보다 확인형으로 바꿔 보세요. '왜 그래?' 대신 '내가 이렇게 이해했는데 맞아?'",
          "불안한 날일수록 연락 빈도를 늘리기보다 짧고 진심 있는 한 번의 대화를 목표하세요.",
        ],
      };
    }

    case "reunion":
      return {
        opening:
          "밤바다처럼 깊고 고요한 마음속에서 재회의 등대가 조용히 빛을 보내고 있습니다. 그 불빛을 따라 두 사람의 과거와 현재, 그리고 가능성의 문 앞에 서게 됩니다. 카드들이 솔직하게 이야기할 것입니다. 어떤 이야기가 나오든 당신에게 필요한 진실이 담겨 있습니다.",
        pastBond:
          "두 사람 사이에는 쉽게 지워지지 않는 인연의 흔적이 있습니다. 그 기억은 좋은 것과 아픈 것이 뒤섞여 있지만, 그 복잡함이야말로 인연의 깊이를 증명합니다. 과거의 연결고리는 아직 끊기지 않았으며, 이 카드는 그 기반이 여전히 의미를 가지고 있음을 보여줍니다. 무거운 감정을 내려놓고 지금을 바라보는 것이 첫 번째 단계입니다.",
        theirNow:
          "상대는 지금도 나름의 방식으로 과거와 현재 사이에서 균형을 잡고 있습니다. 겉으로 드러나는 모습이 전부가 아닐 수 있으며, 내면에서는 혼자 많은 것을 처리 중일 수 있습니다. 연락이 없다고 해서 잊혔다는 의미는 아닙니다. 시간이 필요한 것과 답이 없는 것은 전혀 다른 신호입니다.",
        outsideFactor:
          "두 사람의 재회를 가로막는 외부 요인이 있습니다. 그것이 거리일 수도, 주변 사람들의 시선일 수도, 혹은 삶의 조건일 수도 있습니다. 하지만 외부 장애물은 내부의 의지가 명확해지면 조각조각 돌파할 수 있습니다. 상황에 질질 끌려가는 대신 먼저 내 의도를 명확히 하는 것이 첫 번째 해법입니다.",
        theirHeart:
          "상대의 마음 안에는 당신에 대한 기억이 아직도 살아있습니다. 쉽게 털어내지 못하는 무언가가 남아있으며, 이 카드는 그 감정이 완전히 꺼지지 않았음을 암시합니다. 다만 그 감정을 꺼내는 데 용기와 적절한 순간이 필요합니다. 서두르면 오히려 벽이 높아질 수 있으니 타이밍을 지켜봐 주세요.",
        reunionOutcome:
          "재회의 가능성은 열려 있지만, 그것이 이전과 같은 방식의 재현이어서는 안 됩니다. 변화와 성숙이 전제될 때 두 사람은 더 건강한 방식으로 다시 만날 수 있습니다. 급한 재결합보다는 각자의 성장이 먼저이며, 그 이후에 오는 재회가 진짜 지속 가능합니다. 카드는 '가능성 있음'을 말하지만 동시에 '준비'를 먼저 요청합니다.",
        lighthouseGuidance:
          "등대는 방향을 알려주지만 배를 운전하는 것은 당신입니다. 연락을 기다리기보다는 먼저 내 마음을 정리하고, 그 감정이 진짜 그 사람이어야 하는가를 한 번 더 물어보세요. 재회를 원한다면 명확하고 진심 있는 한 번의 시도가 긴 침묵보다 낫습니다. 어떤 결과가 오든 당신은 한 뼘 더 성장할 것입니다.",
      };

    case "yearly": {
      const ZODIAC = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
      const TRAITS = [
        "지혜, 시작, 풍요",
        "근면, 우직함, 안정",
        "용기, 변화, 리더십",
        "성장, 평화, 직관",
        "비상, 큰 성취, 열정",
        "지성, 매력, 비밀",
        "활동력, 자유, 추진력",
        "예술성, 온화함, 조화",
        "재치, 임기응변, 다재다능",
        "결단력, 통찰, 화려함",
        "충직함, 책임감, 보호",
        "여유, 행운, 마무리",
      ];
      const baseMonths = Array.from({ length: 12 }, (_, i) => {
        const card = cards[i] || {};
        const name = safeCardName(card, i);
        const ori = card?.orientation === "reversed" ? "역방향" : "정방향";
        const zName = ZODIAC[i] || "";
        const trait = TRAITS[i] || "";
        return {
          month: i + 1,
          flow: `${zName}의 기운이 흐르는 ${i + 1}월입니다. ${trait}의 에너지가 활성화되며, ${name}(${ori}) 카드가 이 달을 이끕니다. 월초에 세운 목표를 꾸준히 실천하면 후반에 보람 있는 결과가 따라옵니다. 흐름을 억지로 바꾸려 하기보다 자연스러운 리듬에 올라타는 것이 이 달의 핵심입니다.`,
          money:
            "꾸준한 관리와 현명한 선택이 재물 흐름을 안정시킵니다. 불필요한 지출을 줄이고 저축의 씨앗을 뿌리면 후반에 결실이 보입니다. 큰 투자보다는 소득 기반을 탄탄히 다지는 데 집중하세요.",
          love:
            "진심 어린 표현이 관계를 따뜻하게 만드는 달입니다. 마음을 열고 대화할수록 인연이 깊어집니다. 기다리기보다 먼저 다가가는 용기가 둘 사이를 가깝게 할 것입니다.",
          relationship:
            "솔직한 소통과 경계 존중이 인간관계를 풍요롭게 합니다. 주변과의 조화를 위해 한 걸음 양보해 보세요. 새로운 인연이 뜻밖의 기회로 이어질 수 있습니다.",
          exam:
            "집중력과 꾸준한 반복이 합격의 핵심입니다. 컨디션 관리가 실력만큼 중요하니 충분한 수면과 주기적 휴식을 확보하세요. 작은 성취를 매일 기록하면 동기 유지에 큰 도움이 됩니다.",
        };
      });
      return {
        summary:
          "천상의 열두 수호신이 한 해의 문을 열었습니다. 1月부터 12月까지 각 월패를 눌러 해당 달의 전반 운세, 재물·연애·인간관계·합격운을 천천히 따라가 보세요. 이 리딩은 예언이 아닌 당신이 더 현명한 선택을 하도록 돕는 나침반입니다. 한 해 동안 곁에 두고 활용해 주세요.",
        finalAdvice:
          "올해는 십이지신이 지키는 한 해입니다. 매월의 카드 메시지를 곁에 두고, 작은 결심 하나하나를 실천하면 운명의 수레바퀴가 유리하게 돌아갑니다. 급하지 않게, 그러나 꾸준히 나아가면 재물·인연·성취의 기운이 차분히 쌓일 것입니다.",
        monthlyReadings: baseMonths,
      };
    }

    case "monthly": {
      const cl = cards
        .map((c, i) => safeCardName(c, i) + (c?.orientation === "reversed" ? "(역방향)" : "(정방향)"))
        .join(", ");
      return {
        story: `${cl || "세 장의 카드"}가 각각 원인·과정·결과를 이야기합니다. 첫 번째 카드는 현재 상황의 뿌리를 보여주고, 두 번째 카드는 지금 진행 중인 역동성을, 세 번째 카드는 이 방향대로 흘렀을 때 나타날 결과를 암시합니다. 세 장의 연결을 하나의 흐름으로 읽을 때 더 선명한 방향이 보입니다. 패턴을 인식하는 것만으로도 이미 절반은 해결된 것입니다.`,
        advice:
          "이 달의 중요한 지점은 과거 패턴을 반복하지 않는 것입니다. 카드가 보여주는 경고 신호를 무시하지 말고, 작은 행동 수정으로 흐름을 바꿀 수 있는 타이밍을 포착하세요. 오늘 당장 두 가지를 확인하세요: 첫째, 지금 내가 피하고 있는 것이 무엇인지. 둘째, 가장 작은 실행 가능한 다음 단계가 무엇인지.",
      };
    }

    case "self_esteem": {
      const breakdown = cards.map((card, idx) => ({
        title: String(card?.position || `포지션 ${idx + 1}`).replace(/_/g, " "),
        card: safeCardName(card, idx) + (card?.orientation === "reversed" ? " (역방향)" : " (정방향)"),
        insight:
          card?.orientation === "reversed"
            ? "이 포지션의 카드는 내면의 저항이나 막힌 에너지를 보여줍니다. 지금 당장 해결되지 않더라도, 이 부분을 인식하는 것만으로도 치유의 첫 단계가 시작됩니다. 억누르기보다는 '지금 이게 있구나'하고 인정해 주는 것이 더 효과적입니다. 저항하는 에너지일수록 그 이면에 중요한 욕구가 숨어 있습니다."
            : "이 포지션은 현재 활성화된 잠재력을 나타냅니다. 이 에너지를 의식적으로 사용하면 자존감 레벨업에 직접적인 도움이 됩니다. 지금 이 부분에서 당신은 이미 방향을 잡고 있습니다. 이 강점을 더 자주 발휘하는 것이 빠른 레벨업의 열쇠입니다.",
      }));
      return {
        opening:
          "자존감은 하루아침에 만들어지지 않습니다. 지금 이 순간 이 리딩을 선택한 것 자체가 자신을 돌보려는 의지입니다. 카드들이 당신의 현재 자존감 레벨과 성장 가능한 지점을 솔직하게 보여줄 것입니다. 어떤 결과가 나오든 당신은 더 나아질 수 있습니다.",
        pastDebuff:
          "과거의 비교, 비판, 실패 경험이 지금의 자존감에 그림자를 드리우고 있을 수 있습니다. 그 기억들은 사실이 아닐 수 있으며, 설령 사실이었더라도 지금의 당신을 규정하지는 않습니다. 과거의 데버프를 인식하는 것만으로도 그 영향력이 줄어들기 시작합니다. 과거는 바꿀 수 없지만, 그것을 해석하는 방식은 지금도 바꿀 수 있습니다.",
        innerMonster:
          "내면의 비판자는 당신을 보호하려다 과도하게 작동하는 경우가 많습니다. 그 목소리가 말하는 것을 사실로 받아들이기보다, '또 그 걱정이 나왔구나'라고 거리를 두고 바라보세요. 내면의 몬스터는 싸워 없애는 것이 아니라, 그 존재를 인정하고 주도권을 넘기지 않는 것이 핵심입니다. 몬스터에게 이름을 붙여줄 때 그것이 나 자체가 아님을 더 명확히 알 수 있습니다.",
        currentDamage:
          "현재 주의 에너지가 자존감에 부정적인 영향을 주고 있는 영역들이 있습니다. 모든 상처를 한 번에 치유하려 하지 말고, 지금 가장 아픈 곳 하나에 먼저 집중하세요. 현재의 손상 지점을 파악한 것 자체가 이미 회복의 시작입니다. 아픔을 인정할 수 있다는 것은 이미 그것에 압도되지 않는다는 증거입니다.",
        mindShield:
          "당신에게는 이미 자신을 보호하는 내면의 방어막이 있습니다. 힘들 때 버티게 해주는 가치관, 관계, 루틴을 발견하고 그것을 의식적으로 강화해 보세요. 방어막은 고립이 아니라, 건강한 경계선에서 나옵니다. 무엇이 당신에게 에너지를 주고 무엇이 빼앗아가는지를 파악하면 방어막이 자동으로 생깁니다.",
        levelupMastery:
          "자존감 레벨업은 거창한 변화가 아닌 작은 습관의 축적에서 나옵니다. 이 카드는 당신이 이미 갖고 있는 강점을 더 자주 발휘할 것을 권유합니다. 남들과 비교하는 대신 어제의 나와 오늘의 나를 비교하는 습관이 가장 강력한 레벨업 마스터리입니다. 지금 이미 레벨업의 재료는 당신 안에 있습니다.",
        levelupGuidance:
          "다음 레벨로 가는 길은 명확합니다. 매일 자신에게 친절한 말 한 마디, 작은 성취 하나 인정하기, 도움 요청하기. 이 세 가지를 21일 동안 실천하면 자존감의 기반이 눈에 띄게 달라집니다. 지금 딱 하나만 시작해도 충분합니다.",
        positionInsights: breakdown,
        actionPlan: [
          "오늘 거울을 보면서 '나는 충분히 가치 있는 사람이야'라고 3번 말해 보세요.",
          "어제보다 잘한 것 한 가지를 노트에 적어 보세요.",
          "자신을 깎아내리는 말이 나오려 할 때 '지금 그 생각은 사실이 아닐 수 있어'라고 해보세요.",
        ],
      };
    }

    default: {
      const cl = cards
        .map((c, i) => `- ${safeCardName(c, i)} (${c?.orientation || "upright"})`)
        .join("\n");
      return {
        overall: `이번 리딩은 ${body?.category || "general"} 주제를 중심으로 ${body?.spreadType || "one_card"} 배열의 흐름을 읽습니다. 표면적으로는 변화가 느리게 보이지만, 내부적으로는 이미 방향 전환이 시작된 상태입니다. 성급한 결론보다 현재 신호를 정리해 다음 행동을 정확히 선택하는 것이 핵심입니다. 지금 이 리딩이 당신의 나침반이 되길 바랍니다.`,
        card_flow: `${cl || "- 카드 정보가 제한되어 상징 흐름 중심으로 읽었습니다."}\n각 카드는 독립된 의미보다 연결된 서사로 해석해야 정확도가 올라갑니다. 초반 카드는 현재 심리와 현실 조건, 중반 카드는 갈등의 원인, 후반 카드는 전환 포인트를 보여줍니다. 한 장 한 장의 메시지를 하나의 이야기로 엮어 보세요.`,
        relationship_or_context:
          "상대나 주변 환경의 반응은 즉시 명확해지기보다, 당신의 태도 변화에 따라 단계적으로 달라질 가능성이 큽니다. 확인을 재촉하기보다 신뢰를 누적하는 접근이 유리합니다. 대화에서는 단정형 표현보다 사실 기반 질문형 표현을 사용하면 오해를 줄일 수 있습니다. 반복되는 패턴을 먼저 인식하는 것이 변화의 시작입니다.",
        action_plan:
          "1) 오늘 안에 우선순위 1개를 실행하고 결과를 기록하세요. 2) 감정 반응과 사실 데이터를 분리해 의사결정하세요. 3) 관계 이슈라면 48시간 내 짧고 명확한 확인 대화를 시도하세요. 실행을 작게 쪼개면 흐름 회복 속도가 빨라집니다.",
        timing:
          "단기적으로는 1~2주 내 체감 변화 신호가 들어오고, 중기적으로는 4~6주 구간에서 방향성이 더 선명해질 가능성이 있습니다. 중요한 결정은 감정이 과열된 당일보다는 하루 텀을 두고 확정하는 편이 안정적입니다. 타이밍을 기다리는 동안 준비도를 높이면 결과 품질이 올라갑니다.",
        warning_and_tip:
          "불안할수록 과해석과 단정이 늘어나는 패턴을 주의하세요. 리딩은 예언이 아니라 선택 품질을 높이는 도구입니다. 건강, 법률, 투자 관련 결론은 반드시 해당 분야 전문가 판단과 함께 검증하세요.",
      };
    }
  }
}

// ─────────────────────────────────────────────
// Gemini 응답 → 타겟 스키마 정규화
// ─────────────────────────────────────────────
function normalizeReading(parsed, localBase, schema) {
  if (!parsed || typeof parsed !== "object") return localBase;
  const str = (v, fb) => (String(v || "").trim() || String(fb || "")).trim();
  const arr = (v, fb) => (Array.isArray(v) && v.length ? v : Array.isArray(fb) ? fb : []);

  switch (schema) {
    case "healing":
      return {
        opening: str(parsed.opening, localBase.opening),
        hiddenTruth: str(parsed.hiddenTruth, localBase.hiddenTruth),
        embracePain: str(parsed.embracePain, localBase.embracePain),
        silverLining: str(parsed.silverLining, localBase.silverLining),
        stepForward: str(parsed.stepForward, localBase.stepForward),
        integrationMessage: str(parsed.integrationMessage, localBase.integrationMessage),
        actionPlan: arr(parsed.actionPlan, localBase.actionPlan),
      };
    case "love":
      return {
        overallVibe: str(parsed.overallVibe, localBase.overallVibe),
        deepReading: str(parsed.deepReading, localBase.deepReading),
        realityAndFuture: str(parsed.realityAndFuture, localBase.realityAndFuture),
        positionBreakdown: arr(parsed.positionBreakdown, localBase.positionBreakdown),
        advice: arr(parsed.advice, localBase.advice),
      };
    case "reunion":
      return {
        opening: str(parsed.opening, localBase.opening),
        pastBond: str(parsed.pastBond, localBase.pastBond),
        theirNow: str(parsed.theirNow, localBase.theirNow),
        outsideFactor: str(parsed.outsideFactor, localBase.outsideFactor),
        theirHeart: str(parsed.theirHeart, localBase.theirHeart),
        reunionOutcome: str(parsed.reunionOutcome, localBase.reunionOutcome),
        lighthouseGuidance: str(parsed.lighthouseGuidance, localBase.lighthouseGuidance),
      };
    case "yearly":
      return {
        summary: str(parsed.summary, localBase.summary),
        finalAdvice: str(parsed.finalAdvice, localBase.finalAdvice),
        monthlyReadings: arr(parsed.monthlyReadings, localBase.monthlyReadings),
      };
    case "monthly":
      return {
        story: str(parsed.story, localBase.story),
        advice: str(parsed.advice, localBase.advice),
      };
    case "self_esteem":
      return {
        opening: str(parsed.opening, localBase.opening),
        pastDebuff: str(parsed.pastDebuff, localBase.pastDebuff),
        innerMonster: str(parsed.innerMonster, localBase.innerMonster),
        currentDamage: str(parsed.currentDamage, localBase.currentDamage),
        mindShield: str(parsed.mindShield, localBase.mindShield),
        levelupMastery: str(parsed.levelupMastery, localBase.levelupMastery),
        levelupGuidance: str(parsed.levelupGuidance, localBase.levelupGuidance),
        positionInsights: arr(parsed.positionInsights, localBase.positionInsights),
        actionPlan: arr(parsed.actionPlan, localBase.actionPlan),
      };
    default:
      return {
        overall: str(parsed.overall, localBase.overall),
        card_flow: str(parsed.card_flow, localBase.card_flow),
        relationship_or_context: str(parsed.relationship_or_context, localBase.relationship_or_context),
        action_plan: str(parsed.action_plan, localBase.action_plan),
        timing: str(parsed.timing, localBase.timing),
        warning_and_tip: str(parsed.warning_and_tip, localBase.warning_and_tip),
      };
  }
}

async function requestGemini(prompt) {
  const keys = pickGeminiKeys();
  if (!keys.length) return null;

  const models = pickModels();
  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.82,
        maxOutputTokens: /gemini-2\.5-pro/i.test(model) ? 32768 : 8192,
      },
    };

    for (const key of keys) {
      const url = `${endpoint}?key=${encodeURIComponent(key)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) continue;
      const text = parseTextFromGemini(payload);
      if (text) return text;
    }
  }

  return null;
}

export async function POST(request) {
  const fallbackClone = request.clone();
  let upstreamResponse = null;

  try {
    upstreamResponse = await proxyLegacyApi(request);
    if (upstreamResponse?.ok) return upstreamResponse;
  } catch {
    // fallback path below
  }

  const body = await fallbackClone.json().catch(() => ({}));
  const schema = detectSchema(body);
  const localBase = buildLocalReading(body, schema);

  try {
    const prompt = buildPrompt(body, schema);
    const geminiText = await requestGemini(prompt);
    if (geminiText) {
      const parsed = extractJson(geminiText);
      const reading = normalizeReading(parsed, localBase, schema);
      return NextResponse.json(
        {
          ok: true,
          reading,
          source: "gemini-fallback",
          upstreamStatus: upstreamResponse?.status || null,
        },
        { status: 200 }
      );
    }
  } catch {
    // local fallback below
  }

  return NextResponse.json(
    {
      ok: true,
      reading: localBase,
      source: "local-fallback",
      upstreamStatus: upstreamResponse?.status || null,
    },
    { status: 200 }
  );
}
