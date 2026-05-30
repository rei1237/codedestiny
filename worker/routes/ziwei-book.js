import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const ZIWEI_SERVICE_KEY = "ziwei-book";
const ZIWEI_FEATURE_KEY = "premium_pdf_ziwei";
const ZIWEI_FEATURE_ALIASES = new Set(["premium-ziwei-report", "premium_pdf_ziwei"]);
const CHAPTER_MIN_CHARS = 3000;
const SECTION_MIN_CHARS = 600;
const TOTAL_MIN_CHARS = 39000;
const CHAPTER_MAX_RETRIES = 3;

const EARTHLY_BRANCH_HOUR = Object.freeze({
  자: 23,
  축: 1,
  인: 3,
  묘: 5,
  진: 7,
  사: 9,
  오: 11,
  미: 13,
  신: 15,
  유: 17,
  술: 19,
  해: 21,
});

const STRENGTH_LEGEND = Object.freeze({
  miao: "◎",
  de: "O",
  li: "▲",
  ping: "△",
  xianOrShi: "X",
});

const CHAPTER_BLUEPRINTS = [
  {
    id: "01",
    roman: "I",
    palaceKey: "ming",
    title: "Chapter 1. 명반의 첫 문 — 이번 생의 기본 설계",
    categories: [
      "명궁이 보여주는 기본 자아",
      "신궁이 드러내는 실제 삶의 방향",
      "명궁과 신궁의 차이",
      "이번 생에서 반복되는 주제",
      "명반 전체의 첫 결론",
    ],
  },
  {
    id: "02",
    roman: "II",
    palaceKey: "all12",
    title: "Chapter 2. 12궁 완전 해석 — 삶이 펼쳐지는 무대",
    categories: [
      "명궁과 자아의 무대",
      "형제궁·부모궁·노복궁의 관계 구조",
      "부처궁과 인연의 흐름",
      "관록궁·재백궁의 사회적 방향",
      "복덕궁·질액궁의 내면과 몸의 신호",
    ],
  },
  {
    id: "03",
    roman: "III",
    palaceKey: "stars",
    title: "Chapter 3. 주성과 보조성 — 내 안의 주인공과 조력자",
    categories: [
      "핵심 주성이 만드는 기질",
      "보조성이 더하는 재능과 결핍",
      "강하게 빛나는 별의 의미",
      "약하게 놓인 별의 보완점",
      "별 조합이 만드는 인생 패턴",
    ],
  },
  {
    id: "04",
    roman: "IV",
    palaceKey: "sihua",
    title: "Chapter 4. 사화 해석 — 운명이 움직이는 방식",
    categories: [
      "화록이 여는 기회",
      "화권이 만드는 추진력",
      "화과가 주는 인정과 명예",
      "화기가 만드는 집착과 과제",
      "사화가 연결하는 인생의 핵심 사건",
    ],
  },
  {
    id: "05",
    roman: "V",
    palaceKey: "ming",
    title: "Chapter 5. 성격과 내면 — 내가 나를 이해하는 법",
    categories: [
      "겉으로 보이는 성격",
      "속으로 감추는 욕망",
      "고독과 자존심의 구조",
      "감정이 흔들리는 조건",
      "나를 안정시키는 방법",
    ],
  },
  {
    id: "06",
    roman: "VI",
    palaceKey: "spouse",
    title: "Chapter 6. 사랑과 결혼 — 인연의 깊이와 관계의 시험",
    categories: [
      "부처궁이 말하는 사랑의 방식",
      "끌리는 사람의 유형",
      "관계에서 반복되는 상처",
      "결혼과 장기 관계의 조건",
      "사랑을 지키기 위한 현실 조언",
    ],
  },
  {
    id: "07",
    roman: "VII",
    palaceKey: "career",
    title: "Chapter 7. 직업과 사회적 소명 — 내가 세상에서 쓰이는 방식",
    categories: [
      "관록궁이 보여주는 직업 방향",
      "내가 인정받는 방식",
      "조직형/독립형 성향",
      "전문성으로 성공하는 조건",
      "사회적 소명을 현실화하는 전략",
    ],
  },
  {
    id: "08",
    roman: "VIII",
    palaceKey: "wealth",
    title: "Chapter 8. 재물과 성공 — 돈이 모이고 흩어지는 구조",
    categories: [
      "재백궁이 보여주는 돈의 흐름",
      "돈이 들어오는 방식",
      "돈이 새어나가는 패턴",
      "투자·사업·확장의 기준",
      "재물운을 지키는 실전 전략",
    ],
  },
  {
    id: "09",
    roman: "IX",
    palaceKey: "fortune",
    title: "Chapter 9. 복덕과 마음의 안식처 — 내면의 행복 구조",
    categories: [
      "복덕궁이 보여주는 마음의 질",
      "혼자 있을 때 강해지는 생각",
      "불안과 집착의 근원",
      "내면의 평화를 회복하는 법",
      "오래 가는 행복의 조건",
    ],
  },
  {
    id: "10",
    roman: "X",
    palaceKey: "health",
    title: "Chapter 10. 질액과 위기 신호 — 몸과 삶의 경고등",
    categories: [
      "질액궁이 보여주는 약한 지점",
      "스트레스가 몸으로 드러나는 방식",
      "무리하면 생기는 위험",
      "위기 전에 나타나는 신호",
      "삶의 리듬을 회복하는 방법",
    ],
  },
  {
    id: "11",
    roman: "XI",
    palaceKey: "timing",
    title: "Chapter 11. 대운과 전환점 — 인생의 큰 장면들",
    categories: [
      "현재 대운의 핵심 의미",
      "인생이 바뀌는 시기",
      "기회가 강해지는 구간",
      "조심해야 할 전환점",
      "대운을 활용하는 전략",
    ],
  },
  {
    id: "12",
    roman: "XII",
    palaceKey: "patterns",
    title: "Chapter 12. 업과 반복 패턴 — 왜 같은 일이 되풀이되는가",
    categories: [
      "반복되는 관계 패턴",
      "반복되는 실패 패턴",
      "집착과 미련의 구조",
      "이번 생에서 풀어야 할 과제",
      "반복을 끊는 선택",
    ],
  },
  {
    id: "13",
    roman: "XIII",
    palaceKey: "final",
    title: "Chapter 13. 최종 운명 전략 — 나의 명반을 살아내는 법",
    categories: [
      "명반 전체의 최종 요약",
      "가장 강한 재능",
      "가장 조심해야 할 약점",
      "앞으로 3년·5년·10년 전략",
      "최종 조언과 운명 선언문",
    ],
  },
];

const PALACE_LABELS = Object.freeze({
  ming: "명궁",
  body: "신궁",
  siblings: "형제궁",
  spouse: "부부궁",
  children: "자녀궁",
  wealth: "재백궁",
  health: "질액궁",
  travel: "천이궁",
  friends: "노복궁",
  career: "관록궁",
  property: "전택궁",
  fortune: "복덕궁",
  parents: "부모궁",
  timing: "대운·유년",
});

const FORBIDDEN_TEXT = [
  "payload",
  "raw json",
  "json",
  "debug",
  "engine",
  "자동 복구 생성",
  "localdraft",
  "fallback",
  "chapter 1 chapter 1",
  "데이터가 부족합니다",
  "internal server error",
  "about:blank",
  "calculationmode",
];

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeZiweiError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function esc(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripForbiddenTokens(value) {
  let text = clean(value)
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\[object Object\]/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/Chapter\s*1\s*Chapter\s*1/gi, "")
    .replace(/데이터가\s*부족합니다/gi, "")
    .replace(/localdraft/gi, "")
    .replace(/fallback/gi, "")
    .replace(/payload/gi, "")
    .replace(/debug/gi, "")
    .replace(/raw\s*json/gi, "")
    .replace(/\bjson\b/gi, "")
    .replace(/\bengine\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (/^Chapter\s*\d+\s*$/i.test(text)) text = "";
  return text;
}

function normalizeFeatureKey(raw) {
  const key = clean(raw);
  if (!key) return ZIWEI_FEATURE_KEY;
  if (ZIWEI_FEATURE_ALIASES.has(key)) return ZIWEI_FEATURE_KEY;
  return key;
}

function toFiniteInt(value, fallback = NaN) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function pickNonEmpty(...values) {
  for (const value of values) {
    const normalized = clean(value);
    if (normalized) return normalized;
  }
  return "";
}

function normalizeGender(value) {
  const raw = clean(value).toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(raw)) return "male";
  if (["f", "female", "woman", "여", "여성"].includes(raw)) return "female";
  return "unknown";
}

function normalizeCalendarType(value) {
  const raw = clean(value).toLowerCase();
  if (["solar", "양력", "양"].includes(raw)) return "solar";
  if (["lunar", "음력", "음", "lunar_leap", "윤달"].includes(raw)) return "lunar";
  return "unknown";
}

function isUnknownTimeMarker(value) {
  const raw = clean(value).toLowerCase();
  if (!raw) return false;
  return /모름|미상|unknown|없음|미기재|not\s*known|n\/a|na|무시|모르/.test(raw);
}

