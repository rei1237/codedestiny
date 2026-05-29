import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
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
    title: "사주 원국 완전 해설 — 팔자 8글자의 비밀",
    subtitle: "원국 8글자의 구조와 반복 패턴을 해독하는 시작 장",
    categories: ["나의 사주 원국 전체 구조", "일간이 보여주는 본질", "월지와 태어난 계절의 영향", "오행 균형과 기질의 흐름", "원국에서 가장 강한 힘과 약한 지점"],
  },
  {
    id: "02",
    roman: "II",
    title: "나의 설계도 — 월지·일간·조후와 기질의 뿌리",
    subtitle: "월지·일간·조후를 중심으로 기질의 뿌리를 정리하는 장",
    categories: ["월지가 만든 삶의 기본 환경", "일간이 세상을 대하는 방식", "조후가 필요한 이유", "내면의 예민함과 생존 방식", "나답게 살아가기 위한 기본 조건"],
  },
  {
    id: "03",
    roman: "III",
    title: "숨겨진 무기 — 용신·희신과 나만의 필살기",
    subtitle: "용신·희신 운용법과 반복 문제를 전환하는 실행 장",
    categories: ["용신이 의미하는 삶의 방향", "희신이 도와주는 영역", "기신이 만드는 반복 문제", "나의 재능이 열리는 조건", "운을 살리는 선택 기준"],
  },
  {
    id: "04",
    roman: "IV",
    title: "대운 정밀 분석 — 인생의 큰 파도",
    subtitle: "대운 흐름에서 기회와 리스크를 읽는 장",
    categories: ["현재 대운의 핵심 의미", "대운이 삶의 방향에 주는 변화", "과거 대운에서 반복된 패턴", "앞으로 강해질 흐름", "대운을 활용하는 인생 전략"],
  },
  {
    id: "05",
    roman: "V",
    title: "격국과 사회적 소명 — 나의 성공 방정식",
    subtitle: "격국·직업성·브랜딩을 연결해 소명을 설계하는 장",
    categories: ["격국이 보여주는 사회적 역할", "내가 인정받는 방식", "직업적 강점과 약점", "명예와 성취를 얻는 조건", "사회에서 나를 세우는 법"],
  },
  {
    id: "06",
    roman: "VI",
    title: "관계의 전략 — 인연의 법칙과 파트너십",
    subtitle: "관계 패턴과 갈등 해소 전략을 정밀하게 다루는 장",
    categories: ["인간관계에서 반복되는 패턴", "나를 도와주는 사람의 유형", "나를 소모시키는 관계", "협력과 거리 조절의 기준", "관계를 운으로 바꾸는 전략"],
  },
  {
    id: "07",
    roman: "VII",
    title: "연애·결혼 완전 분석 — 사랑의 방식과 배우자 운",
    subtitle: "연애 성향부터 결혼 운용까지 사랑의 구조를 푸는 장",
    categories: ["내가 사랑에 빠지는 방식", "연애에서 반복되는 상처", "배우자 운과 결혼 흐름", "이별과 재회의 패턴", "사랑을 안정시키는 현실 조언"],
  },
  {
    id: "08",
    roman: "VIII",
    title: "재물·직업 운 — 돈과 성취의 구조",
    subtitle: "재성 구조와 직업 흐름을 통합적으로 정리하는 장",
    categories: ["돈이 들어오는 방식", "돈이 새어나가는 패턴", "직업 선택의 기준", "사업·프리랜서·콘텐츠 운", "재물운을 키우는 실전 전략"],
  },
  {
    id: "09",
    roman: "IX",
    title: "건강·심신 운 — 몸에 새겨진 운의 신호",
    subtitle: "오행 불균형과 심신 리듬 관리 전략을 다루는 장",
    categories: ["몸에서 약해지기 쉬운 영역", "과로와 스트레스의 패턴", "마음이 흔들리는 구조", "회복력을 높이는 습관", "운을 지키는 건강 전략"],
  },
  {
    id: "10",
    roman: "X",
    title: "신살·십이운성·퀀텀 포인트 — 숨은 운명의 장치",
    subtitle: "신살과 십이운성 신호를 실전적으로 읽는 장",
    categories: ["주요 신살이 보여주는 상징", "십이운성이 말하는 삶의 리듬", "강하게 작동하는 운명의 장치", "특별한 재능과 위험 신호", "나만의 반전 포인트"],
  },
  {
    id: "11",
    roman: "XI",
    title: "위기와 반전 시나리오 — 무너지는 지점과 다시 서는 법",
    subtitle: "위기 패턴과 반전 전략을 설계하는 장",
    categories: ["인생에서 반복되는 위기 구조", "무너질 때 나타나는 선택 패턴", "가장 조심해야 할 시기와 태도", "위기가 기회로 바뀌는 조건", "다시 일어서는 방법"],
  },
  {
    id: "12",
    roman: "XII",
    title: "나의 길 — 이번 생의 방향과 운명적 과제",
    subtitle: "삶의 방향성과 장기 선택을 정리하는 장",
    categories: ["이번 생에서 반드시 배워야 할 것", "내가 피하면 반복되는 과제", "내 삶의 중심 주제", "운명이 나에게 요구하는 태도", "앞으로 선택해야 할 방향"],
  },
  {
    id: "13",
    roman: "XIII",
    title: "마스터플랜 — 3년·5년·10년 인생 전략",
    subtitle: "핵심 요약과 실천 계획을 확정하는 종장",
    categories: ["앞으로 3년의 핵심 전략", "앞으로 5년의 성장 방향", "앞으로 10년의 인생 설계", "반드시 버려야 할 습관", "최종 조언과 인생 선언문"],
  },
];

const SAJU_LIFE_BOOK_PDF_CHAPTER_SPECS = Object.freeze(CHAPTER_BLUEPRINTS.map((chapter, index) => Object.freeze({
  chapterNo: index + 1,
  id: chapter.id,
  roman: chapter.roman,
  title: chapter.title,
  subtitle: chapter.subtitle,
  sections: Object.freeze((chapter.categories || []).map((sectionTitle, sectionIndex) => Object.freeze({
    sectionNo: sectionIndex + 1,
    id: `${chapter.id}-${String(sectionIndex + 1).padStart(2, "0")}`,
    title: sectionTitle,
    minChars: 600,
  }))),
})));

const SAJU_LIFE_BOOK_PDF_TOTAL_MIN_CHARS = 39000;

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
  甲: "wood",
  乙: "wood",
  丙: "fire",
  丁: "fire",
  戊: "earth",
  己: "earth",
  庚: "metal",
  辛: "metal",
  壬: "water",
  癸: "water",
};

const ELEMENT_KEYS = ["wood", "fire", "earth", "metal", "water"];

const ELEMENT_KEY_TO_KO = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const BRANCH_TO_SEASON = {
  寅: "초봄",
  卯: "한봄",
  辰: "늦봄",
  巳: "초여름",
  午: "한여름",
  未: "늦여름",
  申: "초가을",
  酉: "한가을",
  戌: "늦가을",
  亥: "초겨울",
  子: "한겨울",
  丑: "늦겨울",
  인: "초봄",
  묘: "한봄",
  진: "늦봄",
  사: "초여름",
  오: "한여름",
  미: "늦여름",
  신: "초가을",
  유: "한가을",
  술: "늦가을",
  해: "초겨울",
  자: "한겨울",
  축: "늦겨울",
};

