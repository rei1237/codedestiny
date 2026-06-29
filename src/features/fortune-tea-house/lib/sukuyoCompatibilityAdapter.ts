import { Lunar, Solar } from "lunar-javascript";
import { buildSukuyoAiCompatibility, buildSukuyoFromLunar } from "@/worker/lib/sukuyo-ai-calculation.js";
import type {
  FortuneTeaHouseCalendarType,
  FortuneTeaHouseConsultRequest,
  FortuneTeaHouseSukuyoPersonInput,
  FortuneTeaSukuyoCompatibilitySnapshot,
  FortuneTeaSukuyoPersonSnapshot,
} from "../data/consult";

type BirthParts = {
  year: number;
  month: number;
  day: number;
};

type LunarBirth = {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth: boolean;
  source: string;
};

const RELATION_GUIDE: Record<string, {
  tone: string;
  strengths: string[];
  cautions: string[];
  keywords: string[];
}> = {
  명: {
    tone: "서로의 리듬이 닮아 익숙함이 빠르게 깊어지는 인연입니다.",
    strengths: ["마음의 속도가 비슷해 초반 신뢰가 잘 생깁니다.", "말하지 않아도 알아차리는 감각이 관계를 편안하게 합니다."],
    cautions: ["익숙함이 방심으로 흐르면 상대의 변화를 놓치기 쉽습니다.", "닮은 점이 강할수록 같은 약점도 함께 커질 수 있습니다."],
    keywords: ["익숙함", "공명", "정기적 확인"],
  },
  영친: {
    tone: "돌봄과 신뢰가 부드럽게 오가는 인연입니다.",
    strengths: ["서로에게 안심을 주는 말과 행동이 자연스럽게 살아납니다.", "관계가 오래갈수록 정서적 지지가 강해집니다."],
    cautions: ["한쪽만 돌보는 흐름이 굳어지면 서운함이 쌓일 수 있습니다.", "따뜻함을 당연하게 여기지 않는 확인이 필요합니다."],
    keywords: ["돌봄", "신뢰", "고마움"],
  },
  우쇠: {
    tone: "친밀함과 자극이 함께 움직이는 인연입니다.",
    strengths: ["서로의 장점을 빠르게 알아보고 성장의 자극을 줍니다.", "가벼운 경쟁심이 관계에 생기를 만들 수 있습니다."],
    cautions: ["비교가 깊어지면 자존심이 먼저 다칠 수 있습니다.", "침묵으로 벌주기보다 마음의 이유를 짧게 말해야 합니다."],
    keywords: ["자극", "인정", "비교 내려놓기"],
  },
  안괴: {
    tone: "강한 끌림과 흔들림이 함께 떠오르는 인연입니다.",
    strengths: ["멈춰 있던 감정을 깨우고 관계를 빠르게 변화시킵니다.", "서로의 숨은 상처를 알아차리는 힘이 있습니다."],
    cautions: ["상처가 올라오는 순간 결론을 서두르면 관계가 쉽게 날카로워집니다.", "불안을 사랑의 증거로만 붙잡지 않도록 경계가 필요합니다."],
    keywords: ["강한 끌림", "경계", "속도 조절"],
  },
  업태: {
    tone: "오래된 숙제처럼 반복되는 감정이 떠오르는 인연입니다.",
    strengths: ["서로에게 쉽게 잊히지 않는 존재감이 남습니다.", "반복되는 관계 패턴을 의식적으로 바꾸면 큰 성장이 열립니다."],
    cautions: ["운명이라는 말로 현실의 선택을 미루면 같은 장면이 반복될 수 있습니다.", "강한 끌림일수록 속도와 약속을 또렷하게 나누어야 합니다."],
    keywords: ["반복", "선택", "현실의 약속"],
  },
  위성: {
    tone: "긴장과 성장이 함께 흐르는 인연입니다.",
    strengths: ["서로의 기준을 넓혀 주고 새로운 역할을 배우게 합니다.", "함께 목표를 정하면 관계가 단단해질 수 있습니다."],
    cautions: ["서로를 바꾸려는 마음이 커지면 피로가 빨리 쌓입니다.", "감정 목표와 현실 목표를 분리해 말해야 합니다."],
    keywords: ["성장", "역할 균형", "기준 설명"],
  },
};