function normalizeHourMinute(hour, minute = 0) {
  if (!Number.isFinite(hour)) return null;
  if (!Number.isFinite(minute)) minute = 0;
  const normalizedHour = Math.max(0, Math.min(23, Math.trunc(hour)));
  const normalizedMinute = Math.max(0, Math.min(59, Math.trunc(minute)));
  return { hour: normalizedHour, minute: normalizedMinute };
}

function parseHourMinuteFromText(value) {
  const raw = clean(value);
  if (!raw) return null;
  if (isUnknownTimeMarker(raw)) return { unknown: true };

  const branchMatch = raw.match(/([자축인묘진사오미신유술해])\s*시/);
  if (branchMatch && EARTHLY_BRANCH_HOUR[branchMatch[1]] != null) {
    return normalizeHourMinute(EARTHLY_BRANCH_HOUR[branchMatch[1]], 0);
  }

  const hm = raw.match(/^(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
  if (hm) {
    let hour = toFiniteInt(hm[1], NaN);
    const minute = toFiniteInt(hm[2], 0);
    if (/오후|pm|PM/.test(raw) && Number.isFinite(hour) && hour < 12) hour += 12;
    if (/오전|am|AM/.test(raw) && Number.isFinite(hour) && hour === 12) hour = 0;
    return normalizeHourMinute(hour, minute);
  }

  const hourOnly = raw.match(/^(오전|오후|am|pm|AM|PM)?\s*(\d{1,2})\s*시?$/);
  if (hourOnly) {
    let hour = toFiniteInt(hourOnly[2], NaN);
    if (/오후|pm|PM/.test(hourOnly[1] || "") && Number.isFinite(hour) && hour < 12) hour += 12;
    if (/오전|am|AM/.test(hourOnly[1] || "") && Number.isFinite(hour) && hour === 12) hour = 0;
    return normalizeHourMinute(hour, 0);
  }

  return null;
}

function parseDateParts(value) {
  const raw = clean(value);
  if (!raw) return null;
  const match = raw.match(/^(\d{4})[-./\s](\d{1,2})[-./\s](\d{1,2})$/);
  if (!match) return null;
  const year = toFiniteInt(match[1], NaN);
  const month = toFiniteInt(match[2], NaN);
  const day = toFiniteInt(match[3], NaN);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function pad2(value) {
  return String(toInt(value, 0)).padStart(2, "0");
}

function normalizeSymbol(symbol, name = "") {
  const s = clean(symbol);
  const n = clean(name);
  if (s === "◎") return "◎";
  if (s === "O" || s === "○" || s === "◉") return "O";
  if (s === "▲") return "▲";
  if (s === "△") return "△";
  if (s === "X" || s === "×" || /^x$/i.test(s)) return "X";
  if (/묘|廟/.test(n)) return "◎";
  if (/왕|旺|득|得/.test(n)) return "O";
  if (/리|利|약/.test(n)) return "▲";
  if (/평|平/.test(n)) return "△";
  if (/함|실|陷|불|쇠/.test(n)) return "X";
  return "△";
}

function normalizeStrengthName(value) {
  const raw = clean(value);
  if (/묘|廟|◎/.test(raw)) return "묘";
  if (/왕|旺|득|得|○|O/.test(raw)) return "득";
  if (/리|利|약|▲/.test(raw)) return "리";
  if (/평|平|△/.test(raw)) return "평";
  if (/함|실|陷|불|쇠|×|X/i.test(raw)) return "함";
  return "평";
}

function normalizeStar(star) {
  if (!star || typeof star !== "object") return null;
  const name = clean(star.nameKo || star.name || star.starName);
  if (!name) return null;
  const strengthName = normalizeStrengthName(star.strengthName || star.strength || star.brightnessKo || star.brightness || star.symbol || star.strengthSymbol);
  const strengthSymbol = normalizeSymbol(star.strengthSymbol || star.symbol, strengthName);
  return {
    name,
    strengthName,
    strengthSymbol,
    borrowed: star.borrowed === true,
    sihua: clean(star.sihua || star.transformation || star.transform),
  };
}

function normalizeStarList(list) {
  return (Array.isArray(list) ? list : []).map(normalizeStar).filter(Boolean);
}

function starsText(stars) {
  const rows = normalizeStarList(stars);
  if (!rows.length) return "확인되는 주성이 없습니다";
  return rows.map((star) => `${star.name}${star.strengthSymbol}(${star.strengthName})${star.sihua ? ` ${star.sihua}` : ""}${star.borrowed ? " 차성" : ""}`).join(", ");
}

function normalizeInput(body = {}) {
  const bp = body.birthProfile && typeof body.birthProfile === "object" ? body.birthProfile : {};
  const birth = bp.birth && typeof bp.birth === "object" ? bp.birth : {};
  const input = body.birthInput && typeof body.birthInput === "object" ? body.birthInput : {};

  const birthDateRaw = pickNonEmpty(
    input.birthDate,
    input.birthday,
    input.solarDate,
    input.lunarDate,
    input.date,
    body.birthDate,
    body.birthday,
    body.solarDate,
    body.lunarDate,
    body.date,
    bp.birthDate,
    birth.birthDate,
    birth.solarDate,
    birth.lunarDate,
    body.solarDate,
    body.birthday,
    birth.date,
  );
  const parsedDate = parseDateParts(birthDateRaw);

  const year = Number.isFinite(toFiniteInt(input.birthYear, NaN))
    ? toFiniteInt(input.birthYear, NaN)
    : Number.isFinite(toFiniteInt(body.birthYear, NaN))
      ? toFiniteInt(body.birthYear, NaN)
      : Number.isFinite(toFiniteInt(body.year, NaN))
        ? toFiniteInt(body.year, NaN)
        : Number.isFinite(toFiniteInt(birth.year, NaN))
          ? toFiniteInt(birth.year, NaN)
          : parsedDate?.year;
  const month = Number.isFinite(toFiniteInt(input.birthMonth, NaN))
    ? toFiniteInt(input.birthMonth, NaN)
    : Number.isFinite(toFiniteInt(body.birthMonth, NaN))
      ? toFiniteInt(body.birthMonth, NaN)
      : Number.isFinite(toFiniteInt(body.month, NaN))
        ? toFiniteInt(body.month, NaN)
        : Number.isFinite(toFiniteInt(birth.month, NaN))
          ? toFiniteInt(birth.month, NaN)
          : parsedDate?.month;
  const day = Number.isFinite(toFiniteInt(input.birthDay, NaN))
    ? toFiniteInt(input.birthDay, NaN)
    : Number.isFinite(toFiniteInt(body.birthDay, NaN))
      ? toFiniteInt(body.birthDay, NaN)
      : Number.isFinite(toFiniteInt(body.day, NaN))
        ? toFiniteInt(body.day, NaN)
        : Number.isFinite(toFiniteInt(birth.day, NaN))
          ? toFiniteInt(birth.day, NaN)
          : parsedDate?.day;

  const birthTimeRaw = pickNonEmpty(
    input.birthTime,
    body.birthTime,
    body.time,
    body.timeText,
    body.birth_hour,
    body.hourText,
    body.hour_text,
    bp.birthTime,
    birth.birthTime,
    birth.time,
  );
  const explicitHour = Number.isFinite(toFiniteInt(input.birthHour, NaN))
    ? toFiniteInt(input.birthHour, NaN)
    : Number.isFinite(toFiniteInt(body.birthHour, NaN))
      ? toFiniteInt(body.birthHour, NaN)
      : Number.isFinite(toFiniteInt(body.hour, NaN))
        ? toFiniteInt(body.hour, NaN)
        : Number.isFinite(toFiniteInt(body.birth_hour, NaN))
          ? toFiniteInt(body.birth_hour, NaN)
          : Number.isFinite(toFiniteInt(birth.hour, NaN))
            ? toFiniteInt(birth.hour, NaN)
            : NaN;
  const explicitMinute = Number.isFinite(toFiniteInt(input.birthMinute, NaN))
    ? toFiniteInt(input.birthMinute, NaN)
    : Number.isFinite(toFiniteInt(body.birthMinute, NaN))
      ? toFiniteInt(body.birthMinute, NaN)
      : Number.isFinite(toFiniteInt(body.minute, NaN))
        ? toFiniteInt(body.minute, NaN)
        : Number.isFinite(toFiniteInt(birth.minute, NaN))
          ? toFiniteInt(birth.minute, NaN)
          : 0;

  const parsedTime = parseHourMinuteFromText(birthTimeRaw);
  const isTimeUnknown = Boolean(
    input.isTimeUnknown
    || body.isTimeUnknown
    || body.timeUnknown
    || body.unknownHour
    || bp.timeUnknown
    || birth.timeUnknown
    || (parsedTime && parsedTime.unknown)
    || isUnknownTimeMarker(birthTimeRaw),
  );

  const hourMinute = Number.isFinite(explicitHour)
    ? normalizeHourMinute(explicitHour, explicitMinute)
    : parsedTime && !parsedTime.unknown
      ? normalizeHourMinute(parsedTime.hour, parsedTime.minute)
      : null;

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, message: "정확한 명반 계산을 위해 생년월일 정보를 확인해 주세요." };
  }
  if (isTimeUnknown || !hourMinute) {
    return {
      ok: false,
      code: "BIRTH_TIME_REQUIRED",
      message: "자미두수 PDF는 명궁과 12궁 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.",
    };
  }

  const gender = normalizeGender(pickNonEmpty(input.gender, input.sex, body.gender, body.sex, bp.gender, birth.gender));
  const calendarType = normalizeCalendarType(
    pickNonEmpty(input.calendarType, input.calendar, body.calendarType, body.calendar, bp.calendarType, birth.calType, birth.calendarType),
  );

  const birthInput = {
    name: pickNonEmpty(input.name, body.name, bp.name) || "사용자",
    gender,
    calendarType,
    birthDate: `${year}-${pad2(month)}-${pad2(day)}`,
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    birthTime: `${pad2(hourMinute.hour)}:${pad2(hourMinute.minute)}`,
    birthHour: hourMinute.hour,
    birthMinute: hourMinute.minute,
    timezone: pickNonEmpty(input.timezone, body.timezone, bp.timezone, birth.timezone) || "Asia/Seoul",
    isTimeUnknown: false,
  };

  return {
    ok: true,
    birthInput,
    profile: {
      name: birthInput.name,
      gender: birthInput.gender,
      year,
      month,
      day,
      hour: birthInput.birthHour,
      minute: birthInput.birthMinute,
      calendarType: birthInput.calendarType,
      birthplace: clean(body.birthplace || bp.birthplace || bp.birthPlace) || "대한민국",
      birthIso: `${year}-${pad2(month)}-${pad2(day)} ${pad2(birthInput.birthHour)}:${pad2(birthInput.birthMinute)}`,
    },
  };
}

function getZiweiBase(body = {}) {
  const candidates = [
    body.ziweiBase,
    body.ziweiPdfSeed,
    body.chartResult?.reportPayload,
    body.chartResult?.ziweiBase,
    body.reportPayload,
    body.chart,
  ];
  for (const item of candidates) {
    if (item && typeof item === "object") return item;
  }
  return null;
}

function normalizePalaces(base = {}) {
  const rawPalaces = Array.isArray(base.palaces)
    ? base.palaces
    : Array.isArray(base.chart?.palaces)
      ? base.chart.palaces
      : Array.isArray(base.chartMeta?.palaces)
        ? base.chartMeta.palaces
        : [];
  const palaces = rawPalaces.map((palace, index) => {
    const key = clean(palace.key || palace.id || palace.palaceKey || "");
    const nameKo = clean(palace.nameKo || palace.name || palace.palace || PALACE_LABELS[key] || "");
    return {
      key,
      nameKo,
      branch: clean(palace.branch || palace.earthlyBranch || palace.zhi),
      index,
      mainStars: normalizeStarList(palace.mainStars || palace.stars),
      auxStars: normalizeStarList(palace.auxStars || palace.auxiliaryStars || palace.subStars),
      maleficStars: normalizeStarList(palace.maleficStars || palace.badStars),
      transformations: Array.isArray(palace.transformations) ? palace.transformations : [],
      decadeLuck: palace.decadeLuck || null,
      annualLuck: palace.annualLuck || null,
    };
  });
  return palaces;
}

function shortKeyword(value, max = 56) {
  return clean(value)
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function uniqueShortKeywords(values = [], maxItems = 8) {
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    const token = shortKeyword(raw);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
    if (out.length >= maxItems) break;
  }
  return out;
}

function buildPalaceKeywordSignal(palace) {
  if (!palace) return "계산 기반 핵심 신호 없음";
  const stars = normalizeStarList([...(palace.mainStars || []), ...(palace.auxStars || []), ...(palace.maleficStars || [])]);
  const labels = stars.slice(0, 3).map((star) => `${star.name}${star.strengthSymbol}`);
  return uniqueShortKeywords([
    `${palace.nameKo || "해당 궁"} 핵심 별: ${labels.join(", ") || "별 신호 요약"}`,
    `${palace.nameKo || "해당 궁"} 지지: ${palace.branch || "미상"}`,
  ], 2);
}

function summarizePalaceForSeed(palace) {
  if (!palace) return null;
  const stars = normalizeStarList([...(palace.mainStars || []), ...(palace.auxStars || []), ...(palace.maleficStars || [])]);
  return {
    palaceName: clean(palace.nameKo || ""),
    branch: clean(palace.branch || ""),
    mainStars: normalizeStarList(palace.mainStars).map((star) => ({
      name: star.name,
      brightness: normalizeSymbol(star.strengthSymbol, star.strengthName),
      originalStatus: clean(star.strengthName || ""),
    })),
    assistantStars: normalizeStarList(palace.auxStars).map((star) => star.name),
    minorStars: normalizeStarList(palace.maleficStars).map((star) => star.name),
    transformations: Array.isArray(palace.transformations)
      ? palace.transformations
        .map((item) => ({ star: clean(item?.star), type: clean(item?.type || item?.label) }))
        .filter((item) => item.star || item.type)
      : [],
    lifeStage: clean(palace.decadeLuck?.label || palace.annualLuck?.label || ""),
    notesForLLM: uniqueShortKeywords([
      ...buildPalaceKeywordSignal(palace),
      ...stars.slice(0, 4).map((star) => `${star.name}${star.strengthSymbol} 신호`),
    ], 6),
  };
}

function pickPalaceByNameOrKey(palaces, key, names = []) {
  if (!Array.isArray(palaces)) return null;
  return palaces.find((p) => p.key === key)
    || palaces.find((p) => names.includes(clean(p.nameKo)))
    || null;
}

function buildDerivedSignals(palaces, sihua = []) {
  const ming = pickPalaceByNameOrKey(palaces, "ming", ["명궁"]);
  const career = pickPalaceByNameOrKey(palaces, "career", ["관록궁"]);
  const wealth = pickPalaceByNameOrKey(palaces, "wealth", ["재백궁"]);
  const spouse = pickPalaceByNameOrKey(palaces, "spouse", ["부부궁", "부처궁"]);
  const fortune = pickPalaceByNameOrKey(palaces, "fortune", ["복덕궁"]);
  const health = pickPalaceByNameOrKey(palaces, "health", ["질액궁"]);
  const parents = pickPalaceByNameOrKey(palaces, "parents", ["부모궁"]);
  const siblings = pickPalaceByNameOrKey(palaces, "siblings", ["형제궁"]);

  const tfText = Array.isArray(sihua)
    ? sihua
      .map((item) => `${clean(item?.star)} ${clean(item?.type || item?.label)}`.trim())
      .filter(Boolean)
    : [];

  return {
    personalitySignals: uniqueShortKeywords([...(buildPalaceKeywordSignal(ming) || []), "자기 기준과 주도성 신호"], 6),
    careerSignals: uniqueShortKeywords([...(buildPalaceKeywordSignal(career) || []), "전문성·독립성 강화 신호"], 6),
    wealthSignals: uniqueShortKeywords([...(buildPalaceKeywordSignal(wealth) || []), "현금 흐름과 누수 관리 신호"], 6),
    loveMarriageSignals: uniqueShortKeywords([...(buildPalaceKeywordSignal(spouse) || []), "관계 긴장·깊은 인연 신호"], 6),
    familySignals: uniqueShortKeywords([...(buildPalaceKeywordSignal(parents) || []), ...(buildPalaceKeywordSignal(siblings) || []), "가족·관계 책임 신호"], 6),
    healthMindSignals: uniqueShortKeywords([...(buildPalaceKeywordSignal(health) || []), ...(buildPalaceKeywordSignal(fortune) || []), "스트레스·회복 리듬 신호"], 6),
    crisisSignals: uniqueShortKeywords([...tfText.filter((v) => /화기/.test(v)).map((v) => `${v} 과제 신호`), "과로·감정 소모 경고 신호"], 6),
    transformationSignals: uniqueShortKeywords([...tfText.map((v) => `${v} 전환 신호`), "사화 연동 변화 신호"], 6),
  };
}

function buildKeyPalaces(seedPalaceMap = []) {
  const byName = new Map(seedPalaceMap.map((item) => [clean(item.palaceName), item]));
  return {
    "命궁": byName.get("명궁") || null,
    "신궁": byName.get("신궁") || null,
    "복덕궁": byName.get("복덕궁") || null,
    "관록궁": byName.get("관록궁") || null,
    "재백궁": byName.get("재백궁") || null,
    "부처궁": byName.get("부부궁") || byName.get("부처궁") || null,
    "질액궁": byName.get("질액궁") || null,
    "천이궁": byName.get("천이궁") || null,
    "부모궁": byName.get("부모궁") || null,
    "형제궁": byName.get("형제궁") || null,
    "자녀궁": byName.get("자녀궁") || null,
    "노복궁": byName.get("노복궁") || byName.get("교우궁") || null,
  };
}

function findPalace(seed, key) {
  const palaces = Array.isArray(seed?.palaces)
    ? seed.palaces
    : (Array.isArray(seed?.chart?.palaces) ? seed.chart.palaces : []);
  if (key === "body") {
    return seed.bodyPalace || palaces.find((p) => p.key === "body") || palaces.find((p) => p.branch && p.branch === seed.chart.shenGong) || seed.lifePalace;
  }
  if (key === "signals") {
    return seed.lifePalace || palaces.find((p) => p.key === "ming") || null;
  }
  if (key === "timing") return null;
  const expectedName = PALACE_LABELS[key];
  return palaces.find((p) => p.key === key) || palaces.find((p) => p.nameKo === expectedName) || null;
}

function buildZiweiPdfSeed(profile, base) {
  const palaces = normalizePalaces(base);
  const chartMeta = base.chartMeta || base.chart || {};
  const lifePalace = palaces.find((p) => p.key === "ming" || p.nameKo === "명궁") || null;
  const bodyBranch = clean(chartMeta.shenGong || chartMeta.bodyPalaceBranch || base.shen);
  const bodyPalace = palaces.find((p) => p.key === "body") || palaces.find((p) => p.branch && p.branch === bodyBranch) || null;
  const sihua = Array.isArray(base.sihua) ? base.sihua : (Array.isArray(base.transformations) ? base.transformations : []);
  const luck = base.luck && typeof base.luck === "object" ? base.luck : {};
  const decadeLuck = Array.isArray(luck.decadeLuck) ? luck.decadeLuck : (Array.isArray(base.decadeLuck) ? base.decadeLuck : []);
  const annualLuck = Array.isArray(luck.annual) ? luck.annual : (Array.isArray(base.annualLuck) ? base.annualLuck : []);

  const diagnostics = {
    palaceCount: palaces.length,
    hasAll12Palaces: palaces.length >= 12,
    hasMingGong: Boolean(lifePalace),
    hasShenGong: Boolean(bodyPalace || bodyBranch),
    hasSihua: sihua.length > 0,
    hasDecadeLuck: decadeLuck.length > 0,
  };

  const palaceMap = palaces.map((palace) => summarizePalaceForSeed(palace)).filter(Boolean);
  const derivedSignals = buildDerivedSignals(palaces, sihua);
  const strengths = uniqueShortKeywords([
    ...normalizeStarList((lifePalace && lifePalace.mainStars) || []).map((star) => `${star.name}${normalizeSymbol(star.strengthSymbol, star.strengthName)} 주도성`),
    ...normalizeStarList((bodyPalace && bodyPalace.mainStars) || []).map((star) => `${star.name}${normalizeSymbol(star.strengthSymbol, star.strengthName)} 실행력`),
  ], 8);
  const cautionFlags = uniqueShortKeywords([
    ...normalizeStarList(palaces.flatMap((palace) => palace.maleficStars || [])).map((star) => `${star.name}${normalizeSymbol(star.strengthSymbol, star.strengthName)} 주의 신호`),
    ...((Array.isArray(sihua) ? sihua : []).filter((item) => /화기/.test(clean(item?.type || item?.label))).map((item) => `${clean(item?.star)} 화기 집중 관리`)),
  ], 10);

  const ziweiPdfSeed = {
    input: {
      name: clean(profile.name || ""),
      gender: clean(profile.gender || ""),
      birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`,
      birthTime: `${pad2(profile.hour)}:${pad2(profile.minute)}`,
      birthPlace: clean(profile.birthplace || ""),
      calendarType: clean(profile.calendarType || ""),
    },
    chartMeta: {
      mingGong: clean(chartMeta.mingGong || base.meng || lifePalace?.branch || ""),
      shenGong: bodyBranch,
      bodyPalace: clean(bodyPalace?.nameKo || ""),
      fiveElementClass: clean(chartMeta.fiveElementBureau || base.juInfo || ""),
      yearStem: clean(chartMeta.yearStem || chartMeta.yearGan || base.yearGan || ""),
      yearBranch: clean(chartMeta.yearBranch || chartMeta.yearZhi || ""),
      lunarDate: clean(chartMeta.lunarDate || ""),
    },
    palaceMap,
    keyPalaces: buildKeyPalaces(palaceMap),
    fortuneCycles: {
      decadeFortune: decadeLuck,
      annualFortune: annualLuck,
      currentCycle: decadeLuck.find((item) => item?.current || item?.isCurrent) || decadeLuck[0] || null,
    },
    derivedSignals,
    cautionFlags,
    strengths,
    unresolvedThemes: uniqueShortKeywords([
      "관계와 일의 에너지 배분",
      "집착과 회복의 균형",
      "장기 대운 전략 정교화",
    ], 6),
  };

  return {
    mode: "single",
    birthProfile: {
      birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`,
      birthTime: `${pad2(profile.hour)}:${pad2(profile.minute)}`,
      calendarType: profile.calendarType,
      gender: profile.gender,
      birthplace: profile.birthplace,
    },
    chart: {
      mingGong: clean(chartMeta.mingGong || base.meng || lifePalace?.branch || ""),
      shenGong: bodyBranch,
      fiveElementBureau: clean(chartMeta.fiveElementBureau || base.juInfo || ""),
      yearStemBranch: clean(chartMeta.yearStemBranch || chartMeta.yearGan || base.yearGan || ""),
      palaces,
      transformations: sihua,
      decadeLuck,
      annualLuck,
    },
    ziweiPdfSeed,
    strengthLegend: STRENGTH_LEGEND,
    lifePalace,
    bodyPalace,
    diagnostics,
  };
}

function validateSeed(seed) {
  const errors = [];
  if (!seed?.diagnostics?.hasAll12Palaces) errors.push("palaces.length");
  if (!seed?.diagnostics?.hasMingGong) errors.push("mingGong");
  if (!seed?.diagnostics?.hasShenGong) errors.push("shenGong");
  return { ok: errors.length === 0, errors };
}

function validateZiweiPdfSeed(seed) {
  const errors = [];
  const ziweiPdfSeed = seed?.ziweiPdfSeed || {};
  const chartMeta = ziweiPdfSeed?.chartMeta || {};
  const palaceMap = Array.isArray(ziweiPdfSeed?.palaceMap) ? ziweiPdfSeed.palaceMap : [];
  const derivedSignals = ziweiPdfSeed?.derivedSignals || {};

  if (!clean(chartMeta.mingGong)) errors.push("ziweiPdfSeed.chartMeta.mingGong");
  if (!clean(chartMeta.shenGong)) errors.push("ziweiPdfSeed.chartMeta.shenGong");
  if (palaceMap.length < 12) errors.push("ziweiPdfSeed.palaceMap");
  if (!Array.isArray(derivedSignals.personalitySignals) || !derivedSignals.personalitySignals.length) errors.push("ziweiPdfSeed.derivedSignals.personalitySignals");
  if (!Array.isArray(ziweiPdfSeed.strengths) || !ziweiPdfSeed.strengths.length) errors.push("ziweiPdfSeed.strengths");
  if (!Array.isArray(ziweiPdfSeed.cautionFlags) || !ziweiPdfSeed.cautionFlags.length) errors.push("ziweiPdfSeed.cautionFlags");

  return { ok: errors.length === 0, errors };
}

function buildZiweiFallbackParagraph(seed, chapterSpec, categoryTitle, categoryIndex, paragraphIndex, previousChapterSummaries = []) {
  const ziweiPdfSeed = seed?.ziweiPdfSeed || {};
  const chartMeta = ziweiPdfSeed?.chartMeta || {};
  const palaceMap = Array.isArray(ziweiPdfSeed?.palaceMap) ? ziweiPdfSeed.palaceMap : [];
  const primaryPalace = palaceMap[categoryIndex % Math.max(1, palaceMap.length)] || palaceMap[0] || {};
  const nextPalace = palaceMap[(categoryIndex + 1) % Math.max(1, palaceMap.length)] || primaryPalace;
  const seedSignals = [
    ...(Array.isArray(ziweiPdfSeed?.derivedSignals?.personalitySignals) ? ziweiPdfSeed.derivedSignals.personalitySignals : []),
    ...(Array.isArray(ziweiPdfSeed?.derivedSignals?.careerSignals) ? ziweiPdfSeed.derivedSignals.careerSignals : []),
    ...(Array.isArray(ziweiPdfSeed?.derivedSignals?.wealthSignals) ? ziweiPdfSeed.derivedSignals.wealthSignals : []),
    ...(Array.isArray(ziweiPdfSeed?.strengths) ? ziweiPdfSeed.strengths : []),
    ...(Array.isArray(ziweiPdfSeed?.cautionFlags) ? ziweiPdfSeed.cautionFlags : []),
  ].filter(Boolean);
  const signalText = uniqueShortKeywords(seedSignals, 5).join(" · ") || `${clean(chartMeta.mingGong)} · ${clean(chartMeta.shenGong)}`;
  const prevSummary = Array.isArray(previousChapterSummaries) && previousChapterSummaries.length
    ? clean(previousChapterSummaries[previousChapterSummaries.length - 1]?.title || previousChapterSummaries[previousChapterSummaries.length - 1]?.summary || "")
    : "앞 장의 해석 흐름";
  const anchorText = clean(primaryPalace?.nameKo || chartMeta.mingGong || "명궁");
  const nextAnchorText = clean(nextPalace?.nameKo || chartMeta.shenGong || "신궁");
  const branchText = clean(primaryPalace?.branch || nextPalace?.branch || chartMeta.yearBranch || "");
  const strengthText = uniqueShortKeywords([
    ...uniqueShortKeywords(ziweiPdfSeed?.strengths || [], 2),
    ...uniqueShortKeywords(ziweiPdfSeed?.cautionFlags || [], 2),
  ], 4).join(" · ");

  if (paragraphIndex === 0) {
    return `${chapterSpec.title}의 ${categoryTitle}은 ${anchorText}와 ${nextAnchorText}의 연결을 ${branchText ? `${branchText} 축` : "명반 축"}에서 다시 읽는 출발점입니다. 계산 JSON이 보여 주는 궁·별·사화 신호를 그대로 반영해, 이 장에서는 추상적인 운세가 아니라 실제 삶의 선택이 어디에서 갈리는지를 먼저 확인합니다. ${signalText} 같은 핵심 신호는 자아의 결, 관계의 거리, 일의 집중도, 돈의 흐름을 한 묶음으로 읽게 해 줍니다.`;
  }

  if (paragraphIndex === 1) {
    return `이전 장의 흐름인 ${prevSummary}과 이어서 보면, 같은 명반이라도 어떤 궁이 먼저 반응하는지에 따라 삶의 체감이 달라집니다. ${anchorText}가 주도권을 잡는 순간과 ${nextAnchorText}가 보완 역할을 하는 순간을 나눠 읽어야, 왜 어떤 선택은 곧바로 성과로 이어지고 어떤 선택은 천천히 누적되는지 설명할 수 있습니다. 따라서 이 섹션은 계산 JSON을 다시 해석하는 안내서로서, 성향의 장점과 경고 신호를 동시에 붙잡아야 합니다.`;
  }

  if (paragraphIndex === 2) {
    return `실행 관점에서는 ${strengthText || "강점과 경고 신호"}를 기준으로, 이 주제를 오늘의 행동 문장으로 바꾸는 일이 중요합니다. 관계라면 누가 먼저 다가오고 누가 거리를 조절하는지, 일이라면 어떤 타이밍에 집중력을 쓰고 어떤 구간에서 쉬어야 하는지를 분리해서 적어야 합니다. 자미두수 PDF는 계산값을 설명하는 데서 끝나지 않고, 그 계산이 실제 일정과 선택에 어떻게 작동하는지까지 이어져야 완성됩니다.`;
  }

  return `마지막 정리에서는 ${categoryTitle}을 ${chapterSpec.title} 전체 맥락 속에 놓고, ${anchorText}에서 시작한 흐름이 ${nextAnchorText}로 어떻게 이어지는지 확인합니다. 이 연결을 통해 같은 명반도 장면별로 다르게 드러난다는 점을 분명히 하고, 계산 JSON의 빈칸 없이 해석이 쌓였을 때만 PDF의 완성도가 유지됩니다. 결론적으로 이 장은 계산된 결과를 다시 계산하는 것이 아니라, 이미 완성된 seed를 실제 리포트 문장으로 안정적으로 고정하는 역할을 합니다.`;
}

function buildZiweiFallbackCategoryText(seed, chapterSpec, categoryTitle, categoryIndex, previousChapterSummaries = []) {
  return [0, 1, 2, 3]
    .map((paragraphIndex) => buildZiweiFallbackParagraph(seed, chapterSpec, categoryTitle, categoryIndex, paragraphIndex, previousChapterSummaries))
    .join("\n\n");
}

function buildZiweiFallbackChapter(seed, chapterSpec, previousChapterSummaries = []) {
  const categories = chapterSpec.categories.map((title, index) => ({
    id: `${chapterSpec.id}-${String(index + 1).padStart(2, "0")}`,
    title,
    finalText: buildZiweiFallbackCategoryText(seed, chapterSpec, title, index, previousChapterSummaries),
    order: index + 1,
  }));

  return {
    id: chapterSpec.id,
    roman: chapterSpec.roman,
    chapterNo: Number(chapterSpec.id),
    title: chapterSpec.title,
    categories,
    finalText: categories.map((item) => `### ${item.title}\n\n${item.finalText}`).join("\n\n"),
    text: categories.map((item) => `### ${item.title}\n\n${item.finalText}`).join("\n\n"),
    source: "local-fallback",
    usedFallback: true,
  };
}

function hasRequiredPalaceCoverage(seed) {
  const palaces = Array.isArray(seed?.chart?.palaces) ? seed.chart.palaces : [];
  return palaces.length >= 12;
}

function validateFinalManuscript({ birthInput, seed, chapters }) {
  const errors = [];
  if (!birthInput) errors.push("birthInput_missing");
  if (!clean(birthInput?.birthDate)) errors.push("birthDate_missing");
  if (!Number.isFinite(Number(birthInput?.birthHour))) errors.push("birthHour_missing");
  if (!seed?.ziweiPdfSeed) errors.push("ziweiPdfSeed_missing");
  if (!clean(seed?.chart?.mingGong)) errors.push("mingGong_missing");
  if (!clean(seed?.chart?.shenGong)) errors.push("shenGong_missing");
  if (!hasRequiredPalaceCoverage(seed)) errors.push("palace_count_invalid");
  const chapterValidation = validateZiweiPdfLLMInterpretationQuality({ chapters, expectedChapters: CHAPTER_BLUEPRINTS, seed });
  if (!chapterValidation.ok) errors.push(...chapterValidation.errors);
  if (computeDuplicateRate(chapters) > 0.2) errors.push("duplicate_rate_high");
  return { ok: errors.length === 0, errors, chapterValidation };
}


function parseJsonMaybe(text) {
  const raw = clean(text).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

function validateChapters(chapters = []) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== CHAPTER_BLUEPRINTS.length) errors.push("chapter_count");
  let totalChars = 0;
  CHAPTER_BLUEPRINTS.forEach((blueprint, index) => {
    const chapter = chapters[index];
    if (!chapter || clean(chapter.title) !== blueprint.title) errors.push(`chapter_${index + 1}_title`);
    const cats = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (cats.length !== blueprint.categories.length) errors.push(`chapter_${index + 1}_category_count`);
    const chapterChars = cats.reduce((sum, cat) => sum + stripForbiddenTokens(cat?.finalText || cat?.text || "").length, 0);
    totalChars += chapterChars;
    if (chapterChars < CHAPTER_MIN_CHARS) errors.push(`chapter_${index + 1}_min_chars`);
    blueprint.categories.forEach((title, categoryIndex) => {
      const category = cats[categoryIndex];
      if (!category || clean(category.title) !== title) errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_title`);
      const text = stripForbiddenTokens(category?.finalText || category?.text || "");
      if (text.length < SECTION_MIN_CHARS) errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_text`);
      const lowered = text.toLowerCase();
      for (const token of FORBIDDEN_TEXT) {
        if (lowered.includes(token.toLowerCase())) errors.push(`chapter_${index + 1}_forbidden_${token}`);
      }
    });
  });
  if (totalChars < TOTAL_MIN_CHARS) errors.push("total_min_chars");
  return { ok: errors.length === 0, errors, totalChars };
}

