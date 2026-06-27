import { buildSajuProfile } from "@/worker/lib/destiny-bias-engine.js";
import type { FortuneTeaHouseConsultRequest, FortuneTeaSajuSnapshot } from "../data/consult";
import { getTenGodMeta, normalizeTenGodId, type TenGodId } from "../data/tenGods";

const ELEMENT_LABELS: Record<string, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

type NormalizedBirthInput = {
  birthDate: string;
  birthTime?: string;
  calendarType: "solar" | "lunar";
  gender?: string;
  unknownTime: boolean;
};

type SajuProfile = {
  dayMaster?: {
    stemKo?: string;
    elementKo?: string;
  };
  pillars?: Partial<Record<"year" | "month" | "day" | "hour", { ganji?: string }>>;
  calendar?: {
    includeHour?: boolean;
  };
  fiveElements?: {
    percentages?: Record<string, unknown>;
    strongest?: unknown;
    lacking?: unknown;
  };
  tenGods?: {
    counts?: Record<string, number>;
    dominant?: string;
    ranked?: Array<{ name?: string; score?: number }>;
  };
  usefulGods?: {
    yong?: unknown;
    hee?: unknown;
  };
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseBirthDate(source: string) {
  const match = source.match(/(\d{4})\s*(?:[.\-/년]\s*)?(\d{1,2})\s*(?:[.\-/월]\s*)?(\d{1,2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

function parseBirthTime(source: string) {
  const clock = source.match(/(\d{1,2})\s*:\s*(\d{1,2})/);
  if (clock) {
    const hour = Number(clock[1]);
    const minute = Number(clock[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }

  const korean = source.match(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/);
  if (!korean) return "";

  let hour = Number(korean[2]);
  const minute = Number(korean[3] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return "";
  if (korean[1] === "오후" && hour < 12) hour += 12;
  if (korean[1] === "오전" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return "";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeCalendarType(request: FortuneTeaHouseConsultRequest) {
  const explicit = request.calendarType;
  if (explicit === "lunar") return "lunar";
  const birthInfo = text(request.birthInfo);
  if (birthInfo.includes("음력")) return "lunar";
  return "solar";
}

function normalizeGender(request: FortuneTeaHouseConsultRequest) {
  const value = text(request.gender) || text(request.birthInfo);
  if (/(남성|남자|남\b|male|man)/i.test(value)) return "male";
  if (/(여성|여자|여\b|female|woman)/i.test(value)) return "female";
  return "";
}

function normalizeBirthInput(request: FortuneTeaHouseConsultRequest): NormalizedBirthInput | null {
  const birthInfo = text(request.birthInfo);
  const birthDate = parseBirthDate(text(request.birthDate) || birthInfo);
  if (!birthDate) return null;

  const birthTime = parseBirthTime(text(request.birthTime) || birthInfo);
  return {
    birthDate,
    birthTime: birthTime || undefined,
    calendarType: normalizeCalendarType(request),
    gender: normalizeGender(request) || undefined,
    unknownTime: !birthTime,
  };
}

function elementLabel(value: unknown) {
  const key = text(value);
  return ELEMENT_LABELS[key] || key;
}

function listElements(value: unknown) {
  if (Array.isArray(value)) return value.map(elementLabel).filter(Boolean);
  const label = elementLabel(value);
  return label ? [label] : [];
}

function normalizeFiveElements(profile: SajuProfile) {
  const percentages = profile.fiveElements?.percentages;
  if (!percentages || typeof percentages !== "object") return undefined;

  return Object.fromEntries(
    Object.entries(percentages)
      .map(([key, value]) => [elementLabel(key), Number(value)])
      .filter(([, value]) => Number.isFinite(value as number)),
  ) as Record<string, number>;
}

function normalizeTenGods(profile: SajuProfile) {
  if (typeof profile.tenGods?.dominant === "string") return [profile.tenGods.dominant];
  if (Array.isArray(profile.tenGods?.ranked)) {
    return profile.tenGods.ranked.map((item: { name?: string }) => text(item.name)).filter(Boolean).slice(0, 3);
  }
  return undefined;
}

function uniqueTenGodIds(labels: string[]) {
  const ids: TenGodId[] = [];
  for (const label of labels) {
    const id = normalizeTenGodId(label);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function normalizeTenGodSnapshot(profile?: SajuProfile): FortuneTeaSajuSnapshot["tenGodSnapshot"] {
  if (!profile) {
    return {
      available: false,
      tenGodLabels: [],
      reason: "출생정보가 충분하지 않아 십성을 산출하지 않았습니다.",
      source: "unavailable",
    };
  }

  const rankedLabels = Array.isArray(profile.tenGods?.ranked) ? profile.tenGods.ranked.map((item) => text(item.name)).filter(Boolean) : [];
  const countLabels = Object.entries(profile.tenGods?.counts || {})
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => text(label))
    .filter(Boolean);
  const labels = [text(profile.tenGods?.dominant), ...rankedLabels, ...countLabels].filter(Boolean);
  const ids = uniqueTenGodIds(labels);

  if (!ids.length) {
    return {
      available: false,
      tenGodLabels: labels,
      reason: "기존 사주 엔진에서 십성 라벨을 확인하지 못했습니다.",
      source: "unavailable",
    };
  }

  const primaryTenGod = ids[0];
  const primaryMeta = getTenGodMeta(primaryTenGod);
  return {
    available: true,
    primaryTenGod,
    secondaryTenGods: ids.slice(1, 3),
    tenGodLabels: labels.slice(0, 5),
    reason: `기존 사주 엔진의 주도 십성 ${primaryMeta.nameKo} 흐름을 운명의 찻집 손님으로 옮겼습니다.`,
    source: "existing-saju-engine",
  };
}

function buildCoreSummary(snapshot: FortuneTeaSajuSnapshot) {
  if (!snapshot.available) {
    return "출생정보가 충분하지 않아 오늘은 현재 고민과 타로, 찻잔의 흐름을 중심으로 읽어드릴게요.";
  }

  const dayMaster = snapshot.dayMaster ? `${snapshot.dayMaster} 일간` : "오늘의 사주 흐름";
  const strong = snapshot.strongElements?.length ? `${snapshot.strongElements.join(", ")} 기운이 두드러지고` : "두드러지는 기운을 살피며";
  const weak = snapshot.weakElements?.length ? `${snapshot.weakElements.join(", ")} 기운은 보완이 필요합니다` : "부족한 기운은 질문의 맥락 안에서 천천히 보아야 합니다";
  return `${dayMaster}을 중심으로 보면 ${strong}, ${weak}.`;
}

export function buildFortuneTeaSajuSnapshot(request: FortuneTeaHouseConsultRequest): FortuneTeaSajuSnapshot {
  const birth = normalizeBirthInput(request);
  if (!birth) {
    return {
      available: false,
      coreSummary: "출생정보가 충분하지 않아 오늘은 현재 고민과 타로, 찻잔의 흐름을 중심으로 읽어드릴게요.",
      tenGodSnapshot: normalizeTenGodSnapshot(),
    };
  }

  try {
    const profile = buildSajuProfile({
      name: text(request.nickname) || "손님",
      gender: birth.gender,
      birth: {
        calendarType: birth.calendarType,
        birthDate: birth.birthDate,
        birthTime: birth.birthTime,
        unknownTime: birth.unknownTime,
        birthTimeKnown: !birth.unknownTime,
      },
    }) as SajuProfile;

    const snapshot: FortuneTeaSajuSnapshot = {
      available: true,
      dayMaster: profile.dayMaster?.stemKo ? `${profile.dayMaster.stemKo}${profile.dayMaster.elementKo ? `(${profile.dayMaster.elementKo})` : ""}` : undefined,
      pillars: {
        year: profile.pillars?.year?.ganji,
        month: profile.pillars?.month?.ganji,
        day: profile.pillars?.day?.ganji,
        hour: profile.calendar?.includeHour ? profile.pillars?.hour?.ganji : undefined,
      },
      fiveElements: normalizeFiveElements(profile),
      tenGods: normalizeTenGods(profile),
      tenGodSnapshot: normalizeTenGodSnapshot(profile),
      strongElements: listElements(profile.fiveElements?.strongest),
      weakElements: listElements(profile.fiveElements?.lacking),
      usefulElements: [...listElements(profile.usefulGods?.yong), ...listElements(profile.usefulGods?.hee)].filter((value, index, array) => array.indexOf(value) === index),
      caution: birth.unknownTime ? "출생시간이 없어 시주의 세밀한 결은 제외하고 큰 흐름 중심으로 읽었습니다." : undefined,
    };

    return {
      ...snapshot,
      coreSummary: buildCoreSummary(snapshot),
    };
  } catch {
    return {
      available: false,
      coreSummary: "출생정보가 충분하지 않아 오늘은 현재 고민과 타로, 찻잔의 흐름을 중심으로 읽어드릴게요.",
      tenGodSnapshot: normalizeTenGodSnapshot(),
      caution: "사주 계산이 잠시 흐려져 오늘은 찻잔과 타로의 상징을 더 중심에 두었습니다.",
    };
  }
}

export function buildSajuResultSection(snapshot: FortuneTeaSajuSnapshot) {
  if (!snapshot.available) {
    return {
      available: false,
      title: "사주가 말하는 기본 흐름",
      summary: snapshot.coreSummary || "출생정보가 충분하지 않아 오늘은 현재 고민과 타로, 찻잔의 흐름을 중심으로 읽어드릴게요.",
      keyPoints: ["없는 사주 데이터는 억지로 만들지 않고, 지금의 질문과 찻잔, 타로 흐름을 중심으로 읽었습니다."],
      caution: snapshot.caution,
      tenGodSnapshot: snapshot.tenGodSnapshot,
    };
  }

  const pillars = snapshot.pillars
    ? [snapshot.pillars.year, snapshot.pillars.month, snapshot.pillars.day, snapshot.pillars.hour].filter(Boolean).join(" · ")
    : "";
  const elements = snapshot.fiveElements
    ? Object.entries(snapshot.fiveElements)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, value]) => `${name} ${Math.round(value)}%`)
        .join(" · ")
    : "";

  return {
    available: true,
    title: snapshot.dayMaster ? `${snapshot.dayMaster} 일간의 기본 결` : "사주가 말하는 기본 흐름",
    summary: snapshot.coreSummary || "사주의 기본 흐름이 오늘의 고민을 조금 더 입체적으로 비춥니다.",
    keyPoints: [
      pillars ? `사주 네 기둥: ${pillars}` : "",
      elements ? `오행의 결: ${elements}` : "",
      snapshot.tenGods?.length ? `두드러진 십성: ${snapshot.tenGods.join(" · ")}` : "",
      snapshot.tenGodSnapshot?.available && snapshot.tenGodSnapshot.primaryTenGod
        ? `오늘 찻집에 들어온 십성: ${getTenGodMeta(snapshot.tenGodSnapshot.primaryTenGod).nameKo}`
        : "",
      snapshot.usefulElements?.length ? `균형을 돕는 기운: ${snapshot.usefulElements.join(" · ")}` : "",
    ].filter(Boolean),
    caution: snapshot.caution,
    tenGodSnapshot: snapshot.tenGodSnapshot,
  };
}
