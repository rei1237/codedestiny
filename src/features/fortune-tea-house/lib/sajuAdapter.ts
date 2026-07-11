import { buildSajuProfile } from "@/worker/lib/destiny-bias-engine.js";
import type {
  FortuneTeaFiveElementBalance,
  FortuneTeaFiveElementKey,
  FortuneTeaHouseConsultRequest,
  FortuneTeaSajuBirthSummary,
  FortuneTeaSajuDaewoonRow,
  FortuneTeaSajuPillar,
  FortuneTeaSajuPillarKey,
  FortuneTeaSajuSnapshot,
} from "../data/consult";
import { getTenGodMeta, normalizeTenGodId, type TenGodId } from "../data/tenGods";

const ELEMENT_LABELS: Record<string, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const ELEMENT_KEYS: FortuneTeaFiveElementKey[] = ["wood", "fire", "earth", "metal", "water"];

const STEM_ELEMENTS: Record<string, string> = {
  갑: "목",
  을: "목",
  병: "화",
  정: "화",
  무: "토",
  기: "토",
  경: "금",
  신: "금",
  임: "수",
  계: "수",
};

const BRANCH_ELEMENTS: Record<string, string> = {
  인: "목",
  묘: "목",
  사: "화",
  오: "화",
  진: "토",
  술: "토",
  축: "토",
  미: "토",
  신: "금",
  유: "금",
  해: "수",
  자: "수",
};

const PILLAR_LABELS: Record<FortuneTeaSajuPillarKey, string> = {
  year: "년주",
  month: "월주",
  day: "일주",
  hour: "시주",
};

const ELEMENT_TONES: Record<FortuneTeaFiveElementKey, FortuneTeaFiveElementBalance["tone"]> = {
  wood: "green",
  fire: "rose",
  earth: "gold",
  metal: "silver",
  water: "blue",
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
  pillars?: Partial<
    Record<
      FortuneTeaSajuPillarKey,
      {
        ganji?: string;
        stem?: string;
        branch?: string;
        stemKo?: string;
        branchKo?: string;
        heavenlyStem?: string;
        earthlyBranch?: string;
        elementKo?: string;
        tenGod?: string;
        tenGodKo?: string;
      }
    >
  >;
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
  daewoon?: {
    directionLabel?: string;
    list?: Array<{
      index?: number;
      pillar?: string;
      startAgeDecimal?: number;
      startAgeDisplay?: string;
      endAgeDisplay?: string;
      estimatedStartYear?: number;
      estimatedEndYear?: number;
    }>;
  };
};

// 월지 → 계절 (엔진 pillar가 한글/한자 어느 쪽이든 매칭되도록 양쪽 표기 수록)
const BRANCH_SEASONS: Record<string, string> = {
  인: "봄", 묘: "봄", 진: "봄(환절)", 사: "여름", 오: "여름", 미: "여름(환절)",
  신: "가을", 유: "가을", 술: "가을(환절)", 해: "겨울", 자: "겨울", 축: "겨울(환절)",
  寅: "봄", 卯: "봄", 辰: "봄(환절)", 巳: "여름", 午: "여름", 未: "여름(환절)",
  申: "가을", 酉: "가을", 戌: "가을(환절)", 亥: "겨울", 子: "겨울", 丑: "겨울(환절)",
};

function monthBranchFromProfile(profile: SajuProfile) {
  const month = profile.pillars?.month;
  const branch = text(month?.branchKo) || text(month?.branch) || text(month?.earthlyBranch);
  if (branch) return branch;
  const ganji = text(month?.ganji);
  return ganji ? Array.from(ganji).slice(-1).join("") : "";
}

function seasonFromMonthBranch(monthBranch: string) {
  for (const char of Array.from(monthBranch)) {
    if (BRANCH_SEASONS[char]) return BRANCH_SEASONS[char];
  }
  return "";
}

// 엔진이 계산한 대운 목록을 프롬프트 factInput용 행으로 축약한다 (현재 대운 표시 포함).
function buildDaewoonSnapshot(profile: SajuProfile): FortuneTeaSajuDaewoonRow[] | undefined {
  const rows = profile.daewoon?.list;
  if (!Array.isArray(rows) || !rows.length) return undefined;
  const nowYear = new Date().getFullYear();
  const mapped = rows.slice(0, 8).map((row) => {
    const pillar = text(row?.pillar);
    const startYear = Number(row?.estimatedStartYear);
    const endYear = Number(row?.estimatedEndYear);
    const isCurrent = Number.isFinite(startYear) && Number.isFinite(endYear) && nowYear >= startYear && nowYear <= endYear;
    const ageRange = [text(row?.startAgeDisplay), text(row?.endAgeDisplay)].filter(Boolean).join("~");
    return {
      pillar,
      label: `${row?.index ? `${row.index}대운 ` : ""}${pillar}${ageRange ? ` ${ageRange}` : ""}${isCurrent ? " (현재 대운)" : ""}`,
      startAge: Number.isFinite(Number(row?.startAgeDecimal)) ? Math.floor(Number(row?.startAgeDecimal)) : undefined,
      startYear: Number.isFinite(startYear) ? startYear : undefined,
      isCurrent: isCurrent || undefined,
    };
  }).filter((row) => row.pillar);
  return mapped.length ? mapped : undefined;
}

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