function summarizeChapter(chapter) {
  const first = (Array.isArray(chapter?.categories) ? chapter.categories : [])[0] || {};
  return {
    title: clean(chapter?.title),
    firstCategory: clean(first?.title),
    summary: shortKeyword(stripForbiddenTokens(first?.finalText || first?.text || ""), 220),
  };
}

function chapterNeedsZiweiKeywords(chapterNo) {
  if (chapterNo === 1 || chapterNo === 2) return ["명궁", "신궁", "12궁"];
  if (chapterNo === 3) return ["주성", "보조성"];
  if (chapterNo === 4) return ["화록", "화권", "화과", "화기"];
  if (chapterNo === 11) return ["대운"];
  if (chapterNo === 13) return ["3년", "5년", "10년"];
  return [];
}

function parseChapterJsonFromLlm(text) {
  const parsed = parseJsonMaybe(text);
  if (!parsed) return null;
  const source = parsed?.chapter && typeof parsed.chapter === "object" ? parsed.chapter : parsed;
  if (!source || typeof source !== "object") return null;
  return source;
}

function normalizeGeneratedChapter(source, chapterSpec) {
  const incomingCategories = Array.isArray(source?.categories) ? source.categories : [];
  const categories = chapterSpec.categories.map((title, index) => {
    const matched = incomingCategories.find((item) => clean(item?.title) === title) || incomingCategories[index] || {};
    const finalText = stripForbiddenTokens(matched.finalText || matched.text || matched.body || "");
    return {
      id: `${chapterSpec.id}-${String(index + 1).padStart(2, "0")}`,
      title,
      finalText,
      order: index + 1,
    };
  });

  return {
    id: chapterSpec.id,
    roman: chapterSpec.roman,
    chapterNo: Number(chapterSpec.id),
    title: chapterSpec.title,
    categories,
    finalText: categories.map((item) => `### ${item.title}\n\n${item.finalText}`).join("\n\n"),
    text: categories.map((item) => `### ${item.title}\n\n${item.finalText}`).join("\n\n"),
    source: "llm-original",
  };
}

