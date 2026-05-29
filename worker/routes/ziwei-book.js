import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";

const ZIWEI_SERVICE_KEY = "ziwei-book";
const ZIWEI_FEATURE_KEY = "premium_pdf_ziwei";
const ZIWEI_FEATURE_ALIASES = new Set(["premium-ziwei-report", "premium_pdf_ziwei"]);
const CHAPTER_MIN_CHARS = 2000;
const SECTION_MIN_CHARS = 500;
const TOTAL_MIN_CHARS = 25000;

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
    title: "Chapter 1. 명궁 완전 해독 — 타고난 나의 중심 별",
    categories: ["명궁의 주성 구조", "내가 세상에 드러나는 방식", "성격의 핵심 장점과 약점", "명궁 별 강도에 따른 인생 전략"],
  },
  {
    id: "02",
    roman: "II",
    palaceKey: "body",
    title: "Chapter 2. 신궁 심층 분석 — 후천적으로 완성되는 나",
    categories: ["신궁이 보여주는 후천적 변화", "나이가 들수록 강해지는 성향", "명궁과 신궁의 조화 또는 충돌", "인생 후반부의 핵심 방향"],
  },
  {
    id: "03",
    roman: "III",
    palaceKey: "siblings",
    title: "Chapter 3. 형제궁과 인간관계 — 가까운 사람들과의 거리",
    categories: ["형제·동료·친구 관계의 기본 구조", "협력과 경쟁의 패턴", "가까운 사람에게서 받는 도움과 부담", "인간관계에서 지켜야 할 경계선"],
  },
  {
    id: "04",
    roman: "IV",
    palaceKey: "spouse",
    title: "Chapter 4. 부부궁 — 사랑, 결혼, 깊은 인연의 방식",
    categories: ["연애와 결혼에서 끌리는 인연", "배우자상과 관계의 핵심 성향", "갈등이 생기는 지점", "좋은 관계를 유지하는 현실적 조언"],
  },
  {
    id: "05",
    roman: "V",
    palaceKey: "children",
    title: "Chapter 5. 자녀궁 — 창조성, 표현력, 이어지는 운",
    categories: ["자녀운과 후대운의 흐름", "창작력과 표현력", "내가 남기는 영향력", "돌봄과 책임의 균형"],
  },
  {
    id: "06",
    roman: "VI",
    palaceKey: "wealth",
    title: "Chapter 6. 재백궁 — 돈, 자산, 현실 감각",
    categories: ["돈을 버는 방식", "재물운의 강점과 약점", "투자·소비·저축 성향", "재물 흐름을 안정시키는 전략"],
  },
  {
    id: "07",
    roman: "VII",
    palaceKey: "health",
    title: "Chapter 7. 질액궁 — 몸과 마음의 취약 지점",
    categories: ["체력과 건강 리듬", "스트레스가 쌓이는 방식", "마음의 불균형이 나타나는 패턴", "생활 습관 개선 조언"],
  },
  {
    id: "08",
    roman: "VIII",
    palaceKey: "travel",
    title: "Chapter 8. 천이궁 — 세상 밖에서 열리는 기회",
    categories: ["이동운과 외부 활동운", "낯선 환경에서 드러나는 능력", "귀인과 기회가 들어오는 방식", "외부 세계를 활용하는 전략"],
  },
  {
    id: "09",
    roman: "IX",
    palaceKey: "friends",
    title: "Chapter 9. 노복궁 — 사람을 얻고 쓰는 힘",
    categories: ["주변 사람과의 협력운", "부하·동료·조력자와의 관계", "사람 때문에 생기는 기회와 손실", "인맥을 운으로 바꾸는 법"],
  },
  {
    id: "10",
    roman: "X",
    palaceKey: "career",
    title: "Chapter 10. 관록궁 — 직업, 명예, 사회적 성취",
    categories: ["직업적 재능과 일의 방식", "사회적 인정과 명예운", "조직 안에서의 위치", "성공을 만드는 커리어 전략"],
  },
  {
    id: "11",
    roman: "XI",
    palaceKey: "property",
    title: "Chapter 11. 전택궁 — 집, 기반, 축적되는 복",
    categories: ["부동산과 생활 기반", "가정환경과 안정감", "쌓이는 자산과 물질적 기반", "오래 지켜야 할 삶의 터전"],
  },
  {
    id: "12",
    roman: "XII",
    palaceKey: "fortune",
    title: "Chapter 12. 복덕궁 — 행복, 내면, 영혼의 쉼터",
    categories: ["마음의 만족과 행복 조건", "혼자 있을 때 회복되는 방식", "정신적 안정과 취미의 방향", "삶의 질을 높이는 조언"],
  },
  {
    id: "13",
    roman: "XIII",
    palaceKey: "timing",
    title: "Chapter 13. 대운·유년 종합 전략 — 앞으로 열리는 운의 지도",
    categories: ["현재 대운의 핵심 흐름", "가까운 유년운의 기회와 주의점", "인생 전환점에서의 선택 기준", "앞으로의 3년 실전 전략"],
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

const FORBIDDEN_TEXT = ["payload", "raw json", "json", "debug", "engine", "자동 복구 생성", "localdraft", "fallback"];

function clean(value) {
  return String(value == null ? "" : value).trim();
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
  if (/묘|왕|廟|旺/.test(n)) return "◎";
  if (/득|得/.test(n)) return "O";
  if (/리|利|약/.test(n)) return "▲";
  if (/평|平/.test(n)) return "△";
  if (/함|실|陷|불|쇠/.test(n)) return "X";
  return "△";
}

function normalizeStrengthName(value) {
  const raw = clean(value);
  if (/묘|왕|廟|旺|◎/.test(raw)) return "묘";
  if (/득|得|○|O/.test(raw)) return "득";
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
    body.birthDate,
    bp.birthDate,
    birth.birthDate,
    birth.solarDate,
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
    return { ok: false, code: "BIRTH_TIME_REQUIRED", message: "자미두수 프리미엄 PDF는 태어난 시간 정보가 필요합니다. 프로필 카드에서 출생 시간을 먼저 입력해 주세요." };
  }

  const gender = normalizeGender(pickNonEmpty(input.gender, body.gender, bp.gender, birth.gender));
  const calendarType = normalizeCalendarType(pickNonEmpty(input.calendarType, body.calendarType, bp.calendarType, birth.calType, birth.calendarType));

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

function findPalace(seed, key) {
  const palaces = Array.isArray(seed?.palaces)
    ? seed.palaces
    : (Array.isArray(seed?.chart?.palaces) ? seed.chart.palaces : []);
  if (key === "body") {
    return seed.bodyPalace || palaces.find((p) => p.key === "body") || palaces.find((p) => p.branch && p.branch === seed.chart.shenGong) || seed.lifePalace;
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

function palaceEvidenceText(seed, palace) {
  if (!palace) return "현재 계산된 명반에서 확인되는 범위에서는 이 궁의 세부 별 배치를 보수적으로 해석합니다.";
  const main = starsText(palace.mainStars);
  const aux = starsText(palace.auxStars);
  const malefic = starsText(palace.maleficStars);
  const trans = Array.isArray(palace.transformations) && palace.transformations.length
    ? palace.transformations.map((t) => `${clean(t.star)} ${clean(t.type || t.label)}`.trim()).filter(Boolean).join(", ")
    : "사화 직접 작동은 약하게 확인됩니다";
  return `${palace.nameKo || "해당 궁"}(${palace.branch || "지지 미확인"})의 주성은 ${main}입니다. 보조성은 ${aux}, 살성·압박 신호는 ${malefic}로 정리되며, 사화 흐름은 ${trans}로 읽습니다.`;
}

function timingEvidenceText(seed) {
  const current = seed.chart.decadeLuck.find((item) => item && (item.current || item.isCurrent)) || seed.chart.decadeLuck[0] || null;
  const decade = current ? `${clean(current.label || current.range || "대운")}` : "현재 대운 세부 범위는 제한적으로 확인됩니다";
  const sihua = seed.chart.transformations.length
    ? seed.chart.transformations.map((item) => `${clean(item.star)} ${clean(item.type)}`).filter(Boolean).join(", ")
    : "사화 자료는 기본 명반 범위에서만 확인됩니다";
  return `대운 기준은 ${decade}이며, 가까운 흐름은 ${sihua}를 중심으로 현실 선택의 우선순위를 정리합니다.`;
}

function collectSignals(seed, palace) {
  const usedStars = [];
  const usedSignals = [];
  const mainStars = normalizeStarList(palace?.mainStars || []);
  const auxStars = normalizeStarList(palace?.auxStars || []);
  const maleficStars = normalizeStarList(palace?.maleficStars || []);

  for (const star of [...mainStars, ...auxStars, ...maleficStars]) {
    if (!usedStars.includes(star.name)) usedStars.push(star.name);
    const signal = `${star.name}${star.strengthSymbol}`;
    if (!usedSignals.includes(signal)) usedSignals.push(signal);
  }

  if (Array.isArray(palace?.transformations)) {
    for (const tf of palace.transformations) {
      const token = `${clean(tf?.star)} ${clean(tf?.type || tf?.label)}`.trim();
      if (token && !usedSignals.includes(token)) usedSignals.push(token);
    }
  }
  return { usedStars, usedSignals };
}

function buildCategoryText(profile, seed, blueprint, categoryTitle, categoryIndex, pass = 1) {
  const palace = findPalace(seed, blueprint.palaceKey);
  const evidence = blueprint.palaceKey === "timing" ? timingEvidenceText(seed) : palaceEvidenceText(seed, palace);
  const label = blueprint.palaceKey === "timing" ? "대운·유년" : (palace?.nameKo || PALACE_LABELS[blueprint.palaceKey] || "해당 궁");
  const signals = collectSignals(seed, palace);
  const focusedStars = signals.usedStars.slice(0, 4).join(", ") || "핵심 별 신호";
  const focusedSignal = signals.usedSignals.slice(0, 5).join(", ") || "궁간 상호작용";
  const strengthGuide = `${categoryTitle} 해석에서는 ${label}의 별 강도를 묘 ◎, 득 O, 리 ▲, 평 △, 함·실 X 순서로 읽되, ${focusedStars}의 조합을 실행 우선순위로 연결하는 방식이 가장 현실적입니다.`;
  const practical = [
    `이번 장에서는 ${label}의 구조를 ${focusedStars}의 배치와 ${focusedSignal}의 작동 축으로 읽어야 실제 선택이 선명해집니다.`,
    `${categoryTitle}를 해석할 때 가장 중요한 지점은 단기 성과보다 반복 가능한 리듬을 먼저 고정하는 일입니다. 같은 별 조합이라도 실행 순서가 바뀌면 결과의 질이 달라지기 때문입니다.`,
    `${profile.name}님의 경우 ${label}에서 드러나는 기회 신호는 즉시 확장보다 기준 확립에서 더 크게 살아납니다. 협업, 재정, 루틴을 동시에 다루기보다 주당 핵심 항목을 두세 개로 압축하면 체감 성과가 분명해집니다.`,
    `${categoryTitle}에서는 강한 별을 추진력으로 쓰되, 약한 별은 ${label} 기준의 복구 규칙으로 관리해야 손실이 줄어듭니다. 일정 지연, 감정 피로, 관계 소모를 초기에 감지하도록 경보 조건을 만들면 운의 파동이 커져도 균형을 지킬 수 있습니다.`,
    `실행 전략은 "분석-결정-실행-복기"의 4단계를 짧게 순환하는 방식이 좋습니다. 특히 ${categoryTitle}에서는 매주 같은 시간에 의사결정 로그를 남기면 별 신호가 행동으로 번역되고, 모호했던 고민이 다음 선택의 기준으로 축적됩니다.`,
  ];
  const focus = categoryIndex % 2 === 0
    ? `${categoryTitle}에서는 빠른 확장보다 안정적인 반복 구조가 유리하며, ${label}에서 포착된 신호를 월 단위 점검 항목으로 고정하면 변동 구간의 손실을 줄일 수 있습니다.`
    : `${categoryTitle}에서는 관계와 일의 경계를 먼저 설계해야 하며, ${label}의 신호를 기준으로 부탁 수락 조건과 거절 문장을 미리 정해두면 에너지 누수를 줄일 수 있습니다.`;
  const passBonus = pass > 1
    ? `${categoryTitle}의 핵심 별 신호를 월 단위 운영 계획으로 내려서 관리하면, 대운·세운의 변동 구간에서도 시행착오를 크게 줄일 수 있습니다. 중요한 것은 거창한 결단이 아니라 작은 원칙을 반복해 구조적 우위를 만드는 것입니다.`
    : "";
  return stripForbiddenTokens(`이 절은 ${categoryTitle} 실행 전략을 ${label} 데이터에 맞춰 구체화한 안내입니다.\n\n${evidence}\n\n${strengthGuide}\n\n${practical.join("\n\n")}\n\n${focus}\n\n${passBonus}`);
}

function buildZiweiLocalPremiumManuscript(profile, seed, pass = 1) {
  return CHAPTER_BLUEPRINTS.map((blueprint, chapterIndex) => {
    const palace = findPalace(seed, blueprint.palaceKey);
    const signals = collectSignals(seed, palace);
    const sections = blueprint.categories.map((categoryTitle, index) => {
      const body = buildCategoryText(profile, seed, blueprint, categoryTitle, index, pass);
      return {
        title: categoryTitle,
        body,
        bullets: [
          `${categoryTitle}의 핵심 별 신호: ${(signals.usedSignals.slice(0, 4).join(", ") || "기본 명반 신호")}`,
          `실행 기준: ${(signals.usedStars.slice(0, 3).join(", ") || "핵심 별") + " 중심으로 우선순위 설정"}`,
          "실전 루틴: 주간 복기와 월간 재정렬로 변동성 관리",
        ],
      };
    });
    return {
      chapterNo: chapterIndex + 1,
      title: blueprint.title,
      subtitle: `${PALACE_LABELS[blueprint.palaceKey] || "핵심 궁"} 중심 해석`,
      sections,
      localQuality: {
        minLengthPassed: sections.every((section) => stripForbiddenTokens(section.body).length >= SECTION_MIN_CHARS),
        usedPalaces: [palace?.nameKo || PALACE_LABELS[blueprint.palaceKey] || ""].filter(Boolean),
        usedStars: signals.usedStars,
        usedSignals: signals.usedSignals,
      },
    };
  });
}

function draftToChapter(draft, blueprint, source = "local") {
  const categories = (Array.isArray(draft.sections) ? draft.sections : []).map((section, index) => ({
    id: `${blueprint.id}-${String(index + 1).padStart(2, "0")}`,
    title: section.title,
    localSummary: section.body,
    finalText: section.body,
    order: index + 1,
  }));
  return {
    id: blueprint.id,
    roman: blueprint.roman,
    title: draft.title,
    categories,
    finalText: categories.map((c) => `### ${c.title}\n\n${c.finalText}`).join("\n\n"),
    text: categories.map((c) => `### ${c.title}\n\n${c.finalText}`).join("\n\n"),
    source,
    localQuality: draft.localQuality,
  };
}

function buildLocalChapters(profile, seed, pass = 1) {
  const drafts = buildZiweiLocalPremiumManuscript(profile, seed, pass);
  const chapters = drafts.map((draft, index) => draftToChapter(draft, CHAPTER_BLUEPRINTS[index], pass > 1 ? "local-reinforced" : "local-skeleton"));
  return { drafts, chapters };
}

function parseJsonMaybe(text) {
  const raw = clean(text).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

function mergeLlmChapter(localChapter, llmJson) {
  const source = llmJson?.chapter && typeof llmJson.chapter === "object" ? llmJson.chapter : llmJson;
  const incoming = Array.isArray(source?.categories) ? source.categories : [];
  if (!incoming.length) return { ...localChapter, source: "local" };
  const categories = localChapter.categories.map((category, index) => {
    const matched = incoming.find((item) => clean(item?.title) === category.title || clean(item?.id) === category.id) || incoming[index] || {};
    const finalText = stripForbiddenTokens(matched.finalText || matched.text || matched.body || category.finalText);
    return { ...category, finalText: finalText || category.finalText, llmEnhancedText: finalText || "" };
  });
  return {
    ...localChapter,
    categories,
    finalText: categories.map((c) => `### ${c.title}\n\n${c.finalText}`).join("\n\n"),
    text: categories.map((c) => `### ${c.title}\n\n${c.finalText}`).join("\n\n"),
    source: "llm",
  };
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

async function enhanceChaptersWithLlm(env, profile, seed, localChapters) {
  const chapters = [];
  let fallbackUsed = false;
  for (let i = 0; i < localChapters.length; i += 1) {
    const chapter = localChapters[i];
    console.info("[ZiweiPremiumPDF][LLMEnhanceStart]", { chapter: i + 1, categoryCount: Array.isArray(chapter.categories) ? chapter.categories.length : 0 });
    const prompt = [
      "너는 자미두수 계산을 새로 하지 않는다.",
      "이미 제공된 localZiweiJson과 localChapterDraft만 사용한다.",
      "챕터 수, 챕터 제목, 세부 섹션 제목을 절대 변경하지 않는다.",
      "PDF 본문에 JSON, payload, debug, fallback, 자동 복구 생성이라는 표현을 출력하지 않는다.",
      "각 섹션은 실제 명반 데이터에 근거한 상담문으로 작성한다.",
      "동일 문장 반복을 금지한다.",
      "각 세부 카테고리는 기존 의미를 유지하면서 문장 밀도만 높인다.",
      "반드시 JSON 객체 하나만 반환하세요. 형식: {\"chapter\":{\"title\":string,\"categories\":[{\"title\":string,\"finalText\":string}]}}",
      `프로필: ${JSON.stringify({ gender: profile.gender, birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`, birthTime: `${pad2(profile.hour)}:${pad2(profile.minute)}` })}`,
      `localZiweiJson: ${JSON.stringify({ chart: seed.chart, legend: seed.strengthLegend })}`,
      `localChapterDraft: ${JSON.stringify(chapter)}`,
    ].join("\n");
    try {
      const result = await callGeminiText(env, prompt, {
        keyEnvKeys: ["ZIWEI_GEMINI_API_KEY"],
        modelEnvKeys: ["ZIWEI_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL"],
        temperature: 0.55,
        maxOutputTokens: 4096,
        timeoutMs: Number(env.ZIWEI_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 45000),
        totalTimeoutMs: Number(env.ZIWEI_GEMINI_TOTAL_TIMEOUT_MS || 90000),
        maxAttemptsPerPair: Number(env.ZIWEI_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 4),
      });
      const parsed = result?.ok ? parseJsonMaybe(result.text) : null;
      const merged = parsed ? mergeLlmChapter(chapter, parsed) : { ...chapter, source: "local" };
      if (!parsed) fallbackUsed = true;
      chapters.push(merged);
      if (merged.source === "llm") {
        console.info("[ZiweiPremiumPDF][LLMEnhanceSuccess]", { chapter: i + 1, source: merged.source });
      } else {
        console.warn("[ZiweiPremiumPDF][LLMEnhanceFailedUseLocal]", { chapter: i + 1, reason: "parse_or_empty" });
      }
    } catch (error) {
      fallbackUsed = true;
      chapters.push({ ...chapter, source: "local" });
      console.warn("[ZiweiPremiumPDF][LLMEnhanceFailedUseLocal]", { chapter: i + 1, message: clean(error?.message || error) });
    }
  }
  return { chapters, fallbackUsed };
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
    interpretationSeeds: {
      personality: [palaceEvidenceText(seed, seed.lifePalace)],
      relationship: [palaceEvidenceText(seed, findPalace(seed, "spouse"))],
      career: [palaceEvidenceText(seed, findPalace(seed, "career"))],
      wealth: [palaceEvidenceText(seed, findPalace(seed, "wealth"))],
      health: [palaceEvidenceText(seed, findPalace(seed, "health"))],
      happiness: [palaceEvidenceText(seed, findPalace(seed, "fortune"))],
      timing: [timingEvidenceText(seed)],
    },
    chapters,
    metadata: { featureKey: ZIWEI_FEATURE_KEY, ...metadata },
  };
}

function renderZiweiPdf({ profile, seed, chapters, generatedAt, fallbackUsed }) {
  const toc = chapters.map((chapter) => `<li><span>${esc(chapter.roman)}</span><strong>${esc(chapter.title)}</strong></li>`).join("\n");
  const palaceSummary = seed.chart.palaces.slice(0, 12).map((p) => `<tr><td>${esc(p.nameKo)}</td><td>${esc(p.branch)}</td><td>${esc(starsText(p.mainStars))}</td></tr>`).join("\n");
  const chapterHtml = chapters.map((chapter, index) => {
    const categoryHtml = chapter.categories.map((category) => `<section class="zb-category"><h3>${esc(category.title)}</h3><p>${esc(category.finalText)}</p></section>`).join("\n");
    return `<article class="zb-chapter"><div class="zb-eyebrow">${esc(chapter.roman)} · 제 ${index + 1}장</div><h2>${esc(chapter.title)}</h2>${categoryHtml}</article>`;
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
      <p class="notice">${fallbackUsed ? "일부 해석은 기본 명반 해석으로 생성되었습니다." : "계산된 명반을 바탕으로 상담문을 보강했습니다."}</p>
    </section>
    <section class="legend"><h2>별 강도 기호</h2><div class="legend-list"><span>◎ 묘: 가장 강하게 드러나는 별</span><span>O 득: 안정적으로 힘을 얻은 별</span><span>▲ 리: 이롭게 활용할 수 있는 별</span><span>△ 평: 균형 관리가 필요한 별</span><span>X 함·실: 보완과 주의가 필요한 별</span></div></section>
    <section class="panel"><h2>12궁 핵심 명반</h2><table class="palace-table"><thead><tr><th>궁</th><th>지지</th><th>주성</th></tr></thead><tbody>${palaceSummary}</tbody></table></section>
    <section class="toc"><h2>목차</h2><ol>${toc}</ol></section>
    ${chapterHtml}
    <section class="footer">이 문서는 로컬 자미두수 명반 계산 결과와 프리미엄 상담문 보강을 바탕으로 작성되었습니다.</section>
  </main>
</body>
</html>`;
}

function buildPdfReadyPayload(profile, seed, chapters, metadata = {}) {
  const html = renderZiweiPdf({ profile, seed, chapters, generatedAt: new Date().toISOString(), fallbackUsed: Boolean(metadata.fallbackUsed) });
  return {
    title: `${stripForbiddenTokens(profile.name)} 자미두수 프리미엄 리포트`,
    filename: `ziwei-premium-${String(profile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    html,
    chapters: chapters.map((chapter, index) => ({ chapter: index + 1, id: chapter.id, title: chapter.title, categories: chapter.categories, text: chapter.text, source: chapter.source })),
    metadata,
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

  console.info("[ZiweiPremiumPDF][LocalDraftBuildStart]", { chapterCount: CHAPTER_BLUEPRINTS.length });
  const firstPass = buildLocalChapters(profile, seed, 1);
  const firstValidation = validateChapters(firstPass.chapters);
  const localBundle = firstValidation.ok ? firstPass : buildLocalChapters(profile, seed, 2);
  let localChapters = localBundle.chapters;
  const localValidation = validateChapters(localChapters);
  if (!localValidation.ok) {
    localChapters = buildLocalChapters(profile, seed, 3).chapters;
  }
  const localMetrics = validateChapters(localChapters);
  console.info("[ZiweiPremiumPDF][LocalDraftBuildSuccess]", {
    chapterCount: localChapters.length,
    totalChars: localMetrics.totalChars,
    localDraftValid: localMetrics.ok,
  });

  const enhanced = await enhanceChaptersWithLlm(env, profile, seed, localChapters);
  let completedChapters = enhanced.chapters;
  let fallbackUsed = Boolean(enhanced.fallbackUsed);
  const validation = validateChapters(completedChapters);
  const duplicateRate = computeDuplicateRate(completedChapters);
  if (!validation.ok || duplicateRate > 0.4) {
    fallbackUsed = true;
    completedChapters = localChapters.map((chapter) => ({ ...chapter, source: "local" }));
  }
  const finalValidation = validateChapters(completedChapters);
  console.info("[ZiweiPremiumPDF][FinalManuscriptValidated]", {
    chapterCount: completedChapters.length,
    totalChars: finalValidation.totalChars,
    duplicateRate,
    ok: finalValidation.ok,
  });

  console.info("[ZiweiPremiumPDF][PdfRenderStart]", { chapterCount: completedChapters.length, fallbackUsed });
  const ziweiPayload = buildZiweiPayload(profile, seed, completedChapters, { accessType: clean(access.accessType || "unknown") });
  const pdfReady = buildPdfReadyPayload(profile, seed, completedChapters, { featureKey, reportType: "ziweiPremium", fallbackUsed });
  console.info("[ZiweiPremiumPDF][PdfRenderSuccess]", { chapterCount: completedChapters.length });

  return json({
    ok: true,
    serviceKey: ZIWEI_SERVICE_KEY,
    featureKey,
    chapterCount: CHAPTER_BLUEPRINTS.length,
    chapters: completedChapters,
    payload: ziweiPayload,
    ziweiPayload,
    pdfReady,
    fallbackUsed,
  });
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
    console.error("[ZiweiBook][Error]", { message: clean(error?.message || error) });
    return handleRouteError(error, "ZiweiBookRoutes");
  }
}

export const __ziweiBookTestUtils = {
  CHAPTER_BLUEPRINTS,
  buildZiweiPdfSeed,
  buildLocalChapters,
  validateChapters,
  normalizeInput,
  parseHourMinuteFromText,
  buildZiweiLocalPremiumManuscript,
  computeDuplicateRate,
};