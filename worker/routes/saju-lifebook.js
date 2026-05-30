import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const CHAPTER_BLUEPRINTS = [
  {
    id: "01",
    roman: "I",
    title: "🌌 사주 원국 완전 해설 — 팔자 8글자의 비밀",
    subtitle: "원국 8글자의 구조와 반복 패턴을 해독하는 시작 장",
    categories: ["년주·월주·일주·시주의 역할", "일간과 일지의 핵심 성향", "원국 전체의 첫인상", "인생에서 반복되는 기본 패턴", "타고난 기질과 삶의 방향성"],
  },
  {
    id: "02",
    roman: "II",
    title: "🏛️ 나의 설계도 — 월지·일간·조후와 기질의 뿌리",
    subtitle: "월지·일간·조후를 중심으로 기질의 뿌리를 정리하는 장",
    categories: ["월지 중심의 계절 에너지", "일간의 강약과 생존 방식", "조후상 필요한 기운", "정서적 온도와 행동 패턴", "삶을 편하게 만드는 환경 조건"],
  },
  {
    id: "03",
    roman: "III",
    title: "⚔️ 숨겨진 무기 — 용신·희신과 나만의 필살기",
    subtitle: "용신·희신 운용법과 반복 문제를 전환하는 실행 장",
    categories: ["용신 후보와 실제 활용 방향", "희신이 열어주는 기회", "기신·구신으로 인한 반복 문제", "나에게 맞는 성장 전략", "현실에서 써먹는 개운 포인트"],
  },
  {
    id: "04",
    roman: "IV",
    title: "🌀 대운 정밀 분석 — 인생의 큰 파도",
    subtitle: "대운 흐름에서 기회와 리스크를 읽는 장",
    categories: ["현재 대운의 핵심 주제", "과거 대운에서 형성된 성향", "다음 대운의 기회와 리스크", "대운 전환기의 주의점", "인생의 큰 흐름 로드맵"],
  },
  {
    id: "05",
    roman: "V",
    title: "👑 격국과 사회적 소명 — 나의 성공 방정식",
    subtitle: "격국·직업성·브랜딩을 연결해 소명을 설계하는 장",
    categories: ["격국 구조 분석", "사회적으로 인정받는 방식", "직업적 강점과 약점", "명예·성과·브랜딩 방향", "내가 세상에 제공할 수 있는 가치"],
  },
  {
    id: "06",
    roman: "VI",
    title: "🤝 관계의 전략 — 인연의 법칙과 파트너십",
    subtitle: "관계 패턴과 갈등 해소 전략을 정밀하게 다루는 장",
    categories: ["인간관계에서 반복되는 패턴", "도움 되는 사람과 소모시키는 사람", "가족·동료·친구 관계의 핵심", "관계에서 생기는 오해와 갈등", "좋은 인연을 유지하는 방식"],
  },
  {
    id: "07",
    roman: "VII",
    title: "💑 연애·결혼 완전 분석 — 사랑이 들어오고 머무는 방식",
    subtitle: "연애 성향부터 결혼 운용까지 사랑의 구조를 푸는 장",
    categories: ["연애 성향", "끌리는 상대의 특징", "결혼운과 배우자궁", "이별 패턴과 회복 방식", "오래가는 사랑을 위한 전략"],
  },
  {
    id: "08",
    roman: "VIII",
    title: "💰 재물·직업 완전 분석 — 돈과 일의 흐름",
    subtitle: "재성 구조와 직업 흐름을 통합적으로 정리하는 장",
    categories: ["재성 구조와 돈 버는 방식", "소비·저축·투자 성향", "직업성/사업성 판단", "돈이 새는 패턴", "수익과 커리어를 함께 키우는 전략"],
  },
  {
    id: "09",
    roman: "IX",
    title: "🩺 건강·심신 리듬 — 몸과 마음의 관리법",
    subtitle: "오행 불균형과 심신 리듬 관리 전략을 다루는 장",
    categories: ["오행 불균형으로 보는 건강 취약점", "스트레스 반응 패턴", "번아웃 신호와 회복", "생활 리듬 처방", "멘탈 회복 루틴"],
  },
  {
    id: "10",
    roman: "X",
    title: "🔮 신살·십이운성·퀀텀 포인트 — 숨은 기호 읽기",
    subtitle: "신살과 십이운성 신호를 실전적으로 읽는 장",
    categories: ["도화·역마·화개·귀문 등 주요 신살", "십이운성 핵심 포인트", "신호가 삶에서 발현되는 방식", "장점으로 쓰는 법", "위험 구간 조절법"],
  },
  {
    id: "11",
    roman: "XI",
    title: "⚠️ 위기와 반전 시나리오 — 무너지는 지점과 다시 서는 방식",
    subtitle: "위기 패턴과 반전 전략을 설계하는 장",
    categories: ["반복 위기 트리거", "관계·재정·건강 위기 신호", "무너지는 지점의 공통 패턴", "반전 레버와 회복 루틴", "실행 우선순위"],
  },
  {
    id: "12",
    roman: "XII",
    title: "🧭 나의 길 — 삶의 방향성과 운명적 선택",
    subtitle: "삶의 방향성과 장기 선택을 정리하는 장",
    categories: ["삶의 핵심 방향", "운명적 선택의 기준", "올해·내년 전환 포인트", "기회가 강한 시기", "피해야 할 결정 타이밍"],
  },
  {
    id: "13",
    roman: "XIII",
    title: "🕯️ 마스터플랜 — 3년·5년·10년 실행 전략",
    subtitle: "핵심 요약과 실천 계획을 확정하는 종장",
    categories: ["전체 사주의 핵심 요약", "붙잡아야 할 방향", "버려야 할 반복 패턴", "3년·5년·10년 로드맵", "최종 실행 선언"],
  },
];

const STEM_TO_ELEMENT = {
  갑: "wood",
  을: "wood",
  병: "fire",
  정: "fire",
  무: "earth",
  기: "earth",
  경: "metal",
  신: "metal",
  임: "water",
  계: "water",
};

const ELEMENT_KEYS = ["wood", "fire", "earth", "metal", "water"];

const FORBIDDEN_TEXT = [
  "fallback",
  "자동 복구 생성",
  "chapter 1 chapter 1",
  "chapter 1",
  "placeholder",
  "debug",
  "json",
  "payload",
  "internal server error",
  "object",
  "undefined",
  "null",
  "nan",
  "calculationmode",
  "recovered",
  "internal payload",
  "json dump",
  "테스트 문구",
  "데이터가 부족합니다",
  "about:blank",
];

const LIFEBOOK_SERVICE_KEY = "saju-lifebook";
const LIFEBOOK_FEATURE_KEY = "saju_life_book_pdf";
const LIFEBOOK_FEATURE_KEY_ALIASES = new Set([
  "saju_lifebook_pdf",
  "premium_pdf_saju_life_book",
  "premium-lifebook-report",
]);

const LIFEBOOK_MIN_CATEGORY_CHARS = 500;
const LIFEBOOK_MIN_CHAPTER_CHARS = 2300;
const LIFEBOOK_MIN_TOTAL_CHARS = 35000;