function validateZiweiChapterOrThrow(chapter, chapterSpec) {
  if (!chapter || clean(chapter.title) !== chapterSpec.title) {
    throw new Error(`chapter_${chapterSpec.id}_title_invalid`);
  }
  const categories = Array.isArray(chapter.categories) ? chapter.categories : [];
  if (categories.length !== chapterSpec.categories.length) {
    throw new Error(`chapter_${chapterSpec.id}_category_count_invalid`);
  }

  let chapterChars = 0;
  chapterSpec.categories.forEach((expectedTitle, index) => {
    const category = categories[index];
    if (!category || clean(category.title) !== expectedTitle) {
      throw new Error(`chapter_${chapterSpec.id}_category_${index + 1}_title_invalid`);
    }
    const textBody = stripForbiddenTokens(category.finalText || category.text || "");
    if (textBody.length < SECTION_MIN_CHARS) {
      throw new Error(`chapter_${chapterSpec.id}_category_${index + 1}_min_chars`);
    }
    chapterChars += textBody.length;
  });

  if (chapterChars < CHAPTER_MIN_CHARS) {
    throw new Error(`chapter_${chapterSpec.id}_min_chars`);
  }

  const requiredKeywords = chapterNeedsZiweiKeywords(Number(chapterSpec.id));
  if (requiredKeywords.length) {
    const merged = stripForbiddenTokens(
      (Array.isArray(chapter.categories) ? chapter.categories : []).map((item) => item.finalText || item.text || "").join("\n"),
    );
    if (!requiredKeywords.some((keyword) => merged.includes(keyword))) {
      throw new Error(`chapter_${chapterSpec.id}_required_keyword_missing`);
    }
  }
}