const SUKUYO_STABLE_GROUP_HANJA = new Set(["角", "亢", "氐", "房", "心", "尾", "箕"]);
const SUKUYO_RISK_GROUP_HANJA = new Set(["奎", "婁", "胃", "昴", "畢", "觜", "參"]);
const SUKUYO_ELEMENT_CREATE: Record<string, string> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const SUKUYO_ELEMENT_CONTROL: Record<string, string> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };
const SUKUYO_RELATION_12 = [
  { name: "안", han: "安", meaning: "동숙·완벽한 공명" },
  { name: "위", han: "危", meaning: "근접·날카로운 긴장" },
  { name: "괴", han: "壞", meaning: "파괴적 변화 유발" },
  { name: "복", han: "福", meaning: "복과 이익의 관계" },
  { name: "명", han: "命", meaning: "운명적 연결" },
  { name: "이", han: "利", meaning: "실익과 협력" },
  { name: "쇠", han: "衰", meaning: "에너지 소진 위험" },
  { name: "우", han: "友", meaning: "우정·동반의 결속" },
  { name: "아", han: "我", meaning: "자기 투영·미러링" },
  { name: "원", han: "怨", meaning: "원한·업보의 얽힘" },
  { name: "친", han: "親", meaning: "깊은 친밀감" },
  { name: "비", han: "非", meaning: "이질적 공존" },
];

function cleanText(value: unknown, fallback: string, maxLength = 80) {
  const text = String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
  return text || fallback;
}

function normalizeCalendarType(value: unknown): FortuneTeaHouseCalendarType {
  return value === "lunar" ? "lunar" : "solar";
}