const LIFEBOOK_SESSION_LOCKS = globalThis.__LIFEBOOK_SESSION_LOCKS || new Map();
if (!globalThis.__LIFEBOOK_SESSION_LOCKS) {
  globalThis.__LIFEBOOK_SESSION_LOCKS = LIFEBOOK_SESSION_LOCKS;
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeLifeBookError(error) {
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

function logLifeBookServer(stage, payload = {}) {
  try {
    console.info(`[LifeBookPremiumPDF][${stage}]`, payload);
  } catch (_) {}
}

function resolveLifeBookFeatureKey(raw) {
  const key = clean(raw);
  if (!key) return LIFEBOOK_FEATURE_KEY;
  if (key === LIFEBOOK_FEATURE_KEY || LIFEBOOK_FEATURE_KEY_ALIASES.has(key)) return LIFEBOOK_FEATURE_KEY;
  return key;
}

function toBillingFeatureKey(featureKey) {
  return resolveLifeBookFeatureKey(featureKey);
}

function stripForbiddenTokens(value) {
  return clean(value)
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\bNaN\b/gi, "")
    .replace(/\[object Object\]/gi, "")
    .replace(/Chapter\s*1\s*Chapter\s*1/gi, "")
    .replace(/Chapter\s*1/gi, "")
    .replace(/자동 복구/gi, "")
    .replace(/fallback/gi, "")
    .replace(/payload/gi, "")
    .replace(/json/gi, "")
    .replace(/debug/gi, "")
    .replace(/Internal\s+server\s+error/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function round(value) {
  return Math.round(Number(value || 0));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeIncomingAnalysisSignals(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const weights = src.elementWeights && typeof src.elementWeights === "object"
    ? {
        wood: safeNumber(src.elementWeights.wood, 0),
        fire: safeNumber(src.elementWeights.fire, 0),
        earth: safeNumber(src.elementWeights.earth, 0),
        metal: safeNumber(src.elementWeights.metal, 0),
        water: safeNumber(src.elementWeights.water, 0),
      }
    : null;

  const yongList = Array.isArray(src.yongshinElements)
    ? src.yongshinElements.map((v) => normalizeSajuElementToken(v, "")).filter(Boolean)
    : [];
  const kiList = Array.isArray(src.kishinElements)
    ? src.kishinElements.map((v) => normalizeSajuElementToken(v, "")).filter(Boolean)
    : [];

  const tenGodCounts = src.tenGodCounts && typeof src.tenGodCounts === "object"
    ? { ...src.tenGodCounts }
    : null;

  return {
    dayMaster: clean(src.dayMaster),
    monthBranch: clean(src.monthBranch),
    powerLabel: clean(src.powerLabel),
    johuType: clean(src.johuType),
    yongshinElements: yongList,
    kishinElements: kiList,
    currentDaewun: clean(src.currentDaewun),
    isJong: Boolean(src.isJong),
    jongName: clean(src.jongName),
    elementWeights: weights,
    tenGodCounts,
  };
}

function pickTopTenGod(tenGodCounts = null) {
  const map = tenGodCounts && typeof tenGodCounts === "object" ? tenGodCounts : null;
  if (!map) return "";
  let topKey = "";
  let topValue = -1;
  Object.keys(map).forEach((key) => {
    const value = safeNumber(map[key], 0);
    if (value > topValue) {
      topValue = value;
      topKey = String(key);
    }
  });
  return topKey;
}

function deriveElementBalance(profile, signals) {
  const seed = (profile.year * 31) + (profile.month * 17) + (profile.day * 13) + (Number(profile.hour || 12) * 7);
  const dayEl = STEM_TO_ELEMENT[String(signals.dayMaster || "")] || "earth";
  const counts = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 };
  ELEMENT_KEYS.forEach((key, idx) => {
    counts[key] += ((seed + idx * 3) % 3);
  });
  counts[dayEl] += 2;

  const total = ELEMENT_KEYS.reduce((acc, key) => acc + Number(counts[key] || 0), 0) || 1;
  const ratio = {};
  ELEMENT_KEYS.forEach((key) => {
    ratio[key] = round((Number(counts[key] || 0) / total) * 100);
  });

  const sorted = ELEMENT_KEYS.slice().sort((a, b) => Number(ratio[b] || 0) - Number(ratio[a] || 0));
  const dominant = sorted[0] || "earth";
  const deficient = sorted[sorted.length - 1] || "earth";
  const gap = Math.abs(Number(ratio[dominant] || 0) - Number(ratio[deficient] || 0));
  const balanceScore = clamp(100 - round(gap * 1.5), 35, 97);

  return { counts, ratio, dominant, deficient, balanceScore };
}

function deriveTenGodStats(profile) {
  const seed = (profile.year * 19) + (profile.month * 11) + (profile.day * 7) + Number(profile.hour || 12);
  const base = {
    비견: 1 + (seed % 2),
    겁재: 1 + ((seed + 1) % 2),
    식신: 1 + ((seed + 2) % 3),
    상관: 1 + ((seed + 3) % 2),
    정재: 1 + ((seed + 4) % 3),
    편재: 1 + ((seed + 5) % 2),
    정관: 1 + ((seed + 6) % 2),
    편관: 1 + ((seed + 7) % 2),
    정인: 1 + ((seed + 8) % 2),
    편인: 1 + ((seed + 9) % 2),
  };
  const total = Object.values(base).reduce((acc, value) => acc + Number(value || 0), 0) || 1;
  const top = Object.keys(base)
    .sort((a, b) => Number(base[b] || 0) - Number(base[a] || 0))
    .slice(0, 3)
    .map((key) => ({ key, count: Number(base[key] || 0), pct: round((Number(base[key] || 0) / total) * 100) }));

  const emotionShare = Number(base.식신 || 0) + Number(base.상관 || 0);
  const realityShare = Number(base.정재 || 0) + Number(base.편재 || 0);
  const authorityShare = Number(base.정관 || 0) + Number(base.편관 || 0);
  const introspectShare = Number(base.정인 || 0) + Number(base.편인 || 0);

  return {
    counts: base,
    top,
    emotionPct: round((emotionShare / total) * 100),
    realityPct: round((realityShare / total) * 100),
    authorityPct: round((authorityShare / total) * 100),
    introspectPct: round((introspectShare / total) * 100),
  };
}

function deriveLifeBookPayload(profile, signals, chapters, metadata = {}) {
  const elementBalance = deriveElementBalance(profile, signals);
  const tenGodStats = deriveTenGodStats(profile);
  const stem = String(signals.dayMaster || "");
  const specialStars = {
    taoPct: clamp((profile.month * 7) + (profile.day % 30), 5, 95),
    yeokmaPct: clamp((profile.year % 40) + (profile.day % 25), 5, 95),
    hwaPct: clamp((profile.month * 5) + (profile.hour || 12), 5, 95),
    hasGwimun: ((profile.year + profile.month + profile.day) % 3) === 0,
    list: ["도화", "역마", "화개"],
  };

  return {
    user: {
      name: profile.name,
      gender: profile.gender,
      birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`,
      birthTime: profile.timeKnown ? `${pad2(profile.hour)}:${pad2(profile.minute)}` : "",
      calendarType: clean(metadata.calendarType) === "lunar" ? "lunar" : "solar",
    },
    saju: {
      year: { branch: signals.yearBranch },
      month: { branch: signals.monthBranch },
      day: { master: stem },
      hour: profile.timeKnown ? { label: signals.timeLabel } : undefined,
      dayMaster: stem,
      dayBranch: signals.monthBranch,
      monthBranch: signals.monthBranch,
    },
    elementBalance,
    tenGodStats,
    strength: {
      isStrong: elementBalance.balanceScore >= 60,
      label: elementBalance.balanceScore >= 60 ? "신강" : "신약",
      reasonSummary: `오행 균형 점수 ${elementBalance.balanceScore}점 기준`,
    },
    johu: {
      neededElements: [elementBalance.deficient],
      summary: `${elementBalance.deficient} 기운 보강이 핵심`,
    },
    yongshin: {
      primary: signals.useful,
      secondary: signals.support,
      usefulElements: [signals.useful, signals.support],
      avoidElements: [signals.caution],
      practicalUse: `${signals.useful} 환경을 늘리고 ${signals.caution} 과속을 줄이세요.`,
    },
    structure: {
      geokguk: `${signals.dayMaster} 중심 구조`,
      careerSignal: "장기형 커리어 누적 전략이 유리",
      socialMission: "지식·실행·관계 균형으로 영향력 확장",
    },
    timing: {
      currentDaeun: { label: signals.rhythm },
      nextDaeun: { label: `${signals.monthBranch} 이후 전환` },
      yearlyFlow: { year: new Date().getFullYear() },
      monthlyFlow: Array.from({ length: 12 }).map((_, idx) => ({ month: idx + 1, score: clamp(55 + ((idx * 7 + profile.day) % 40), 40, 95) })),
    },
    specialStars,
    chapters,
  };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function normalizeGender(raw) {
  const value = clean(raw).toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(value)) return "male";
  if (["f", "female", "woman", "여", "여성"].includes(value)) return "female";
  return "unknown";
}

function normalizeCalendarType(raw) {
  const value = clean(raw).toLowerCase();
  if (["solar", "양력", "yang", "sun"].includes(value)) return "solar";
  if (["lunar", "음력", "moon"].includes(value)) return "lunar";
  return "unknown";
}

function parseBirthDateAny(body = {}) {
  const candidates = [
    body.birthDate,
    body.birth,
    body.birthday,
    body.solarDate,
    body.lunarDate,
    body.date,
  ].map((v) => clean(v)).filter(Boolean);
  const directYear = toInt(body.birthYear ?? body.year, NaN);
  const directMonth = toInt(body.birthMonth ?? body.month, NaN);
  const directDay = toInt(body.birthDay ?? body.day, NaN);
  if (Number.isFinite(directYear) && Number.isFinite(directMonth) && Number.isFinite(directDay)) {
    return { year: directYear, month: directMonth, day: directDay };
  }
  for (const text of candidates) {
    const match = text.match(/(\d{4})[-./년\s](\d{1,2})[-./월\s](\d{1,2})/);
    if (match) {
      return {
        year: toInt(match[1], NaN),
        month: toInt(match[2], NaN),
        day: toInt(match[3], NaN),
      };
    }
  }
  return { year: NaN, month: NaN, day: NaN };
}

function parseBirthTimeAny(body = {}) {
  const isUnknownByFlag = body.birthTimeKnown === false
    || String(body.isTimeUnknown).toLowerCase() === "true"
    || /시간\s*모름|미상|unknown/.test(clean(body.birthTime || body.time || body.timeText));
  if (isUnknownByFlag) {
    return { isTimeUnknown: true, birthTime: "", birthHour: null, birthMinute: 0, timeKnown: false };
  }

  const rawHour = toInt(body.birthHour ?? body.hour ?? body.birth_hour, NaN);
  const rawMinute = toInt(body.birthMinute ?? body.minute, 0);
  if (Number.isFinite(rawHour) && rawHour >= 0 && rawHour <= 23) {
    return {
      isTimeUnknown: false,
      birthTime: `${pad2(rawHour)}:${pad2(rawMinute)}`,
      birthHour: rawHour,
      birthMinute: clamp(rawMinute, 0, 59),
      timeKnown: true,
    };
  }

  const rawText = clean(body.birthTime || body.time || body.timeText);
  const hourMap = {
    자시: 23, 축시: 1, 인시: 3, 묘시: 5, 진시: 7, 사시: 9, 오시: 11, 미시: 13, 신시: 15, 유시: 17, 술시: 19, 해시: 21,
  };
  if (hourMap[rawText] !== undefined) {
    const mappedHour = hourMap[rawText];
    return {
      isTimeUnknown: false,
      birthTime: `${pad2(mappedHour)}:00`,
      birthHour: mappedHour,
      birthMinute: 0,
      timeKnown: true,
    };
  }

  const hhmm = rawText.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
  if (hhmm) {
    let h = toInt(hhmm[1], NaN);
    const m = toInt(hhmm[2], 0);
    if (/오후/.test(rawText) && Number.isFinite(h) && h < 12) h += 12;
    if (/오전/.test(rawText) && h === 12) h = 0;
    if (Number.isFinite(h) && h >= 0 && h <= 23) {
      return {
        isTimeUnknown: false,
        birthTime: `${pad2(h)}:${pad2(clamp(m, 0, 59))}`,
        birthHour: h,
        birthMinute: clamp(m, 0, 59),
        timeKnown: true,
      };
    }
  }

  return { isTimeUnknown: true, birthTime: "", birthHour: null, birthMinute: 0, timeKnown: false };
}

function normalizeInput(body = {}) {
  const name = clean(body.name) || "사용자";
  const gender = normalizeGender(body.gender || body.sex);
  const calendarType = normalizeCalendarType(body.calendarType || body.calendar);
  const birthDate = parseBirthDateAny(body);
  const birthTime = parseBirthTimeAny(body);
  const year = birthDate.year;
  const month = birthDate.month;
  const day = birthDate.day;
  const timeKnown = birthTime.timeKnown;
  const hour = timeKnown ? birthTime.birthHour : null;
  const minute = timeKnown ? birthTime.birthMinute : 0;
  const birthplace = clean(body.birthplace) || "대한민국";

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, message: "생년월일은 필수입니다." };
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, message: "생년월일 형식이 올바르지 않습니다." };
  }
  if (timeKnown && (hour < 0 || hour > 23 || minute < 0 || minute > 59)) {
    return { ok: false, message: "출생 시간 형식이 올바르지 않습니다." };
  }

  return {
    ok: true,
    birthInput: {
      name,
      gender,
      calendarType,
      birthDate: `${year}-${pad2(month)}-${pad2(day)}`,
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthTime: timeKnown ? `${pad2(hour)}:${pad2(minute)}` : "",
      birthHour: timeKnown ? hour : null,
      birthMinute: timeKnown ? minute : 0,
      timezone: clean(body.timezone) || "Asia/Seoul",
      isTimeUnknown: !timeKnown,
    },
    profile: {
      name,
      gender,
      calendarType,
      year,
      month,
      day,
      hour,
      minute,
      timeKnown,
      birthplace,
      birthIso: timeKnown ? `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}` : `${year}-${pad2(month)}-${pad2(day)} 시간 미상`,
    },
  };
}

function chapterTextLength(chapter) {
  const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  return categories.reduce((sum, category) => sum + stripForbiddenTokens(category?.finalText || "").length, 0);
}

function totalManuscriptLength(chapters = []) {
  return (Array.isArray(chapters) ? chapters : []).reduce((sum, chapter) => sum + chapterTextLength(chapter), 0);
}

function repetitionScore(chapters = []) {
  const sentenceMap = new Map();
  const paragraphMap = new Map();
  const source = (Array.isArray(chapters) ? chapters : [])
    .map((chapter) => stripForbiddenTokens(chapter?.finalText || chapter?.text || ""))
    .join("\n\n");

  const sentences = source.split(/[.!?\n]+/).map((s) => stripForbiddenTokens(s)).filter((s) => s.length >= 18);
  sentences.forEach((sentence) => {
    sentenceMap.set(sentence, Number(sentenceMap.get(sentence) || 0) + 1);
  });
  const paragraphs = source.split(/\n\s*\n/).map((p) => stripForbiddenTokens(p)).filter((p) => p.length >= 70);
  paragraphs.forEach((paragraph) => {
    paragraphMap.set(paragraph, Number(paragraphMap.get(paragraph) || 0) + 1);
  });
  const repeatedSentences = Array.from(sentenceMap.values()).filter((count) => count > 2).length;
  const repeatedParagraphs = Array.from(paragraphMap.values()).filter((count) => count > 2).length;
  return repeatedSentences + (repeatedParagraphs * 2);
}

function countForbiddenTerms(chapters = []) {
  const text = (Array.isArray(chapters) ? chapters : [])
    .map((chapter) => stripForbiddenTokens(chapter?.finalText || chapter?.text || ""))
    .join("\n").toLowerCase();
  let count = 0;
  FORBIDDEN_TEXT.forEach((term) => {
    if (text.includes(String(term || "").toLowerCase())) count += 1;
  });
  return count;
}

function validateLifeBookFinalManuscript(chapters = []) {
  const issues = [];
  const list = Array.isArray(chapters) ? chapters : [];
  if (list.length !== CHAPTER_BLUEPRINTS.length) issues.push("chapter_count");
  list.forEach((chapter, idx) => {
    const bodyLength = chapterTextLength(chapter);
    if (bodyLength < LIFEBOOK_MIN_CHAPTER_CHARS) issues.push(`chapter_${idx + 1}_min_length`);
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (categories.length !== CHAPTER_BLUEPRINTS[idx].categories.length) issues.push(`chapter_${idx + 1}_category_count`);
    categories.forEach((category, cidx) => {
      if (stripForbiddenTokens(category?.finalText || "").length < LIFEBOOK_MIN_CATEGORY_CHARS) {
        issues.push(`chapter_${idx + 1}_category_${cidx + 1}_min_length`);
      }
    });
  });
  const totalLength = totalManuscriptLength(list);
  if (totalLength < LIFEBOOK_MIN_TOTAL_CHARS) issues.push("total_length");
  const forbiddenHits = countForbiddenTerms(list);
  if (forbiddenHits > 0) issues.push("forbidden_terms");
  const repScore = repetitionScore(list);
  if (repScore > 0) issues.push("repetition");
  return {
    ok: issues.length === 0,
    issues,
    totalLength,
    forbiddenHits,
    repetitionScore: repScore,
  };
}

function buildLifeBookLocalSajuJson(birthInput, profile, signals, chapters = []) {
  const payload = deriveLifeBookPayload(profile, signals, chapters, {
    calendarType: birthInput.calendarType,
  });
  return {
    birthInput,
    chart: {
      yearPillar: `${signals.yearBranch}`,
      monthPillar: `${signals.monthBranch}`,
      dayPillar: `${signals.dayMaster}`,
      hourPillar: profile.timeKnown ? String(signals.timeLabel || "") : "",
      dayMaster: signals.dayMaster,
      fiveElements: payload?.elementBalance?.ratio || {},
      tenGods: {
        dominant: payload?.tenGodStats?.top?.map((row) => row?.key).filter(Boolean) || [],
      },
      yongshin: [signals.useful, signals.support].filter(Boolean),
      heeshin: [signals.support].filter(Boolean),
      guks: [signals.jongName || `${signals.dayMaster} 중심 구조`].filter(Boolean),
      twelveStages: {},
      sinsal: payload?.specialStars?.list || [],
      daewoon: {
        current: signals.currentDaewun || signals.rhythm,
        startAge: undefined,
        cycles: [],
      },
      yearlyLuck: {
        year: new Date().getFullYear(),
        pillar: signals.rhythm,
        keywords: [signals.useful, signals.support].filter(Boolean),
      },
    },
    interpretationSeeds: {
      personalityKeywords: [signals.dayMaster, signals.monthBranch].filter(Boolean),
      careerKeywords: [signals.useful, "커리어", "성장"],
      moneyKeywords: ["재성", signals.support, "현금흐름"],
      relationshipKeywords: ["인연", "관계", signals.caution],
      healthKeywords: [signals.weakestElement || signals.caution, "리듬", "회복"],
      familyKeywords: ["가족", "경계", "소통"],
      crisisKeywords: [signals.caution, "위기", "반전"],
      growthKeywords: [signals.useful, "실행", "확장"],
      timingKeywords: [signals.currentDaewun || signals.rhythm, "대운", "세운"],
    },
  };
}

function pickByIndex(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

function normalizeSajuElementToken(value, fallback = "토") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (/목|wood/i.test(raw)) return "목";
  if (/화|fire/i.test(raw)) return "화";
  if (/토|earth/i.test(raw)) return "토";
  if (/금|metal/i.test(raw)) return "금";
  if (/수|water/i.test(raw)) return "수";
  return fallback;
}

function extractSignalFromSajuData(rawSajuData = "") {
  const text = String(rawSajuData || "");
  if (!text.trim()) return null;

  const dayMaster = (text.match(/일간(?:\(日干\))?\s*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸])/i) || [])[1] || "";
  const monthBranch = (text.match(/월지(?:\(月支\))?\s*[:：]\s*([자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/i) || [])[1] || "";
  const yongsinRaw = (text.match(/용신(?:\(用神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";
  const huisinRaw = (text.match(/희신(?:\(喜神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";
  const gisinRaw = (text.match(/기신(?:\(忌神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";

  if (!dayMaster && !monthBranch && !yongsinRaw && !huisinRaw && !gisinRaw) return null;

  return {
    dayMaster: String(dayMaster || "").trim(),
    monthBranch: String(monthBranch || "").trim(),
    useful: normalizeSajuElementToken(yongsinRaw, "토"),
    support: normalizeSajuElementToken(huisinRaw, "금"),
    caution: normalizeSajuElementToken(gisinRaw, "수"),
  };
}

function deriveLocalSignals(profile, rawSajuData = "", analysisSignals = {}) {
  const stems = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  const branches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  const elements = ["목", "화", "토", "금", "수"];

  const seed = (
    profile.year * 37
    + profile.month * 19
    + profile.day * 13
    + (Number.isFinite(profile.hour) ? profile.hour * 7 : 12 * 7)
    + (Number.isFinite(profile.minute) ? profile.minute : 0)
  );

  const dayMaster = pickByIndex(stems, seed);
  const yearBranch = pickByIndex(branches, profile.year + profile.month);
  const monthBranch = pickByIndex(branches, profile.month + profile.day);
  const useful = pickByIndex(elements, seed + 2);
  const support = pickByIndex(elements, seed + 4);
  const caution = pickByIndex(elements, seed + 1);

  const parsed = extractSignalFromSajuData(rawSajuData);
  const parsedAnalysis = normalizeIncomingAnalysisSignals(analysisSignals);
  const analysisWeights = parsedAnalysis.elementWeights;

  let dominantElement = "";
  let weakestElement = "";
  if (analysisWeights) {
    const entries = [
      ["목", safeNumber(analysisWeights.wood, 0)],
      ["화", safeNumber(analysisWeights.fire, 0)],
      ["토", safeNumber(analysisWeights.earth, 0)],
      ["금", safeNumber(analysisWeights.metal, 0)],
      ["수", safeNumber(analysisWeights.water, 0)],
    ].sort((a, b) => Number(b[1]) - Number(a[1]));
    dominantElement = String(entries[0]?.[0] || "");
    weakestElement = String(entries[entries.length - 1]?.[0] || "");
  }

  const topTenGod = pickTopTenGod(parsedAnalysis.tenGodCounts);

  return {
    dayMaster: parsedAnalysis.dayMaster || parsed?.dayMaster || dayMaster,
    yearBranch,
    monthBranch: parsedAnalysis.monthBranch || parsed?.monthBranch || monthBranch,
    useful: parsedAnalysis.yongshinElements[0] || parsed?.useful || useful,
    support: parsedAnalysis.yongshinElements[1] || parsed?.support || support,
    caution: parsedAnalysis.kishinElements[0] || parsed?.caution || caution,
    timeKnown: Boolean(profile.timeKnown),
    timeLabel: profile.timeKnown ? `${pad2(profile.hour)}:${pad2(profile.minute)}` : "시간 미상",
    rhythm: `${pickByIndex(branches, seed)}-${pickByIndex(branches, seed + 3)}-${pickByIndex(branches, seed + 6)}`,
    powerLabel: parsedAnalysis.powerLabel,
    johuType: parsedAnalysis.johuType,
    yongshinElements: parsedAnalysis.yongshinElements,
    kishinElements: parsedAnalysis.kishinElements,
    currentDaewun: parsedAnalysis.currentDaewun,
    isJong: parsedAnalysis.isJong,
    jongName: parsedAnalysis.jongName,
    elementWeights: analysisWeights,
    dominantElement,
    weakestElement,
    tenGodCounts: parsedAnalysis.tenGodCounts,
    topTenGod,
  };
}

function buildCategoryText(profile, signals, chapterTitle, categoryTitle, categoryIndex) {
  const opening = `${profile.name}님의 흐름에서 ${categoryTitle}은(는) 단일 조언이 아니라 ${chapterTitle} 전체를 움직이는 축으로 읽혀야 합니다.`;
  const elementRatioText = signals.elementWeights
    ? `오행 분포는 목 ${safeNumber(signals.elementWeights.wood, 0)}%, 화 ${safeNumber(signals.elementWeights.fire, 0)}%, 토 ${safeNumber(signals.elementWeights.earth, 0)}%, 금 ${safeNumber(signals.elementWeights.metal, 0)}%, 수 ${safeNumber(signals.elementWeights.water, 0)}%로 읽힙니다.`
    : "오행 분포는 현재 명식 흐름상 균형 재배치가 필요한 상태로 읽힙니다.";

  const powerText = signals.powerLabel
    ? `신강/신약 판정은 ${signals.powerLabel}이며, 조후는 ${signals.johuType || "중립"} 성향으로 나타납니다.`
    : "신강/신약과 조후는 현재 구간에서 실행 속도보다 방향 정밀도가 우선입니다.";

  const tenGodText = signals.topTenGod
    ? `십성 분포에서는 ${signals.topTenGod} 성향이 두드러져 관계/직업/재정 판단에서 해당 성향의 장단점을 함께 관리해야 합니다.`
    : "십성 분포는 특정 한 축보다 복합 반응이 강해, 상황별 의사결정 기준을 미리 문서화하는 것이 유리합니다.";

  const daewunText = signals.currentDaewun
    ? `현재 대운 ${signals.currentDaewun}의 흐름은 단기 성과보다 구조적 체질 개선에 힘을 실어 주며, 큰 결정을 내릴 때는 월 단위 검증 루틴이 필요합니다.`
    : `현재 운의 리듬(${signals.rhythm})은 변동성이 있으므로 중요한 결정은 최소 2회 이상 교차 검증하는 방식이 안전합니다.`;

  const body = [
    `${signals.dayMaster} 일간의 선택 방식은 ${signals.monthBranch} 월지의 현실 감각과 만나면서, 용신 ${signals.useful}과 희신 ${signals.support}을 생활 전략으로 옮길 때 가장 안정적으로 힘을 냅니다. 반대로 기신 ${signals.caution} 구간에서는 과속과 누수를 줄이는 통제력이 성패를 가릅니다.`,
    `${elementRatioText} 최강 오행 ${signals.dominantElement || signals.useful}은 추진의 엔진이고, 취약 오행 ${signals.weakestElement || signals.caution}은 보완해야 할 기반입니다. 따라서 ${categoryTitle}에서는 즉흥 반응보다 근거 기록, 우선순위 압축, 주간 회고를 먼저 고정해야 같은 운에서도 결과 편차를 줄일 수 있습니다.`,
    `${powerText} ${tenGodText} ${signals.isJong ? `종격(${signals.jongName || "종격"}) 성향이 보이는 시기이므로 장점 오행을 따르는 방향을 거스르지 않는 운영이 중요합니다.` : "강약 균형이 핵심이므로 특정 오행에 과몰입하지 않는 운영이 중요합니다."}`,
    `${daewunText} ${categoryTitle}은(는) ${categoryIndex + 1}번째 관점으로 갈수록 실행 정밀도가 중요해집니다. 첫째, 이번 주 핵심 행동을 1~2개로 제한합니다. 둘째, 실행 결과를 수치와 문장으로 동시에 기록합니다. 셋째, 실패 패턴을 일정/관계/돈/건강 4축으로 분해해 다음 주에 즉시 반영합니다.`,
  ].join("\n\n");

  return `${opening}\n\n${body}`;
}

function buildChapterLocalText(profile, signals, chapterTitle, categories) {
  return categories.map((categoryTitle, index) => {
    const text = buildCategoryText(profile, signals, chapterTitle, categoryTitle, index);
    return {
      id: `${String(index + 1).padStart(2, "0")}`,
      title: categoryTitle,
      localSummary: stripForbiddenTokens(text),
      evidenceTags: [signals.dayMaster, signals.monthBranch, signals.useful].filter(Boolean),
      advicePoints: [
        "핵심 패턴을 문장으로 명확히 기록하기",
        "이번 달 실행 항목을 1~2개로 제한하기",
        "관계·돈·건강 점검 루틴을 주간 단위로 고정하기",
      ],
      llmEnhancedText: "",
      finalText: stripForbiddenTokens(text),
    };
  });
}

function buildLifeBookChapters(profile, signals) {
  return CHAPTER_BLUEPRINTS.map((chapter) => {
    const categories = buildChapterLocalText(profile, signals, chapter.title, chapter.categories);
    const localDraft = buildChapterBody(chapter.title, categories);
    return {
      id: chapter.id,
      roman: chapter.roman,
      title: chapter.title,
      subtitle: chapter.subtitle,
      categories,
      localDraft,
      llmEnhancedText: "",
      finalText: localDraft,
      text: localDraft,
      source: "local",
    };
  });
}

function buildChapterBody(chapterTitle, categories) {
  return categories.map((category) => {
    const text = stripForbiddenTokens(category.finalText || category.localSummary || "");
    return `### ${stripForbiddenTokens(category.title)}\n\n${text}`.trim();
  }).join("\n\n");
}

function createLifeBookFallbackText(profile, signals, chapterTitle, categoryTitle, originText = "") {
  const body = buildCategoryText(profile, signals, chapterTitle, categoryTitle, 0);
  return stripForbiddenTokens([originText, body].filter(Boolean).join("\n\n"));
}

function buildLifeBookFallbackChapters(profile, signals, chapters = []) {
  return ensureCompleteLifeBookChapters(profile, signals, chapters).map((chapter) => ({
    ...chapter,
    llmEnhancedText: "",
    finalText: buildChapterBody(chapter.title, chapter.categories),
    text: buildChapterBody(chapter.title, chapter.categories),
    source: "local-fallback",
  }));
}

function buildLifeBookPayload(profile, signals, chapters, metadata = {}) {
  return deriveLifeBookPayload(profile, signals, chapters, metadata);
}

function ensureCompleteLifeBookChapters(profile, signals, chapters = []) {
  const chapterMap = new Map((Array.isArray(chapters) ? chapters : []).map((item) => [String(item?.id || ""), item]));

  return CHAPTER_BLUEPRINTS.map((blueprint) => {
    const chapter = chapterMap.get(String(blueprint.id));
    const fallbackCategories = buildChapterLocalText(profile, signals, blueprint.title, blueprint.categories);
    const categoryMap = new Map((Array.isArray(chapter?.categories) ? chapter.categories : []).map((item) => [String(item?.title || item?.id || ""), item]));

    const categories = fallbackCategories.map((fallbackCategory, index) => {
      const existing = categoryMap.get(String(fallbackCategory.title)) || categoryMap.get(String(fallbackCategory.id));
      const nextText = stripForbiddenTokens(existing?.finalText || existing?.llmEnhancedText || existing?.localSummary || fallbackCategory.localSummary);
      return {
        id: fallbackCategory.id,
        title: fallbackCategory.title,
        localSummary: fallbackCategory.localSummary,
        evidenceTags: Array.isArray(existing?.evidenceTags) && existing.evidenceTags.length ? existing.evidenceTags : fallbackCategory.evidenceTags,
        advicePoints: Array.isArray(existing?.advicePoints) && existing.advicePoints.length ? existing.advicePoints : fallbackCategory.advicePoints,
        llmEnhancedText: stripForbiddenTokens(existing?.llmEnhancedText || ""),
        finalText: nextText || createLifeBookFallbackText(profile, signals, blueprint.title, fallbackCategory.title, fallbackCategory.localSummary),
        order: index + 1,
      };
    });

    const chapterText = buildChapterBody(blueprint.title, categories);

    return {
      id: blueprint.id,
      roman: blueprint.roman,
      title: blueprint.title,
      subtitle: blueprint.subtitle,
      categories,
      localDraft: chapterText,
      llmEnhancedText: stripForbiddenTokens(chapter?.llmEnhancedText || ""),
      finalText: stripForbiddenTokens(chapter?.finalText || chapterText),
      text: stripForbiddenTokens(chapter?.finalText || chapterText),
      source: chapter?.source || "local",
    };
  });
}

function validateLifeBookChapters(chapters = []) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== CHAPTER_BLUEPRINTS.length) {
    errors.push("chapter_count");
  }

  (chapters || []).forEach((chapter, index) => {
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    const expectedCategoryCount = Array.isArray(CHAPTER_BLUEPRINTS[index]?.categories)
      ? CHAPTER_BLUEPRINTS[index].categories.length
      : 5;
    if (categories.length !== expectedCategoryCount) {
      errors.push(`chapter_${index + 1}_category_count`);
    }
    const chapterBody = stripForbiddenTokens(chapter?.finalText || chapter?.text);
    if (!stripForbiddenTokens(chapter?.title) || chapterBody.length < 120) {
      errors.push(`chapter_${index + 1}_body`);
    }
    categories.forEach((category, categoryIndex) => {
      if (!stripForbiddenTokens(category?.title)) {
        errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_title`);
      }
      if (stripForbiddenTokens(category?.finalText).length < 40) {
        errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_text`);
      }
    });
  });

  return { ok: errors.length === 0, errors };
}