async function generateZiweiChapterByLlm({ env, seed, chapterSpec, previousChapterSummaries, attempt, previousFailureReason, options = {} }) {
  const llmChapterGenerator = typeof options.llmChapterGenerator === "function" ? options.llmChapterGenerator : null;
  const forbiddenGuide = "JSON, payload, seed, rawData, engine, local, debug, calculation, undefined, null, fallback, 자동 복구";
  let result = null;
  if (llmChapterGenerator) {
    result = await llmChapterGenerator({ seed, chapterSpec, previousChapterSummaries, attempt, previousFailureReason });
  } else {
    const prompt = [
      "당신은 자미두수 명반을 기반으로 프리미엄 PDF 리포트를 작성하는 전문 상담가입니다.",
      "계산은 이미 내부 자미두수 엔진에서 완료되었습니다. 계산을 새로 하지 않습니다.",
      "로컬 원고를 고치는 것이 아니라, 지금부터 챕터 본문을 새로 작성합니다.",
      "제공된 JSON seed와 챕터/세부 카테고리 제목에 정확히 맞는 내용을 작성하세요.",
      "JSON에 없는 별, 궁, 사화, 대운 정보를 임의로 만들지 마세요.",
      "각 세부 카테고리는 서로 다른 관점과 내용을 가져야 하며 문장 구조를 반복하지 마세요.",
      `PDF 본문에는 다음 기술 문구를 절대 노출하지 마세요: ${forbiddenGuide}`,
      `현재 생성 대상 챕터: ${chapterSpec.title}`,
      `세부 카테고리: ${JSON.stringify(chapterSpec.categories)}`,
      "각 세부 카테고리 본문은 최소 600자 이상 작성하세요.",
      "반드시 JSON 객체 하나만 반환하세요.",
      "형식: {\"chapter\":{\"title\":string,\"categories\":[{\"title\":string,\"finalText\":string}]}}",
      `시도 횟수: ${attempt}`,
      previousFailureReason ? `이전 실패 사유: ${previousFailureReason}` : "",
      `이전 챕터 요약: ${JSON.stringify(previousChapterSummaries || [])}`,
      `ZiweiPdfSeed: ${JSON.stringify(seed.ziweiPdfSeed || {})}`,
    ].filter(Boolean).join("\n");

    result = await callGeminiText(env, prompt, {
      keyEnvKeys: ["ZIWEI_GEMINI_API_KEY"],
      modelEnvKeys: ["ZIWEI_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL"],
      temperature: 0.72,
      maxOutputTokens: 8192,
      timeoutMs: Math.min(20000, Number(env.ZIWEI_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 18000)),
      totalTimeoutMs: Math.min(26000, Number(env.ZIWEI_GEMINI_TOTAL_TIMEOUT_MS || env.PREMIUM_GEMINI_TOTAL_TIMEOUT_MS || 24000)),
      maxAttemptsPerPair: 1,
    });
  }

  if (!result?.ok || !clean(result.text)) {
    throw new Error(`chapter_${chapterSpec.id}_llm_empty`);
  }

  const parsed = parseChapterJsonFromLlm(result.text);
  if (!parsed) {
    throw new Error(`chapter_${chapterSpec.id}_llm_parse_failed`);
  }

  const chapter = normalizeGeneratedChapter(parsed, chapterSpec);
  try {
    validateZiweiChapterOrThrow(chapter, chapterSpec);
    return chapter;
  } catch (error) {
    throw error;
  }
}

