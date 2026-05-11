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

const DATE_INPUT_ERROR = "생년월일은 8자리 숫자 또는 YYYY-MM-DD 형식으로 입력해 주세요.";
const DATE_INVALID_ERROR = "존재하지 않는 날짜입니다.";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toSafeInt(value: string) {
  const num = Number(value);
  return Number.isInteger(num) ? num : NaN;
}

export function normalizeBirthDateInput(value: string): NormalizedBirthDateResult {
  const raw = String(value || "").trim();
  if (!raw) {
    return { ok: false, reason: DATE_INPUT_ERROR };
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
      return { ok: false, reason: DATE_INPUT_ERROR };
    }
    year = toSafeInt(match[1]);
    month = toSafeInt(match[2]);
    day = toSafeInt(match[3]);
  }

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { ok: false, reason: DATE_INPUT_ERROR };
  }

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, reason: DATE_INVALID_ERROR };
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() + 1 !== month
    || candidate.getUTCDate() !== day
  ) {
    return { ok: false, reason: DATE_INVALID_ERROR };
  }

  return {
    ok: true,
    value: `${year}-${pad2(month)}-${pad2(day)}`,
  };
}

export function parseBirthDate(input: string): ParsedBirthDate {
  const normalized = normalizeBirthDateInput(input);
  if (!normalized.ok) {
    throw new Error("reason" in normalized ? normalized.reason : DATE_INPUT_ERROR);
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
  if (parsed.month >= 3 && parsed.month <= 5) {
    return { key: "spring", label: "봄의 새싹", element: "목" };
  }
  if (parsed.month >= 6 && parsed.month <= 8) {
    return { key: "summer", label: "여름의 열광", element: "화" };
  }
  if (parsed.month >= 9 && parsed.month <= 11) {
    return { key: "autumn", label: "가을의 울림", element: "금" };
  }
  return { key: "winter", label: "겨울의 심연", element: "수" };
}

export function getBirthNumberEnergy(date: string) {
  const parsed = parseBirthDate(date);
  const digits = `${parsed.year}${pad2(parsed.month)}${pad2(parsed.day)}`.split("").map((d) => Number(d));
  const sum = digits.reduce((acc, value) => acc + value, 0);
  const core = ((sum - 1) % 9) + 1;

  const labels: Record<number, string> = {
    1: "개척",
    2: "공감",
    3: "표현",
    4: "안정",
    5: "전환",
    6: "헌신",
    7: "탐구",
    8: "추진",
    9: "완성",
  };

  return {
    core,
    label: labels[core] || "조율",
    sum,
  };
}

export function getNameHashEnergy(name: string) {
  const text = String(name || "").trim();
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 1000003;
  }

  const auraPool = ["네온 오라", "문라이트 오라", "크리스탈 오라", "블루 플레어", "핑크 코멧", "스타 더스트"];
  const focusPool = ["무대 집중력", "팬서비스 감응", "서사 몰입력", "치유 텐션", "카리스마 파동", "러블리 잔광"];

  return {
    hash,
    aura: auraPool[hash % auraPool.length],
    focus: focusPool[(hash * 7 + 3) % focusPool.length],
  };
}