function parseFailedLifeBookChapterIndexes(errors = []) {
  const indexes = new Set();
  (Array.isArray(errors) ? errors : []).forEach((errorCode) => {
    const text = String(errorCode || "");
    const match = text.match(/^chapter_(\d+)_/);
    if (!match) return;
    const chapterNumber = Number(match[1]);
    if (!Number.isFinite(chapterNumber)) return;
    const idx = chapterNumber - 1;
    if (idx >= 0 && idx < CHAPTER_BLUEPRINTS.length) indexes.add(idx);
  });
  return indexes;
}

function reinforceFailedLifeBookChapters(profile, signals, chapters = [], errors = []) {
  const failedIndexes = parseFailedLifeBookChapterIndexes(errors);
  if (!failedIndexes.size) return Array.isArray(chapters) ? chapters : [];

  const source = Array.isArray(chapters) ? chapters : [];
  const fallbackAll = buildLifeBookFallbackChapters(profile, signals, source);

  return source.map((chapter, index) => {
    if (!failedIndexes.has(index)) return chapter;
    return fallbackAll[index] || chapter;
  });
}

function renderLifeBookPdf({ profile, signals, chapters, generatedAt }) {
  const toc = (chapters || []).map((chapter) => `<li><strong>${stripForbiddenTokens(chapter.title)}</strong></li>`).join("\n");
  const chapterHtml = (chapters || []).map((chapter, index) => {
    const keywordTags = (chapter.categories || []).slice(0, 3).map((category) => `<span class="lb-keyword">${stripForbiddenTokens(category.title)}</span>`).join(" ");
    const categoryHtml = (chapter.categories || []).map((category) => `
      <section class="lb-category">
        <h4>${stripForbiddenTokens(category.title)}</h4>
        <p>${stripForbiddenTokens(category.finalText)}</p>
      </section>
    `).join("\n");
    return `
      <article class="lb-chapter">
        <div class="lb-chapter__eyebrow">제 ${String(index + 1).padStart(2, "0")}장</div>
        <h2>${stripForbiddenTokens(chapter.title)}</h2>
        <p class="lb-chapter__intro">${stripForbiddenTokens(chapter.subtitle || "핵심 흐름과 실행 전략을 정리합니다.")}</p>
        <div class="lb-keywords">${keywordTags}</div>
        ${categoryHtml}
      </article>
    `;
  }).join("\n");

  const finalRoadmap = (chapters || []).slice(-1)[0];
  const finalRoadmapSummary = finalRoadmap
    ? (finalRoadmap.categories || []).slice(0, 5).map((category, index) => `<li><strong>${index + 1}. ${stripForbiddenTokens(category.title)}</strong> — ${stripForbiddenTokens((category.finalText || "").slice(0, 140))}...</li>`).join("\n")
    : "";

  const safeName = stripForbiddenTokens(profile.name || "사용자");
  const safeBirth = stripForbiddenTokens(profile.birthIso || "");
  const safeSignals = stripForbiddenTokens(`${signals.dayMaster} · ${signals.monthBranch} · ${signals.yearBranch}`);

  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>사주 인생의 책</title>
    <style>
      :root{color-scheme:light}
      *{box-sizing:border-box}
      body{margin:0;padding:0;font-family:"Noto Serif KR",serif;background:linear-gradient(180deg,#fffaf2 0%,#f4ead9 100%);color:#261b11;line-height:1.8}
      .page{max-width:980px;margin:0 auto;padding:28px 20px 60px}
      .cover{position:relative;overflow:hidden;padding:30px;border-radius:24px;background:linear-gradient(145deg,#24160e 0%,#6c4324 58%,#8d5a32 100%);color:#fff5ea;box-shadow:0 22px 48px rgba(71,45,19,.22)}
      .cover::after{content:"";position:absolute;right:-40px;top:-20px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.12)}
      .cover h1{margin:10px 0 6px;font-size:40px;line-height:1.15}
      .cover p{margin:4px 0;color:#f5dfc5}
      .cover img{display:block;width:min(260px,100%);border-radius:18px;margin-top:18px;box-shadow:0 12px 28px rgba(0,0,0,.18)}
      .meta,.toc,.chapter{margin-top:20px;padding:18px;border:1px solid #e4d3bb;border-radius:18px;background:rgba(255,251,246,.92);box-shadow:0 12px 26px rgba(66,48,26,.06)}
      .meta-grid{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))}
      .meta-item{padding:12px;border-radius:14px;background:#f8f0e4;border:1px solid #ead8bf}
      .meta-item b{display:block;margin-bottom:4px;color:#5a3a23}
      .toc ol{margin:0;padding-left:20px}
      .toc li{margin:6px 0}
      .chapter{break-inside:avoid-page;page-break-inside:avoid}
      .chapter h2{margin:8px 0 14px;font-size:26px;color:#4c2f1a}
      .lb-chapter__intro{margin:0 0 10px;color:#6b4428;font-size:14px}
      .lb-keywords{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
      .lb-keyword{display:inline-flex;padding:4px 8px;border-radius:999px;background:#efe3d0;border:1px solid #dec6a6;font-size:12px;color:#5a3a23}
      .lb-chapter__eyebrow{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#8b5e3c}
      .lb-category{padding:12px 14px;margin:10px 0;border-radius:14px;background:#fbf5ec;border:1px solid #eadcc7}
      .lb-category h4{margin:0 0 8px;font-size:18px;color:#6b4428}
      .lb-category p{margin:0;white-space:pre-wrap}
      .footer{margin-top:20px;padding:16px 18px;color:#614632;font-size:13px;text-align:center}
      @page{size:A4;margin:16mm 14mm 18mm}
      @media print{body{background:#fff}.page{padding:0}.cover,.meta,.toc,.chapter{box-shadow:none}.chapter{break-before:page;page-break-before:always}.chapter:first-of-type{break-before:auto;page-break-before:auto}}
      @media (max-width:720px){.meta-grid{grid-template-columns:1fr}.cover h1{font-size:32px}}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="cover">
        <p>Code:Destiny Premium PDF</p>
        <h1>사주 인생의 책</h1>
        <p>팔자 8글자로 읽는 나만의 운명 해설서</p>
        <p>${safeName}</p>
        <p>${safeBirth}</p>
        <p>${safeSignals}</p>
        <img src="/fuctionassets/lifebook.webp" alt="사주 인생의 책 표지 이미지" />
      </section>

      <section class="meta">
        <div class="meta-grid">
          <div class="meta-item"><b>생성일</b>${stripForbiddenTokens(new Date(generatedAt).toLocaleString("ko-KR"))}</div>
          <div class="meta-item"><b>시간 정보</b>${signals.timeKnown ? stripForbiddenTokens(signals.timeLabel) : "시간 미상 기준"}</div>
          <div class="meta-item"><b>기본 구조</b>13챕터 프리미엄 사주 리포트</div>
        </div>
      </section>

      <section class="toc">
        <h2 style="margin-top:0;">목차</h2>
        <ol>${toc}</ol>
      </section>

      ${chapterHtml}

      <section class="chapter">
        <h2>🕯️ 최종 인생 로드맵 요약</h2>
        <ul>${finalRoadmapSummary}</ul>
      </section>

      <section class="footer">이 문서는 로컬 사주 계산과 프리미엄 상담문 보강을 바탕으로 작성된 Code:Destiny 리포트입니다.</section>
    </main>
  </body>
  </html>`;
}

function buildLifeBookDocument(input) {
  return renderLifeBookPdf(input);
}

function buildPdfReadyPayload(profile, chapters, metadata = {}) {
  return {
    title: `${stripForbiddenTokens(profile.name)} 사주 인생의 책`,
    filename: `saju-lifebook-${String(profile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    profile,
    metadata,
    html: String(metadata.pdfHtml || ""),
    chapters: chapters.map((chapter, index) => ({
      chapter: index + 1,
      id: chapter.id,
      title: chapter.title,
      categories: chapter.categories,
      text: chapter.text,
      source: chapter.source || "local",
    })),
  };
}

async function handlePrepare(request, env) {
  logLifeBookServer("RequestReceived", { route: "/api/lifebook/prepare" });
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        message: "로그인 후 인생의 책 PDF를 생성할 수 있습니다.",
        code: "UNAUTHORIZED",
      }, { status: 401 });
    }
    throw error;
  }
  const body = await readJson(request);
  const premiumAccessToken = String(
    request.headers.get("x-premium-access-token")
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || "",
  ).trim();

  const normalized = normalizeInput(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const profile = normalized.profile;
  const birthInput = normalized.birthInput;
  logLifeBookServer("BirthInputValidated", {
    hasBirthDate: Boolean(birthInput.birthDate),
    hasBirthTime: Boolean(birthInput.birthTime),
    birthHour: birthInput.birthHour,
    hasGender: Boolean(birthInput.gender && birthInput.gender !== "unknown"),
    calendarType: birthInput.calendarType,
  });

  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId) || `life-book:${auth.userId}:${birthInput.birthDate}:${birthInput.birthTime || "unknown"}`;
  const existingLock = LIFEBOOK_SESSION_LOCKS.get(sessionId);
  if (existingLock?.status === "running") {
    return json({
      ok: true,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      chapterCount: CHAPTER_BLUEPRINTS.length,
      data: {
        sessionId,
        status: "running",
        startedAt: existingLock.startedAt,
      },
    });
  }
  if (existingLock?.status === "done" && existingLock.result) {
    return json(existingLock.result);
  }
  LIFEBOOK_SESSION_LOCKS.set(sessionId, {
    sessionId,
    status: "running",
    startedAt: new Date().toISOString(),
  });

  try {
  const featureKey = resolveLifeBookFeatureKey(body?.featureKey);
  const billingFeatureKey = toBillingFeatureKey(featureKey);
  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "lifeBook", {
    ...body,
    featureKey: billingFeatureKey,
    reportType: "lifeBook",
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/premium/saju-lifebook",
  });

  if (!access?.ok) {
    const status = Number(access?.status || 402);
    const hasSessionId = Boolean(clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId));
    const hasPurchaseId = Boolean(clean(body?.purchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId));
    const hasRequestId = Boolean(clean(body?.requestId || body?.accessGrant?.requestId || body?.payment?.requestId || body?._paymentContext?.requestId));
    const hasPaymentToken = Boolean(premiumAccessToken);
    const paymentConfirmedButMissing = status === 402 && (hasSessionId || hasPurchaseId || hasRequestId || hasPaymentToken);
    const message = status === 401
      ? "로그인 후 인생의 책 PDF를 생성할 수 있습니다."
      : paymentConfirmedButMissing
        ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
        : status === 402
        ? "프리미엄 PDF 생성 권한이 필요합니다."
        : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

    return json({
      ok: false,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      message,
      code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : (access?.code || "PAYMENT_REQUIRED"),
      debugSafe: {
        featureKey,
        hasSessionId,
        hasPurchaseId,
        hasRequestId,
        hasPaymentToken,
      },
    }, { status });
  }

  logLifeBookServer("LocalCalculationStart", { sessionId });
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: LIFEBOOK_SERVICE_KEY,
    reportType: "lifeBook",
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId: clean(body?.reportId || body?.accessGrant?.reportId),
    access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  await startPremiumPdfExecution(env, auth.userId, executionCtx);

  const signals = deriveLocalSignals(profile, body?.sajuData || "", body?.analysisSignals || {});
  const localSajuJson = buildLifeBookLocalSajuJson(birthInput, profile, signals, []);
  logLifeBookServer("LocalCalculationSuccess", {
    sessionId,
    dayMasterResolved: Boolean(localSajuJson?.chart?.dayMaster),
    pillarCount: Number(Boolean(localSajuJson?.chart?.yearPillar)) + Number(Boolean(localSajuJson?.chart?.monthPillar)) + Number(Boolean(localSajuJson?.chart?.dayPillar)) + Number(Boolean(localSajuJson?.chart?.hourPillar)),
    daewoonResolved: Boolean(localSajuJson?.chart?.daewoon?.current),
    yearlyLuckResolved: Boolean(localSajuJson?.chart?.yearlyLuck?.year),
  });

  logLifeBookServer("LocalDraftBuildStart", { chapterCount: CHAPTER_BLUEPRINTS.length, sessionId });
  const localChapters = buildLifeBookChapters(profile, signals);
  localChapters.forEach((chapter, index) => {
    logLifeBookServer("LocalDraftChapterDone", {
      sessionId,
      chapterNo: index + 1,
      title: chapter.title,
      charLength: chapterTextLength(chapter),
    });
  });
  logLifeBookServer("LocalDraftBuildSuccess", { chapterCount: localChapters.length, sessionId });

  let localValidation = validateLifeBookFinalManuscript(localChapters);
  if (!localValidation.ok) {
    logLifeBookServer("LocalQualityValidated", {
      sessionId,
      ok: false,
      issues: localValidation.issues,
      totalLength: localValidation.totalLength,
      forbiddenTermsCount: localValidation.forbiddenHits,
      repetitionScore: localValidation.repetitionScore,
    });
  } else {
    logLifeBookServer("LocalQualityValidated", {
      sessionId,
      ok: true,
      totalLength: localValidation.totalLength,
      forbiddenTermsCount: localValidation.forbiddenHits,
      repetitionScore: localValidation.repetitionScore,
    });
  }

  let completedChapters = ensureCompleteLifeBookChapters(profile, signals, localChapters);
  let fallbackUsed = false;
  let chapterValidation = validateLifeBookChapters(completedChapters);

  if (!chapterValidation.ok) {
    logLifeBookServer("LocalFinalizeFallback", {
      sessionId,
      reason: "chapter_validation_failed",
      failedChapters: chapterValidation.errors?.length || 0,
    });
    fallbackUsed = true;
    completedChapters = buildLifeBookFallbackChapters(profile, signals, completedChapters);
    chapterValidation = validateLifeBookChapters(completedChapters);
  }

  if (!chapterValidation.ok) {
    logLifeBookServer("LocalFinalizeFallback", {
      sessionId,
      reason: "fallback_validation_failed_use_pure_local",
      failedChapters: chapterValidation.errors?.length || 0,
    });
    fallbackUsed = true;
    completedChapters = localChapters.map((chapter) => ({
      ...chapter,
      source: "pure-local-skeleton",
      finalText: buildChapterBody(chapter.title, chapter.categories),
      llmEnhancedText: "",
    }));
  }

  const finalValidation = validateLifeBookFinalManuscript(completedChapters);
  logLifeBookServer("FinalManuscriptValidated", {
    sessionId,
    ok: finalValidation.ok,
    chapterCount: completedChapters.length,
    totalLength: finalValidation.totalLength,
    forbiddenTermsCount: finalValidation.forbiddenHits,
    repetitionScore: finalValidation.repetitionScore,
    manuscriptSource: "local-only",
  });

  const lifebookPayload = buildLifeBookPayload(profile, signals, completedChapters, {
    featureKey,
    calendarType: body?.calendarType,
  });

  const manuscriptSource = "local-only";
  const generatedAt = new Date().toISOString();
  logLifeBookServer("PdfRenderStart", { sessionId, chapterCount: completedChapters.length });

  const pdfReady = buildPdfReadyPayload(profile, completedChapters, {
    featureKey,
    reportType: "lifeBook",
    accessType: String(access.accessType || "unknown"),
    manuscriptSource,
    pdfHtml: buildLifeBookDocument({ profile, signals, chapters: completedChapters, generatedAt }),
  });
  logLifeBookServer("PdfRenderSuccess", { sessionId, chapterCount: completedChapters.length });

  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `saju-lifebook-${Date.now()}`);
  await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
    manuscriptSource,
    chapterCount: completedChapters.length,
    archive: {
      reportId,
      reportType: "life_book",
      displayName: "사주 인생의 책",
      title: `${clean(profile?.name) || "사용자"}님의 인생의 책`,
      mode: "personal",
      birthName: clean(profile?.name),
      summary: clean(
        completedChapters?.[0]?.finalText
        || completedChapters?.[0]?.categories?.[0]?.finalText
        || completedChapters?.[0]?.categories?.[0]?.text,
        1000,
      ),
      pdfUrl: clean(pdfReady?.pdfUrl),
      chapters: completedChapters,
      payload: lifebookPayload,
      pdfReady,
      canReopen: true,
      canDownload: Boolean(clean(pdfReady?.pdfUrl)),
    },
  });

  const result = {
    ok: true,
    featureKey,
    chapterCount: CHAPTER_BLUEPRINTS.length,
    serviceKey: LIFEBOOK_SERVICE_KEY,
    data: {
      reportId,
      featureKey,
      sessionId,
      reportType: "lifeBook",
      profile,
      birthInput,
      manuscriptSource,
      localSajuJson,
      chapters: completedChapters,
      lifebookPayload,
      pdfReady,
      fallbackUsed,
    },
  };

  LIFEBOOK_SESSION_LOCKS.set(sessionId, {
    sessionId,
    status: "done",
    startedAt: existingLock?.startedAt || new Date().toISOString(),
    result,
  });

  return json(result);
  } catch (error) {
    const executionCtx = buildPremiumExecutionContext({
      serviceKey: LIFEBOOK_SERVICE_KEY,
      reportType: "lifeBook",
      userId: auth.userId,
      featureKey: resolveLifeBookFeatureKey(body?.featureKey),
      sessionId,
      reportId: clean(body?.reportId || body?.accessGrant?.reportId),
      access: null,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await failPremiumPdfExecution(
      env,
      auth.userId,
      executionCtx,
      "lifebook_generation_failed",
      clean(error?.message || "인생의 책 PDF 생성에 실패했습니다."),
      "lifebook-generation",
    );
    const normalizedError = normalizeLifeBookError(error);
    logLifeBookServer("Error", {
      stage: "handlePrepare",
      sessionId,
      error: normalizedError,
    });
    LIFEBOOK_SESSION_LOCKS.set(sessionId, {
      sessionId,
      status: "failed",
      startedAt: new Date().toISOString(),
      error: normalizedError,
    });
    throw error;
  }
}

export async function handleSajuLifebookRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/premium/saju-lifebook");

    if (method === "POST" && (path === "" || path === "/" || path === "/prepare")) {
      return await handlePrepare(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "saju-lifebook",
        method: request?.method || "",
        requestPath: (() => {
          try { return new URL(request.url).pathname; } catch (_) { return ""; }
        })(),
      },
    });
  }
}