async function generateZiweiPdfWithLLMOnlyInterpretation({ env, seed, chapterSpecs, sessionId, onProgress, options = {} }) {
  const chapters = [];
  for (const chapterSpec of chapterSpecs) {
    let chapter = null;
    let lastError = null;
    for (let attempt = 1; attempt <= CHAPTER_MAX_RETRIES; attempt += 1) {
      try {
        chapter = await generateZiweiChapterByLlm({
          env,
          seed,
          chapterSpec,
          previousChapterSummaries: chapters.map((item) => summarizeChapter(item)),
          attempt,
          previousFailureReason: lastError ? clean(lastError.message || "") : "",
          options,
        });
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn("[ZiweiPremiumPDF][ChapterRetry]", {
          chapterNo: Number(chapterSpec.id),
          attempt,
          reason: clean(lastError.message || "chapter_failed"),
        });
      }
    }
    if (!chapter) {
      throw new Error(`chapter_${chapterSpec.id}_failed_after_retry:${clean(lastError?.message || "unknown")}`);
    }

    chapters.push(chapter);
    if (typeof onProgress === "function") {
      await onProgress({
        sessionId,
        currentChapterNo: Number(chapterSpec.id),
        totalChapters: chapterSpecs.length,
        chapterTitle: chapterSpec.title,
      });
    }
  }

  return chapters;
}

function validateZiweiPdfLLMInterpretationQuality({ chapters, expectedChapters, seed }) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== expectedChapters.length) {
    errors.push("chapter_count");
    return { ok: false, errors, totalChars: 0 };
  }

  let totalChars = 0;
  expectedChapters.forEach((chapterSpec, chapterIndex) => {
    const chapter = chapters[chapterIndex];
    if (!chapter || clean(chapter.title) !== chapterSpec.title) {
      errors.push(`chapter_${chapterIndex + 1}_title`);
      return;
    }

    const categories = Array.isArray(chapter.categories) ? chapter.categories : [];
    if (categories.length !== chapterSpec.categories.length) {
      errors.push(`chapter_${chapterIndex + 1}_category_count`);
    }

    let chapterChars = 0;
    chapterSpec.categories.forEach((title, categoryIndex) => {
      const category = categories[categoryIndex];
      if (!category || clean(category.title) !== title) {
        errors.push(`chapter_${chapterIndex + 1}_category_${categoryIndex + 1}_title`);
        return;
      }
      const body = stripForbiddenTokens(category.finalText || category.text || "");
      chapterChars += body.length;
      if (body.length < SECTION_MIN_CHARS) {
        errors.push(`chapter_${chapterIndex + 1}_category_${categoryIndex + 1}_min_chars`);
      }

      const lowered = body.toLowerCase();
      for (const token of FORBIDDEN_TEXT) {
        if (lowered.includes(token.toLowerCase())) {
          errors.push(`chapter_${chapterIndex + 1}_forbidden_${token}`);
          break;
        }
      }
    });

    if (chapterChars < CHAPTER_MIN_CHARS) {
      errors.push(`chapter_${chapterIndex + 1}_min_chars`);
    }
    totalChars += chapterChars;

    const requiredKeywords = chapterNeedsZiweiKeywords(chapterIndex + 1);
    if (requiredKeywords.length) {
      const merged = categories.map((item) => stripForbiddenTokens(item.finalText || item.text || "")).join("\n");
      if (!requiredKeywords.some((keyword) => merged.includes(keyword))) {
        errors.push(`chapter_${chapterIndex + 1}_required_keyword_missing`);
      }
    }
  });

  if (totalChars < TOTAL_MIN_CHARS) {
    errors.push("total_min_chars");
  }

  if (computeDuplicateRate(chapters) > 0.2) {
    errors.push("duplicate_rate_high");
  }

  const seedValidation = validateZiweiPdfSeed(seed);
  const seedCore = JSON.stringify(seed?.ziweiPdfSeed?.chartMeta || {});
  if (!seedCore || seedCore === "{}") {
    errors.push("seed_chart_meta_missing");
  }
  if (!seedValidation.ok) {
    errors.push(...seedValidation.errors);
  }

  return { ok: errors.length === 0, errors, totalChars };
}

