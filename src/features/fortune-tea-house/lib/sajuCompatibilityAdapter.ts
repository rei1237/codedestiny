import type {
  FortuneTeaHouseConsultRequest,
  FortuneTeaHouseSajuCompatPersonInput,
  FortuneTeaSajuCompatibilitySnapshot,
  FortuneTeaSajuCompatInteraction,
  FortuneTeaSajuCompatPersonSnapshot,
  FortuneTeaSajuSnapshot,
} from "../data/consult";
import { getTenGodMeta } from "../data/tenGods";
import { buildFortuneTeaSajuSnapshot, buildFortuneTeaSajuSnapshotFromParts } from "./sajuAdapter";

// 사주 궁합 상호작용은 일간 오행의 상생/상극 관계를 정본으로 삼는다(숙요 어댑터의 오행 관계 로직과 동일한 규칙).
const ELEMENT_CREATE: Record<string, string> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const ELEMENT_CONTROL: Record<string, string> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };
const STEM_ELEMENTS: Record<string, string> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토",
  기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
};

function cleanText(value: unknown, fallback: string, maxLength = 40) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
  return text || fallback;
}

function dayMasterElement(saju?: FortuneTeaSajuSnapshot) {
  const label = String(saju?.dayMaster || "");
  const paren = label.match(/[（(]\s*([목화토금수])\s*[）)]/);
  if (paren) return paren[1];
  const stem = Array.from(label.replace(/\s/g, ""))[0];
  return STEM_ELEMENTS[stem] || "";
}

function elementRelation(a: string, b: string) {
  if (!a || !b) return "";
  if (a === b) return "동류";
  if (ELEMENT_CREATE[a] === b || ELEMENT_CREATE[b] === a) return "상생";
  if (ELEMENT_CONTROL[a] === b || ELEMENT_CONTROL[b] === a) return "상극";
  return "보완";
}

function primaryTenGodName(saju?: FortuneTeaSajuSnapshot) {
  if (saju?.tenGodSnapshot?.available && saju.tenGodSnapshot.primaryTenGod) {
    return getTenGodMeta(saju.tenGodSnapshot.primaryTenGod).nameKo;
  }
  return saju?.tenGods?.[0];
}

function buildPersonSnapshot(
  input: FortuneTeaHouseSajuCompatPersonInput,
  fallbackName: string,
  saju: FortuneTeaSajuSnapshot,
): FortuneTeaSajuCompatPersonSnapshot {
  const pillars = saju.pillars
    ? [saju.pillars.year, saju.pillars.month, saju.pillars.day, saju.pillars.hour].filter(Boolean).join(" · ")
    : "";
  const keyPoints = [
    saju.dayMaster ? `일간 ${saju.dayMaster}` : "",
    pillars ? `사주 네 기둥 ${pillars}` : "",
    saju.strongElements?.length ? `두드러진 기운 ${saju.strongElements.join(" · ")}` : "",
    primaryTenGodName(saju) ? `중심 십성 ${primaryTenGodName(saju)}` : "",
  ].filter(Boolean);
  return {
    name: cleanText(input.name, fallbackName),
    birthDate: input.birthDate,
    birthTime: input.birthTimeUnknown ? undefined : input.birthTime,
    birthTimeUnknown: Boolean(input.birthTimeUnknown || !input.birthTime),
    calendarType: input.calendarType || "solar",
    gender: input.gender,
    dayMaster: saju.dayMaster,
    pillars: saju.pillars,
    dominantElements: saju.strongElements,
    primaryTenGod: primaryTenGodName(saju),
    keyPoints,
    saju,
  };
}

function relationReading(relation: string, userName: string, partnerName: string) {
  if (relation === "상생") {
    return {
      tone: `${userName}과 ${partnerName}의 일간 기운은 상생의 결로 맞닿아, 서로의 기운을 자연스럽게 북돋아 주는 흐름입니다.`,
      strengths: [
        "서로의 부족한 기운을 채워 주는 방향이라, 함께 있을 때 마음이 한결 편안해지고 회복이 빠릅니다.",
        "한 사람의 강점이 다른 사람의 약점을 덮어 주어, 오래 갈수록 안정감이 쌓이는 관계입니다.",
      ],
      cautions: [
        "편안함이 익숙함으로 굳으면 고마움을 표현하는 말이 줄어들 수 있어요. 작은 인사를 자주 건네세요.",
        "한쪽이 늘 채워 주는 역할로 기울지 않도록, 서로 기대는 방향을 번갈아 바꾸어 보세요.",
      ],
    };
  }
  if (relation === "상극") {
    return {
      tone: `${userName}과 ${partnerName}의 일간 기운은 상극의 결이라, 끌림과 긴장이 함께 올라오는 관계입니다.`,
      strengths: [
        "서로 다른 기질이 자극이 되어, 혼자서는 넘기 어려운 벽을 함께 넘게 하는 힘이 있습니다.",
        "긴장을 성장의 재료로 쓰면, 각자의 세계가 넓어지고 관계가 단단해질 수 있어요.",
      ],
      cautions: [
        "감정이 격해질 때 서로를 이기려는 말이 앞서면 상처가 깊어집니다. 결론을 서두르지 마세요.",
        "다름을 틀림으로 읽지 말고, 상대의 방식에도 이유가 있음을 먼저 인정하는 연습이 필요합니다.",
      ],
    };
  }
  if (relation === "동류") {
    return {
      tone: `${userName}과 ${partnerName}은 닮은 기운을 가진 인연이라, 처음부터 낯설지 않고 리듬이 빨리 맞습니다.`,
      strengths: [
        "비슷한 속도와 감각 덕분에 공감이 빠르고, 초반 신뢰가 부드럽게 쌓입니다.",
        "말하지 않아도 서로의 마음을 읽어 주는 편안함이 오래 유지될 수 있어요.",
      ],
      cautions: [
        "닮은 약점이 동시에 올라오면 둘 다 물러서지 못할 수 있어요. 누가 먼저 멈출지 미리 정해 두세요.",
        "익숙함이 방심이 되어 상대의 변화나 서운함을 늦게 알아차리지 않도록 살펴 주세요.",
      ],
    };
  }
  return {
    tone: `${userName}과 ${partnerName}의 기운은 서로를 보완하는 결이라, 다른 색을 가진 두 사람이 조율하며 맞춰 가는 관계입니다.`,
    strengths: [
      "서로에게 없는 색을 나누어 주어, 함께할 때 생각의 폭과 선택의 여지가 넓어집니다.",
      "속도와 방식이 달라도 대화로 맞추면 오래 가는 균형을 만들 수 있어요.",
    ],
    cautions: [
      "다른 방식이 답답하게 느껴질 때 상대를 고치려 들면 피로가 쌓입니다. 기준을 나눠 말하세요.",
      "말하지 않아도 알아주길 바라기보다, 필요한 것을 구체적으로 표현하는 편이 안전합니다.",
    ],
  };
}