function normalizeGenderValue(value?: string) {
  const v = text(value);
  if (/(남성|남자|남\b|male|man)/i.test(v)) return "male";
  if (/(여성|여자|여\b|female|woman)/i.test(v)) return "female";
  return "";
}

function normalizeGender(request: FortuneTeaHouseConsultRequest) {
  return normalizeGenderValue(text(request.gender) || text(request.birthInfo));
}

function normalizeBirthInput(request: FortuneTeaHouseConsultRequest): NormalizedBirthInput | null {
  const birthInfo = text(request.birthInfo);
  const birthDate = parseBirthDate(text(request.birthDate) || birthInfo);
  if (!birthDate) return null;

  const explicitUnknownTime = request.birthTimeUnknown === true || /출생시간\s*(미상|모름)|시간\s*(미상|모름)/.test(birthInfo);
  const birthTime = explicitUnknownTime ? "" : parseBirthTime(text(request.birthTime) || birthInfo);
  return {
    birthDate,
    birthTime: birthTime || undefined,
    calendarType: normalizeCalendarType(request),
    gender: normalizeGender(request) || undefined,
    unknownTime: explicitUnknownTime || !birthTime,
  };
}

// 임의의 출생 정보(본인/상대)를 받아 명식 스냅샷 입력으로 정규화한다 — 궁합에서 상대 명식 계산에 재사용.
export type FortuneTeaSajuBirthParts = {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  calendarType?: "solar" | "lunar";
  gender?: string;
};