function computeDuplicateRate(chapters = []) {
  const source = chapters
    .flatMap((chapter) => (Array.isArray(chapter?.categories) ? chapter.categories : []))
    .map((item) => stripForbiddenTokens(item?.finalText || item?.text || ""))
    .join("\n\n");
  const paragraphs = source
    .split(/\n\s*\n+/)
    .map((row) => clean(row).replace(/\s+/g, " "))
    .filter((row) => row.length >= 80);
  if (!paragraphs.length) return 0;
  const counter = new Map();
  for (const paragraph of paragraphs) {
    counter.set(paragraph, (counter.get(paragraph) || 0) + 1);
  }
  const repeated = Array.from(counter.values())
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + (count - 1), 0);
  return repeated / paragraphs.length;
}

function buildZiweiPayload(profile, seed, chapters, metadata = {}) {
  return {
    mode: "single",
    birthProfile: seed.birthProfile,
    chart: {
      mingGong: seed.chart.mingGong,
      shenGong: seed.chart.shenGong,
      palaces: seed.chart.palaces,
      transformations: seed.chart.transformations,
      decadeLuck: seed.chart.decadeLuck,
      annualLuck: seed.chart.annualLuck,
    },
    strengthLegend: seed.strengthLegend,
    ziweiPdfSeed: seed.ziweiPdfSeed,
    chapters,
    metadata: { featureKey: ZIWEI_FEATURE_KEY, ...metadata },
  };
}

function toKoreanChapterTitle(title, index) {
  const stripped = String(title || "").replace(/^Chapter\s*\d+\.?\s*/i, "").trim();
  return `제${index + 1}장 ${stripped}`;
}