function buildUnavailable(
  request: FortuneTeaHouseConsultRequest,
  userSaju: FortuneTeaSajuSnapshot,
  partnerSaju: FortuneTeaSajuSnapshot,
): FortuneTeaSajuCompatibilitySnapshot {
  const input = request.sajuCompatibility;
  return {
    available: false,
    calculationSource: "fortune-tea-house-saju-compatibility",
    title: "두 사람의 명식이 아직 나란히 놓이지 않았어요",
    summary: "사주 궁합을 열려면 두 사람의 생년월일이 모두 필요해요. 없는 명식은 지어내지 않고, 확인된 정보만 조심스럽게 읽었습니다.",
    relationshipType: cleanText(input?.relationshipType, "인연", 40),
    focus: cleanText(input?.focus, "관계의 흐름", 40),
    currentSituation: cleanText(input?.currentSituation, "", 300),
    user: buildPersonSnapshot(input?.user || {}, "나", userSaju),
    partner: buildPersonSnapshot(input?.partner || {}, "상대", partnerSaju),
    adviceKeywords: ["생년월일 확인", "두 명식", "관계의 질문"],
  };
}

export function buildFortuneTeaSajuCompatibility(request: FortuneTeaHouseConsultRequest): FortuneTeaSajuCompatibilitySnapshot {
  const input = request.sajuCompatibility;
  // 본인 명식은 단독 사주와 동일하게 top-level 요청 필드로 계산해 result.saju와 일치시킨다.
  const userSaju = buildFortuneTeaSajuSnapshot(request);
  const partnerSaju = buildFortuneTeaSajuSnapshotFromParts(input?.partner || {});

  const userInput: FortuneTeaHouseSajuCompatPersonInput = {
    name: request.nickname,
    birthDate: request.birthDate,
    birthTime: request.birthTime,
    birthTimeUnknown: request.birthTimeUnknown,
    calendarType: request.calendarType,
    gender: request.gender,
  };
  const user = buildPersonSnapshot(userInput, "나", userSaju);
  const partner = buildPersonSnapshot(input?.partner || {}, "상대", partnerSaju);

  if (!userSaju.available || !partnerSaju.available) {
    return buildUnavailable(request, userSaju, partnerSaju);
  }

  const userElement = dayMasterElement(userSaju);
  const partnerElement = dayMasterElement(partnerSaju);
  const relation = elementRelation(userElement, partnerElement) || "보완";
  const reading = relationReading(relation, user.name, partner.name);
  const focus = cleanText(input?.focus, "관계의 흐름", 40);
  const elementHarmony = userElement && partnerElement
    ? `${user.name}의 ${userElement} 기운과 ${partner.name}의 ${partnerElement} 기운은 ${relation}의 결로 맞닿습니다.`
    : "두 사람의 오행 기운을 나란히 놓고 조율의 결을 살핍니다.";

  const interaction: FortuneTeaSajuCompatInteraction = {
    dayMasterRelation: userElement && partnerElement ? `${userElement}·${partnerElement} ${relation}` : relation,
    elementHarmony,
    summary: `${reading.tone} ${focus}을 중심으로, 두 사람의 명식이 어디서 맞물리고 어디서 조율이 필요한지 함께 살폈습니다.`,
    strengths: reading.strengths,
    cautions: reading.cautions,
  };

  return {
    available: true,
    calculationSource: "fortune-tea-house-saju-compatibility",
    title: `${user.name}의 ${user.dayMaster || "명식"}과 ${partner.name}의 ${partner.dayMaster || "명식"}이 만나는 ${relation}의 결`,
    summary: `${user.name}의 사주와 ${partner.name}의 사주를 나란히 놓고 보면, 두 일간은 ${elementHarmony} ${reading.tone} 오늘은 ${focus}을 중심으로 두 사람의 결을 함께 읽어드릴게요.`,
    relationshipType: cleanText(input?.relationshipType, "인연", 40),
    focus,
    currentSituation: cleanText(input?.currentSituation, "", 300),
    user,
    partner,
    interaction,
    adviceKeywords: [relation, focus, user.dayMaster || "나의 명식", partner.dayMaster || "상대의 명식"].filter(Boolean).slice(0, 5),
  };
}