function normalizeBirthParts(parts: FortuneTeaSajuBirthParts): NormalizedBirthInput | null {
  const birthDate = parseBirthDate(text(parts.birthDate));
  if (!birthDate) return null;
  const explicitUnknownTime = parts.birthTimeUnknown === true;
  const birthTime = explicitUnknownTime ? "" : parseBirthTime(text(parts.birthTime));
  return {
    birthDate,
    birthTime: birthTime || undefined,
    calendarType: parts.calendarType === "lunar" ? "lunar" : "solar",
    gender: normalizeGenderValue(parts.gender) || undefined,
    unknownTime: explicitUnknownTime || !birthTime,
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

function birthSummaryFromRequest(request?: FortuneTeaHouseConsultRequest): FortuneTeaSajuBirthSummary | undefined {
  if (!request) return undefined;
  const birthInfo = text(request.birthInfo);
  const birthDate = text(request.birthDate) || parseBirthDate(birthInfo) || undefined;
  const explicitUnknownTime = request.birthTimeUnknown === true || /출생시간\s*(미상|모름)|시간\s*(미상|모름)/.test(birthInfo);
  const birthTime = explicitUnknownTime ? undefined : text(request.birthTime) || parseBirthTime(birthInfo) || undefined;

  return {
    nickname: text(request.nickname) || "손님",
    profileId: text(request.profileId) || undefined,
    birthDate,
    birthTime,
    birthTimeUnknown: explicitUnknownTime || !birthTime,
    hasBirthTime: Boolean(birthTime) && !explicitUnknownTime,
    calendarType: request.calendarType,
    gender: text(request.gender) || undefined,
    birthPlace: text(request.birthPlace) || undefined,
    timezone: text(request.timezone) || undefined,
  };
}

function splitGanji(ganji?: string) {
  const chars = Array.from(text(ganji));
  return {
    stem: chars[0] || undefined,
    branch: chars[1] || undefined,
  };
}

function pillarElement(stem?: string, branch?: string) {
  if (stem && STEM_ELEMENTS[stem]) return STEM_ELEMENTS[stem];
  if (branch && BRANCH_ELEMENTS[branch]) return BRANCH_ELEMENTS[branch];
  return undefined;
}

function buildPillar(key: FortuneTeaSajuPillarKey, ganji?: string, note?: string): FortuneTeaSajuPillar {
  const parts = splitGanji(ganji);
  return {
    key,
    label: PILLAR_LABELS[key],
    ganji,
    heavenlyStem: parts.stem,
    earthlyBranch: parts.branch,
    element: pillarElement(parts.stem, parts.branch),
    available: Boolean(ganji),
    note,
  };
}

function buildPillars(snapshot: FortuneTeaSajuSnapshot): FortuneTeaSajuPillar[] {
  return [
    buildPillar("year", snapshot.pillars?.year),
    buildPillar("month", snapshot.pillars?.month),
    buildPillar("day", snapshot.pillars?.day),
    buildPillar(
      "hour",
      snapshot.pillars?.hour,
      snapshot.pillars?.hour
        ? undefined
        : "출생시간을 몰라도 괜찮아요. 이번 상담에서는 시주 없이 큰 흐름을 중심으로 읽습니다.",
    ),
  ];
}

function strengthLabel(value: number) {
  if (value >= 28) return "짙게 차오름";
  if (value >= 18) return "고르게 머묾";
  if (value > 0) return "은은하게 남음";
  return "비어 있음";
}

function elementReading(nameKo: string, value: number) {
  if (value >= 28) {
    return `${nameKo} 기운이 비교적 또렷합니다. 이 힘은 장점으로 쓰면 기준을 세우게 하고, 지나치면 한쪽으로 마음이 기울 수 있어요.`;
  }
  if (value >= 18) {
    return `${nameKo} 기운이 안정적으로 머뭅니다. 지금은 이 기운을 무리하게 키우기보다 다른 흐름과 조화를 맞추는 편이 좋아요.`;
  }
  if (value > 0) {
    return `${nameKo} 기운은 은은하게 남아 있습니다. 작게 보이는 마음이라도 천천히 돌보면 균형을 회복하는 실마리가 됩니다.`;
  }
  return `${nameKo} 기운은 오늘의 명식에서 약하게 보입니다. 없는 것으로 단정하기보다, 의식적으로 보완할 방향으로 살피면 좋아요.`;
}

function buildFiveElementBalance(snapshot: FortuneTeaSajuSnapshot): FortuneTeaFiveElementBalance[] | undefined {
  if (!snapshot.fiveElements) return undefined;

  return ELEMENT_KEYS.map((key) => {
    const nameKo = ELEMENT_LABELS[key];
    const value = Number(snapshot.fiveElements?.[nameKo] ?? snapshot.fiveElements?.[key] ?? 0);
    const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

    return {
      key,
      nameKo,
      value: safeValue,
      strengthLabel: strengthLabel(safeValue),
      reading: elementReading(nameKo, safeValue),
      tone: ELEMENT_TONES[key],
    };
  });
}

function dominantElementsFromBalance(balance?: FortuneTeaFiveElementBalance[]) {
  return balance
    ?.filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((item) => item.nameKo);
}

function buildCautionReading(snapshot: FortuneTeaSajuSnapshot) {
  if (snapshot.caution) return snapshot.caution;
  if (snapshot.weakElements?.length) {
    return `${snapshot.weakElements.join(" · ")} 기운이 약하게 머무를 수 있어요. 오늘은 부족함을 탓하기보다, 그 기운을 천천히 채우는 선택을 먼저 보세요.`;
  }
  return "오늘의 사주는 한쪽 결론으로 급히 닫기보다, 내 기준과 감정이 서로 부딪히는 지점을 차분히 나누어 보라고 말합니다.";
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

function snapshotFromNormalizedBirth(birth: NormalizedBirthInput, name: string): FortuneTeaSajuSnapshot {
  try {
    const profile = buildSajuProfile({
      name: name || "손님",
      gender: birth.gender,
      birth: {
        calendarType: birth.calendarType,
        birthDate: birth.birthDate,
        birthTime: birth.birthTime,
        unknownTime: birth.unknownTime,
        birthTimeKnown: !birth.unknownTime,
      },
    }) as SajuProfile;

    const monthBranch = monthBranchFromProfile(profile);
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
      monthBranch: monthBranch || undefined,
      season: seasonFromMonthBranch(monthBranch) || undefined,
      daewoon: buildDaewoonSnapshot(profile),
      caution: birth.unknownTime ? "출생시간이 없어 시주의 세밀한 결은 제외하고 큰 흐름 중심으로 읽었습니다." : undefined,
    };

    return {
      ...snapshot,
      coreSummary: buildCoreSummary(snapshot),
    };
  } catch {
    return {
      available: false,
      coreSummary: "출생정보가 충분하지 않아 오늘은 확인된 정보와 현재 질문의 결을 중심으로 읽어드릴게요.",
      tenGodSnapshot: normalizeTenGodSnapshot(),
      caution: "사주 계산이 잠시 흐려져 오늘은 확인된 질문과 찻잔의 결을 더 중심에 두었습니다.",
    };
  }
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
  return snapshotFromNormalizedBirth(birth, text(request.nickname));
}

// 궁합에서 상대(또는 본인)의 명식을 top-level 요청 필드와 무관하게 계산한다.
export function buildFortuneTeaSajuSnapshotFromParts(parts: FortuneTeaSajuBirthParts): FortuneTeaSajuSnapshot {
  const birth = normalizeBirthParts(parts);
  if (!birth) {
    return {
      available: false,
      coreSummary: "출생정보가 충분하지 않아 이 사람의 명식은 열지 않고, 확인된 정보만 조심스럽게 읽었습니다.",
      tenGodSnapshot: normalizeTenGodSnapshot(),
    };
  }
  return snapshotFromNormalizedBirth(birth, text(parts.name));
}

export function buildSajuResultSection(snapshot: FortuneTeaSajuSnapshot, request?: FortuneTeaHouseConsultRequest) {
  const birthSummary = birthSummaryFromRequest(request);

  if (!snapshot.available) {
    return {
      available: false,
      title: "사주가 말하는 기본 흐름",
      summary: snapshot.coreSummary || "출생정보가 충분하지 않아 오늘은 확인된 정보와 현재 질문의 결을 중심으로 읽어드릴게요.",
      keyPoints: ["없는 사주 데이터는 억지로 만들지 않고, 지금의 질문과 찻잔의 결을 중심으로 읽었습니다."],
      birthSummary,
      pillars: buildPillars(snapshot),
      caution: snapshot.caution,
      cautionReading: "출생정보가 충분하지 않아 오늘은 사주의 세부 흐름을 펼치지 않았어요. 대신 연이는 보이는 정보와 지금 적어주신 고민의 결만 차분히 읽어드릴게요.",
      actionPrescription: "오늘은 결론을 서두르기보다, 지금 가장 궁금한 질문을 한 문장으로 줄여 적어보세요.",
      tarotBridgeReady: "다른 상담 방식을 열고 싶다면, 같은 질문을 새 상징 위에 다시 올려도 괜찮습니다.",
      tenGodSnapshot: snapshot.tenGodSnapshot,
    };
  }

  const pillarBoard = buildPillars(snapshot);
  const fiveElementBalance = buildFiveElementBalance(snapshot);
  const dominantElements = dominantElementsFromBalance(fiveElementBalance);
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
  const primaryTenGodMeta =
    snapshot.tenGodSnapshot?.available && snapshot.tenGodSnapshot.primaryTenGod
      ? getTenGodMeta(snapshot.tenGodSnapshot.primaryTenGod)
      : null;
  const secondaryTenGods =
    snapshot.tenGodSnapshot?.available && snapshot.tenGodSnapshot.secondaryTenGods?.length
      ? snapshot.tenGodSnapshot.secondaryTenGods.map((id) => {
          const meta = getTenGodMeta(id);
          return {
            id,
            nameKo: meta.nameKo,
            roleInTeaHouse: meta.roleInTeaHouse,
          };
        })
      : undefined;

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
    birthSummary,
    dayMaster: snapshot.dayMaster,
    dominantElements,
    pillars: pillarBoard,
    fiveElements: fiveElementBalance,
    primaryTenGod: primaryTenGodMeta
      ? {
          id: primaryTenGodMeta.id,
          nameKo: primaryTenGodMeta.nameKo,
          roleInTeaHouse: primaryTenGodMeta.roleInTeaHouse,
          reading: primaryTenGodMeta.yeoniDescription,
        }
      : undefined,
    secondaryTenGods,
    monthBranch: snapshot.monthBranch,
    season: snapshot.season,
    daewoon: snapshot.daewoon,
    caution: snapshot.caution,
    cautionReading: buildCautionReading(snapshot),
    actionPrescription: primaryTenGodMeta
      ? `오늘은 ${primaryTenGodMeta.nameKo}의 마음이 앞서 움직이기 전에, 지금 확인할 수 있는 사실과 아직 추측인 마음을 한 줄씩 나누어 적어보세요.`
      : "오늘은 마음이 반복해서 향하는 장면을 적고, 그 안에서 지킬 기준 하나만 조용히 골라보세요.",
    tarotBridgeReady: "다른 상담 방식을 열고 싶다면, 같은 질문을 새 상징 위에 다시 올려도 괜찮습니다.",
    tenGodSnapshot: snapshot.tenGodSnapshot,
  };
}