function renderZiweiPdf({ profile, seed, chapters, generatedAt }) {
  const toc = chapters.map((chapter, index) => `<li><span>${esc(chapter.roman)}</span><strong>${esc(toKoreanChapterTitle(chapter.title, index))}</strong></li>`).join("\n");
  const palaceSummary = seed.chart.palaces.slice(0, 12).map((p) => `<tr><td>${esc(p.nameKo)}</td><td>${esc(p.branch)}</td><td>${esc(starsText(p.mainStars))}</td></tr>`).join("\n");
  const chapterHtml = chapters.map((chapter, index) => {
    const categoryHtml = chapter.categories.map((category) => `<section class="zb-category"><h3>${esc(category.title)}</h3><p>${esc(category.finalText)}</p></section>`).join("\n");
    return `<article class="zb-chapter"><div class="zb-eyebrow">${esc(chapter.roman)} · 제 ${index + 1}장</div><h2>${esc(toKoreanChapterTitle(chapter.title, index))}</h2>${categoryHtml}</article>`;
  }).join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>자미두수 프리미엄 리포트</title>
  <style>
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;font-family:"Noto Serif KR","Malgun Gothic",serif;background:#100821;color:#f8f4ff;line-height:1.82}.page{max-width:980px;margin:0 auto;padding:28px 20px 64px}.cover{position:relative;overflow:hidden;min-height:92vh;padding:42px 34px;border-radius:24px;background:radial-gradient(circle at 72% 12%,rgba(250,204,21,.25),transparent 26%),linear-gradient(145deg,#160729 0%,#30125f 48%,#091b3a 100%);box-shadow:0 24px 60px rgba(0,0,0,.32);display:flex;flex-direction:column;justify-content:center}.cover::after{content:"";position:absolute;inset:24px;border:1px solid rgba(250,204,21,.28);border-radius:20px;pointer-events:none}.cover img{position:relative;z-index:1;width:min(320px,82%);border-radius:18px;margin:24px 0 0;box-shadow:0 18px 42px rgba(0,0,0,.34);background:#271146}.cover h1{position:relative;z-index:1;margin:8px 0 8px;font-size:44px;line-height:1.12;color:#fff7d6}.cover p{position:relative;z-index:1;margin:4px 0;color:#d8ccff}.badge{letter-spacing:.22em;text-transform:uppercase;color:#facc15;font-size:12px}.panel,.toc,.zb-chapter,.legend{margin-top:20px;padding:20px;border:1px solid rgba(216,180,254,.28);border-radius:18px;background:rgba(255,255,255,.08);box-shadow:0 14px 30px rgba(0,0,0,.16)}.panel h2,.toc h2,.legend h2{margin:0 0 12px;color:#fde68a}.meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.meta-item{padding:12px;border-radius:14px;background:rgba(16,8,33,.52);border:1px solid rgba(250,204,21,.2)}.meta-item b{display:block;color:#facc15}.legend-list{display:flex;flex-wrap:wrap;gap:8px}.legend-list span{padding:6px 10px;border-radius:999px;background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.26)}.palace-table{width:100%;border-collapse:collapse;font-size:13px}.palace-table td,.palace-table th{border-bottom:1px solid rgba(255,255,255,.12);padding:8px;text-align:left;vertical-align:top}.toc ol{margin:0;padding-left:20px}.toc li{margin:8px 0}.toc span{display:inline-block;min-width:44px;color:#facc15}.zb-chapter{break-inside:avoid-page;page-break-inside:avoid;background:#fbf7ff;color:#241333}.zb-eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#7c3aed;font-size:12px}.zb-chapter h2{margin:8px 0 18px;color:#2e1065;font-size:26px}.zb-category{padding:14px 16px;margin:12px 0;border-radius:14px;background:#fff;border:1px solid #e9d5ff}.zb-category h3{margin:0 0 8px;color:#5b21b6;font-size:18px}.zb-category p{margin:0;white-space:pre-wrap;color:#2f2440}.notice{color:#d8ccff;font-size:13px}.footer{margin-top:22px;text-align:center;color:#c4b5fd;font-size:13px}@page{size:A4;margin:16mm 14mm 18mm}@media print{body{background:#fff}.page{padding:0}.cover,.panel,.toc,.legend,.zb-chapter{box-shadow:none}.cover{border-radius:0}.zb-chapter{break-before:page;page-break-before:always}.zb-chapter:first-of-type{break-before:auto;page-break-before:auto}}@media(max-width:720px){.cover h1{font-size:32px}.meta-grid{grid-template-columns:1fr}.page{padding:14px 10px 40px}}
  </style>
</head>
<body>
  <main class="page">
    <section class="cover">
      <p class="badge">Code:Destiny Premium Ziwei</p>
      <h1>자미두수 프리미엄 리포트</h1>
      <p>명궁과 12궁으로 읽는 나만의 운명 설계도</p>
      <p>${esc(profile.name)} · ${esc(profile.birthIso)}</p>
      <img src="/fuctionassets/jamipremiun.webp" alt="자미두수 프리미엄 리포트 표지 이미지" />
    </section>
    <section class="panel">
      <div class="meta-grid"><div class="meta-item"><b>명궁</b>${esc(seed.chart.mingGong || "확인 범위 내")}</div><div class="meta-item"><b>신궁</b>${esc(seed.chart.shenGong || "확인 범위 내")}</div><div class="meta-item"><b>발행일</b>${esc(new Date(generatedAt).toLocaleDateString("ko-KR"))}</div></div>
      <p class="notice">명반의 핵심 흐름을 바탕으로 각 장의 해석을 정교하게 구성했습니다.</p>
    </section>
    <section class="legend"><h2>별 강도 기호</h2><div class="legend-list"><span>◎ 묘: 가장 강하게 드러나는 별</span><span>O 득: 안정적으로 힘을 얻은 별</span><span>▲ 리: 이롭게 활용할 수 있는 별</span><span>△ 평: 균형 관리가 필요한 별</span><span>X 함·실: 보완과 주의가 필요한 별</span></div></section>
    <section class="panel"><h2>12궁 핵심 명반</h2><table class="palace-table"><thead><tr><th>궁</th><th>지지</th><th>주성</th></tr></thead><tbody>${palaceSummary}</tbody></table></section>
    <section class="toc"><h2>목차</h2><ol>${toc}</ol></section>
    ${chapterHtml}
    <section class="footer">이 문서는 자미두수 명반을 바탕으로 작성된 개인 맞춤형 프리미엄 리포트입니다.</section>
  </main>
</body>
</html>`;
}

function buildPdfReadyPayload(profile, seed, chapters, metadata = {}) {
  const html = renderZiweiPdf({ profile, seed, chapters, generatedAt: new Date().toISOString() });
  return {
    title: `${stripForbiddenTokens(profile.name)} 자미두수 프리미엄 리포트`,
    filename: `ziwei-premium-${String(profile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    html,
    chapters: chapters.map((chapter, index) => ({ chapter: index + 1, id: chapter.id, title: chapter.title, categories: chapter.categories, text: chapter.text, source: chapter.source })),
    metadata: {
      ...metadata,
      reportType: "ziwei_book",
      chapterCount: chapters.length,
      generationMode: "llm-only-interpretation",
    },
  };
}

async function handleChapters() {
  return json({ ok: true, serviceKey: ZIWEI_SERVICE_KEY, chapterCount: CHAPTER_BLUEPRINTS.length, chapters: CHAPTER_BLUEPRINTS });
}

async function handlePrepare(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "UNAUTHORIZED", message: "자미두수 PDF 생성을 위해 먼저 로그인해 주세요." }, { status: 401 });
    }
    throw error;
  }

  const body = await readJson(request);
  console.info("[ZiweiPremiumPDF][RequestReceived]", {
    hasBirthInput: Boolean(body?.birthInput),
    hasBirthProfile: Boolean(body?.birthProfile),
    hasZiweiBase: Boolean(body?.ziweiBase || body?.ziweiPdfSeed || body?.chartResult?.reportPayload),
  });
  const normalized = normalizeInput(body);
  if (!normalized.ok) return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: normalized.code || "INVALID_INPUT", message: normalized.message }, { status: 422 });

  const profile = normalized.profile;
  const birthInput = normalized.birthInput;
  console.info("[ZiweiPremiumPDF][BirthInputValidated]", {
    hasBirthDate: Boolean(birthInput.birthDate),
    hasBirthTime: Boolean(birthInput.birthTime),
    birthHour: birthInput.birthHour,
    gender: birthInput.gender,
  });

  const base = getZiweiBase(body);
  if (!base) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "MISSING_ZIWEI_ENGINE_RESULT", message: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요." }, { status: 422 });
  }

  console.info("[ZiweiPremiumPDF][LocalCalculationStart]", { hasBase: true });
  const seed = buildZiweiPdfSeed(profile, base);
  const seedValidation = validateSeed(seed);
  if (!seedValidation.ok) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "ZIWEI_SEED_INVALID", message: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.", missing: seedValidation.errors }, { status: 422 });
  }
  console.info("[ZiweiPremiumPDF][LocalCalculationSuccess]", { palaceCount: seed?.chart?.palaces?.length || 0 });

  const premiumAccessToken = clean(
    request.headers.get("x-premium-access-token")
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || "",
  );
  const featureKey = normalizeFeatureKey(body?.featureKey);

  console.info("[ZiweiBook][Flow] BILLING_CHECK_START", { featureKey, userId: auth.userId });
  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "ziweiPremium", {
    ...body,
    featureKey,
    reportType: "ziweiPremium",
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/ziwei-book",
  });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return json({
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: access?.code || (status === 401 ? "UNAUTHORIZED" : "PAYMENT_REQUIRED"),
      message: status === 401
        ? "자미두수 PDF 생성을 위해 먼저 로그인해 주세요."
        : status === 402
          ? "프리미엄 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다."
          : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    }, { status });
  }
  console.info("[ZiweiBook][Flow] BILLING_CHECK_OK", { featureKey, accessType: clean(access.accessType || "") });

  const executionCtx = buildPremiumExecutionContext({
    serviceKey: ZIWEI_SERVICE_KEY,
    reportType: "ziweiPremium",
    userId: auth.userId,
    featureKey,
    sessionId: clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId),
    reportId: clean(body?.reportId || body?.accessGrant?.reportId),
    access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  await startPremiumPdfExecution(env, auth.userId, executionCtx);

  try {

  console.info("[ZiweiPremiumPDF][LLMOnlyInterpretationStart]", { chapterCount: CHAPTER_BLUEPRINTS.length });
  const completedChapters = await generateZiweiPdfWithLLMOnlyInterpretation({
    env,
    seed,
    chapterSpecs: CHAPTER_BLUEPRINTS,
    sessionId: executionCtx.sessionId,
    onProgress: async ({ currentChapterNo, totalChapters, chapterTitle }) => {
      console.info("[ZiweiPremiumPDF][ChapterCompleted]", {
        currentChapterNo,
        totalChapters,
        chapterTitle,
      });
    },
  });

  const finalValidation = validateZiweiPdfLLMInterpretationQuality({
    chapters: completedChapters,
    expectedChapters: CHAPTER_BLUEPRINTS,
    seed,
  });
  if (!finalValidation.ok) {
    throw new Error(`ziwei_quality_validation_failed:${finalValidation.errors.join(",")}`);
  }

  const duplicateRate = computeDuplicateRate(completedChapters);
  const finalBundleValidation = validateFinalManuscript({ birthInput, seed, chapters: completedChapters });
  if (!finalBundleValidation.ok) {
    throw new Error(`ziwei_bundle_validation_failed:${finalBundleValidation.errors.join(",")}`);
  }

  console.info("[ZiweiPremiumPDF][FinalManuscriptValidated]", {
    chapterCount: completedChapters.length,
    totalChars: finalValidation.totalChars,
    duplicateRate,
    ok: finalValidation.ok,
    hasBirthDate: Boolean(birthInput.birthDate),
    hasBirthTime: Boolean(birthInput.birthTime),
    birthHour: birthInput.birthHour,
    hasMingGong: Boolean(seed.chart.mingGong),
    hasShenGong: Boolean(seed.chart.shenGong),
    palaceCount: Array.isArray(seed.chart.palaces) ? seed.chart.palaces.length : 0,
  });

  console.info("[ZiweiPremiumPDF][PdfRenderStart]", { chapterCount: completedChapters.length, fallbackUsed: false });
  const ziweiPayload = buildZiweiPayload(profile, seed, completedChapters, { accessType: clean(access.accessType || "unknown") });
  const pdfReady = buildPdfReadyPayload(profile, seed, completedChapters, { featureKey, reportType: "ziweiPremium", fallbackUsed: false });
  console.info("[ZiweiPremiumPDF][PdfRenderSuccess]", { chapterCount: completedChapters.length });

  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `ziwei-premium-${Date.now().toString(36)}`);
  await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
    manuscriptSource: "llm-only",
    chapterCount: completedChapters.length,
    archive: {
      reportId,
      reportType: "ziwei_book",
      displayName: "자미두수",
      title: `${clean(profile?.name) || "사용자"}님의 자미두수 리포트`,
      mode: "personal",
      birthName: clean(profile?.name),
      summary: clean(completedChapters?.[0]?.categories?.[0]?.finalText || "", 1000),
      pdfUrl: clean(pdfReady?.pdfUrl),
      pdfStorageKey: clean(pdfReady?.pdfStorageKey),
      chapters: completedChapters,
      payload: ziweiPayload,
      pdfReady,
      canReopen: true,
      canDownload: Boolean(clean(pdfReady?.pdfUrl)),
    },
  });

  return json({
    ok: true,
    serviceKey: ZIWEI_SERVICE_KEY,
    featureKey,
    reportId,
    sessionId: executionCtx.sessionId || clean(body?.sessionId || body?.reportSessionId || ""),
    chapterCount: CHAPTER_BLUEPRINTS.length,
    chapters: completedChapters,
    payload: ziweiPayload,
    ziweiPayload,
    ziweiPdfSeed: seed.ziweiPdfSeed,
    pdfReady,
    fallbackUsed: false,
    localDraftChapterCount: 0,
    finalChapterCount: completedChapters.length,
  });
  } catch (error) {
    await failPremiumPdfExecution(
      env,
      auth.userId,
      executionCtx,
      "ziwei_generation_failed",
      clean(error?.message || "자미두수 PDF 생성에 실패했습니다."),
      "ziwei-generation",
    );
    throw error;
  }
}

export async function handleZiweiBookRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/ziwei-book");
    if (method === "GET" && (path === "/chapters" || path === "chapters")) return await handleChapters();
    if (method === "POST" && (path === "" || path === "/" || path === "/prepare" || path === "prepare")) return await handlePrepare(request, env);
    if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, message: "지원하지 않는 자미두수 PDF 경로입니다." }, { status: 404 });
  } catch (error) {
    console.error("[ZiweiPremiumPDF][Error]", normalizeZiweiError(error));
    return handleRouteError(error, "ZiweiBookRoutes");
  }
}

export const __ziweiBookTestUtils = {
  CHAPTER_BLUEPRINTS,
  buildZiweiPdfSeed,
  validateZiweiPdfLLMInterpretationQuality,
  validateChapters,
  normalizeInput,
  parseHourMinuteFromText,
  computeDuplicateRate,
};