function parseBirthDate(value?: string): BirthParts | null {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function lunarForPerson(person: FortuneTeaHouseSukuyoPersonInput): LunarBirth {
  const birth = parseBirthDate(person.birthDate);
  if (!birth) throw new Error("INVALID_SUKUYO_BIRTH");
  const calendarType = normalizeCalendarType(person.calendarType);
  if (calendarType === "lunar") {
    Lunar.fromYmd(birth.year, birth.month, birth.day);
    return {
      lunarYear: birth.year,
      lunarMonth: birth.month,
      lunarDay: birth.day,
      isLeapMonth: false,
      source: "user-lunar-input",
    };
  }

  const lunar = Solar.fromYmdHms(birth.year, birth.month, birth.day, 12, 0, 0).getLunar();
  const lunarMonth = Number(lunar.getMonth());
  return {
    lunarYear: Number(lunar.getYear()),
    lunarMonth: Math.abs(lunarMonth),
    lunarDay: Number(lunar.getDay()),
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  };
}

function calculatePersonSukuyo(person: FortuneTeaHouseSukuyoPersonInput) {
  const lunar = lunarForPerson(person);
  const sukuyo = buildSukuyoFromLunar(lunar.lunarMonth, lunar.lunarDay, {
    isLeapMonth: lunar.isLeapMonth,
    source: lunar.source,
  });
  if (!sukuyo) throw new Error("SUKUYO_EMPTY");
  return { ...sukuyo, lunarYear: lunar.lunarYear };
}

function sukuyoName(value: any) {
  const name = cleanText(value?.nameKo || value?.name, "", 12);
  return name ? `${name}숙` : "";
}

function sukuyoHanja(value: any) {
  const name = cleanText(value?.nameHan || value?.hanja, "", 12);
  return name ? `${name}宿` : "";
}

function buildPersonSnapshot(input: FortuneTeaHouseSukuyoPersonInput, fallbackName: string, sukuyo?: any): FortuneTeaSukuyoPersonSnapshot {
  return {
    name: cleanText(input.name, fallbackName, 40),
    birthDate: input.birthDate,
    calendarType: normalizeCalendarType(input.calendarType),
    gender: input.gender,
    sukuyoName: sukuyo ? sukuyoName(sukuyo) : undefined,
    sukuyoHanja: sukuyo ? sukuyoHanja(sukuyo) : undefined,
    index: Number.isFinite(Number(sukuyo?.index)) ? Number(sukuyo.index) : undefined,
    element: sukuyo?.element,
    direction: sukuyo?.direction,
    keywords: Array.isArray(sukuyo?.keywords) ? sukuyo.keywords.slice(0, 3) : [],
  };
}

function compatibilityIndex(compatibility: any) {
  const chemistry = Number(compatibility?.chemistryScore || 74);
  const stability = Number(compatibility?.stabilityScore || 72);
  const conflict = Number(compatibility?.conflictScore || 42);
  return Math.max(1, Math.min(99, Math.round((chemistry + stability + (100 - conflict)) / 3)));
}

function relationGuide(relationType?: string) {
  return RELATION_GUIDE[cleanText(relationType, "명", 12)] || RELATION_GUIDE.명;
}

function normalizeSukuyoElement(value: unknown) {
  const element = cleanText(value, "토", 4);
  if (["목", "화", "토", "금", "수"].includes(element)) return element;
  if (element === "일") return "화";
  if (element === "월") return "수";
  return "토";
}

function elementRelation(userElement: string, partnerElement: string) {
  if (userElement === partnerElement) return "동류";
  if (SUKUYO_ELEMENT_CREATE[userElement] === partnerElement || SUKUYO_ELEMENT_CREATE[partnerElement] === userElement) return "상생";
  if (SUKUYO_ELEMENT_CONTROL[userElement] === partnerElement || SUKUYO_ELEMENT_CONTROL[partnerElement] === userElement) return "상극";
  return "보완";
}

function sukuyoGroup(sukuyo: any) {
  const han = cleanText(sukuyo?.nameHan || sukuyo?.hanja, "", 8);
  if (SUKUYO_STABLE_GROUP_HANJA.has(han)) return "안숙";
  if (SUKUYO_RISK_GROUP_HANJA.has(han)) return "위험숙";
  return "성숙";
}

function sukuyoGuardian(sukuyo: any) {
  const direction = cleanText(sukuyo?.direction, "", 12);
  if (direction.includes("동")) return "청룡";
  if (direction.includes("남")) return "주작";
  if (direction.includes("서")) return "백호";
  if (direction.includes("북")) return "현무";
  const index = Number(sukuyo?.index);
  if (Number.isFinite(index)) {
    if (index <= 6) return "청룡";
    if (index <= 13) return "현무";
    if (index <= 20) return "백호";
    return "주작";
  }
  return "청룡";
}

function sukuyoYinYang(sukuyo: any) {
  const index = Number(sukuyo?.index);
  return Number.isFinite(index) && index % 2 === 0 ? "양" : "음";
}

function sukuyoKeyword(sukuyo: any) {
  const words = []
    .concat(Array.isArray(sukuyo?.keywords) ? sukuyo.keywords : [])
    .concat(Array.isArray(sukuyo?.strengths) ? sukuyo.strengths : [])
    .map((item) => cleanText(item, "", 20))
    .filter(Boolean);
  return words.slice(0, 3).join(" · ") || "직관 · 조율 · 성장";
}

function relationByDirectionalDistance(distance: unknown) {
  const normalized = ((Math.floor(Number(distance) || 0) % 27) + 27) % 27;
  const item = SUKUYO_RELATION_12[Math.min(normalized, 11)] || SUKUYO_RELATION_12[11];
  return {
    label: `${item.name}(${item.han})`,
    meaning: item.meaning,
    rawDistance: normalized,
  };
}

function relationIntensity(shortestDistance: unknown, relationType: string) {
  const distance = Number(shortestDistance);
  if (distance <= 3 || ["안괴", "업태"].includes(relationType)) return "강렬";
  if (distance >= 9) return "잔잔";
  return "보통";
}

function distanceTier(shortestDistance: unknown): "same" | "near" | "middle" | "far" {
  const distance = Number(shortestDistance);
  if (!Number.isFinite(distance)) return "middle";
  if (distance === 0) return "same";
  if (distance <= 4) return "near";
  if (distance <= 10) return "middle";
  return "far";
}

function clampAreaScore(value: unknown) {
  return Math.max(12, Math.min(18, Math.round(Number(value) || 15)));
}

function normalizeScoreTotal(scores: Record<string, number>) {
  const keys = ["destiny", "harmony", "emotion", "growth", "stability"] as const;
  const normalized = Object.fromEntries(keys.map((key) => [key, clampAreaScore(scores[key])])) as Record<typeof keys[number], number>;
  let total = keys.reduce((sum, key) => sum + normalized[key], 0);
  while (total > 80) {
    const key = keys.find((name) => normalized[name] > 14);
    if (!key) break;
    normalized[key] -= 1;
    total -= 1;
  }
  while (total < 70) {
    const key = keys.find((name) => normalized[name] < 16);
    if (!key) break;
    normalized[key] += 1;
    total += 1;
  }
  return {
    ...normalized,
    total,
    label: total >= 78 ? "깊은 공명" : total >= 74 ? "따뜻한 조율" : "천천히 맞춰갈 인연",
  };
}

function buildScoreSummary(userSukuyo: any, partnerSukuyo: any, compatibility: any, relationType: string, intensity: string) {
  const userElement = normalizeSukuyoElement(userSukuyo?.element);
  const partnerElement = normalizeSukuyoElement(partnerSukuyo?.element);
  const harmonyType = elementRelation(userElement, partnerElement);
  const distance = Number(compatibility?.shortestDistance ?? compatibility?.distanceMetrics?.shortestDistance) || 0;
  const chemistry = Number(compatibility?.chemistryScore || 75);
  const stability = Number(compatibility?.stabilityScore || 74);
  const boost = intensity === "강렬" ? 1 : intensity === "잔잔" ? -1 : 0;
  return normalizeScoreTotal({
    destiny: 15 + boost + (distance === 0 ? 2 : distance <= 4 ? 1 : 0),
    harmony: 15 + (harmonyType === "상생" ? 2 : harmonyType === "동류" ? 1 : harmonyType === "상극" ? -2 : 0),
    emotion: 15 + (sukuyoYinYang(userSukuyo) !== sukuyoYinYang(partnerSukuyo) ? 1 : 0) + (sukuyoGuardian(userSukuyo) === sukuyoGuardian(partnerSukuyo) ? 1 : 0) - (distance >= 9 ? 1 : 0),
    growth: 15 + (["안괴", "업태"].includes(relationType) ? 2 : 0) + (chemistry >= 82 ? 1 : 0),
    stability: 15 + (stability >= 82 ? 2 : stability <= 66 ? -2 : 0) - (intensity === "강렬" ? 1 : 0),
  });
}

function buildUnavailableSukuyo(request: FortuneTeaHouseConsultRequest, reason: string): FortuneTeaSukuyoCompatibilitySnapshot {
  const user = request.sukuyo?.user || {};
  const partner = request.sukuyo?.partner || {};
  return {
    available: false,
    calculationSource: "sukuyo-compatibility-ai-calculation",
    title: "달빛 궁합의 방이 아직 조용히 닫혀 있어요",
    summary: reason,
    relationshipType: request.sukuyo?.relationshipType,
    focus: request.sukuyo?.focus,
    currentSituation: request.sukuyo?.currentSituation,
    user: buildPersonSnapshot(user, "나"),
    partner: buildPersonSnapshot(partner, "상대"),
    strengths: ["지금은 두 사람의 생년월일과 달력 기준이 모두 놓인 뒤에야 27숙의 거리를 열 수 있습니다."],
    cautions: ["비어 있는 정보로 인연을 꾸미지 않고, 확인된 마음과 질문만 조용히 붙잡겠습니다."],
    adviceKeywords: ["생년월일 확인", "달력 기준", "마음의 질문"],
  };
}

export function buildFortuneTeaSukuyoCompatibility(request: FortuneTeaHouseConsultRequest): FortuneTeaSukuyoCompatibilitySnapshot {
  const input = request.sukuyo;
  if (!input?.user?.birthDate || !input?.partner?.birthDate || !input.user.calendarType || !input.partner.calendarType) {
    return buildUnavailableSukuyo(request, "두 사람의 생년월일과 달력 기준이 모두 놓여야 27숙 인연의 흐름을 열 수 있습니다.");
  }

  try {
    const userSukuyo = calculatePersonSukuyo(input.user);
    const partnerSukuyo = calculatePersonSukuyo(input.partner);
    const compatibility = buildSukuyoAiCompatibility(userSukuyo, partnerSukuyo);
    const guide = relationGuide(compatibility?.relationType);
    const user = buildPersonSnapshot(input.user, "나", userSukuyo);
    const partner = buildPersonSnapshot(input.partner, "상대", partnerSukuyo);
    const relationType = cleanText(compatibility?.relationType, "명", 12);
    const distanceLabel = cleanText(compatibility?.distanceLabel || compatibility?.distanceMetrics?.distanceLabel, "동숙", 20);
    const index = compatibilityIndex(compatibility);
    const forwardDistance = Number(compatibility?.forwardDistance);
    const reverseDistance = Number(compatibility?.reverseDistance);
    const shortestDistance = Number(compatibility?.shortestDistance ?? compatibility?.distanceMetrics?.shortestDistance);
    const forwardRelation = relationByDirectionalDistance(forwardDistance);
    const reverseRelation = relationByDirectionalDistance(reverseDistance);
    const intensity = relationIntensity(shortestDistance, relationType);
    const tier = distanceTier(shortestDistance);
    const scores = buildScoreSummary(userSukuyo, partnerSukuyo, compatibility, relationType, intensity);
    const userElement = normalizeSukuyoElement(userSukuyo?.element);
    const partnerElement = normalizeSukuyoElement(partnerSukuyo?.element);
    const elementHarmonyRelation = elementRelation(userElement, partnerElement);
    const questionFocus = cleanText(input.focus, "관계의 흐름", 40);
    return {
      available: true,
      calculationSource: "sukuyo-compatibility-ai-calculation",
      title: `${user.sukuyoName || "나의 본명숙"}과 ${partner.sukuyoName || "상대의 본명숙"}이 만나는 ${relationType}의 달빛`,
      summary: `${user.name}와 ${partner.name}의 27숙은 ${distanceLabel}의 거리에서 ${relationType} 관계로 맞닿습니다. ${guide.tone} ${forwardRelation.label}으로 다가가고 ${reverseRelation.label}으로 되돌아오는 흐름이라, 지금은 ${questionFocus}을 중심으로 끌림과 조심해야 할 리듬을 함께 보아야 합니다.`,
      relationshipType: cleanText(input.relationshipType, "인연", 40),
      focus: questionFocus,
      currentSituation: cleanText(input.currentSituation, "", 220),
      user,
      partner,
      calculationBasis: {
        user: {
          lunarYear: Number(userSukuyo?.lunarYear),
          lunarMonth: Number(userSukuyo?.lunarMonth),
          lunarDay: Number(userSukuyo?.lunarDay),
          isLeapMonth: Boolean(userSukuyo?.isLeapMonth),
          source: cleanText(userSukuyo?.source, "lunar-javascript", 40),
          group: sukuyoGroup(userSukuyo),
          guardian: sukuyoGuardian(userSukuyo),
          yinYang: sukuyoYinYang(userSukuyo),
          keyword: sukuyoKeyword(userSukuyo),
        },
        partner: {
          lunarYear: Number(partnerSukuyo?.lunarYear),
          lunarMonth: Number(partnerSukuyo?.lunarMonth),
          lunarDay: Number(partnerSukuyo?.lunarDay),
          isLeapMonth: Boolean(partnerSukuyo?.isLeapMonth),
          source: cleanText(partnerSukuyo?.source, "lunar-javascript", 40),
          group: sukuyoGroup(partnerSukuyo),
          guardian: sukuyoGuardian(partnerSukuyo),
          yinYang: sukuyoYinYang(partnerSukuyo),
          keyword: sukuyoKeyword(partnerSukuyo),
        },
      },
      relationDetail: {
        typeAToB: forwardRelation.label,
        typeBToA: reverseRelation.label,
        intensity,
        userToPartnerMeaning: forwardRelation.meaning,
        partnerToUserMeaning: reverseRelation.meaning,
      },
      relationType,
      relationTypeHan: cleanText(compatibility?.relationTypeHan, "", 12),
      distanceLabel,
      distanceTier: tier,
      forwardDistance: Number.isFinite(forwardDistance) ? forwardDistance : undefined,
      reverseDistance: Number.isFinite(reverseDistance) ? reverseDistance : undefined,
      shortestDistance: Number.isFinite(shortestDistance) ? shortestDistance : undefined,
      compatibilityIndex: index,
      scores,
      elementHarmony: {
        userElement,
        partnerElement,
        relation: elementHarmonyRelation,
        summary: `${user.name}의 ${userElement} 기운과 ${partner.name}의 ${partnerElement} 기운은 ${elementHarmonyRelation}의 결로 맞닿습니다.`,
      },
      direction: [compatibility?.directionFromAToB, compatibility?.directionFromBToA].map((item) => cleanText(item, "", 24)).filter(Boolean).join(" / "),
      strengths: [
        `${user.sukuyoName || "나의 숙"}은 ${user.keywords?.slice(0, 2).join(" · ") || "감정의 결"}로 먼저 다가가고, ${partner.sukuyoName || "상대의 숙"}은 ${partner.keywords?.slice(0, 2).join(" · ") || "관계의 온도"}로 응답합니다.`,
        `영역 점수는 ${scores.label}으로 모이며, 특히 ${elementHarmonyRelation}의 오행 결이 두 사람의 대화 온도에 영향을 줍니다.`,
        ...guide.strengths,
      ].slice(0, 3),
      cautions: guide.cautions.slice(0, 3),
      adviceKeywords: [relationType, distanceLabel, ...guide.keywords].slice(0, 5),
      roleGuide: {
        userAction: cleanText(compatibility?.roleActionGuide?.meAction, guide.keywords[0], 180),
        partnerAction: cleanText(compatibility?.roleActionGuide?.otherAction, guide.keywords[1] || "상대의 속도 존중", 180),
      },
    };
  } catch {
    return buildUnavailableSukuyo(request, "27숙 계산이 잠시 열리지 않았어요. 연이는 없는 숙요 관계를 지어내지 않고, 확인된 질문의 온도만 먼저 붙잡겠습니다.");
  }
}