const FORBIDDEN_TEXT = [
  "fallback",
  "local",
  "로컬",
  "engine",
  "engine",
  "worker",
  "자동 복구 생성",
  "자동 복구",
  "chapter 1 chapter 1",
  "chapter 1",
  "placeholder",
  "debug",
  "json",
  "payload",
  "seed",
  "rawdata",
  "api",
  "internal server error",
  "object",
  "undefined",
  "null",
  "nan",
  "calculationmode",
  "calculation",
  "recovered",
  "internal payload",
  "json dump",
  "llm 실패",
  "llm fail",
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

const LIFEBOOK_MIN_CATEGORY_CHARS = 600;
const LIFEBOOK_MIN_CHAPTER_CHARS = 3000;
const LIFEBOOK_MIN_TOTAL_CHARS = 39000;

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
  if (signals?.elementWeights) {
    const ratio = {
      wood: round(safeNumber(signals.elementWeights.wood, 0)),
      fire: round(safeNumber(signals.elementWeights.fire, 0)),
      earth: round(safeNumber(signals.elementWeights.earth, 0)),
      metal: round(safeNumber(signals.elementWeights.metal, 0)),
      water: round(safeNumber(signals.elementWeights.water, 0)),
    };
    const sorted = ELEMENT_KEYS.slice().sort((a, b) => Number(ratio[b] || 0) - Number(ratio[a] || 0));
    const dominant = sorted[0] || "earth";
    const deficient = sorted[sorted.length - 1] || "earth";
    const gap = Math.abs(Number(ratio[dominant] || 0) - Number(ratio[deficient] || 0));
    return {
      counts: { ...ratio },
      ratio,
      dominant,
      deficient,
      balanceScore: clamp(100 - round(gap * 1.5), 35, 97),
    };
  }

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

function deriveTenGodStats(profile, signals = null) {
  if (signals?.tenGodCounts && typeof signals.tenGodCounts === "object") {
    const source = signals.tenGodCounts;
    const total = Object.values(source).reduce((acc, value) => acc + safeNumber(value, 0), 0) || 1;
    const top = Object.keys(source)
      .sort((a, b) => safeNumber(source[b], 0) - safeNumber(source[a], 0))
      .slice(0, 3)
      .map((key) => ({ key, count: safeNumber(source[key], 0), pct: round((safeNumber(source[key], 0) / total) * 100) }));

    const emotionShare = safeNumber(source.식신, 0) + safeNumber(source.상관, 0);
    const realityShare = safeNumber(source.정재, 0) + safeNumber(source.편재, 0);
    const authorityShare = safeNumber(source.정관, 0) + safeNumber(source.편관, 0);
    const introspectShare = safeNumber(source.정인, 0) + safeNumber(source.편인, 0);

    return {
      counts: { ...source },
      top,
      emotionPct: round((emotionShare / total) * 100),
      realityPct: round((realityShare / total) * 100),
      authorityPct: round((authorityShare / total) * 100),
      introspectPct: round((introspectShare / total) * 100),
    };
  }

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
  const tenGodStats = deriveTenGodStats(profile, signals);
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
      yearPillar: signals.yearPillar?.ganji || `${signals.yearBranch}`,
      monthPillar: signals.monthPillar?.ganji || `${signals.monthBranch}`,
      dayPillar: signals.dayPillar?.ganji || `${signals.dayMaster}`,
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

function extractPillarFromSajuData(text, label) {
  const match = String(text || "").match(new RegExp(`${label}\\(.*?\\)\\s*[:：]\\s*([^\\n]+)`, "i"));
  const raw = clean(match?.[1] || "");
  if (!raw) return null;
  const ganjiMatch = raw.match(/([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸])\s*([자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/);
  const stem = clean(ganjiMatch?.[1] || "");
  const branch = clean(ganjiMatch?.[2] || "");
  const elementHint = clean((raw.match(/\[([^\]]+)\]/) || [])[1] || "");
  return {
    raw,
    ganji: `${stem}${branch}`.trim(),
    stem,
    branch,
    elementHint,
  };
}

function extractLineValue(text, pattern) {
  const match = String(text || "").match(pattern);
  return clean(match?.[1] || "");
}

function extractSignalFromSajuData(rawSajuData = "") {
  const text = String(rawSajuData || "");
  if (!text.trim()) return null;

  const yearPillar = extractPillarFromSajuData(text, "년주");
  const monthPillar = extractPillarFromSajuData(text, "월주");
  const dayPillar = extractPillarFromSajuData(text, "일주");
  const hourPillar = extractPillarFromSajuData(text, "시주");
  const dayMaster = (text.match(/일간(?:\(日干\))?\s*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸])/i) || [])[1] || "";
  const monthBranch = (text.match(/월지(?:\(月支\))?\s*[:：]\s*([자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/i) || [])[1] || "";
  const yongsinRaw = (text.match(/용신(?:\(用神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";
  const huisinRaw = (text.match(/희신(?:\(喜神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";
  const gisinRaw = (text.match(/기신(?:\(忌神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";
  const dominantElement = extractLineValue(text, /최강\s*오행\s*[:：]\s*([목화토금수木火土金水])/i);
  const weakestElement = extractLineValue(text, /최약\s*오행\s*[:：]\s*([목화토금수木火土金水])/i);
  const powerLabel = extractLineValue(text, /신강\/신약\s*[:：]\s*([^\n]+)/i);
  const johuType = extractLineValue(text, /조후\(調候\)\s*판정\s*[:：]\s*([^\n]+)/i);
  const heavenlyRelations = extractLineValue(text, /천간합\(天干合\)\s*[:：]\s*([^\n]+)/i);
  const earthlyRelations = extractLineValue(text, /지지충\(地支沖\)\s*[:：]\s*([^\n]+)/i);
  const yukhap = extractLineValue(text, /육합\(六合\)\s*[:：]\s*([^\n]+)/i);
  const topTenGod = extractLineValue(text, /주도\s*십성\(육신\)\s*[:：]\s*([^—\n]+)/i);
  const sinsalRaw = extractLineValue(text, /신살(?:\(神煞\))?\s*[:：]\s*([^\n]+)/i);
  const twelveStageRaw = extractLineValue(text, /십이운성(?:\(十二運星\))?\s*[:：]\s*([^\n]+)/i);
  const combinationsRaw = extractLineValue(text, /천간합(?:\(天干合\))?\s*[:：]\s*([^\n]+)/i);
  const clashesRaw = extractLineValue(text, /지지충(?:\(地支沖\))?\s*[:：]\s*([^\n]+)/i);
  const punishmentsRaw = extractLineValue(text, /형(?:\(刑\))\s*[:：]\s*([^\n]+)/i);
  const harmsRaw = extractLineValue(text, /해(?:\(害\))\s*[:：]\s*([^\n]+)/i);
  const breaksRaw = extractLineValue(text, /파(?:\(破\))\s*[:：]\s*([^\n]+)/i);

  if (!dayMaster && !monthBranch && !yongsinRaw && !huisinRaw && !gisinRaw && !yearPillar && !monthPillar && !dayPillar && !hourPillar) return null;

  return {
    dayMaster: String(dayMaster || "").trim(),
    monthBranch: String(monthBranch || "").trim(),
    useful: normalizeSajuElementToken(yongsinRaw, "토"),
    support: normalizeSajuElementToken(huisinRaw, "금"),
    caution: normalizeSajuElementToken(gisinRaw, "수"),
    dominantElement: normalizeSajuElementToken(dominantElement, ""),
    weakestElement: normalizeSajuElementToken(weakestElement, ""),
    powerLabel,
    johuType,
    topTenGod,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    heavenlyRelations,
    earthlyRelations,
    yukhap,
    sinsalRaw,
    twelveStageRaw,
    combinationsRaw,
    clashesRaw,
    punishmentsRaw,
    harmsRaw,
    breaksRaw,
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
    powerLabel: parsedAnalysis.powerLabel || parsed?.powerLabel,
    johuType: parsedAnalysis.johuType || parsed?.johuType,
    yongshinElements: parsedAnalysis.yongshinElements,
    kishinElements: parsedAnalysis.kishinElements,
    currentDaewun: parsedAnalysis.currentDaewun,
    isJong: parsedAnalysis.isJong,
    jongName: parsedAnalysis.jongName,
    elementWeights: analysisWeights,
    dominantElement: dominantElement || parsed?.dominantElement || "",
    weakestElement: weakestElement || parsed?.weakestElement || "",
    tenGodCounts: parsedAnalysis.tenGodCounts,
    topTenGod: parsedAnalysis.tenGodCounts ? topTenGod : (parsed?.topTenGod || topTenGod),
    yearPillar: parsed?.yearPillar || null,
    monthPillar: parsed?.monthPillar || null,
    dayPillar: parsed?.dayPillar || null,
    hourPillar: parsed?.hourPillar || null,
    heavenlyRelations: parsed?.heavenlyRelations || "",
    earthlyRelations: parsed?.earthlyRelations || "",
    yukhap: parsed?.yukhap || "",
    sinsalRaw: parsed?.sinsalRaw || "",
    twelveStageRaw: parsed?.twelveStageRaw || "",
    combinationsRaw: parsed?.combinationsRaw || "",
    clashesRaw: parsed?.clashesRaw || "",
    punishmentsRaw: parsed?.punishmentsRaw || "",
    harmsRaw: parsed?.harmsRaw || "",
    breaksRaw: parsed?.breaksRaw || "",
  };
}

function pillarDisplay(label, pillar, fallbackGanji = "") {
  if (pillar?.ganji) {
    const elementHint = pillar.elementHint ? ` ${pillar.elementHint}` : "";
    return `${label} ${pillar.ganji}${elementHint}`.trim();
  }
  return fallbackGanji ? `${label} ${fallbackGanji}` : `${label} 정보`;
}

function chapterOneAnchors(signals, profile) {
  const yearPillarText = pillarDisplay("년주", signals.yearPillar, signals.yearBranch || "");
  const monthPillarText = pillarDisplay("월주", signals.monthPillar, signals.monthBranch || "");
  const dayPillarText = pillarDisplay("일주", signals.dayPillar, signals.dayMaster || "");
  const hourPillarText = profile.timeKnown
    ? pillarDisplay("시주", signals.hourPillar, signals.timeLabel || "")
    : "시주는 태어난 시각이 비어 있어 앞선 세 기둥의 비중이 더 크게 드러납니다.";
  const dominant = signals.dominantElement || signals.useful || "토";
  const weakest = signals.weakestElement || signals.caution || "수";
  const powerLabel = signals.powerLabel || "강약 균형형";
  const season = BRANCH_TO_SEASON[signals.monthBranch] || "계절 전환기";
  const tenGod = signals.topTenGod || "복합 십성";
  return {
    yearPillarText,
    monthPillarText,
    dayPillarText,
    hourPillarText,
    dominant,
    weakest,
    powerLabel,
    season,
    tenGod,
  };
}

function buildChapterOneCategoryText(profile, signals, categoryTitle, categoryIndex) {
  const anchors = chapterOneAnchors(signals, profile);
  const relationText = [signals.heavenlyRelations, signals.earthlyRelations, signals.yukhap].filter(Boolean).join(" / ") || "기둥 사이에는 결속과 긴장이 동시에 있어 한쪽으로만 해석하기보다 상호작용 전체를 읽는 것이 중요합니다.";
  const johuText = signals.johuType
    ? `조후는 ${signals.johuType} 흐름으로 읽혀, ${signals.useful} 기운을 생활 환경으로 끌어올릴수록 사주의 장점이 빨리 살아납니다.`
    : `${anchors.season} 기운에서 태어난 만큼 계절의 온도와 속도를 함께 고려해야 원국 해석이 현실 감각을 잃지 않습니다.`;

  if (categoryIndex === 0) {
    return [
      `${profile.name}님의 원국은 ${anchors.yearPillarText}, ${anchors.monthPillarText}, ${anchors.dayPillarText}, ${anchors.hourPillarText}라는 네 기둥으로 짜여 있습니다. 원국 전체 구조를 볼 때 가장 먼저 드러나는 특징은 일간 ${signals.dayMaster}를 중심축으로 월지 ${signals.monthBranch}의 생활 환경이 강하게 작동한다는 점입니다. 즉, 이 사주는 타고난 본질과 현실 조건이 분리되어 움직이기보다 서로를 밀고 당기며 삶의 결을 만드는 구조입니다. 그래서 어떤 선택을 하든 마음속 기준만으로 끝나지 않고, 실제 환경이 그 기준을 시험하는 장면이 자주 나타납니다.`,
      `${relationText} 이런 배열은 한 번의 결심보다 축적된 판단 습관이 인생 전체의 방향을 좌우한다는 뜻이기도 합니다. 년주는 뿌리와 배경, 월주는 생존 환경, 일주는 자아와 내면, 시주는 후반부의 결실을 담당하는데, 네 기둥이 서로 다른 목소리를 내더라도 결국 ${signals.dayMaster} 일간이 무엇을 붙잡고 버틸지를 기준으로 재정렬됩니다. 이 때문에 삶이 느슨하게 흘러가기보다는, 중요한 전환점마다 스스로 기준을 다시 세우게 되는 경우가 많습니다.`,
      `원국의 첫인상만 보면 차분하게 구조를 읽는 힘과 쉽게 타협하지 않는 내적 기준이 함께 보입니다. 특히 용신 ${signals.useful}, 희신 ${signals.support}, 기신 ${signals.caution}의 배치는 이 사람이 무엇을 더할 때 운이 살아나고 무엇을 과도하게 밀어붙일 때 균형이 깨지는지를 분명하게 알려 줍니다. 따라서 이 원국은 막연히 좋은 기운을 기다리는 사주가 아니라, 자기 기질을 구조로 바꾸는 순간부터 운의 방향이 또렷해지는 사주라고 정리할 수 있습니다.`,
    ].join("\n\n");
  }

  if (categoryIndex === 1) {
    return [
      `일간 ${signals.dayMaster}는 이 사람의 본질이 어디에서 힘을 얻고 무엇을 기준으로 움직이는지를 보여 줍니다. 일간이 중심에 놓였다는 것은 겉으로 보이는 역할보다 스스로 납득할 수 있는 이유를 더 중시한다는 뜻입니다. 그래서 억지로 맞추는 선택에는 오래 버티지 못하지만, 한 번 의미를 인정한 일에는 예상보다 깊이 파고드는 면이 있습니다. ${anchors.dayPillarText}가 보여 주는 결은 겉으로는 침착해 보여도 내면에서는 감정과 판단이 동시에 작동하는 타입에 가깝습니다.`,
      `여기에 ${anchors.powerLabel} 성향이 겹치면 에너지를 쓰는 방식도 분명해집니다. 힘이 바깥으로 강하게 뻗는 날에는 추진력과 결단이 장점이 되지만, 반대로 마음이 닫히는 구간에서는 같은 힘이 고집이나 자기 압박으로 변할 수 있습니다. 그래서 이 일간은 무조건 강하거나 무조건 부드럽다고 설명하기보다, 자신이 옳다고 여기는 기준을 얼마나 현실적으로 다룰 수 있는지가 핵심이라고 보는 편이 정확합니다.`,
      `또한 ${anchors.tenGod} 성향이 두드러진다는 점은 일간의 본질이 사람을 대하는 방식, 일을 처리하는 방식, 돈을 바라보는 방식까지 연결된다는 뜻입니다. 결국 ${signals.dayMaster} 일간의 장점은 예민함 자체가 아니라 예민함을 구조로 바꾸는 능력입니다. 자기 안에서만 돌리면 피로와 집착이 되지만, 글과 서비스, 분석, 기획, 상담처럼 밖으로 꺼내면 오히려 이 사람만의 설득력과 해석력으로 바뀝니다.`,
    ].join("\n\n");
  }

  if (categoryIndex === 2) {
    return [
      `월지 ${signals.monthBranch}는 태어난 계절이 이 사람에게 어떤 기본 환경을 부여했는지를 보여 줍니다. ${anchors.season} 기운에서 출발한 원국은 태생적으로 삶을 읽는 속도와 체감 온도가 분명합니다. 같은 사건을 겪어도 누군가는 빨리 털고 가지만, 이 사주는 환경이 주는 압력과 감정의 잔향을 함께 저장하기 때문에 경험을 그냥 지나치지 않습니다. ${anchors.monthPillarText}가 중요한 이유도 여기에 있습니다. 월주는 사회와 현실, 생존 감각을 다루는 자리라서 이 기둥이 강하면 현실 판단이 예민해지고, 약하면 환경 변화에 쉽게 소모될 수 있습니다.`,
      `${johuText} 그래서 이 원국은 계절을 무시한 채 의지만으로만 밀어붙일수록 피로가 커질 수 있습니다. 환경이 차갑게 작용하는 흐름에서는 마음보다 구조를 먼저 세우는 것이 필요하고, 반대로 열이 과해지는 흐름에서는 속도를 늦추고 균형을 잡는 쪽이 유리합니다. 여기서 말하는 균형은 소극성이 아니라, 언제 밀고 언제 식혀야 하는지 아는 운영 감각에 가깝습니다.`,
      `월지는 또한 인간관계와 직업 환경에서 어떤 무드를 자주 만나게 되는지도 보여 줍니다. ${signals.monthBranch}가 만든 삶의 무대에서는 사람과 일이 동시에 들어올 때 우선순위를 어떻게 정하느냐가 중요합니다. 자기 속도를 지키지 못하면 주변 기대에 끌려가고, 반대로 환경을 너무 경계하면 좋은 기회까지 차단하게 됩니다. 결국 월지 해석의 핵심은 어떤 계절에 태어났는가가 아니라, 그 계절의 압력을 자기 방식으로 소화할 수 있는가에 있습니다.`,
    ].join("\n\n");
  }

  if (categoryIndex === 3) {
    return [
      `오행 균형을 보면 ${ELEMENT_KEY_TO_KO[STEM_TO_ELEMENT[String(signals.dayMaster || "")] || "earth"] || signals.dayMaster} 일간이 움직이는 바탕 위에서 최강 오행은 ${anchors.dominant}, 최약 오행은 ${anchors.weakest} 쪽으로 읽힙니다. 이는 단순히 강한 오행이 좋고 약한 오행이 나쁘다는 뜻이 아니라, 삶의 흐름이 어느 방향으로 과열되고 어느 지점에서 자주 비어 버리는지를 보여 주는 지도에 가깝습니다. 강한 힘은 추진력과 전문성, 몰입을 만들지만 과하면 독선과 과속이 되고, 약한 힘은 불안과 부족감으로 느껴지지만 잘 보완하면 운을 바꾸는 입구가 됩니다.`,
      `용신 ${signals.useful}과 희신 ${signals.support}은 이 균형을 실전적으로 조정하는 손잡이입니다. 이 기운이 살아나는 환경에서는 생각이 정리되고 사람을 대하는 태도도 안정되며, 결과를 내는 속도도 한층 자연스러워집니다. 반대로 기신 ${signals.caution}이 과열되는 상황에서는 같은 능력도 소모적으로 쓰일 가능성이 큽니다. 그래서 이 사주는 능력이 없어서 막히는 구조가 아니라, 균형을 잃었을 때 장점이 오히려 피로의 원인이 되는 구조라고 보는 편이 맞습니다.`,
      `오행 해석의 결론은 분명합니다. 이 사람의 기질은 하나의 성격으로 고정돼 있는 것이 아니라, 어떤 기운을 얼마나 오래 끌고 가느냐에 따라 전혀 다른 표정을 보일 수 있습니다. 따라서 중요한 시기일수록 감정으로만 결정을 끝내지 말고, 에너지가 새는 지점과 힘이 붙는 지점을 주간 단위로 기록해 두는 것이 좋습니다. 그렇게 해야 원국의 장점이 일시적 컨디션이 아니라 꾸준한 삶의 구조로 자리 잡습니다.`,
    ].join("\n\n");
  }

  return [
    `원국에서 가장 강한 힘은 ${anchors.dominant} 기운과 ${anchors.tenGod} 성향이 맞물리며 만들어 내는 해석력과 집중력입니다. 이 힘은 한 번 방향을 잡았을 때 깊이 있게 파고들고, 복잡한 흐름을 자기 언어로 정리해 내는 능력으로 나타납니다. 특히 ${anchors.yearPillarText}와 ${anchors.dayPillarText}가 연결되는 방식은 이 사람이 쉽게 흔들리는 사람이라기보다, 흔들리더라도 결국 자기 기준을 다시 세우는 사람이라는 점을 보여 줍니다.`,
    `반대로 약한 지점은 ${anchors.weakest} 기운이 비는 자리에서 드러납니다. 여기서는 감정 소화, 체력 배분, 관계 거리 조절처럼 눈에 잘 보이지 않는 운영력이 흔들리기 쉽습니다. 즉 마음속에서는 이미 많은 것을 알고 있어도 그것을 현실의 속도와 결과물로 옮기는 과정에서 피로가 쌓일 수 있습니다. 이때 문제는 능력 부족이 아니라 배치와 순서의 문제인 경우가 많습니다. 무엇을 먼저 세우고 무엇을 나중에 확장할지 정하지 않으면, 강점이 오히려 과부하로 바뀔 수 있습니다.`,
    `결국 이 원국의 관건은 강한 힘을 더 키우는 것보다, 약한 지점을 운영 가능한 방식으로 보완하는 데 있습니다. ${signals.useful} 기운이 들어오는 방향을 삶의 기본 환경으로 만들고 ${signals.caution}이 과열되는 상황을 미리 차단하면, 이 사주는 단순히 버티는 구조가 아니라 스스로 세계를 세워 가는 구조로 바뀝니다. 그래서 Chapter 1의 결론은 분명합니다. 이 사람의 팔자는 고통을 통찰로 바꾸고, 통찰을 구조로 만들어 결국 자기 삶의 방향을 증명해 가는 사주입니다.`,
  ].join("\n\n");
}

function formatElementRatio(ratio = {}) {
  return `목 ${safeNumber(ratio.wood, 0)}%, 화 ${safeNumber(ratio.fire, 0)}%, 토 ${safeNumber(ratio.earth, 0)}%, 금 ${safeNumber(ratio.metal, 0)}%, 수 ${safeNumber(ratio.water, 0)}%`;
}

function topTenGodSummary(tenGodStats = {}) {
  const top = Array.isArray(tenGodStats.top) ? tenGodStats.top : [];
  if (!top.length) return "복합 십성";
  return top.map((entry) => `${entry.key} ${safeNumber(entry.pct, 0)}%`).join(", ");
}

function pickMonthScores(monthlyFlow = [], direction = "high") {
  const sorted = (Array.isArray(monthlyFlow) ? monthlyFlow : [])
    .slice()
    .sort((a, b) => direction === "high" ? safeNumber(b.score, 0) - safeNumber(a.score, 0) : safeNumber(a.score, 0) - safeNumber(b.score, 0))
    .slice(0, 3)
    .map((entry) => `${entry.month}월(${safeNumber(entry.score, 0)}점)`);
  return sorted.length ? sorted.join(", ") : "시기 데이터 정리 중";
}

function buildChapterAnalysisContext(profile, signals) {
  const payload = deriveLifeBookPayload(profile, signals, []);
  const elementBalance = payload.elementBalance || deriveElementBalance(profile, signals);
  const tenGodStats = payload.tenGodStats || deriveTenGodStats(profile, signals);
  const monthlyFlow = Array.isArray(payload?.timing?.monthlyFlow) ? payload.timing.monthlyFlow : [];
  const dominantElement = ELEMENT_KEY_TO_KO[elementBalance.dominant] || signals.dominantElement || signals.useful || "토";
  const deficientElement = ELEMENT_KEY_TO_KO[elementBalance.deficient] || signals.weakestElement || signals.caution || "수";
  return {
    payload,
    elementBalance,
    tenGodStats,
    monthlyFlow,
    dominantElement,
    deficientElement,
    elementRatioText: formatElementRatio(elementBalance.ratio),
    topTenGodText: topTenGodSummary(tenGodStats),
    bestMonths: pickMonthScores(monthlyFlow, "high"),
    cautionMonths: pickMonthScores(monthlyFlow, "low"),
    currentDaewun: payload?.timing?.currentDaeun?.label || signals.currentDaewun || signals.rhythm,
    nextDaewun: payload?.timing?.nextDaeun?.label || `${signals.monthBranch} 이후 전환`,
    relationText: [signals.heavenlyRelations, signals.earthlyRelations, signals.yukhap].filter(Boolean).join(" / ") || "기둥 사이의 합과 충이 동시에 작동해 관계와 선택에서 균형 감각이 중요합니다.",
    johuText: signals.johuType || payload?.johu?.summary || "중립",
    balanceScore: safeNumber(elementBalance.balanceScore, 0),
    realityPct: safeNumber(tenGodStats.realityPct, 0),
    emotionPct: safeNumber(tenGodStats.emotionPct, 0),
    authorityPct: safeNumber(tenGodStats.authorityPct, 0),
    introspectPct: safeNumber(tenGodStats.introspectPct, 0),
    specialStars: payload?.specialStars || { taoPct: 0, yeokmaPct: 0, hwaPct: 0, hasGwimun: false, list: [] },
    structureName: signals.jongName || payload?.structure?.geokguk || `${signals.dayMaster} 중심 구조`,
  };
}

function buildCalculatedCategoryText(profile, signals, chapterId, categoryTitle, categoryIndex) {
  const ctx = buildChapterAnalysisContext(profile, signals);
  const chapterLabel = `제${Number(chapterId) || 0}장`;

  if (chapterId === "02") {
    const introSet = [
      `${chapterLabel}의 ${categoryTitle}은 월지 ${signals.monthBranch}와 계절 ${BRANCH_TO_SEASON[signals.monthBranch] || "전환기"}의 압력이 일간 ${signals.dayMaster}에 어떻게 걸리는지에서 출발합니다. 이 사주는 태어난 환경의 온도와 속도를 무시하면 기질 해석이 빗나가기 쉽고, 반대로 월지의 조건을 먼저 읽으면 왜 같은 능력을 가지고도 특정 공간과 사람 앞에서 반응이 달라지는지가 선명해집니다.`,
      `${categoryTitle}을 보면 일간 ${signals.dayMaster}의 생존 방식은 신강/신약 ${signals.powerLabel || "균형형"} 판정과 맞물려 작동합니다. 힘이 충분할 때는 스스로 판을 짜고 밀어붙이는 쪽이 강점이 되지만, 균형이 흔들릴 때는 같은 힘이 자기 압박과 과잉 책임감으로 바뀌므로 강약을 읽는 것이 곧 생존 전략이 됩니다.`,
      `${categoryTitle}에서 가장 중요한 계산 근거는 조후 ${ctx.johuText}와 용신 ${signals.useful}, 희신 ${signals.support}의 조합입니다. 같은 사주라도 계절 보정이 맞지 않으면 실력이 있어도 몸과 마음이 먼저 지치기 때문에, 조후는 단순 설명이 아니라 실제 생활 조건을 설계하는 기준으로 읽어야 합니다.`,
      `${categoryTitle}은 오행과 십성 분포가 감정의 온도와 행동 패턴으로 어떻게 번역되는지를 보는 자리입니다. 현재 오행 분포 ${ctx.elementRatioText}와 상위 십성 ${ctx.topTenGodText}를 함께 보면, 이 사람은 감정 반응을 바로 표출하기보다 내부 기준으로 한 번 걸러낸 뒤 움직이는 경향이 강합니다.`,
      `${categoryTitle}을 실제로 편하게 만드는 조건은 추상적 위로가 아니라, 용신 ${signals.useful}이 살아나는 환경과 기신 ${signals.caution}이 과열되지 않는 리듬을 만드는 데 있습니다. 결국 이 장은 타고난 기질을 바꾸려는 장이 아니라, 이미 계산된 구조를 덜 소모적으로 운영하는 방법을 찾는 장입니다.`,
    ];
    const detailSet = [
      `월지 중심 해석에서는 현실 적응력이 곧 기질의 절반입니다. ${ctx.relationText} 같은 기둥 간 상호작용까지 함께 보면, 환경이 안정될수록 판단이 날카로워지고 환경이 불안정할수록 예민함이 과열되는 구조가 읽힙니다. 그래서 직업, 인간관계, 주거 공간을 고를 때도 단순히 좋아 보이는 조건보다 내 호흡을 길게 유지할 수 있는지를 먼저 따져야 합니다.`,
      `일간의 강약은 능력의 많고 적음이 아니라 에너지 사용 방식의 차이입니다. 오행 균형 점수 ${ctx.balanceScore}점은 과하게 밀어붙이기보다 힘을 배분할 때 결과가 좋아지는 타입임을 보여 주고, ${ctx.topTenGodText}는 의사결정이 감정 하나가 아니라 일, 관계, 책임이 섞인 계산 위에서 나온다는 점을 보강합니다.`,
      `조후가 맞는 환경에서는 생각과 실행의 타이밍이 자연스럽게 붙지만, 어긋나는 환경에서는 같은 재능도 산만함과 피로로 흐르기 쉽습니다. 특히 부족 오행 ${ctx.deficientElement}을 보완하지 않으면 장기전에서 체력과 집중력이 먼저 무너지기 쉬우므로, 조후 보정은 컨디션 관리이자 성과 관리입니다.`,
      `정서적 온도는 감성적인지 이성적인지를 넘어서, 무엇을 불편으로 느끼고 무엇을 안전으로 느끼는지와 연결됩니다. 이 사주는 감정 비중 ${ctx.emotionPct}%와 권위 비중 ${ctx.authorityPct}%가 함께 작동해 사람을 대할 때도 따뜻함과 기준 제시를 동시에 요구하는 편이라, 경계가 흐려진 관계에서는 오히려 더 빨리 지칠 수 있습니다.`,
      `편한 환경은 무조건 쉬운 곳이 아니라 ${signals.useful} 기운이 반복적으로 공급되는 구조입니다. 일정이 과도하게 흔들리거나 관계 압박이 커질 때 ${signals.caution} 기운이 과열되면 계산 실수와 감정 누수가 동시에 발생하므로, 환경 조건을 세우는 일은 사치가 아니라 운을 보존하는 장치입니다.`,
    ];
    const actionSet = [
      `따라서 월지 중심 해석의 실전 포인트는 환경 선택을 운의 일부로 보는 것입니다. 일하는 시간대, 사람 밀도, 의사결정 속도를 조정해 ${signals.monthBranch} 월지가 버틸 수 있는 리듬을 만들면 사주 전체의 장점이 훨씬 안정적으로 드러납니다.`,
      `실행에서는 강한 날과 약한 날을 같은 기준으로 운영하지 않는 것이 중요합니다. 추진이 붙는 날에는 핵심 결정을 몰아서 처리하고, 피로가 높아지는 날에는 판단보다 정리와 검토를 앞세워야 일간의 힘이 낭비되지 않습니다.`,
      `조후 관점에서는 몸이 먼저 편해야 판단이 정교해집니다. ${signals.useful} 기운이 들어오는 공간, 색채, 일정 패턴을 의식적으로 늘리고 ${ctx.cautionMonths}처럼 흐름이 약해지는 구간에는 속도보다 체력 보존을 우선해야 합니다.`,
      `정서 관리에서는 느낀 것을 바로 관계에 쏟기보다 하루 정도 문장으로 정리한 뒤 대응하는 것이 유리합니다. 이렇게 해야 감정 반응이 전략으로 바뀌고, 사람 문제 때문에 자기 리듬이 흔들리는 일을 줄일 수 있습니다.`,
      `환경 조건은 작게라도 매일 재현해야 효과가 납니다. 작업 장소, 수면 시간, 관계 거리, 회복 루틴을 고정해 ${signals.useful}/${signals.support} 기운이 생활의 기본값이 되도록 설계하는 것이 Chapter 2의 결론입니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  if (chapterId === "03") {
    const introSet = [
      `${categoryTitle}은 용신 ${signals.useful}과 희신 ${signals.support}이 실제 삶에서 어떤 역할을 맡는지 해석하는 자리입니다. 이 사주는 단순히 좋은 기운을 하나 정답처럼 붙이는 구조가 아니라, 오행 분포 ${ctx.elementRatioText} 속에서 어떤 요소를 더할 때 전체 흐름이 매끄러워지는지가 분명한 편입니다.`,
      `${categoryTitle}은 희신 ${signals.support}이 열어주는 보조 통로를 읽는 항목입니다. 용신이 엔진이라면 희신은 가속이 붙는 조건에 가깝고, 이 보조선이 살아날 때 인간관계와 기회 포착 속도가 동시에 좋아집니다.`,
      `${categoryTitle}에서는 기신 ${signals.caution}과 부족 오행 ${ctx.deficientElement}이 반복 문제를 어떻게 만들고 있는지 점검해야 합니다. 막히는 이유를 외부 탓으로만 돌리면 같은 패턴이 반복되지만, 어떤 상황에서 ${signals.caution}이 과열되는지를 알면 소모를 줄일 수 있습니다.`,
      `${categoryTitle}은 상위 십성 ${ctx.topTenGodText}와 격국 ${ctx.structureName}을 실제 성장 전략으로 번역하는 과정입니다. 이 사주는 강점을 많이 갖고 있어도 모든 방향에 동시에 힘을 쓰면 분산되기 쉬우므로, 성장 전략은 선택과 집중의 문제로 접근해야 합니다.`,
      `${categoryTitle}은 개운을 미신처럼 다루지 않고, 계산된 구조를 생활 습관으로 바꾸는 항목입니다. 결국 개운은 좋은 날을 기다리는 행위가 아니라 ${signals.useful} 기운이 머무는 조건을 반복적으로 만드는 운영 기술입니다.`,
    ];
    const detailSet = [
      `용신 후보가 실제 활용 방향이 되려면 결과가 나는 장면과 연결돼야 합니다. ${signals.useful} 기운이 작동할 때는 판단이 정리되고 관계에서 불필요한 마찰이 줄며, 재정이나 일에서도 우선순위가 분명해지는 흐름이 나타납니다. 그래서 용신은 머리로만 아는 요소가 아니라 하루의 리듬, 공간, 협업 방식으로 내려와야 힘을 냅니다.`,
      `희신은 용신만큼 강하게 드러나지 않지만, 기회의 문턱을 낮추는 역할을 합니다. 특히 ${ctx.bestMonths}처럼 흐름 점수가 좋은 구간에는 ${signals.support} 기운과 연결된 활동에서 사람과 정보가 더 잘 붙으므로, 보조 운을 적극적으로 써야 큰 흐름도 부드럽게 이어집니다.`,
      `기신이 문제인 이유는 나쁜 기운이어서가 아니라 과열되면 장점의 방향을 틀어 버리기 때문입니다. 이 사주에서는 ${signals.caution} 성향이 강해질수록 과속, 집착, 관계 피로, 지출 누수 같은 형태로 드러날 가능성이 높고, 특히 ${ctx.cautionMonths}에는 같은 패턴이 쉽게 재발할 수 있습니다.`,
      `성장 전략을 짤 때는 나에게 없는 것을 억지로 붙이기보다 이미 강한 축을 안정적으로 복제하는 편이 맞습니다. ${ctx.topTenGodText}가 보여 주듯 이 사람은 특정 능력을 깊게 파고들 때 성과가 커지므로, 새로운 프로젝트도 지금 잘하는 방식과 연결될수록 성장 곡선이 안정됩니다.`,
      `실전 개운 포인트는 오행 보완, 사람 정리, 시간 설계 세 축으로 나눠 보는 것이 가장 정확합니다. ${signals.useful}/${signals.support}을 끌어오는 루틴이 늘수록 심리적 흔들림이 줄고, 기신 ${signals.caution}이 자극되는 자극원은 빨리 정리할수록 운의 마찰 비용이 낮아집니다.`,
    ];
    const actionSet = [
      `따라서 용신 활용은 중요한 결정을 할 때마다 "이 선택이 ${signals.useful} 기운을 늘리는가, 줄이는가"를 묻는 습관으로 시작하는 것이 좋습니다. 이 질문 하나만 고정해도 선택의 질이 달라집니다.`,
      `희신 운용에서는 무리한 확장보다 연결의 질을 높이는 쪽이 효과적입니다. 도움 되는 사람, 잘 맞는 업무 방식, 성과가 붙는 시간대를 기록해 희신의 작동 조건을 반복 재현해야 합니다.`,
      `기신 관리는 참는 것이 아니라 차단 순서를 정하는 일입니다. 피로를 키우는 일정, 관계, 소비 패턴을 목록으로 만들고 먼저 끊을 것 한 가지부터 실행하면 반복 문제의 강도가 눈에 띄게 줄어듭니다.`,
      `성장 전략은 한 번에 크게 바꾸기보다, 지금 잘되는 루틴을 더 자주 복제하는 방식이 유리합니다. 강점이 붙는 영역을 세 개 이하로 좁혀 집중하면 운의 밀도가 높아집니다.`,
      `개운 포인트는 감각적 기분보다 생활 구조로 검증해야 합니다. 공간 정리, 수면, 인간관계, 공부/일의 시간 블록을 ${signals.useful} 기준으로 재배열하는 것이 이 장의 핵심 실행안입니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  if (chapterId === "04") {
    const introSet = [
      `${categoryTitle}은 현재 대운 ${ctx.currentDaewun}이 사주 원국과 어떤 주제로 맞물리는지부터 읽어야 합니다. 대운은 단순 배경이 아니라 큰 생활 환경이 바뀌는 주기이므로, 이 시기의 중심 의제가 무엇인지 알아야 세부 선택도 흔들리지 않습니다.`,
      `${categoryTitle}에서는 현재 모습만이 아니라 이전 흐름이 남긴 습관을 함께 봐야 합니다. 대운은 지나가도 그 시기에 몸에 밴 사고방식과 방어 패턴은 오래 남기 때문에, 과거 흐름이 만든 성향을 읽는 것이 현재 운을 낭비하지 않는 첫 단계입니다.`,
      `${categoryTitle}은 다음 대운 ${ctx.nextDaewun}으로 넘어갈 때 무엇이 기회가 되고 무엇이 부담이 되는지를 미리 정리하는 구간입니다. 다음 흐름은 갑자기 오는 것이 아니라 이미 현재 대운 안에서 징후를 보이기 때문에, 변화의 전조를 일찍 읽을수록 전환 비용이 줄어듭니다.`,
      `${categoryTitle}은 대운이 바뀔 때 생기는 흔들림을 다루는 항목입니다. 운이 바뀌는 시기에는 좋은 요소도 불안정하게 느껴질 수 있으므로, 전환기의 주의점은 비관이 아니라 안전장치로 이해해야 합니다.`,
      `${categoryTitle}은 큰 흐름을 실제 로드맵으로 번역하는 마지막 정리입니다. 이 장의 목적은 운세를 듣고 끝나는 것이 아니라, 앞으로 몇 년간 어떤 순서로 움직여야 하는지 구조를 세우는 데 있습니다.`,
    ];
    const detailSet = [
      `현재 대운은 ${signals.dayMaster} 일간의 핵심 성향을 확대하거나 시험하는 역할을 합니다. 상위 십성 ${ctx.topTenGodText}와 오행 균형 ${ctx.elementRatioText}를 겹쳐 보면, 지금은 단기 성과보다 체질을 다시 세우는 선택이 더 큰 수익으로 이어질 가능성이 높습니다.`,
      `과거 대운의 영향은 현재의 방어 습관에서 드러납니다. 특히 ${ctx.relationText}처럼 관계와 선택의 긴장이 이미 명식에 있는 경우, 지나간 운에서 형성된 경계심이나 과속 습관이 여전히 남아 있을 가능성이 큽니다. 이 흔적을 모르면 현재 운까지 과거 방식으로 소비하게 됩니다.`,
      `다음 대운은 새로운 주제를 열어 주지만, 기존 강점을 다른 방식으로 쓰라고 요구하기도 합니다. ${ctx.bestMonths}처럼 기회 점수가 높은 시기는 준비된 사람에게 훨씬 유리하므로, 다음 대운의 기회는 미래의 보너스가 아니라 지금부터 미리 투자해야 할 자산으로 보는 편이 맞습니다.`,
      `전환기에는 부족 오행 ${ctx.deficientElement}이 흔들리기 쉬워 체력, 감정, 자금 흐름 중 한 축이 먼저 흔들릴 수 있습니다. 그래서 대운 전환기의 핵심은 새로운 일을 늘리는 것보다 기존 시스템의 누수를 먼저 막는 데 있습니다.`,
      `로드맵을 짤 때는 현재 대운의 핵심 과제, 다음 대운의 예고 신호, 월별 강약 ${ctx.bestMonths} / ${ctx.cautionMonths}를 한 화면에 놓고 보는 것이 좋습니다. 그래야 인생의 큰 파도를 막연한 감으로 맞지 않고, 준비된 이동으로 바꿀 수 있습니다.`,
    ];
    const actionSet = [
      `현재 대운에서는 이미 잘하는 것의 재현성과 지속성을 높이는 선택이 우선입니다. 무리한 확장보다 기반을 다지는 쪽이 몇 년 뒤의 도약 폭을 키웁니다.`,
      `과거 대운의 그림자를 정리하려면 반복적으로 무너졌던 패턴을 문장으로 남겨야 합니다. 언제 과속했고, 언제 스스로를 과하게 압박했는지 구조화하면 현재 대운에서 같은 함정을 피할 수 있습니다.`,
      `다음 대운 준비는 새로운 공부나 관계를 지금부터 조금씩 심어 두는 방식이 효과적입니다. 완전히 바뀌기를 기다리기보다, 전조가 보일 때부터 작은 연결을 만들어 두는 편이 운의 낙차를 줄입니다.`,
      `전환기에는 자금, 일정, 체력 중 가장 약한 한 축을 따로 보호해야 합니다. 이 세 가지 중 하나만 안정돼도 운 변화의 스트레스를 훨씬 잘 버틸 수 있습니다.`,
      `로드맵은 3개월, 1년, 3년 단위로 나눠 적는 것이 좋습니다. 이렇게 해야 큰 운의 흐름이 실제 행동 계획으로 내려오고, 막연한 불안이 전략으로 바뀝니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  if (chapterId === "05") {
    const introSet = [
      `${categoryTitle}은 격국 ${ctx.structureName}와 십성 구조 ${ctx.topTenGodText}를 바탕으로, 이 사람이 세상에서 어떤 방식으로 인정받는지를 읽는 항목입니다. 소명은 막연한 꿈이 아니라 명식이 반복해서 밀어주는 역할과 성과 패턴의 교집합에서 드러납니다.`,
      `${categoryTitle}은 사회적으로 인정받는 방식을 해석하는 자리입니다. 단순히 재능이 있는가보다 어떤 장면에서 영향력이 커지는가를 봐야 하고, 그 기준은 오행 균형과 십성 배치 안에 이미 들어 있습니다.`,
      `${categoryTitle}에서는 직업적 강점과 약점이 동시에 드러납니다. 강점은 이미 익숙해 쉽게 과소평가하기 쉽고, 약점은 컨디션에 따라 크게 흔들려 장기 설계에서 반드시 관리 대상이 됩니다.`,
      `${categoryTitle}은 명예와 성과가 어떤 브랜딩 방식으로 확장되는지 보는 항목입니다. 이 사주는 결과만 잘 내는 것보다 결과를 어떤 언어와 태도로 전달하는지가 성취 규모를 가르는 경우가 많습니다.`,
      `${categoryTitle}은 결국 이 사람이 세상에 어떤 가치를 제공할 때 가장 오래 빛나는지를 정리하는 자리입니다. 소명은 거창한 선언이 아니라, 반복해도 소모보다 의미가 더 커지는 일에서 발견됩니다.`,
    ];
    const detailSet = [
      `격국 구조는 일간 ${signals.dayMaster}, 월지 ${signals.monthBranch}, 용신 ${signals.useful}의 관계에서 읽어야 정확합니다. 이 명식은 한 가지 기술만으로 밀어붙이기보다, 해석력과 실행력을 묶어 문제를 풀어낼 때 사회적 역할이 분명해지는 구조입니다.`,
      `인정받는 방식은 상위 십성 ${ctx.topTenGodText}와 현실 비중 ${ctx.realityPct}%에서 힌트를 줍니다. 즉, 능력을 조용히 쌓는 것만으로 끝내지 말고 결과를 보이게 만드는 방식까지 함께 설계해야 사회적 평가가 커집니다.`,
      `직업적 강점은 깊이 파고드는 힘, 구조를 보는 힘, 반복을 견디는 힘에서 나올 가능성이 큽니다. 반대로 부족 오행 ${ctx.deficientElement}이 흔들리는 순간에는 체력 저하, 감정 소모, 관계 피로가 직업 성과를 직접 깎아먹을 수 있으므로 강점 못지않게 약점 관리가 중요합니다.`,
      `브랜딩 방향은 기질과 다른 가면을 쓰는 것이 아니라 명식의 강점을 이해하기 쉬운 언어로 번역하는 과정입니다. 이 사람은 ${signals.useful} 기운이 살아날 때 메시지가 정리되고, ${signals.caution}이 과열되면 표현이 급해지거나 방어적으로 바뀔 수 있습니다.`,
      `세상에 제공할 가치란 이 사람이 쉽게 하는 일을 타인이 명확한 도움으로 체감하는 방식입니다. 계산된 구조를 보면 분석, 기획, 정리, 조율, 상담, 제작처럼 복잡한 것을 이해 가능한 형태로 바꾸는 역할에서 효율이 높을 가능성이 큽니다.`,
    ];
    const actionSet = [
      `소명 설계에서는 잘하는 일과 오래 버틸 수 있는 일을 분리하지 않는 것이 중요합니다. 의미는 크지만 소모가 심한 일은 주력으로 삼기 어렵고, 반대로 안정적이지만 완전히 무의미한 일도 오래 끌기 힘듭니다.`,
      `인정받는 방식은 결과를 쌓는 것과 보여 주는 것을 함께 설계해야 완성됩니다. 실적 기록, 포트폴리오, 소개 문장, 협업 후기가 모두 소명의 외부 증거가 됩니다.`,
      `직업 전략에서는 강점을 키우는 루틴과 약점을 보호하는 루틴을 동시에 가져가야 합니다. 몰입 시간을 확보하고, 회복 루틴을 따로 잡아두면 장기전에서 격국의 힘이 살아납니다.`,
      `브랜딩은 과장보다 일관성이 중요합니다. 무엇을 잘하는지, 어떤 문제를 해결하는지, 어떤 방식으로 협업하는지를 한 문장으로 설명할 수 있어야 합니다.`,
      `가치 제공은 거창한 목표보다 반복 가능한 도움에서 시작합니다. 작은 성과를 꾸준히 재현하는 구조를 만들면 이 장의 소명 해석이 실제 커리어와 명예로 이어집니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  if (chapterId === "06") {
    const introSet = [
      `${categoryTitle}은 관계에서 반복되는 패턴을 명식 구조로 읽는 항목입니다. 이 사주는 ${ctx.relationText}처럼 결속과 긴장이 함께 있어, 가까워질수록 더 세밀한 기준과 거리 조절이 필요할 가능성이 큽니다.`,
      `${categoryTitle}에서는 어떤 사람이 에너지를 살리고 어떤 사람이 소모시키는지 판별해야 합니다. 관계 운은 무조건 좋은 사람을 만나는 문제가 아니라, 내 명식과 맞는 상호작용을 알아보는 문제에 가깝습니다.`,
      `${categoryTitle}은 가족, 동료, 친구처럼 역할이 다른 관계에서 무엇이 핵심 변수인지 보는 자리입니다. 같은 사람이라도 역할이 바뀌면 기대치와 갈등 방식이 달라지므로, 관계를 한 덩어리로 보지 않는 것이 중요합니다.`,
      `${categoryTitle}은 오해와 갈등의 구조를 읽는 항목입니다. 갈등은 성격 문제가 아니라 대개 기준, 속도, 거리감의 차이에서 생기고, 명식은 그 차이를 특히 어디에서 민감하게 느끼는지를 보여 줍니다.`,
      `${categoryTitle}은 좋은 인연을 오래 유지하는 운영법을 다룹니다. 인연운은 들어오는 것보다 유지하는 과정에서 더 큰 차이가 벌어지므로, 유지 전략은 관계 해석의 핵심입니다.`,
    ];
    const detailSet = [
      `상위 십성 ${ctx.topTenGodText}와 감정 비중 ${ctx.emotionPct}%를 보면 이 사람은 관계에서 따뜻함만을 찾기보다 신뢰 가능한 구조를 더 중시하는 편입니다. 그래서 말이 잘 통하는 것 이상으로, 약속을 지키고 감정을 과도하게 소모시키지 않는 사람과 있을 때 운이 안정됩니다.`,
      `도움 되는 사람은 ${signals.useful}/${signals.support} 기운을 자극하는 사람입니다. 함께 있을 때 생각이 정리되고, 결정이 선명해지고, 일과 생활 리듬이 흐트러지지 않는다면 맞는 인연일 가능성이 높습니다. 반대로 ${signals.caution}을 과열시키는 관계는 매력과 별개로 장기적으로 소모가 큽니다.`,
      `가족, 동료, 친구 관계의 핵심은 같은 기준을 모두에게 적용하지 않는 데 있습니다. 가족에게는 감정과 역사, 동료에게는 역할과 성과, 친구에게는 호흡과 진정성이 중요하게 작동하므로, 역할별 경계를 다르게 세워야 마찰이 줄어듭니다.`,
      `갈등은 대부분 말의 내용보다 타이밍과 온도에서 커집니다. 권위 비중 ${ctx.authorityPct}%가 작지 않은 명식은 기준이 무너질 때 예민해지기 쉽고, 상대가 그 이유를 모르면 차갑거나 कठोर하게 느낄 수 있습니다.`,
      `좋은 인연은 감정이 큰 사람보다 리듬이 맞는 사람일 가능성이 큽니다. 함께 있을 때 몸과 마음의 속도가 안정되고, 성과와 회복이 동시에 가능해진다면 그 인연은 명식에 맞는 관계 자산으로 볼 수 있습니다.`,
    ];
    const actionSet = [
      `관계 패턴을 바꾸려면 먼저 내가 반복해서 소모되는 장면을 기록해야 합니다. 어느 유형의 사람, 어떤 말투, 어떤 상황에서 에너지가 떨어지는지 명확히 알면 관계 선택이 쉬워집니다.`,
      `사람을 고를 때는 호감과 안정감을 분리해서 봐야 합니다. 호감이 높아도 안정감이 낮으면 장기적으로는 기신 구간을 자극할 가능성이 큽니다.`,
      `역할별 관계 원칙을 한 줄씩 정해 두는 것이 좋습니다. 가족에게는 어디까지 개입할지, 동료와는 어디까지 공유할지, 친구에게는 무엇을 기대할지를 미리 정하면 오해가 줄어듭니다.`,
      `갈등 상황에서는 즉시 결론을 내리기보다 하루 정도 간격을 두고 말하는 편이 유리합니다. 감정이 식은 뒤 기준을 설명하면 관계 손상을 줄이면서도 필요한 경계는 유지할 수 있습니다.`,
      `좋은 인연을 유지하려면 완벽한 이해보다 꾸준한 리듬이 더 중요합니다. 연락, 만남, 협업의 간격을 무리하지 않게 유지하는 것이 관계 운을 지키는 핵심입니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  if (chapterId === "07") {
    const introSet = [
      `${categoryTitle}은 일주 ${signals.dayPillar?.ganji || signals.dayMaster}와 관계 신호를 중심으로 사랑을 받아들이는 방식을 해석하는 자리입니다. 연애는 감정만의 영역이 아니라, 내 명식이 친밀함을 어떤 속도와 언어로 처리하는지에서 결정됩니다.`,
      `${categoryTitle}에서는 어떤 상대에게 끌리는지, 그리고 그 이유가 욕구인지 운의 합인지 구분해야 합니다. 명식은 단순 취향을 넘어 관계에서 반복적으로 반응하는 자극점을 보여 줍니다.`,
      `${categoryTitle}은 결혼운과 배우자궁을 현실 관점으로 읽는 항목입니다. 결혼운은 시기만이 아니라 함께 사는 방식, 역할 분담, 생활 리듬의 합까지 포함해서 봐야 정확합니다.`,
      `${categoryTitle}은 이별 패턴과 회복 방식의 구조를 정리하는 자리입니다. 연애가 끝나는 이유도 대부분 명식의 취약 지점에서 반복되므로, 반복 구조를 이해하면 상처를 다음 관계의 자산으로 바꿀 수 있습니다.`,
      `${categoryTitle}은 오래가는 사랑을 위해 어떤 운영 전략이 필요한지 다룹니다. 사랑이 유지되는 방식은 감정의 크기보다 생활 구조의 안정성과 더 깊게 연결됩니다.`,
    ];
    const detailSet = [
      `이 사람의 연애 성향은 상위 십성 ${ctx.topTenGodText}와 감정 비중 ${ctx.emotionPct}%에서 읽힙니다. 감정 표현이 아예 없는 타입은 아니지만, 마음이 움직여도 신뢰와 안정의 근거가 쌓여야 깊이 들어가는 경향이 있습니다. 그래서 빠른 전개에는 끌려도 오래 유지되는 관계는 따로일 가능성이 큽니다.`,
      `끌리는 상대는 대개 ${signals.useful}/${signals.support} 기운을 자극하는 특성을 갖습니다. 함께 있을 때 내 리듬이 선명해지고, 과도한 설명 없이도 생활 템포가 맞는 사람이 실제 궁합에서는 더 유리합니다. 반대로 강한 끌림이 있어도 ${signals.caution}을 자극해 불안과 집착을 키우는 상대는 오래 가기 어렵습니다.`,
      `결혼운은 배우자궁 해석만이 아니라 현실 운용 능력까지 포함해 봐야 합니다. 관계가 깊어질수록 금전, 집안일, 시간 배분 같은 생활 협상이 중요해지고, 여기서 명식의 권위 비중 ${ctx.authorityPct}%와 현실 비중 ${ctx.realityPct}%가 크게 작동합니다.`,
      `이별 패턴은 대부분 애정 부족보다 기대치 불일치, 속도 차이, 감정 소화 방식 차이에서 생깁니다. 특히 ${ctx.relationText}처럼 합과 충이 함께 있는 명식은 가까워질수록 좋은 면과 불편한 면이 동시에 커질 수 있어, 경계 없는 친밀감이 오히려 부담으로 바뀌기 쉽습니다.`,
      `오래가는 사랑은 상대로부터 모든 것을 채우려 하지 않을 때 시작됩니다. 내 리듬과 회복 루틴이 안정돼 있어야 상대와도 건강한 거리 유지가 가능하고, 그 위에서 친밀함도 오래 지속됩니다.`,
    ];
    const actionSet = [
      `연애에서는 마음이 생겼을 때 바로 몰입하기보다, 세 번 정도의 만남 동안 생활 리듬이 맞는지 확인하는 절차를 두는 것이 좋습니다. 감정의 크기보다 리듬의 안정성이 더 중요합니다.`,
      `이상형을 정리할 때는 외적 조건보다 내 리듬을 망가뜨리지 않는 특성을 먼저 적어야 합니다. 결국 오래 가는 상대는 나를 과열시키지 않는 사람입니다.`,
      `결혼을 생각하는 관계라면 초기에 역할 분담과 돈, 시간, 가족 경계에 대한 대화를 반드시 해 두는 편이 좋습니다. 생활 구조가 맞아야 애정도 오래 갑니다.`,
      `이별 후에는 상대를 분석하기보다 내가 어떤 패턴에서 무너졌는지 먼저 적어 두어야 합니다. 그래야 다음 관계에서 같은 상처를 반복하지 않습니다.`,
      `오래가는 사랑의 전략은 간단합니다. 관계 밖의 내 삶을 탄탄하게 유지하고, 감정이 큰 날일수록 말보다 구조를 먼저 조정하는 것입니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  if (chapterId === "08") {
    const introSet = [
      `${categoryTitle}은 재성 흐름과 현실 비중 ${ctx.realityPct}%를 바탕으로 돈이 들어오고 유지되는 구조를 읽는 항목입니다. 재물운은 수입 크기 하나보다, 어떤 방식으로 벌고 어떻게 보존하는지가 더 중요합니다.`,
      `${categoryTitle}은 소비·저축·투자 성향이 명식 안에서 어떤 균형을 이루는지 해석하는 자리입니다. 돈을 대하는 습관은 성격이 아니라 오행과 십성의 반복 반응으로 볼 때 훨씬 명확해집니다.`,
      `${categoryTitle}에서는 직업성인지 사업성인지, 혹은 둘을 어떻게 섞어야 하는지 판단해야 합니다. 돈의 흐름은 일의 구조와 붙어 있으므로 직업 전략 없이 재물운만 따로 보기 어렵습니다.`,
      `${categoryTitle}은 돈이 새는 패턴을 읽는 항목입니다. 재물운이 좋아도 누수 구조를 방치하면 체감 자산은 늘지 않으므로, 누수 해석은 수익 해석만큼 중요합니다.`,
      `${categoryTitle}은 수익과 커리어를 함께 키우는 마지막 정리입니다. 결국 재물운은 좋아지는 시기만 기다리는 것이 아니라, 돈이 붙는 구조를 반복 가능하게 만드는 데서 완성됩니다.`,
    ];
    const detailSet = [
      `이 사주의 돈 버는 방식은 재성 비중뿐 아니라 상위 십성 ${ctx.topTenGodText}와 용신 ${signals.useful}에서 힌트를 얻습니다. 즉, 단순히 많이 일한다고 돈이 붙는 구조가 아니라, 맞는 방식으로 일할 때 수익 효율이 훨씬 커지는 편입니다.`,
      `소비와 저축 패턴은 감정 비중 ${ctx.emotionPct}%와 현실 비중 ${ctx.realityPct}%의 균형을 보면 읽힙니다. 감정 기복이 큰 날 소비가 늘어나는지, 불안할 때 현금을 과하게 움켜쥐는지 같은 습관은 명식의 취약 지점과 연결돼 있을 가능성이 큽니다.`,
      `직업성/사업성 판단에서는 혼자 깊게 파고드는 것이 맞는지, 사람과 연결해 확장하는 것이 맞는지 구분해야 합니다. 이 명식은 ${signals.useful}/${signals.support} 기운이 살아나는 환경에서 성과가 자연스럽게 돈으로 이어질 가능성이 크므로, 업무 구조를 운과 분리해서 볼 수 없습니다.`,
      `돈이 새는 패턴은 대부분 피로와 관계에서 시작됩니다. ${signals.caution}이 과열될 때는 충동 소비, 잘못된 투자, 무리한 호의, 계획 없는 확장처럼 다양한 형태의 누수가 생길 수 있어, 기신 관리가 곧 재무 관리가 됩니다.`,
      `수익과 커리어를 함께 키우려면 단기 현금 흐름과 장기 포지셔닝을 동시에 관리해야 합니다. 바로 돈이 되는 일과 내 값을 높이는 일을 적절히 섞을 때 재물운도 훨씬 안정적으로 커집니다.`,
    ];
    const actionSet = [
      `재물 구조를 다루는 첫 단계는 어떤 일에서 가장 자연스럽게 돈이 붙는지 기록하는 것입니다. 많이 버는 일보다 덜 지치며 반복 가능한 일이 장기 재물운에 더 유리합니다.`,
      `소비 관리에서는 감정 소비와 목적 소비를 분리하는 장치를 만들어야 합니다. 예산표보다 먼저, 피곤할 때 반복되는 지출 상황을 끊는 것이 효과적입니다.`,
      `직업과 사업 선택에서는 내가 잘하는 일, 시장이 원하는 일, 지속 가능한 일을 겹쳐 보는 판단이 필요합니다. 세 가지가 겹치는 영역이 실제 돈이 남는 자리입니다.`,
      `누수 방지는 큰 결단보다 작은 자동화가 더 좋습니다. 고정지출, 투자 한도, 관계 지출 기준을 정해 두면 기신 구간에도 손실 폭을 줄일 수 있습니다.`,
      `수익과 커리어를 함께 키우려면 지금의 현금 흐름을 지키면서도, 내 전문성을 값으로 전환하는 장치를 꾸준히 추가해야 합니다. 가격표, 포트폴리오, 후기, 시스템화가 모두 재물운의 일부입니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  if (chapterId === "09") {
    const introSet = [
      `${categoryTitle}은 오행 불균형과 부족 오행 ${ctx.deficientElement}을 중심으로 건강 취약점을 읽는 자리입니다. 건강운은 병명보다 먼저 몸이 어떤 방식으로 무너지는지, 그리고 무엇이 회복을 빠르게 하는지를 아는 것이 중요합니다.`,
      `${categoryTitle}은 스트레스가 몸과 마음에 어떻게 번역되는지 해석하는 항목입니다. 스트레스 반응은 심리 문제로만 보지 말고 명식의 에너지 흐름과 연결해 읽어야 실제 대처가 가능합니다.`,
      `${categoryTitle}은 번아웃 신호와 회복 순서를 정리하는 자리입니다. 번아웃은 갑자기 오는 것이 아니라, 약한 오행이 장기간 소모될 때 몸이 보내는 경고입니다.`,
      `${categoryTitle}은 생활 리듬 처방을 다루는 항목입니다. 건강운은 특별한 날의 관리보다 평소 반복되는 리듬에서 결정되므로, 명식에 맞는 생활 구조를 만드는 것이 핵심입니다.`,
      `${categoryTitle}은 멘탈 회복을 실제 루틴으로 바꾸는 마지막 단계입니다. 마음이 흔들릴 때 무엇을 먼저 회복해야 하는지 아는 사람이 위기에서도 훨씬 빨리 중심을 되찾습니다.`,
    ];
    const detailSet = [
      `현재 오행 분포 ${ctx.elementRatioText}를 보면 강한 기운과 약한 기운의 차이가 분명합니다. 강한 축은 과열되면 염증, 긴장, 과몰입처럼 나타날 수 있고, 약한 축은 에너지 저하, 냉각, 회복 지연처럼 드러날 수 있어 균형 관리가 중요합니다.`,
      `스트레스 반응은 상위 십성 ${ctx.topTenGodText}와 감정 비중 ${ctx.emotionPct}%에서 힌트를 줍니다. 이 사주는 스트레스를 겉으로 즉시 폭발시키기보다 안에서 오래 굴리는 경향이 있어, 겉보기보다 피로 누적이 빠를 수 있습니다.`,
      `번아웃은 보통 몸보다 의욕의 흔들림으로 먼저 옵니다. 해야 할 일을 알면서도 손이 안 나가고, 사람을 피하고 싶고, 수면과 식사 리듬이 흐트러지기 시작하면 이미 신호가 시작된 것입니다.`,
      `생활 리듬은 용신 ${signals.useful}과 희신 ${signals.support}을 매일 공급하는 방식으로 설계하는 것이 좋습니다. 반대로 ${signals.caution}이 과열되는 환경, 특히 ${ctx.cautionMonths}에는 과한 일정과 감정 소모를 줄이는 편이 유리합니다.`,
      `멘탈 회복은 생각을 고치는 것보다 몸의 리듬을 먼저 복구하는 쪽이 빠를 가능성이 큽니다. 부족 오행 ${ctx.deficientElement}을 보완하는 습관이 들어오면 감정 회복 속도도 함께 올라가는 구조입니다.`,
    ];
    const actionSet = [
      `건강 취약점은 막연히 두려워하기보다, 내 몸이 보내는 초기 신호를 체크리스트로 만드는 것이 좋습니다. 피로, 소화, 수면, 긴장도 중 가장 먼저 흔들리는 지표를 정해 보세요.`,
      `스트레스 대응에서는 무조건 참는 방식이 가장 불리합니다. 감정을 문장으로 기록하거나 몸을 먼저 움직이는 배출 루틴을 만들어 두면 누적이 줄어듭니다.`,
      `번아웃 징후가 보일 때는 생산성을 끌어올리려 하지 말고 먼저 회복 순서를 고정해야 합니다. 수면, 식사, 일의 우선순위를 바로잡는 것만으로도 하강 곡선을 늦출 수 있습니다.`,
      `생활 리듬 처방은 크게 만들 필요가 없습니다. 기상 시간, 집중 시간, 회복 시간 세 칸만 고정해도 몸은 훨씬 안정적으로 반응합니다.`,
      `멘탈 회복 루틴은 기분이 나쁠 때 생각을 설득하는 것이 아니라, 회복 행동을 자동으로 시작하게 만드는 장치여야 합니다. 산책, 호흡, 기록, 연락 차단처럼 바로 실행 가능한 루틴이 좋습니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  if (chapterId === "10") {
    const introSet = [
      `${categoryTitle}은 신살과 특수 기운을 점수화된 신호로 읽는 항목입니다. 현재 계산상 도화 ${safeNumber(ctx.specialStars.taoPct, 0)}점, 역마 ${safeNumber(ctx.specialStars.yeokmaPct, 0)}점, 화개 ${safeNumber(ctx.specialStars.hwaPct, 0)}점 흐름이 잡혀 있어, 어떤 특수 기운이 삶에서 더 자주 체감되는지 가늠할 수 있습니다.`,
      `${categoryTitle}은 보이지 않는 기호가 삶에서 어떤 방식으로 발현되는지 읽는 자리입니다. 신살은 운명을 결정하는 절대값이 아니라, 특정 장면에서 반응을 증폭시키는 보조 신호로 보는 편이 정확합니다.`,
      `${categoryTitle}은 신호를 장점으로 쓰는 방법을 다룹니다. 특수 기운은 통제되지 않으면 흔들림이 되지만, 이해하고 쓰면 개성과 기회가 됩니다.`,
      `${categoryTitle}은 위험 구간과 트리거를 파악하는 항목입니다. 특수 기운은 좋은 면과 과열 면이 늘 같이 오기 때문에, 리스크 관리가 해석의 절반입니다.`,
      `${categoryTitle}은 실전 조절법을 정리하는 마지막 단계입니다. 신살과 특수 기운은 두려워할 것이 아니라, 언제 켜지고 언제 꺼야 하는지 알면 훨씬 유용한 도구가 됩니다.`,
    ];
    const detailSet = [
      `도화 점수가 높으면 매력과 주목도가 올라가지만 시선과 관계 소모도 함께 늘 수 있습니다. 역마가 강하면 이동과 변화에 강점이 생기지만 안정감이 흔들릴 수 있고, 화개가 강하면 해석력과 몰입이 깊어지지만 고립감이 커질 수 있습니다.`,
      `이런 신호는 원국 구조와 따로 움직이지 않습니다. ${ctx.topTenGodText} 같은 십성 분포, ${ctx.relationText} 같은 관계 신호와 같이 볼 때 비로소 실제 발현 방식이 드러나므로, 특수 기운도 전체 사주의 일부로 해석해야 합니다.`,
      `장점으로 쓸 때는 어떤 기운이 나를 돋보이게 하는지, 어떤 기운이 나를 흔드는지를 분리해야 합니다. 예를 들어 도화는 표현력과 주목도를, 역마는 실행력과 이동성을, 화개는 깊이와 통찰을 강화하는 방향으로 쓰면 좋습니다.`,
      `위험 구간은 대체로 과열될 때 나타납니다. 관심이 많아질수록 경계가 무너지고, 변화가 많아질수록 루틴이 흔들리고, 몰입이 깊어질수록 사람을 멀리하게 되는 식의 패턴이 반복될 수 있습니다.`,
      `실전 조절법의 핵심은 점수가 높은 기운을 무조건 키우는 것이 아니라 필요한 장면에서만 쓰는 것입니다. 내 명식에 맞는 스위치처럼 다루어야 장점은 살고 부작용은 줄어듭니다.`,
    ];
    const actionSet = [
      `특수 기운 해석에서는 지금 내 삶에서 가장 자주 체감되는 장면을 먼저 적어 보세요. 주목, 이동, 고립 중 어디가 반복되는지가 현재 사용 중인 신호를 알려 줍니다.`,
      `발현 방식을 읽을 때는 사건 하나보다 반복 패턴을 보아야 합니다. 비슷한 종류의 일과 사람이 계속 들어온다면 이미 특정 기운이 강하게 활성화된 상태입니다.`,
      `장점으로 쓰려면 목적을 먼저 정한 뒤 기운을 연결해야 합니다. 보여야 할 때는 표현을, 움직여야 할 때는 이동을, 깊어져야 할 때는 몰입을 전략적으로 쓰는 식입니다.`,
      `위험 구간 관리에서는 과열 신호를 빠르게 끊는 장치가 중요합니다. 관계, 일정, SNS, 감정 기록 같은 트리거를 통제하면 특수 기운도 훨씬 안정적으로 운용됩니다.`,
      `조절법은 감각보다 규칙으로 남겨야 지속됩니다. 언제 사람을 만나고, 언제 이동하고, 언제 혼자 깊게 들어갈지 기준을 정해 두면 기운을 훨씬 안전하게 쓸 수 있습니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  if (chapterId === "11") {
    const introSet = [
      `${categoryTitle}은 위기가 반복해서 시작되는 트리거를 읽는 항목입니다. 위기 신호는 갑자기 오는 것처럼 보여도, 명식에서는 이미 어떤 조건에서 균형이 무너지는지가 반복적으로 나타납니다.`,
      `${categoryTitle}은 관계, 재정, 건강 세 축에서 어떤 위험 신호가 먼저 올라오는지 정리하는 자리입니다. 위기의 모습은 달라도 시작 지점은 의외로 비슷한 경우가 많습니다.`,
      `${categoryTitle}은 무너지는 지점의 공통 패턴을 읽는 항목입니다. 어떤 문제든 결국 같은 약한 축을 건드릴 때 무너진다면, 해결도 그 축을 보호하는 데서 시작해야 합니다.`,
      `${categoryTitle}은 반전 레버와 회복 루틴을 다룹니다. 위기를 막는 것만큼 중요한 것은, 흔들렸을 때 얼마나 빨리 중심을 되찾는가입니다.`,
      `${categoryTitle}은 위기 대응의 실행 우선순위를 확정하는 마지막 정리입니다. 실제 위기 상황에서는 모든 것을 동시에 고칠 수 없으므로, 먼저 잡아야 할 축을 아는 것이 중요합니다.`,
    ];
    const detailSet = [
      `이 명식의 위기 트리거는 대개 ${signals.caution} 기운이 과열되고 부족 오행 ${ctx.deficientElement}이 버티지 못할 때 강해집니다. 그 결과 관계에서는 예민함, 재정에서는 누수, 건강에서는 회복 저하처럼 서로 다른 형태로 보일 수 있습니다.`,
      `특히 ${ctx.cautionMonths}처럼 점수가 낮은 구간에는 작은 실수가 크게 느껴질 수 있습니다. 위기 신호를 초기에 알아차리려면 감정, 현금흐름, 수면 중 어떤 지표가 먼저 흔들리는지 평소에 파악해 두는 편이 좋습니다.`,
      `무너지는 공통 패턴은 늘 비슷한 이유를 갖습니다. 지나친 책임감, 과속, 경계 없는 관계, 회복 없는 몰입처럼 이미 알고 있던 문제들이 누적되다가 특정 시점에 한꺼번에 터지는 식입니다.`,
      `반전의 레버는 강점을 키우는 데만 있지 않습니다. 오히려 중요한 것은 가장 약한 축을 먼저 보호해 추가 손실을 막는 것이고, 그 위에서 ${signals.useful}/${signals.support} 기운이 살아나는 행동을 다시 올리는 것입니다.`,
      `실행 우선순위는 위기의 종류마다 달라도 기본 원칙은 같습니다. 상황을 멈추고, 손실을 줄이고, 호흡을 회복하고, 그 다음에 판단하는 순서가 가장 안전합니다.`,
    ];
    const actionSet = [
      `반복 위기 트리거는 사건 직후가 아니라 안정된 날에 목록으로 정리해야 합니다. 그래야 실제 위기가 왔을 때 바로 사용할 수 있습니다.`,
      `위기 신호는 세부 정보보다 초반 징후를 빠르게 잡는 것이 중요합니다. 관계 피로, 지출 급증, 수면 붕괴 중 하나만 보여도 즉시 속도를 줄이세요.`,
      `무너지는 패턴을 끊으려면 혼자 버티는 습관부터 수정해야 합니다. 도움 요청, 일정 조정, 지출 중단처럼 외부 조치를 빠르게 쓰는 편이 회복이 빠릅니다.`,
      `반전 레버는 크지 않아도 됩니다. 산만한 문제를 한 번에 풀려 하지 말고, 지금 가장 큰 손실을 만드는 축 하나만 먼저 멈추는 것이 핵심입니다.`,
      `실행 우선순위는 미리 적어 두면 위기 때 훨씬 강력합니다. 1순위 중단, 2순위 보호, 3순위 회복, 4순위 재개라는 구조만 있어도 흔들림을 줄일 수 있습니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  if (chapterId === "12") {
    const introSet = [
      `${categoryTitle}은 삶의 방향성을 장기 흐름 속에서 읽는 자리입니다. 현재 대운 ${ctx.currentDaewun}, 다음 대운 ${ctx.nextDaewun}, 월별 점수 ${ctx.bestMonths} / ${ctx.cautionMonths}를 함께 보면 앞으로 무엇에 힘을 실어야 하는지가 선명해집니다.`,
      `${categoryTitle}은 운명적 선택을 할 때 어떤 기준을 붙잡아야 하는지 해석하는 항목입니다. 선택의 기준이 흔들리면 좋은 운도 분산되기 쉬우므로, 기준 자체를 먼저 세워야 합니다.`,
      `${categoryTitle}은 올해와 내년의 전환 포인트를 읽는 자리입니다. 전환은 갑작스러운 이벤트가 아니라, 이미 생활 속에서 방향이 바뀌기 시작하는 징후로 먼저 나타납니다.`,
      `${categoryTitle}은 기회가 강한 시기를 실제 일정 감각으로 정리하는 항목입니다. 기회는 준비되지 않은 사람에게는 부담으로 느껴질 수 있으므로, 시기 해석은 실행 계획과 함께 가야 합니다.`,
      `${categoryTitle}은 피해야 할 결정 타이밍을 정리하는 자리입니다. 모든 시기에 같은 방식으로 움직이면 운의 강약 차이를 활용할 수 없기 때문입니다.`,
    ];
    const detailSet = [
      `삶의 핵심 방향은 격국 ${ctx.structureName}, 용신 ${signals.useful}, 상위 십성 ${ctx.topTenGodText}의 교집합에서 드러납니다. 즉, 이 사람의 길은 타인의 모델을 흉내 내는 데 있지 않고, 내가 자연스럽게 힘을 낼 수 있는 구조를 선택하는 데 있습니다.`,
      `운명적 선택의 기준은 감정이 아니라 지속 가능성입니다. 선택 직후의 흥분보다 6개월 뒤에도 버틸 수 있는지, ${signals.useful} 기운을 늘리는 방향인지, ${signals.caution}을 과열시키지 않는지로 판단해야 후회가 적습니다.`,
      `전환 포인트는 대운뿐 아니라 월별 강약에서도 드러납니다. ${ctx.bestMonths}처럼 흐름이 좋은 시기는 새로운 연결과 실행을 붙이기 좋고, ${ctx.cautionMonths}처럼 약한 시기에는 정리와 복구를 앞세워야 전체 흐름이 살아납니다.`,
      `기회가 강한 시기는 준비된 자원과 연결됐을 때만 실제 기회가 됩니다. 따라서 좋은 시기일수록 즉흥적으로 뛰기보다, 이미 쌓아 온 것과 연결해 확장하는 편이 유리합니다.`,
      `피해야 할 타이밍은 나쁜 날이라는 의미가 아니라, 큰 결정을 검증 없이 밀어붙이면 손실이 커지는 시기라는 뜻입니다. 특히 피로 누적, 감정 과열, 현금 흐름 불안이 동시에 보일 때는 중요한 결정을 미루는 편이 맞습니다.`,
    ];
    const actionSet = [
      `삶의 방향성을 정리할 때는 무엇을 할지보다 무엇을 계속할지를 먼저 고르는 것이 좋습니다. 오래 붙들수록 운이 살아나는 축이 실제 진로입니다.`,
      `선택 기준은 세 줄 정도로 간단히 고정해 두세요. 내 리듬을 지키는가, 장기적으로 값이 쌓이는가, 용신 기운을 늘리는가 정도면 충분합니다.`,
      `전환 포인트는 달력에 미리 표시해 두는 편이 좋습니다. 준비 기간과 실행 기간을 분리하면 운의 흐름을 훨씬 효율적으로 쓸 수 있습니다.`,
      `기회가 강한 시기에는 새 일 하나, 관계 하나, 발표 하나처럼 확장 행동을 제한해서 집중하세요. 분산보다 선명한 한 방이 더 유리합니다.`,
      `약한 시기에는 결정을 늦추는 것도 전략입니다. 멈춤을 실패로 보지 말고, 다음 상승 구간을 위한 보호 조치로 받아들이는 것이 중요합니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  if (chapterId === "13") {
    const introSet = [
      `${categoryTitle}은 지금까지 읽어 온 명식의 핵심을 하나의 축으로 정리하는 자리입니다. 정리의 기준은 단순 요약이 아니라, 앞으로도 반복해서 써먹을 수 있는 구조인지에 있습니다.`,
      `${categoryTitle}은 앞으로 붙잡아야 할 방향을 확정하는 항목입니다. 선택지가 많을수록 기준이 필요하고, 그 기준은 이미 명식 안에서 반복해서 드러난 강점에서 나옵니다.`,
      `${categoryTitle}은 버려야 할 반복 패턴을 정리하는 자리입니다. 강점이 계속 결과로 이어지지 않았다면, 대개 같은 누수 패턴이 뒤에서 발목을 잡고 있었을 가능성이 큽니다.`,
      `${categoryTitle}은 3년·5년·10년 로드맵을 실제 시간 감각으로 분해하는 항목입니다. 장기 계획은 거창한 목표보다, 어떤 순서로 기반을 쌓을지 결정하는 데 의미가 있습니다.`,
      `${categoryTitle}은 최종 실행 선언입니다. 결국 이 책의 목적은 좋은 문장을 읽는 데서 끝나지 않고, 실제 삶의 방식이 바뀌는 데 있습니다.`,
    ];
    const detailSet = [
      `핵심 요약은 일간 ${signals.dayMaster}, 월지 ${signals.monthBranch}, 용신 ${signals.useful}, 기신 ${signals.caution}, 상위 십성 ${ctx.topTenGodText}를 함께 놓았을 때 가장 정확합니다. 이 명식은 강한 축을 더 세게 밀어붙이는 것보다 약한 축을 운영 가능한 방식으로 보완할 때 전체 운이 살아납니다.`,
      `붙잡아야 할 방향은 ${signals.useful}/${signals.support} 기운이 들어오는 일과 환경, 그리고 ${ctx.structureName}이 자연스럽게 발휘되는 역할입니다. 이미 잘되는 장면과 잘 버티는 장면이 겹친다면 그곳이 앞으로 더 키워야 할 방향입니다.`,
      `버려야 할 패턴은 대개 ${signals.caution} 과열에서 시작됩니다. 과속, 과잉 책임, 경계 없는 관계, 회복 없는 몰입 같은 습관은 지금까지의 좋은 흐름도 쉽게 깎아먹을 수 있습니다.`,
      `장기 로드맵에서는 현재 대운 ${ctx.currentDaewun}과 다음 대운 ${ctx.nextDaewun}의 연결을 같이 봐야 합니다. 지금은 기반을 만들고, 이후에는 확장하는 식으로 큰 흐름을 나누어야 장기 계획이 실제성이 생깁니다.`,
      `최종 메시지는 단순합니다. 이 사주는 불안정해서 조심만 해야 하는 구조가 아니라, 자기 기준과 생활 구조를 맞추면 시간이 갈수록 힘이 살아나는 구조입니다.`,
    ];
    const actionSet = [
      `핵심 요약은 자주 보이는 곳에 짧게 남겨 두는 것이 좋습니다. 내 구조를 매일 상기해야 실제 행동도 그 방향으로 모입니다.`,
      `붙잡아야 할 방향은 세 개 이하로 줄이세요. 방향이 많아질수록 집중력은 약해지고, 운의 밀도도 떨어집니다.`,
      `버릴 패턴은 의지보다 시스템으로 끊는 편이 효과적입니다. 반복되는 실수는 일정, 관계, 돈의 규칙으로 막아야 합니다.`,
      `로드맵은 3년은 기반, 5년은 확장, 10년은 정착이라는 식으로 역할을 나눠 설계하세요. 이렇게 해야 장기 계획이 막연한 희망이 아니라 실제 경로가 됩니다.`,
      `마지막 선언은 화려할 필요가 없습니다. 내가 살릴 기운과 끊을 패턴을 한 문장으로 적고, 다음 한 달 실행안에 바로 연결하는 것이 가장 중요합니다.`,
    ];
    return [introSet[categoryIndex], detailSet[categoryIndex], actionSet[categoryIndex]].join("\n\n");
  }

  return "";
}

function buildCategoryText(profile, signals, chapterTitle, categoryTitle, categoryIndex) {
  const chapterMeta = CHAPTER_BLUEPRINTS.find((chapter) => String(chapter.title || "") === String(chapterTitle || ""));
  if (String(chapterTitle || "").includes("사주 원국 완전 해설")) {
    return buildChapterOneCategoryText(profile, signals, categoryTitle, categoryIndex);
  }

  if (chapterMeta?.id) {
    const calculatedText = buildCalculatedCategoryText(profile, signals, String(chapterMeta.id), categoryTitle, categoryIndex);
    if (calculatedText) return calculatedText;
  }

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

function createLifeBookFallbackText(profile, signals, chapterTitle, categoryTitle, categoryIndex = 0, originText = "") {
  const body = buildCategoryText(profile, signals, chapterTitle, categoryTitle, categoryIndex);
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

function validateChapterText(text) {
  const source = stripForbiddenTokens(text);
  if (!source) return { ok: false, reason: "empty" };
  if (source.length < 600) return { ok: false, reason: "too_short" };

  const lowered = source.toLowerCase();
  for (const forbidden of FORBIDDEN_TEXT) {
    if (lowered.includes(forbidden)) return { ok: false, reason: `forbidden:${forbidden}` };
  }

  return { ok: true, reason: "ok" };
}

function reinforceChapterText(profile, signals, chapterTitle, categoryTitle, originText) {
  const appendix = [
    `${profile.name}님의 ${chapterTitle}는 ${signals.dayMaster} 일간의 장점을 살릴 때 가장 설득력이 커집니다.`,
    `핵심은 ${categoryTitle}를 단발성 문장이 아니라 시간 블록, 관계 경계, 실행 단위로 바꾸는 것입니다.`,
    `${signals.useful}/${signals.support} 기운이 강한 날에는 확장 행동을, ${signals.caution} 기운이 강한 날에는 정리와 검토를 우선하세요.`,
  ].join("\n\n");
  return stripForbiddenTokens(`${originText}\n\n${appendix}`);
}

function parseJsonMaybe(text) {
  const raw = stripForbiddenTokens(text).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function mergeLifeBookLlmResult(chapter, llmResult) {
  const next = {
    ...chapter,
    categories: (chapter.categories || []).map((category) => ({ ...category })),
  };

  const sourceChapter = llmResult?.chapter && typeof llmResult.chapter === "object" ? llmResult.chapter : llmResult;
  const incomingCategories = Array.isArray(sourceChapter?.categories) ? sourceChapter.categories : [];

  if (!incomingCategories.length) {
    return next;
  }

  next.categories = next.categories.map((category, index) => {
    const incoming = incomingCategories.find((item) => String(item?.id || item?.title || "") === String(category.id || category.title || "")) || incomingCategories[index];
    const finalText = stripForbiddenTokens(incoming?.finalText || incoming?.text || incoming?.llmEnhancedText || category.finalText || category.localSummary);
    return {
      ...category,
      llmEnhancedText: stripForbiddenTokens(incoming?.llmEnhancedText || incoming?.text || ""),
      finalText: finalText || category.finalText,
    };
  });

  next.llmEnhancedText = buildChapterBody(next.title, next.categories);
  next.finalText = next.llmEnhancedText || next.localDraft || "";
  next.text = next.finalText;
  return next;
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
        finalText: nextText || createLifeBookFallbackText(profile, signals, blueprint.title, fallbackCategory.title, index, fallbackCategory.localSummary),
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

      <section class="footer">이 문서는 Code:Destiny가 정리한 프리미엄 사주 리포트입니다.</section>
    </main>
  </body>
  </html>`;
}

function buildLifeBookDocument(input) {
  return renderLifeBookPdf(input);
}

function buildTwelveGrowthStages(dayStem, pillars = {}) {
  const stageMap = {
    甲: { 亥: "장생", 子: "목욕", 丑: "관대", 寅: "임관", 卯: "제왕", 辰: "쇠", 巳: "병", 午: "사", 未: "묘", 申: "절", 酉: "태", 戌: "양" },
    乙: { 午: "장생", 巳: "목욕", 辰: "관대", 卯: "임관", 寅: "제왕", 丑: "쇠", 子: "병", 亥: "사", 戌: "묘", 酉: "절", 申: "태", 未: "양" },
    丙: { 寅: "장생", 卯: "목욕", 辰: "관대", 巳: "임관", 午: "제왕", 未: "쇠", 申: "병", 酉: "사", 戌: "묘", 亥: "절", 子: "태", 丑: "양" },
    丁: { 酉: "장생", 申: "목욕", 未: "관대", 午: "임관", 巳: "제왕", 辰: "쇠", 卯: "병", 寅: "사", 丑: "묘", 子: "절", 亥: "태", 戌: "양" },
    戊: { 寅: "장생", 卯: "목욕", 辰: "관대", 巳: "임관", 午: "제왕", 未: "쇠", 申: "병", 酉: "사", 戌: "묘", 亥: "절", 子: "태", 丑: "양" },
    己: { 酉: "장생", 申: "목욕", 未: "관대", 午: "임관", 巳: "제왕", 辰: "쇠", 卯: "병", 寅: "사", 丑: "묘", 子: "절", 亥: "태", 戌: "양" },
    庚: { 巳: "장생", 午: "목욕", 未: "관대", 申: "임관", 酉: "제왕", 戌: "쇠", 亥: "병", 子: "사", 丑: "묘", 寅: "절", 卯: "태", 辰: "양" },
    辛: { 子: "장생", 亥: "목욕", 戌: "관대", 酉: "임관", 申: "제왕", 未: "쇠", 午: "병", 巳: "사", 辰: "묘", 卯: "절", 寅: "태", 丑: "양" },
    壬: { 申: "장생", 酉: "목욕", 戌: "관대", 亥: "임관", 子: "제왕", 丑: "쇠", 寅: "병", 卯: "사", 辰: "묘", 巳: "절", 午: "태", 未: "양" },
    癸: { 卯: "장생", 寅: "목욕", 丑: "관대", 子: "임관", 亥: "제왕", 戌: "쇠", 酉: "병", 申: "사", 未: "묘", 午: "절", 巳: "태", 辰: "양" },
  };
  const selectedMap = stageMap[dayStem] || stageMap.戊;
  return ["year", "month", "day", "hour"].map((pillarName) => {
    const branch = clean(pillars?.[pillarName]?.branch || "");
    const stage = branch ? selectedMap[branch] || "미정" : "미정";
    return {
      pillar: branch ? `${pillarName}:${branch}` : `${pillarName}:미상`,
      stage,
      keywords: stage === "미정" ? ["십이운성 미상"] : [stage, branch],
    };
  });
}

function buildSajuLifeBookPdfSeed({ birthInput, profile, signals, analysisSignals = {}, sajuProfile = null }) {
  const profileSource = sajuProfile || buildSajuProfile({
    name: profile?.name || birthInput?.name || "사용자",
    gender: String(profile?.gender || birthInput?.gender || "OTHER").toUpperCase(),
    birth: {
      year: Number(profile?.year || birthInput?.birthYear || 0),
      month: Number(profile?.month || birthInput?.birthMonth || 0),
      day: Number(profile?.day || birthInput?.birthDay || 0),
      hour: Number.isFinite(profile?.hour) ? profile.hour : 12,
      minute: Number.isFinite(profile?.minute) ? profile.minute : 0,
      calendarType: String(birthInput?.calendarType || profile?.calendarType || "solar"),
      unknownTime: !Boolean(profile?.timeKnown),
    },
  });

  const parsedSignals = normalizeIncomingAnalysisSignals(analysisSignals || {});
  const yearPillar = clean(signals?.yearPillar?.ganji || profileSource?.pillars?.year?.ganji || "");
  const monthPillar = clean(signals?.monthPillar?.ganji || profileSource?.pillars?.month?.ganji || "");
  const dayPillar = clean(signals?.dayPillar?.ganji || profileSource?.pillars?.day?.ganji || "");
  const hourPillar = clean(signals?.hourPillar?.ganji || profileSource?.pillars?.hour?.ganji || "");
  const dayMaster = clean(signals?.dayMaster || profileSource?.dayMaster?.stemKo || profileSource?.dayMaster?.stem || "");
  const dayMasterElement = clean(profileSource?.dayMaster?.elementKo || profileSource?.dayMaster?.element || "");
  const dayMasterYinYang = clean(profileSource?.dayMaster?.yinYang || "");
  const monthBranch = clean(signals?.monthBranch || profileSource?.pillars?.month?.branch || "");
  const season = clean(BRANCH_TO_SEASON[monthBranch] || "계절 전환기");

  const fiveElementsScores = profileSource?.fiveElements?.scores || {};
  const fiveElementsPercentages = profileSource?.fiveElements?.percentages || {};
  const strongest = [profileSource?.fiveElements?.strongest, profileSource?.fiveElements?.secondStrongest].filter(Boolean);
  const weakest = [profileSource?.fiveElements?.weakest].filter(Boolean);
  const lacking = Array.isArray(profileSource?.fiveElements?.lacking) ? profileSource.fiveElements.lacking : [];
  const strongTenGods = Array.isArray(profileSource?.tenGods?.ranked)
    ? profileSource.tenGods.ranked.slice(0, 3).map((row) => clean(row?.name || row?.key || row?.title)).filter(Boolean)
    : [];
  const weakTenGods = Object.entries(profileSource?.tenGods?.counts || {})
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .slice(0, 3)
    .map(([key]) => clean(key))
    .filter(Boolean);

  const usefulGods = profileSource?.usefulGods || {};
  const yongshin = [clean(usefulGods.yong), clean(signals?.useful)].filter(Boolean).slice(0, 3);
  const heeshin = [clean(usefulGods.hee?.[0] || usefulGods.hee), clean(signals?.support)].filter(Boolean).slice(0, 3);
  const gishin = [clean(usefulGods.gi?.[0] || usefulGods.gi), clean(signals?.caution)].filter(Boolean).slice(0, 3);
  const johu = [clean(signals?.johuType), clean(profileSource?.usefulGods?.strength)].filter(Boolean).slice(0, 3);

  const hiddenStems = {
    year: profileSource?.pillars?.year?.hiddenStems || [],
    month: profileSource?.pillars?.month?.hiddenStems || [],
    day: profileSource?.pillars?.day?.hiddenStems || [],
    hour: profileSource?.pillars?.hour?.hiddenStems || [],
  };

  const currentYear = new Date().getFullYear();
  const currentAge = Number.isFinite(profile?.year) ? Math.max(0, currentYear - Number(profile.year)) : 0;
  const currentDaewoonStart = Math.max(0, currentAge - (currentAge % 10));
  const currentDaewoonEnd = currentDaewoonStart + 9;
  const currentDaewoonPillar = clean(signals?.currentDaewun || signals?.rhythm || profileSource?.pillars?.month?.ganji || monthPillar);
  const currentDaewoon = {
    pillar: currentDaewoonPillar,
    startAge: currentDaewoonStart,
    endAge: currentDaewoonEnd,
    keywords: [clean(signals?.powerLabel), clean(signals?.johuType), clean(signals?.topTenGod)].filter(Boolean).slice(0, 5),
    tenGodEffect: strongTenGods.slice(0, 3),
    elementEffect: [clean(signals?.dominantElement || profileSource?.fiveElements?.strongest), clean(signals?.weakestElement || profileSource?.fiveElements?.weakest)].filter(Boolean).slice(0, 3),
  };

  const previousDaewoon = [-20, -10].map((offset) => ({
    pillar: `${dayMaster || profileSource?.dayMaster?.stemKo || "일간"}-${Math.abs(offset)}년 전`,
    startAge: Math.max(0, currentDaewoonStart + offset),
    endAge: Math.max(0, currentDaewoonStart + offset + 9),
    keywords: [clean(signals?.monthBranch), clean(signals?.yearBranch), clean(signals?.johuType)].filter(Boolean).slice(0, 3),
  }));

  const nextDaewoon = [10, 20].map((offset) => ({
    pillar: `${dayMaster || profileSource?.dayMaster?.stemKo || "일간"}-${offset}년 후`,
    startAge: currentDaewoonEnd + offset,
    endAge: currentDaewoonEnd + offset + 9,
    keywords: [clean(signals?.useful), clean(signals?.support), clean(signals?.caution)].filter(Boolean).slice(0, 3),
  }));

  const yearlyFlow = {
    currentYear,
    pillar: clean(signals?.yearBranch || profileSource?.pillars?.year?.branch || ""),
    keywords: [clean(signals?.yearPillar?.ganji || profileSource?.pillars?.year?.ganji || ""), clean(signals?.rhythm || "")].filter(Boolean).slice(0, 4),
    clashOrCombinationWithNatal: [clean(signals?.heavenlyRelations || ""), clean(signals?.earthlyRelations || ""), clean(signals?.yukhap || "")].filter(Boolean).slice(0, 4),
  };

  const sinsal = [];
  const branchTokens = [profileSource?.pillars?.year?.branch, profileSource?.pillars?.month?.branch, profileSource?.pillars?.day?.branch, profileSource?.pillars?.hour?.branch].filter(Boolean);
  if (/[子午]/.test(branchTokens.join(""))) sinsal.push({ name: "도화", relatedPillar: profileSource?.pillars?.day?.branch || profileSource?.pillars?.month?.branch, keywords: ["도화", clean(profileSource?.pillars?.day?.branch || "")].filter(Boolean) });
  if (/[寅申巳亥]/.test(branchTokens.join(""))) sinsal.push({ name: "역마", relatedPillar: profileSource?.pillars?.month?.branch || profileSource?.pillars?.year?.branch, keywords: ["역마", clean(profileSource?.pillars?.month?.branch || "")].filter(Boolean) });
  if (/[辰戌丑未]/.test(branchTokens.join(""))) sinsal.push({ name: "화개", relatedPillar: profileSource?.pillars?.day?.branch || profileSource?.pillars?.hour?.branch, keywords: ["화개", clean(profileSource?.pillars?.day?.branch || "")].filter(Boolean) });
  if (branchTokens.length >= 3) sinsal.push({ name: "귀문", relatedPillar: profileSource?.pillars?.hour?.branch || profileSource?.pillars?.day?.branch, keywords: ["귀문", clean(profileSource?.pillars?.hour?.branch || "")].filter(Boolean) });

  const twelveGrowthStages = buildTwelveGrowthStages(profileSource?.dayMaster?.stem || signals?.dayMaster || "戊", profileSource?.pillars || {});
  const specialPatterns = [clean(signals?.powerLabel), clean(signals?.johuType), clean(signals?.topTenGod)].filter(Boolean).slice(0, 5);
  const combinations = [clean(signals?.heavenlyRelations), clean(signals?.yukhap)].filter(Boolean).slice(0, 5);
  const clashes = [clean(signals?.earthlyRelations), clean(parsedSignals?.clashesRaw)].filter(Boolean).slice(0, 5);
  const punishments = [clean(parsedSignals?.punishmentsRaw)].filter(Boolean).slice(0, 3);
  const harms = [clean(parsedSignals?.harmsRaw)].filter(Boolean).slice(0, 3);
  const breaks = [clean(parsedSignals?.breaksRaw)].filter(Boolean).slice(0, 3);

  const derivedSignals = {
    personalitySignals: [dayMaster, dayMasterElement, dayMasterYinYang, clean(signals?.topTenGod), clean(signals?.powerLabel)].filter(Boolean).slice(0, 6),
    lifeThemeSignals: [clean(signals?.monthBranch), season, clean(signals?.johuType), clean(signals?.currentDaewun || signals?.rhythm)].filter(Boolean).slice(0, 6),
    careerSignals: [clean(signals?.useful), clean(signals?.support), clean(signals?.topTenGod), clean(signals?.dominantElement)].filter(Boolean).slice(0, 6),
    moneySignals: [clean(profileSource?.tenGods?.dominant), clean(signals?.support), clean(signals?.useful)].filter(Boolean).slice(0, 6),
    loveMarriageSignals: [clean(signals?.caution), clean(profileSource?.pillars?.day?.branch || ""), clean(signals?.earthlyRelations || "")].filter(Boolean).slice(0, 6),
    relationshipSignals: [clean(signals?.heavenlyRelations || ""), clean(signals?.earthlyRelations || ""), clean(signals?.yukhap || "")].filter(Boolean).slice(0, 6),
    familySignals: [clean(hiddenStems.year?.[0] || ""), clean(hiddenStems.month?.[0] || ""), clean(hiddenStems.day?.[0] || "")].filter(Boolean).slice(0, 6),
    healthMindSignals: [clean(profileSource?.fiveElements?.weakest), clean(profileSource?.fiveElements?.lacking?.[0] || ""), clean(season)].filter(Boolean).slice(0, 6),
    crisisSignals: [clean(signals?.caution), clean(parsedSignals?.clashesRaw), clean(parsedSignals?.breaksRaw)].filter(Boolean).slice(0, 6),
    transformationSignals: [clean(signals?.support), clean(signals?.powerLabel), clean(signals?.johuType)].filter(Boolean).slice(0, 6),
    longTermStrategySignals: [clean(signals?.currentDaewun || signals?.rhythm), clean(profileSource?.dayMaster?.elementKo || ""), clean(profileSource?.usefulGods?.strength || "")].filter(Boolean).slice(0, 6),
  };

  const strengths = [
    clean(signals?.useful),
    clean(signals?.support),
    clean(profileSource?.fiveElements?.strongest),
    clean(profileSource?.tenGods?.dominant),
  ].filter(Boolean).slice(0, 8);

  const cautionFlags = [
    clean(signals?.caution),
    clean(profileSource?.fiveElements?.weakest),
    clean(profileSource?.fiveElements?.lacking?.[0] || ""),
  ].filter(Boolean).slice(0, 8);

  const unresolvedThemes = [
    clean(signals?.johuType),
    clean(signals?.powerLabel),
    clean(signals?.earthlyRelations || ""),
    clean(signals?.heavenlyRelations || ""),
  ].filter(Boolean).slice(0, 8);

  return {
    input: {
      name: clean(birthInput?.name || profile?.name || "사용자"),
      gender: clean(birthInput?.gender || profile?.gender || "unknown"),
      birthDate: clean(birthInput?.birthDate || `${profile?.year || ""}-${pad2(profile?.month || 1)}-${pad2(profile?.day || 1)}`),
      birthTime: clean(birthInput?.birthTime || (profile?.timeKnown ? `${pad2(profile?.hour)}:${pad2(profile?.minute)}` : "")),
      birthPlace: clean(profile?.birthplace || birthInput?.birthPlace || "대한민국"),
      calendarType: clean(birthInput?.calendarType || profile?.calendarType || "solar"),
    },
    natalChart: {
      yearPillar: yearPillar || undefined,
      monthPillar: monthPillar || undefined,
      dayPillar: dayPillar || undefined,
      hourPillar: hourPillar || undefined,
      dayMaster: dayMaster || undefined,
      dayBranch: clean(profileSource?.pillars?.day?.branch || "") || undefined,
      monthBranch: monthBranch || undefined,
      season,
      hiddenStems,
    },
    fiveElements: {
      wood: Math.round(Number(fiveElementsPercentages.wood || 0)),
      fire: Math.round(Number(fiveElementsPercentages.fire || 0)),
      earth: Math.round(Number(fiveElementsPercentages.earth || 0)),
      metal: Math.round(Number(fiveElementsPercentages.metal || 0)),
      water: Math.round(Number(fiveElementsPercentages.water || 0)),
      strongest: strongest.slice(0, 3),
      weakest: weakest.slice(0, 3),
      missing: lacking.slice(0, 3),
      balanceKeywords: [clean(profileSource?.fiveElements?.strongest), clean(profileSource?.fiveElements?.weakest), clean(profileSource?.fiveElements?.lacking?.[0] || "")].filter(Boolean).slice(0, 5),
    },
    tenGods: {
      year: clean(profileSource?.tenGods?.counts?.[yearPillar] || parsedSignals?.topTenGod || ""),
      month: clean(profileSource?.tenGods?.counts?.[monthPillar] || ""),
      day: clean(profileSource?.tenGods?.counts?.[dayPillar] || profileSource?.tenGods?.dominant || ""),
      hour: clean(profileSource?.tenGods?.counts?.[hourPillar] || ""),
      distribution: profileSource?.tenGods?.counts || {},
      strongTenGods,
      weakTenGods,
      spouseStar: [clean(profileSource?.tenGods?.dominant), clean(signals?.caution)].filter(Boolean).slice(0, 3),
      careerStar: [clean(signals?.useful), clean(signals?.support), clean(profileSource?.dayMaster?.elementKo || "")].filter(Boolean).slice(0, 3),
      wealthStar: [clean(profileSource?.tenGods?.dominant), clean(signals?.support)].filter(Boolean).slice(0, 3),
      expressionStar: [clean(signals?.topTenGod), clean(signals?.dayMaster)].filter(Boolean).slice(0, 3),
    },
    usefulGods: {
      yongshin,
      heeshin,
      gishin,
      johu,
      keywords: [clean(signals?.useful), clean(signals?.support), clean(signals?.caution), clean(signals?.johuType)].filter(Boolean).slice(0, 6),
    },
    structure: {
      geokguk: clean(signals?.johuType || profileSource?.usefulGods?.strength || ""),
      geokgukKeywords: [clean(signals?.topTenGod), clean(signals?.powerLabel), clean(signals?.johuType)].filter(Boolean).slice(0, 5),
      specialPatterns,
      combinations,
      clashes,
      punishments,
      harms,
      breaks,
      rootStrength: clean(profileSource?.dayMaster?.yinYang || dayMasterYinYang || ""),
      dayMasterStrength: clean(profileSource?.usefulGods?.strength || signals?.powerLabel || ""),
    },
    luckCycles: {
      currentDaewoon,
      previousDaewoon,
      nextDaewoon,
      yearlyFlow,
    },
    sinsal,
    twelveGrowthStages,
    derivedSignals,
    strengths,
    cautionFlags,
    unresolvedThemes,
  };
}

function summarizeSajuLifeBookChapter(chapter) {
  const sections = Array.isArray(chapter?.categories) ? chapter.categories : [];
  const sectionSummary = sections.slice(0, 2).map((section) => `${clean(section.title)}:${stripForbiddenTokens(section.finalText || section.text || "").slice(0, 90)}`).join(" | ");
  return `${clean(chapter?.title || "챕터")}: ${sectionSummary}`.trim().slice(0, 260);
}

function validateSajuLifeBookChapterOrThrow(chapter, chapterSpec) {
  if (!chapter || clean(chapter.title) !== clean(chapterSpec.title)) {
    throw new Error(`chapter_${chapterSpec.chapterNo}_title_invalid`);
  }

  const categories = Array.isArray(chapter.categories) ? chapter.categories : [];
  if (categories.length !== chapterSpec.sections.length) {
    throw new Error(`chapter_${chapterSpec.chapterNo}_section_count_invalid`);
  }

  let chapterChars = 0;
  chapterSpec.sections.forEach((sectionSpec, index) => {
    const section = categories[index];
    if (!section || clean(section.title) !== clean(sectionSpec.title)) {
      throw new Error(`chapter_${chapterSpec.chapterNo}_section_${index + 1}_title_invalid`);
    }
    const textBody = stripForbiddenTokens(section.finalText || section.text || "");
    if (textBody.length < Number(sectionSpec.minChars || 600)) {
      throw new Error(`chapter_${chapterSpec.chapterNo}_section_${index + 1}_min_chars`);
    }
    chapterChars += textBody.length;
  });

  if (chapterChars < 3000) {
    throw new Error(`chapter_${chapterSpec.chapterNo}_min_chars`);
  }

  const merged = stripForbiddenTokens(categories.map((item) => item.finalText || item.text || "").join("\n"));
  if (!merged) {
    throw new Error(`chapter_${chapterSpec.chapterNo}_empty`);
  }
}

function buildSajuLifeBookChapterPrompt({ seed, chapterSpec, previousChapterSummaries = [], previousFailureReason = "", attempt = 1 }) {
  const forbiddenGuide = "JSON, payload, seed, rawData, engine, local, debug, calculation, undefined, null, fallback, 자동 복구";
  return [
    "당신은 사주 명리학 기반 ‘인생의 책’ 프리미엄 PDF 리포트를 작성하는 전문 상담가입니다.",
    "계산은 이미 내부 사주 엔진에서 완료되었습니다. 당신은 계산을 새로 하지 않습니다.",
    "로컬 원고를 고치는 것이 아니라, 지금부터 챕터 본문을 새로 작성합니다.",
    "제공된 JSON seed와 챕터/세부 카테고리 제목에 정확히 맞는 내용을 작성하세요.",
    "JSON에 없는 계산값, 대운, 세운, 신살, 십이운성 정보를 임의로 만들지 마세요.",
    "각 세부 카테고리는 서로 다른 관점과 내용을 가져야 하며 문장 구조를 반복하지 마세요.",
    `PDF 본문에는 다음 기술 문구를 절대 노출하지 마세요: ${forbiddenGuide}`,
    `현재 생성 대상 챕터: ${chapterSpec.title}`,
    `세부 카테고리: ${JSON.stringify(chapterSpec.sections.map((section) => section.title))}`,
    "각 세부 카테고리 본문은 최소 600자 이상 작성하세요.",
    "반드시 JSON 객체 하나만 반환하세요.",
    '형식: {"chapter":{"id":string,"title":string,"categories":[{"id":string,"title":string,"finalText":string}]}}',
    `시도 횟수: ${attempt}`,
    previousFailureReason ? `이전 실패 사유: ${previousFailureReason}` : "",
    `이전 챕터 요약: ${JSON.stringify(previousChapterSummaries || [])}`,
    `SajuLifeBookPdfSeed: ${JSON.stringify(seed || {})}`,
    `ChapterSpec: ${JSON.stringify(chapterSpec || {})}`,
  ].filter(Boolean).join("\n");
}

async function generateSajuLifeBookChapterByLLM({ env, seed, chapterSpec, previousChapterSummaries = [], attempt = 1, previousFailureReason = "" }) {
  const prompt = buildSajuLifeBookChapterPrompt({ seed, chapterSpec, previousChapterSummaries, previousFailureReason, attempt });
  const result = await callGeminiText(env, prompt, {
    modelEnvKeys: ["LIFEBOOK_GEMINI_MODEL", "GEMINI_MODEL"],
    temperature: 0.72,
    maxOutputTokens: 8192,
    timeoutMs: Number(env.LIFEBOOK_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 45000),
    totalTimeoutMs: Number(env.LIFEBOOK_GEMINI_TOTAL_TIMEOUT_MS || 90000),
    maxAttemptsPerPair: 1,
  });

  if (!result?.ok || !clean(result.text)) {
    throw new Error(`chapter_${chapterSpec.chapterNo}_llm_empty`);
  }

  const parsed = parseJsonMaybe(result.text);
  if (!parsed) {
    throw new Error(`chapter_${chapterSpec.chapterNo}_llm_parse_failed`);
  }

  const sourceChapter = parsed?.chapter && typeof parsed.chapter === "object" ? parsed.chapter : parsed;
  const categories = Array.isArray(sourceChapter?.categories) ? sourceChapter.categories : [];
  const chapter = {
    id: clean(sourceChapter?.id || chapterSpec.id),
    roman: clean(chapterSpec.roman),
    title: clean(sourceChapter?.title || chapterSpec.title),
    subtitle: clean(chapterSpec.subtitle),
    categories: categories.map((item, index) => ({
      id: clean(item?.id || chapterSpec.sections[index]?.id || `${chapterSpec.id}-${String(index + 1).padStart(2, "0")}`),
      title: clean(item?.title || chapterSpec.sections[index]?.title || `세부 항목 ${index + 1}`),
      finalText: stripForbiddenTokens(item?.finalText || item?.text || ""),
      llmEnhancedText: stripForbiddenTokens(item?.llmEnhancedText || item?.text || ""),
      order: index + 1,
    })),
    source: "llm-original",
  };

  validateSajuLifeBookChapterOrThrow(chapter, chapterSpec);
  return chapter;
}

async function generateSajuLifeBookPdfWithLLMOnlyInterpretation({ env, seed, chapterSpecs, sessionId, onProgress }) {
  const chapters = [];

  for (const chapterSpec of chapterSpecs) {
    let chapter = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        chapter = await generateSajuLifeBookChapterByLLM({
          env,
          seed,
          chapterSpec,
          previousChapterSummaries: chapters.map((item) => summarizeSajuLifeBookChapter(item)),
          attempt,
          previousFailureReason: lastError ? clean(lastError.message || "") : "",
        });
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn("[LifeBookPremiumPDF][ChapterRetry]", {
          chapterNo: chapterSpec.chapterNo,
          attempt,
          reason: clean(lastError.message || "chapter_failed"),
        });
      }
    }

    if (!chapter) {
      throw new Error(`chapter_${chapterSpec.chapterNo}_failed_after_retry:${clean(lastError?.message || "unknown")}`);
    }

    chapters.push(chapter);
    if (typeof onProgress === "function") {
      await onProgress({
        sessionId,
        currentChapterNo: chapterSpec.chapterNo,
        totalChapters: chapterSpecs.length,
        chapterTitle: chapterSpec.title,
      });
    }
  }

  return chapters;
}

function validateSajuLifeBookPdfLLMInterpretationQuality({ chapters, expectedChapters, seed }) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== expectedChapters.length) {
    errors.push("chapter_count");
    return { ok: false, errors, totalChars: 0 };
  }

  let totalChars = 0;
  expectedChapters.forEach((chapterSpec, chapterIndex) => {
    const chapter = chapters[chapterIndex];
    if (!chapter || clean(chapter.title) !== clean(chapterSpec.title)) {
      errors.push(`chapter_${chapterIndex + 1}_title`);
      return;
    }

    const categories = Array.isArray(chapter.categories) ? chapter.categories : [];
    if (categories.length !== chapterSpec.sections.length) {
      errors.push(`chapter_${chapterIndex + 1}_section_count`);
    }

    let chapterChars = 0;
    chapterSpec.sections.forEach((sectionSpec, sectionIndex) => {
      const section = categories[sectionIndex];
      if (!section || clean(section.title) !== clean(sectionSpec.title)) {
        errors.push(`chapter_${chapterIndex + 1}_section_${sectionIndex + 1}_title`);
        return;
      }
      const body = stripForbiddenTokens(section.finalText || section.text || "");
      chapterChars += body.length;
      if (body.length < Number(sectionSpec.minChars || 600)) {
        errors.push(`chapter_${chapterIndex + 1}_section_${sectionIndex + 1}_min_chars`);
      }
      const lowered = body.toLowerCase();
      for (const token of FORBIDDEN_TEXT) {
        if (token && lowered.includes(String(token).toLowerCase())) {
          errors.push(`chapter_${chapterIndex + 1}_forbidden_${token}`);
          break;
        }
      }
    });

    if (chapterChars < 3000) {
      errors.push(`chapter_${chapterIndex + 1}_min_chars`);
    }
    totalChars += chapterChars;

    const merged = categories.map((item) => stripForbiddenTokens(item.finalText || item.text || "")).join("\n");
    const requiredGroups = [
      ["사주", "원국", "일간", "월지", "오행"],
      ["월지", "일간", "조후"],
      ["용신", "희신", "기신"],
      ["대운"],
      ["격국"],
      ["관계", "귀인", "소모"],
      ["연애", "결혼", "배우자"],
      ["재물", "직업", "사업"],
      ["건강", "과로", "오행"],
      ["신살", "십이운성", "반전"],
      ["위기", "회복", "반전"],
      ["이번 생", "반복", "방향"],
      ["3년", "5년", "10년"],
    ];
    const required = requiredGroups[chapterIndex] || [];
    if (required.length && !required.some((keyword) => merged.includes(keyword))) {
      errors.push(`chapter_${chapterIndex + 1}_required_keyword_missing`);
    }
  });

  if (totalChars < SAJU_LIFE_BOOK_PDF_TOTAL_MIN_CHARS) {
    errors.push("total_min_chars");
  }

  const duplicateRate = (() => {
    const source = chapters
      .flatMap((chapter) => (Array.isArray(chapter?.categories) ? chapter.categories : []))
      .map((item) => stripForbiddenTokens(item?.finalText || item?.text || ""))
      .join("\n\n");
    const paragraphs = source.split(/\n\s*\n+/).map((row) => clean(row).replace(/\s+/g, " ")).filter((row) => row.length >= 80);
    if (!paragraphs.length) return 0;
    const counter = new Map();
    for (const paragraph of paragraphs) {
      counter.set(paragraph, (counter.get(paragraph) || 0) + 1);
    }
    const repeated = Array.from(counter.values()).filter((count) => count > 1).reduce((sum, count) => sum + (count - 1), 0);
    return repeated / paragraphs.length;
  })();
  if (duplicateRate > 0.2) {
    errors.push("duplicate_rate_high");
  }

  const seedCore = JSON.stringify(seed?.natalChart || {});
  if (!seedCore || seedCore === "{}") {
    errors.push("seed_natal_chart_missing");
  }

  return { ok: errors.length === 0, errors, totalChars };
}

async function maybeEnhanceChapterWithLlm(env, profile, signals, chapter, context = {}) {
  void env;
  void profile;
  void signals;
  void chapter;
  void context;
  throw new Error("SAJU_LIFEBOOK_LEGACY_LOCAL_FALLBACK_DISABLED");
}

async function enhanceLifeBookManuscriptWithLLM(env, { birthInput, localSaju, localManuscript, chapterSchema }) {
  void env;
  void birthInput;
  void localSaju;
  void localManuscript;
  void chapterSchema;
  throw new Error("SAJU_LIFEBOOK_LEGACY_LOCAL_FALLBACK_DISABLED");
}

function buildPdfReadyPayload(profile, chapters, metadata = {}) {
  const reportId = clean(metadata.reportId || "");
  return {
    title: `${stripForbiddenTokens(profile.name)} 사주 인생의 책`,
    filename: `saju-lifebook-${String(profile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    profile,
    metadata,
    html: String(metadata.pdfHtml || ""),
    pdfUrl: clean(metadata.pdfUrl || ""),
    pdfStorageKey: clean(metadata.pdfStorageKey || (reportId ? `saju-lifebook/${reportId}.html` : "")),
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

  logLifeBookServer("LocalCalculationStart", { sessionId, chapterCount: SAJU_LIFE_BOOK_PDF_CHAPTER_SPECS.length });
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
  const sajuProfile = buildSajuProfile({
    name: profile.name,
    gender: profile.gender === "male" ? "M" : profile.gender === "female" ? "F" : "OTHER",
    birth: {
      year: profile.year,
      month: profile.month,
      day: profile.day,
      hour: Number.isFinite(profile.hour) ? profile.hour : 12,
      minute: Number.isFinite(profile.minute) ? profile.minute : 0,
      calendarType: profile.calendarType,
      unknownTime: !profile.timeKnown,
    },
  });
  const sajuLifeBookPdfSeed = buildSajuLifeBookPdfSeed({
    birthInput,
    profile,
    signals,
    analysisSignals: body?.analysisSignals || {},
    sajuProfile,
  });

  logLifeBookServer("LocalCalculationSuccess", {
    sessionId,
    dayMasterResolved: Boolean(sajuLifeBookPdfSeed?.natalChart?.dayMaster),
    pillarCount: Number(Boolean(sajuLifeBookPdfSeed?.natalChart?.yearPillar)) + Number(Boolean(sajuLifeBookPdfSeed?.natalChart?.monthPillar)) + Number(Boolean(sajuLifeBookPdfSeed?.natalChart?.dayPillar)) + Number(Boolean(sajuLifeBookPdfSeed?.natalChart?.hourPillar)),
    daewoonResolved: Boolean(sajuLifeBookPdfSeed?.luckCycles?.currentDaewoon?.pillar),
    yearlyLuckResolved: Boolean(sajuLifeBookPdfSeed?.luckCycles?.yearlyFlow?.currentYear),
  });

  const chapterSpecs = SAJU_LIFE_BOOK_PDF_CHAPTER_SPECS;
  LIFEBOOK_SESSION_LOCKS.set(sessionId, {
    sessionId,
    status: "running",
    startedAt: new Date().toISOString(),
    progress: { stage: "seed-ready", currentChapterNo: 0, totalChapters: chapterSpecs.length },
  });

  const completedChapters = await generateSajuLifeBookPdfWithLLMOnlyInterpretation({
    env,
    seed: sajuLifeBookPdfSeed,
    chapterSpecs,
    sessionId,
    onProgress: async ({ currentChapterNo, totalChapters, chapterTitle }) => {
      logLifeBookServer("ChapterCompleted", {
        sessionId,
        currentChapterNo,
        totalChapters,
        chapterTitle,
      });
      const existing = LIFEBOOK_SESSION_LOCKS.get(sessionId) || {};
      LIFEBOOK_SESSION_LOCKS.set(sessionId, {
        ...existing,
        sessionId,
        status: "running",
        startedAt: existing.startedAt || new Date().toISOString(),
        progress: {
          stage: `chapter-${currentChapterNo}`,
          currentChapterNo,
          totalChapters,
          chapterTitle,
        },
      });
    },
  });

  const finalValidation = validateSajuLifeBookPdfLLMInterpretationQuality({
    chapters: completedChapters,
    expectedChapters: chapterSpecs,
    seed: sajuLifeBookPdfSeed,
  });
  if (!finalValidation.ok) {
    throw new Error(`saju_lifebook_quality_validation_failed:${finalValidation.errors.join(",")}`);
  }

  const finalBundleValidation = validateLifeBookFinalManuscript(completedChapters);
  if (!finalBundleValidation.ok) {
    throw new Error(`saju_lifebook_bundle_validation_failed:${finalBundleValidation.issues.join(",")}`);
  }

  logLifeBookServer("FinalManuscriptValidated", {
    sessionId,
    ok: finalValidation.ok,
    chapterCount: completedChapters.length,
    totalLength: finalValidation.totalChars,
    forbiddenTermsCount: finalBundleValidation.forbiddenHits,
    repetitionScore: finalBundleValidation.repetitionScore,
    manuscriptSource: "llm-only-interpretation",
  });

  const lifebookPayload = buildLifeBookPayload(profile, signals, completedChapters, {
    featureKey,
    calendarType: body?.calendarType,
    reportType: "saju_life_book",
    generationMode: "llm-only-interpretation",
    seed: sajuLifeBookPdfSeed,
  });

  const generatedAt = new Date().toISOString();
  logLifeBookServer("PdfRenderStart", { sessionId, chapterCount: completedChapters.length });
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `saju-lifebook-${Date.now()}`);

  const pdfReady = buildPdfReadyPayload(profile, completedChapters, {
    featureKey,
    reportType: "saju_life_book",
    accessType: String(access.accessType || "unknown"),
    manuscriptSource: "llm-only-interpretation",
    reportId,
    pdfHtml: buildLifeBookDocument({ profile, signals, chapters: completedChapters, generatedAt }),
  });
  logLifeBookServer("PdfRenderSuccess", { sessionId, chapterCount: completedChapters.length });
  await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
    manuscriptSource: "llm-only-interpretation",
    chapterCount: completedChapters.length,
    archive: {
      reportId,
      reportType: "saju_life_book",
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
      pdfStorageKey: clean(pdfReady?.pdfStorageKey),
      createdAt: generatedAt,
      completedAt: generatedAt,
      chapters: completedChapters,
      payload: lifebookPayload,
      pdfReady,
      paymentSessionId: clean(executionCtx?.paymentSessionId),
      coinAmount: Number(executionCtx?.coinAmount || 0),
      status: "completed",
      canReopen: true,
      canDownload: Boolean(clean(pdfReady?.pdfUrl)),
    },
  });

  const result = {
    ok: true,
    featureKey,
    chapterCount: chapterSpecs.length,
    serviceKey: LIFEBOOK_SERVICE_KEY,
    data: {
      reportId,
      featureKey,
      sessionId,
      reportType: "saju_life_book",
      profile,
      birthInput,
      seed: sajuLifeBookPdfSeed,
      localSajuJson: sajuLifeBookPdfSeed,
      chapters: completedChapters,
      lifebookPayload,
      pdfReady,
      fallbackUsed: false,
      manuscriptSource: "llm-only-interpretation",
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
      progress: { stage: "failed" },
      error: normalizedError,
    });
    const safeMessage = clean(error?.message || "");
    const refundMessage = safeMessage.includes("환불")
      ? safeMessage
      : "사주 인생의 책 PDF 생성이 완료되지 않아 사용된 코인이 자동으로 환불되었습니다. 다시 시도해 주세요.";
    return json({
      ok: false,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      code: clean(error?.code) || "LIFEBOOK_GENERATION_FAILED",
      message: refundMessage,
      autoRefunded: true,
    }, { status: Number(error?.status) || 502 });
  }
}

export async function handleSajuLifebookRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/premium/saju-lifebook");

    if (method === "GET" && path === "/premium/chapters") {
      return json({
        ok: true,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        reportType: "saju_life_book",
        chapterCount: SAJU_LIFE_BOOK_PDF_CHAPTER_SPECS.length,
        chapterSpecs: SAJU_LIFE_BOOK_PDF_CHAPTER_SPECS,
      });
    }

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
