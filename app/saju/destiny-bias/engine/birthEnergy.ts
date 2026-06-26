import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type NormalizedBirthDateResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

export type ParsedBirthDate = {
  value: string;
  year: number;
  month: number;
  day: number;
  timestamp: number;
};

const BIRTH_ENERGY_TEXT_TRANSLATIONS = {
  ko: {
    dateInputError: "생년월일은 8자리 숫자 또는 YYYY-MM-DD 형식으로 입력해 주세요.",
    dateInvalidError: "존재하지 않는 날짜입니다.",
    seasons: {
      spring: "봄의 새싹",
      summer: "여름의 열광",
      autumn: "가을의 울림",
      winter: "겨울의 심연",
    },
    numberLabels: {
      1: "개척",
      2: "공감",
      3: "표현",
      4: "안정",
      5: "전환",
      6: "헌신",
      7: "탐구",
      8: "추진",
      9: "완성",
      fallback: "조율",
    },
    auraPool: ["네온 오라", "문라이트 오라", "크리스탈 오라", "블루 플레어", "핑크 코멧", "스타 더스트"],
    focusPool: ["무대 집중력", "팬서비스 감응", "서사 몰입력", "치유 텐션", "카리스마 파동", "러블리 잔광"],
  },
  en: {
    dateInputError: "Enter the birth date as 8 digits or in YYYY-MM-DD format.",
    dateInvalidError: "This date does not exist.",
    seasons: {
      spring: "Spring Sprout",
      summer: "Summer Fever",
      autumn: "Autumn Echo",
      winter: "Winter Depth",
    },
    numberLabels: {
      1: "Pioneer",
      2: "Empathy",
      3: "Expression",
      4: "Stability",
      5: "Transition",
      6: "Devotion",
      7: "Inquiry",
      8: "Momentum",
      9: "Completion",
      fallback: "Attunement",
    },
    auraPool: ["Neon Aura", "Moonlight Aura", "Crystal Aura", "Blue Flare", "Pink Comet", "Star Dust"],
    focusPool: ["Stage Focus", "Fan-service Sensitivity", "Story Immersion", "Healing Tension", "Charisma Wave", "Lovely Afterglow"],
  },
  ja: {
    dateInputError: "生年月日は8桁の数字、またはYYYY-MM-DD形式で入力してください。",
    dateInvalidError: "存在しない日付です。",
    seasons: {
      spring: "春の芽吹き",
      summer: "夏の熱狂",
      autumn: "秋の響き",
      winter: "冬の深淵",
    },
    numberLabels: {
      1: "開拓",
      2: "共感",
      3: "表現",
      4: "安定",
      5: "転換",
      6: "献身",
      7: "探究",
      8: "推進",
      9: "完成",
      fallback: "調律",
    },
    auraPool: ["ネオンオーラ", "ムーンライトオーラ", "クリスタルオーラ", "ブルーフレア", "ピンクコメット", "スターダスト"],
    focusPool: ["ステージ集中力", "ファンサービス感応", "物語への没入", "癒しのテンション", "カリスマの波動", "ラブリーな余韻"],
  },
} as const;

function getBirthEnergyCopy(locale: LoadingLocale = getCurrentLoadingLocale()) {
  return BIRTH_ENERGY_TEXT_TRANSLATIONS[locale as "ko" | "en" | "ja"] || BIRTH_ENERGY_TEXT_TRANSLATIONS.ko;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toSafeInt(value: string) {
  const num = Number(value);
  return Number.isInteger(num) ? num : NaN;
}

export function normalizeBirthDateInput(value: string): NormalizedBirthDateResult {
  const copy = getBirthEnergyCopy();
  const raw = String(value || "").trim();
  if (!raw) {
    return { ok: false, reason: copy.dateInputError };
  }

  const compact = raw.replace(/[.\/]/g, "-").replace(/\s+/g, "");
  let year = NaN;
  let month = NaN;
  let day = NaN;

  if (/^\d{8}$/.test(compact)) {
    year = toSafeInt(compact.slice(0, 4));
    month = toSafeInt(compact.slice(4, 6));
    day = toSafeInt(compact.slice(6, 8));
  } else {
    const match = compact.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) {
      return { ok: false, reason: copy.dateInputError };
    }
    year = toSafeInt(match[1]);
    month = toSafeInt(match[2]);
    day = toSafeInt(match[3]);
  }

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { ok: false, reason: copy.dateInputError };
  }

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, reason: copy.dateInvalidError };
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() + 1 !== month
    || candidate.getUTCDate() !== day
  ) {
    return { ok: false, reason: copy.dateInvalidError };
  }

  return {
    ok: true,
    value: `${year}-${pad2(month)}-${pad2(day)}`,
  };
}

export function parseBirthDate(input: string): ParsedBirthDate {
  const normalized = normalizeBirthDateInput(input);
  if (!normalized.ok) {
    throw new Error("reason" in normalized ? normalized.reason : getBirthEnergyCopy().dateInputError);
  }

  const [yearText, monthText, dayText] = normalized.value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  return {
    value: normalized.value,
    year,
    month,
    day,
    timestamp: Date.UTC(year, month - 1, day),
  };
}

export function getSeasonEnergy(date: string) {
  const parsed = parseBirthDate(date);
  const copy = getBirthEnergyCopy();
  if (parsed.month >= 3 && parsed.month <= 5) {
    return { key: "spring", label: copy.seasons.spring, element: "목" };
  }
  if (parsed.month >= 6 && parsed.month <= 8) {
    return { key: "summer", label: copy.seasons.summer, element: "화" };
  }
  if (parsed.month >= 9 && parsed.month <= 11) {
    return { key: "autumn", label: copy.seasons.autumn, element: "금" };
  }
  return { key: "winter", label: copy.seasons.winter, element: "수" };
}

export function getBirthNumberEnergy(date: string) {
  const parsed = parseBirthDate(date);
  const copy = getBirthEnergyCopy();
  const digits = `${parsed.year}${pad2(parsed.month)}${pad2(parsed.day)}`.split("").map((d) => Number(d));
  const sum = digits.reduce((acc, value) => acc + value, 0);
  const core = ((sum - 1) % 9) + 1;

  return {
    core,
    label: copy.numberLabels[core as keyof typeof copy.numberLabels] || copy.numberLabels.fallback,
    sum,
  };
}

export function getNameHashEnergy(name: string) {
  const copy = getBirthEnergyCopy();
  const text = String(name || "").trim();
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 1000003;
  }

  return {
    hash,
    aura: copy.auraPool[hash % copy.auraPool.length],
    focus: copy.focusPool[(hash * 7 + 3) % copy.focusPool.length],
  };
}
