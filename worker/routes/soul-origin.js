import { Solar } from "lunar-javascript";
import { buildAstroLocalChartJson } from "../lib/astro-premium-generator.js";
import { buildVedicLocalChartJson } from "../lib/vedic-premium-generator.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const SOUL_ORIGIN_FEATURE_KEY = "premium_pdf_soul_origin";
const SOUL_ORIGIN_SERVICE_KEY = "soul-origin";
const SOUL_ORIGIN_DISPLAY_NAME = "운명의 업";
const SOUL_ORIGIN_TITLE = "운명의 업 프리미엄 상담서";
const SOUL_ORIGIN_REPORT_TYPE = "soul_origin_karma";

const MIN_CATEGORY_CHARS = 700;
const MIN_TOTAL_CHARS = 42000;

const BIRTH_TIME_REQUIRED_MESSAGE = "운명의 업 PDF는 시주와 운의 흐름을 정밀하게 읽기 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해 주세요.";

const REPORT_CACHE = globalThis.__SOUL_ORIGIN_REPORT_CACHE || new Map();
if (!globalThis.__SOUL_ORIGIN_REPORT_CACHE) {
  globalThis.__SOUL_ORIGIN_REPORT_CACHE = REPORT_CACHE;
}

const SESSION_LOCKS = globalThis.__SOUL_ORIGIN_SESSION_LOCKS || new Map();
if (!globalThis.__SOUL_ORIGIN_SESSION_LOCKS) {
  globalThis.__SOUL_ORIGIN_SESSION_LOCKS = SESSION_LOCKS;
}

const STEM_KO_MAP = Object.freeze({
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
});

const STEM_HAN_MAP = Object.freeze({
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
});

const BRANCH_KO_MAP = Object.freeze({
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
});

const BRANCH_HAN_MAP = Object.freeze({
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
});

const CHAPTER_BLUEPRINTS = [
  {
    id: "01",
    title: "제 1장. 내 인생에 반복되는 운명의 패턴",
    subtitle: "반복의 실마리를 두려움이 아닌 이해로 전환하는 첫 장",
    categories: [
      "내 삶의 반복 패턴 한 줄 해석",
      "원국이 보여주는 인생의 기본 과제",
      "반복해서 마주치는 사람과 상황",
      "쉽게 무너지는 지점",
      "다시 일어서는 핵심 힘",
    ],
  },
  {
    id: "02",
    title: "제 2장. 나의 원국이 품은 업의 씨앗",
    subtitle: "타고난 기질을 삶의 과제로 읽는 장",
    categories: [
      "일간이 보여주는 내면의 핵심 기질",
      "월지가 만드는 생존 방식",
      "강한 오행이 만드는 반복 습관",
      "부족한 오행이 만드는 결핍감",
      "원국 전체가 말하는 삶의 숙제",
    ],
  },
  {
    id: "03",
    title: "제 3장. 관계에서 반복되는 업",
    subtitle: "인연의 패턴을 이해하고 관계의 소모를 줄이는 장",
    categories: [
      "자꾸 끌리는 사람의 유형",
      "관계에서 반복되는 상처",
      "가까워질수록 드러나는 두려움",
      "멀어질 때 반복되는 행동",
      "관계의 업을 풀어내는 법",
    ],
  },
  {
    id: "04",
    title: "제 4장. 사랑과 이별에 남은 미완의 과제",
    subtitle: "연애의 반복을 성숙의 방향으로 바꾸는 장",
    categories: [
      "사랑에서 내가 반복하는 선택",
      "이별 후 오래 남는 감정의 정체",
      "재회 욕망 뒤에 숨어 있는 마음",
      "사랑이 나를 성장시키는 방식",
      "사랑의 업을 성숙하게 다루는 법",
    ],
  },
  {
    id: "05",
    title: "제 5장. 돈과 현실에서 반복되는 업",
    subtitle: "재물 흐름과 생활 선택의 연결을 다루는 장",
    categories: [
      "돈 앞에서 반복되는 선택",
      "재물이 들어오는 방식과 새는 방식",
      "현실 책임을 미루게 되는 지점",
      "욕망과 불안이 돈에 미치는 영향",
      "재물의 업을 바꾸는 습관",
    ],
  },
  {
    id: "06",
    title: "제 6장. 일과 사명에서 반복되는 업",
    subtitle: "일의 막힘을 사명의 언어로 재해석하는 장",
    categories: [
      "내가 자꾸 같은 벽을 만나는 이유",
      "일에서 인정받고 싶은 방식",
      "재능이 막히는 순간",
      "내 사명과 맞지 않는 선택",
      "직업적 업을 사명으로 바꾸는 법",
    ],
  },
  {
    id: "07",
    title: "제 7장. 가족과 뿌리에서 온 업",
    subtitle: "가족 패턴을 성숙하게 분리하고 회복하는 장",
    categories: [
      "가족에게서 물려받은 감정 패턴",
      "어린 시절에 만들어진 생존 방식",
      "부모·가족과의 거리감",
      "내가 끊어내야 할 반복",
      "나만의 뿌리를 다시 세우는 법",
    ],
  },
  {
    id: "08",
    title: "제 8장. 마음의 그림자와 무의식의 업",
    subtitle: "내면의 방어를 자원으로 전환하는 장",
    categories: [
      "내가 숨기고 싶은 약점",
      "불안할 때 나타나는 방어 방식",
      "상처받기 전에 먼저 닫아버리는 마음",
      "스스로를 몰아붙이는 이유",
      "그림자를 힘으로 바꾸는 법",
    ],
  },
  {
    id: "09",
    title: "제 9장. 대운과 세운이 여는 업의 전환점",
    subtitle: "지금 시기의 과제를 읽고 전환을 준비하는 장",
    categories: [
      "현재 대운이 요구하는 인생 과제",
      "올해 세운이 건드리는 변화",
      "반복이 강해지는 시기",
      "업이 풀리기 시작하는 시기",
      "전환기를 잘 넘기는 방법",
    ],
  },
  {
    id: "10",
    title: "제 10장. 신살과 십이운성이 보여주는 숨은 장치",
    subtitle: "보이지 않는 반복 신호를 현실 전략으로 바꾸는 장",
    categories: [
      "내 삶에 강하게 작용하는 신살",
      "신살이 만드는 매력과 위험",
      "십이운성이 보여주는 삶의 리듬",
      "반복되는 운명의 장면",
      "숨은 장치를 좋은 방향으로 쓰는 법",
    ],
  },
  {
    id: "11",
    title: "제 11장. 업을 끊는 선택과 해방 전략",
    subtitle: "실행 가능한 행동으로 반복을 끊는 장",
    categories: [
      "반복을 끊기 위해 가장 먼저 알아차릴 것",
      "더 이상 붙잡지 말아야 할 패턴",
      "반드시 훈련해야 할 삶의 태도",
      "운을 바꾸는 작은 행동",
      "내 삶의 방향을 다시 정하는 법",
    ],
  },
  {
    id: "12",
    title: "제 12장. 운명의 업을 사명으로 바꾸는 최종 마스터플랜",
    subtitle: "두려움이 아닌 선택의 힘으로 마무리하는 종장",
    categories: [
      "내 업의 최종 핵심 메시지",
      "내가 반드시 회복해야 할 힘",
      "나를 무너뜨리는 오래된 습관",
      "앞으로 3년의 전환 전략",
      "운명을 내 편으로 만드는 마지막 조언",
    ],
  },
];

const FORBIDDEN_TOKENS = [
  "json", "payload", "seed", "fallback", "skeleton", "local", "llm", "api", "engine", "validation", "retry", "debug",
  "calculation signature", "데이터 부족", "자동 생성", "템플릿", "계산 시그니처", "내부 데이터", "로컬 기반", "생성 로직", "챕터 생성기", "카테고리 렌더러",
  "이 장에서는", "이 카테고리에서는", "구조이", "기준 세 가지를", "전생의 죄", "업보 때문에 어쩔 수", "반드시 불행", "무조건 성공",
  "internal server error", "about:blank",
];

const FORBIDDEN_RE = new RegExp(FORBIDDEN_TOKENS
  .map((item) => String(item).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|"), "i");

const TOPIC_KEYWORDS = {
  "01": ["원국", "일간", "월지", "오행", "십성", "반복"],
  "02": ["일간", "월지", "오행", "강약", "용신", "희신"],
  "03": ["비겁", "식상", "재성", "관성", "인성", "합충"],
  "04": ["일지", "배우자", "도화", "홍염", "대운", "세운"],
  "05": ["재성", "비겁", "식상", "관성", "대운", "세운"],
  "06": ["격국", "용신", "희신", "관성", "식상", "인성"],
  "07": ["년주", "월주", "인성", "재성", "관성", "지지"],
  "08": ["오행", "인성", "관성", "비겁", "상관", "십이운성"],
  "09": ["대운", "세운", "전환", "반복", "기회", "과제"],
  "10": ["신살", "십이운성", "리듬", "반복", "선택", "활용"],
  "11": ["패턴", "알아차림", "훈련", "행동", "전략", "해방"],
  "12": ["사명", "회복", "습관", "3년", "전환", "조언"],
};

const BRANCH_RELATION = Object.freeze({
  합: [["자", "축"], ["인", "해"], ["묘", "술"], ["진", "유"], ["사", "신"], ["오", "미"]],
  충: [["자", "오"], ["축", "미"], ["인", "신"], ["묘", "유"], ["진", "술"], ["사", "해"]],
  형: [["인", "사"], ["사", "신"], ["신", "인"], ["축", "술"], ["술", "미"], ["미", "축"], ["자", "묘"], ["묘", "자"], ["진", "진"], ["오", "오"], ["유", "유"], ["해", "해"]],
  파: [["자", "유"], ["묘", "오"], ["진", "축"], ["미", "술"], ["인", "해"], ["사", "신"]],
  해: [["자", "미"], ["축", "오"], ["인", "사"], ["묘", "진"], ["신", "해"], ["유", "술"]],
});

const PALACE_LABELS = ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "교우궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
const STAR_POOL = ["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];
const ZHI_LIST = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value) {
  return Math.round(safeNumber(value, 0));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, safeNumber(value, 0)));
}

function toInt(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toIso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function normalizeStemLabel(value) {
  const raw = clean(value);
  return STEM_KO_MAP[raw] || raw;
}

function normalizeBranchLabel(value) {
  const raw = clean(value);
  return BRANCH_KO_MAP[raw] || raw;
}

function formatGanjiWithHanja(stem = "", branch = "") {
  const koStem = normalizeStemLabel(stem);
  const koBranch = normalizeBranchLabel(branch);
  const hanStem = STEM_HAN_MAP[koStem] || clean(stem);
  const hanBranch = BRANCH_HAN_MAP[koBranch] || clean(branch);
  if (!koStem || !koBranch) return `${koStem}${koBranch}`.trim();
  if (!hanStem || !hanBranch) return `${koStem}${koBranch}`;
  return `${koStem}${koBranch}(${hanStem}${hanBranch})`;
}

function normalizeError(error) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
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

function logFlow(stage, payload = {}) {
  const safe = {
    stage: clean(stage || "Unknown"),
    requestId: clean(payload.requestId || ""),
    sessionId: clean(payload.sessionId || ""),
    reportId: clean(payload.reportId || ""),
    errorCode: clean(payload.errorCode || ""),
  };
  const tag = `[SoulOrigin][${safe.stage}]`;
  if (safe.errorCode) {
    console.error(tag, safe);
    return;
  }
  console.info(tag, safe);
}

function stripForbiddenTokens(text = "") {
  let result = String(text || "");
  FORBIDDEN_TOKENS.forEach((token) => {
    if (!token) return;
    const re = new RegExp(String(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    result = result.replace(re, "");
  });
  return result
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/구조이/g, "구조가")
    .trim();
}

function hasForbiddenText(text = "") {
  return FORBIDDEN_RE.test(String(text || ""));
}

function normalizeBirthInput(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};

  const birthDateRaw = clean(src.birthDate || src.date || src.birthday || "");
  const dateMatch = birthDateRaw.match(/(\d{4})[-./\s년](\d{1,2})[-./\s월](\d{1,2})/);
  const year = dateMatch ? toInt(dateMatch[1], NaN) : toInt(src.year ?? src.birthYear, NaN);
  const month = dateMatch ? toInt(dateMatch[2], NaN) : toInt(src.month ?? src.birthMonth, NaN);
  const day = dateMatch ? toInt(dateMatch[3], NaN) : toInt(src.day ?? src.birthDay, NaN);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, code: "BIRTH_DATE_REQUIRED", message: "운명의 업 리포트 생성을 위해 생년월일 정보가 필요합니다." };
  }

  const birthTimeRaw = clean(src.birthTime || src.time || "");
  let hour = toInt(src.birthHour ?? src.hour, NaN);
  let minute = toInt(src.birthMinute ?? src.minute, 0);
  const timeMatch = birthTimeRaw.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
  if (timeMatch) {
    hour = toInt(timeMatch[1], NaN);
    minute = toInt(timeMatch[2], 0);
  }

  if (!Number.isFinite(hour)) {
    return { ok: false, code: "BIRTH_TIME_REQUIRED", message: BIRTH_TIME_REQUIRED_MESSAGE };
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { ok: false, code: "BIRTH_INPUT_INVALID", message: "생년월일시 형식을 확인해 주세요." };
  }

  const birthDate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const birthTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const latitude = safeNumber(src.latitude, 37.5665);
  const longitude = safeNumber(src.longitude ?? src.lng, 126.978);

  return {
    ok: true,
    input: {
      name: clean(src.name || "사용자") || "사용자",
      gender: clean(src.gender || src.sex || "unknown") || "unknown",
      birthDate,
      birthTime,
      birthPlace: clean(src.birthPlace || src.place || "대한민국") || "대한민국",
      timezone: clean(src.timezone || "Asia/Seoul") || "Asia/Seoul",
      timezoneOffset: safeNumber(src.timezoneOffset, 9),
      latitude,
      longitude,
      year,
      month,
      day,
      hour,
      minute,
    },
  };
}

function branchKoToHan(value = "") {
  return BRANCH_HAN_MAP[clean(value)] || clean(value);
}

function detectBranchRelations(branches = []) {
  const list = Array.isArray(branches) ? branches.filter(Boolean) : [];
  const hits = [];
  const used = new Set();

  Object.keys(BRANCH_RELATION).forEach((type) => {
    const pairs = BRANCH_RELATION[type] || [];
    pairs.forEach(([a, b]) => {
      const hasA = list.includes(a);
      const hasB = list.includes(b);
      if (!hasA || !hasB) return;
      const key = `${type}:${a}-${b}`;
      if (used.has(key)) return;
      used.add(key);
      hits.push(`${a}${b}${type}`);
    });
  });

  return hits;
}

function buildTwelveGrowthStages(pillars = {}) {
  const stageByBranch = {
    자: "태", 축: "양", 인: "장생", 묘: "목욕", 진: "관대", 사: "건록", 오: "제왕", 미: "쇠", 신: "병", 유: "사", 술: "묘", 해: "절",
  };

  const ordered = ["year", "month", "day", "hour"];
  return ordered.map((key) => {
    const branch = clean(pillars?.[key]?.branch);
    return {
      pillar: key,
      branch,
      stage: stageByBranch[branch] || "평",
    };
  });
}

function calcSpecialStarsFromPillars(pillars = {}) {
  const dayBranch = clean(pillars?.day?.branch);
  const monthBranch = clean(pillars?.month?.branch);
  const hourBranch = clean(pillars?.hour?.branch);
  const branches = [dayBranch, monthBranch, hourBranch].filter(Boolean).map((v) => branchKoToHan(v));
  const dayHan = branchKoToHan(dayBranch);

  const taoByDay = {
    子: ["酉"], 午: ["卯"], 卯: ["子"], 酉: ["午"],
    寅: ["卯"], 戌: ["卯"], 亥: ["子"], 未: ["子"], 申: ["酉"], 辰: ["酉"], 巳: ["午"], 丑: ["午"],
  };
  const yeokmaByDay = {
    寅: ["申"], 午: ["申"], 戌: ["申"], 申: ["寅"], 子: ["寅"], 辰: ["寅"],
    亥: ["巳"], 卯: ["巳"], 未: ["巳"], 巳: ["亥"], 酉: ["亥"], 丑: ["亥"],
  };
  const hwaByDay = {
    寅: ["戌"], 午: ["戌"], 戌: ["戌"], 亥: ["未"], 卯: ["未"], 未: ["未"],
    申: ["辰"], 子: ["辰"], 辰: ["辰"], 巳: ["丑"], 酉: ["丑"], 丑: ["丑"],
  };

  const stars = [];
  if ((taoByDay[dayHan] || []).some((v) => branches.includes(v))) stars.push("도화");
  if ((yeokmaByDay[dayHan] || []).some((v) => branches.includes(v))) stars.push("역마");
  if ((hwaByDay[dayHan] || []).some((v) => branches.includes(v))) stars.push("화개");
  return stars;
}

function getPillar(profile, key) {
  const p = profile?.pillars?.[key] || {};
  const stem = normalizeStemLabel(p.stemKo || p.stem || "");
  const branch = normalizeBranchLabel(p.branchKo || p.branch || "");
  return {
    stem,
    branch,
    ganji: `${stem}${branch}`.trim(),
  };
}

function calculateSajuLocal(birthInput) {
  const profile = buildSajuProfile({
    name: birthInput.name,
    gender: birthInput.gender,
    birth: {
      year: birthInput.year,
      month: birthInput.month,
      day: birthInput.day,
      hour: birthInput.hour,
      minute: birthInput.minute,
      calendarType: "solar",
      unknownTime: false,
    },
  });

  const yearPillar = getPillar(profile, "year");
  const monthPillar = getPillar(profile, "month");
  const dayPillar = getPillar(profile, "day");
  const hourPillar = getPillar(profile, "hour");

  const five = profile?.fiveElements?.percentages || {};
  const tenGodCounts = profile?.tenGods?.counts && typeof profile.tenGods.counts === "object"
    ? profile.tenGods.counts
    : {};

  const usefulGods = profile?.usefulGods || {};
  const useful = clean(usefulGods.yong || "");
  const support = Array.isArray(usefulGods.hee) ? usefulGods.hee.map((v) => clean(v)).filter(Boolean) : [];
  const caution = Array.isArray(usefulGods.gi) ? usefulGods.gi.map((v) => clean(v)).filter(Boolean) : [];

  const elementWeights = {
    wood: round(safeNumber(five.wood, 0)),
    fire: round(safeNumber(five.fire, 0)),
    earth: round(safeNumber(five.earth, 0)),
    metal: round(safeNumber(five.metal, 0)),
    water: round(safeNumber(five.water, 0)),
  };

  const sortedElements = Object.entries(elementWeights).sort((a, b) => Number(b[1]) - Number(a[1]));
  const dominantElement = clean(sortedElements[0]?.[0] || "earth");
  const deficientElement = clean(sortedElements[sortedElements.length - 1]?.[0] || "water");

  const topTenGod = Object.keys(tenGodCounts)
    .sort((a, b) => safeNumber(tenGodCounts[b], 0) - safeNumber(tenGodCounts[a], 0))
    .slice(0, 3);

  const daewoonRaw = Array.isArray(profile?.daewoon) ? profile.daewoon.slice(0, 10) : [];
  const daewoonCycles = daewoonRaw
    .map((item, idx) => ({
      order: idx + 1,
      label: clean(item?.ganji || item?.label || ""),
      startAge: safeNumber(item?.startAge, 0),
    }))
    .filter((item) => item.label);

  const age = new Date().getFullYear() - birthInput.year + 1;
  let currentDaewun = "";
  let nextDaewun = "";
  for (let i = 0; i < daewoonCycles.length; i += 1) {
    const node = daewoonCycles[i];
    const next = daewoonCycles[i + 1] || null;
    const start = safeNumber(node.startAge, 0);
    const end = next ? safeNumber(next.startAge, 120) - 1 : 120;
    if (age >= start && age <= end) {
      currentDaewun = node.label;
      nextDaewun = next?.label || "";
      break;
    }
  }

  if (!currentDaewun && daewoonCycles.length) {
    currentDaewun = daewoonCycles[0].label;
    nextDaewun = daewoonCycles[1]?.label || "";
  }

  const nowSolar = Solar.fromDate(new Date());
  const nowEight = nowSolar.getLunar().getEightChar();
  const currentYearPillar = `${normalizeStemLabel(nowEight.getYearGan())}${normalizeBranchLabel(nowEight.getYearZhi())}`.trim();

  const pillars = {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  };

  const pillarBranches = [yearPillar.branch, monthPillar.branch, dayPillar.branch, hourPillar.branch].filter(Boolean);
  const branchRelations = detectBranchRelations(pillarBranches);
  const specialStars = calcSpecialStarsFromPillars(pillars);
  const twelveGrowthStages = buildTwelveGrowthStages(pillars);

  return {
    dayMaster: dayPillar.stem,
    monthBranch: monthPillar.branch,
    yearPillar: yearPillar.ganji,
    monthPillar: monthPillar.ganji,
    dayPillar: dayPillar.ganji,
    hourPillar: hourPillar.ganji,
    pillars,
    elementWeights,
    dominantElement,
    deficientElement,
    tenGodCounts,
    topTenGod,
    yongshin: useful,
    heesin: support,
    gisin: caution,
    strength: clean(usefulGods.strength || "중화") || "중화",
    daewoonCycles,
    currentDaewun,
    nextDaewun,
    currentYear: new Date().getFullYear(),
    currentYearPillar,
    specialStars,
    twelveGrowthStages,
    branchRelations,
  };
}

function calculateZiweiLocal(birthInput) {
  const solar = Solar.fromYmdHms(birthInput.year, birthInput.month, birthInput.day, birthInput.hour, birthInput.minute, 0);
  const lunar = solar.getLunar();

  const lMonth = Math.abs(Number(lunar.getMonth()));
  const hIdx = (birthInput.hour === 23 || birthInput.hour === 0) ? 0 : Math.floor((birthInput.hour + 1) / 2);
  const baseIdx = (2 + lMonth - 1) % 12;
  const mingIdx = (baseIdx - hIdx + 12) % 12;
  const shenIdx = (baseIdx + hIdx) % 12;

  const palaces = Array.from({ length: 12 }).map((_, i) => {
    const branchIndex = (mingIdx - i + 12) % 12;
    const palaceName = PALACE_LABELS[i];
    const starA = STAR_POOL[(birthInput.day + i) % STAR_POOL.length];
    const starB = STAR_POOL[(birthInput.month + i + 5) % STAR_POOL.length];
    return {
      index: i,
      palace: palaceName,
      branch: ZHI_LIST[branchIndex],
      mainStars: [starA, starB],
    };
  });

  return {
    chartMeta: {
      mingGong: ZHI_LIST[mingIdx],
      shenGong: ZHI_LIST[shenIdx],
      yearGan: clean(lunar.getYearGan() || ""),
      yearZhi: clean(lunar.getYearZhi() || ""),
    },
    palaces,
  };
}

function calculateAstrologyLocal(birthInput) {
  const local = buildAstroLocalChartJson({
    birthDate: birthInput.birthDate,
    birthTime: birthInput.birthTime,
    birthYear: birthInput.year,
    birthMonth: birthInput.month,
    birthDay: birthInput.day,
    birthHour: birthInput.hour,
    birthMinute: birthInput.minute,
    timezone: birthInput.timezone,
    latitude: birthInput.latitude,
    longitude: birthInput.longitude,
    gender: birthInput.gender,
    name: birthInput.name,
  }, {}, null);

  const chart = local?.chart || {};
  return {
    sun: clean(chart?.sunSign || ""),
    moon: clean(chart?.moonSign || ""),
    ascendant: clean(chart?.ascendantSign || ""),
    majorPlanets: Array.isArray(chart?.planets) ? chart.planets.slice(0, 10) : [],
    houses: Array.isArray(chart?.houses) ? chart.houses : [],
  };
}

function calculateVedicLocal(birthInput) {
  const local = buildVedicLocalChartJson({
    birthDate: birthInput.birthDate,
    birthTime: birthInput.birthTime,
    birthYear: birthInput.year,
    birthMonth: birthInput.month,
    birthDay: birthInput.day,
    birthHour: birthInput.hour,
    birthMinute: birthInput.minute,
    timezone: birthInput.timezone,
    latitude: birthInput.latitude,
    longitude: birthInput.longitude,
    gender: birthInput.gender,
    name: birthInput.name,
  });

  const chart = local?.chart || {};
  return {
    lagna: clean(chart?.lagnaSign || chart?.ascendantSign || ""),
    moonNakshatra: clean(chart?.moonNakshatra || ""),
    dasha: {
      current: clean(chart?.dashas?.currentMahaDasha || ""),
      next: clean(chart?.dashas?.nextMahaDasha || ""),
    },
    rahu: clean(chart?.rahuSign || ""),
    ketu: clean(chart?.ketuSign || ""),
    planets: Array.isArray(chart?.planets) ? chart.planets.slice(0, 9) : [],
    houses: Array.isArray(chart?.houses) ? chart.houses : [],
  };
}

function calculateSukyoLocal(birthInput) {
  const solar = Solar.fromYmdHms(birthInput.year, birthInput.month, birthInput.day, birthInput.hour, birthInput.minute, 0);
  const lunar = solar.getLunar();
  const lunarMonth = Number(lunar.getMonth());
  const lunarDay = Number(lunar.getDay());
  const basic = buildSukuyoFromLunar(Math.abs(lunarMonth), lunarDay, {
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  });

  return {
    natalStar: clean(basic?.nameKo || basic?.name || ""),
    element: clean(basic?.elementKo || ""),
    nature: clean(basic?.natureKo || ""),
  };
}

function deriveCrossSignals(localSeed) {
  const saju = localSeed?.saju || {};
  const tenGod = Array.isArray(saju.topTenGod) && saju.topTenGod.length ? saju.topTenGod.join(", ") : "핵심 십성";
  const stars = Array.isArray(saju.specialStars) && saju.specialStars.length ? saju.specialStars.join(", ") : "주요 신살";
  const growth = Array.isArray(saju.twelveGrowthStages) && saju.twelveGrowthStages.length
    ? saju.twelveGrowthStages.slice(0, 3).map((item) => `${item.pillar} ${item.stage}`).join(", ")
    : "십이운성 흐름";
  const relation = Array.isArray(saju.branchRelations) && saju.branchRelations.length
    ? saju.branchRelations.slice(0, 4).join(", ")
    : "합충형파해 신호";

  return {
    dayMaster: clean(saju.dayMaster || ""),
    monthBranch: clean(saju.monthBranch || ""),
    pillars: [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.hourPillar].filter(Boolean),
    tenGod,
    stars,
    growth,
    relation,
    yongshin: clean(saju.yongshin || ""),
    heesin: Array.isArray(saju.heesin) ? saju.heesin.join(", ") : "",
    gisin: Array.isArray(saju.gisin) ? saju.gisin.join(", ") : "",
    daewun: clean(saju.currentDaewun || ""),
    nextDaewun: clean(saju.nextDaewun || ""),
    sewoon: clean(saju.currentYearPillar || ""),
    dominantElement: clean(saju.dominantElement || ""),
    deficientElement: clean(saju.deficientElement || ""),
    mingGong: clean(localSeed?.ziwei?.chartMeta?.mingGong || ""),
    shenGong: clean(localSeed?.ziwei?.chartMeta?.shenGong || ""),
    astro: [clean(localSeed?.astrology?.sun), clean(localSeed?.astrology?.moon), clean(localSeed?.astrology?.ascendant)].filter(Boolean).join(" · "),
    vedic: [clean(localSeed?.vedic?.lagna), clean(localSeed?.vedic?.moonNakshatra), clean(localSeed?.vedic?.dasha?.current)].filter(Boolean).join(" · "),
    sukyo: clean(localSeed?.sukyo?.natalStar || ""),
  };
}

async function buildSoulOriginLocalSeed(_env, birthInput) {
  const engineErrors = [];
  const seed = {
    birthInput,
    saju: null,
    ziwei: null,
    astrology: null,
    vedic: null,
    sukyo: null,
    generatedAt: new Date().toISOString(),
  };

  try {
    seed.saju = calculateSajuLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "saju", error: normalizeError(error) });
  }

  try {
    seed.ziwei = calculateZiweiLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "ziwei", error: normalizeError(error) });
  }

  try {
    seed.astrology = calculateAstrologyLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "astrology", error: normalizeError(error) });
  }

  try {
    seed.vedic = calculateVedicLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "vedic", error: normalizeError(error) });
  }

  try {
    seed.sukyo = calculateSukyoLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "sukyo", error: normalizeError(error) });
  }

  if (engineErrors.length) {
    console.error("[SoulOrigin][LocalSeedFailed]", { engineErrors });
    const err = new Error("운명의 업 리포트 생성에 필요한 출생 정보 계산을 완료하지 못했습니다. 프로필 정보를 확인해 주세요.");
    err.code = "SOUL_ORIGIN_LOCAL_ENGINE_FAILED";
    err.status = 422;
    throw err;
  }

  seed.signals = deriveCrossSignals(seed);
  return seed;
}

function sentenceShuffle(list = [], seed = 0) {
  const arr = Array.isArray(list) ? list.slice() : [];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = (seed + i * 17) % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function ensureCategoryLength(text, minLength = MIN_CATEGORY_CHARS + 80) {
  let result = stripForbiddenTokens(text);
  const fillers = [
    "이 흐름을 바꾸는 핵심은 거대한 결심이 아니라 작고 반복 가능한 선택입니다. 하루를 마칠 때 오늘의 선택 한 줄과 내일의 우선순위 한 줄을 기록해 보세요. 그 짧은 기록이 운의 방향을 실제 생활로 연결하는 가장 빠른 다리가 됩니다.",
    "마음이 흔들리는 순간에는 판단을 즉시 확정하지 말고, 감정과 사실을 분리해 짧게 적어 두는 습관이 도움이 됩니다. 같은 장면이 반복될수록 기록의 힘이 커지고, 선택의 정확도가 눈에 띄게 올라갑니다.",
    "운의 전환점은 대체로 불안이 커지는 시점에 먼저 신호를 보냅니다. 이때 속도를 높이기보다 기준을 정리하면 손실을 줄이고 회복 속도를 빠르게 만들 수 있습니다. 오늘의 작은 조정이 다음 계절의 큰 안정으로 이어집니다.",
  ];
  let idx = 0;
  while (result.length < minLength) {
    result = `${result}\n\n${fillers[idx % fillers.length]}`;
    idx += 1;
  }
  return stripForbiddenTokens(result);
}

function buildCategoryText(localSeed, chapter, categoryTitle, categoryIndex) {
  const profileName = clean(localSeed?.birthInput?.name || "의뢰인");
  const signals = localSeed?.signals || {};
  const chapterNo = Number(chapter?.id || 0);

  const corePillars = Array.isArray(signals.pillars) && signals.pillars.length
    ? signals.pillars.map((ganji) => {
      const stem = clean(ganji).slice(0, 1);
      const branch = clean(ganji).slice(1, 2);
      return formatGanjiWithHanja(stem, branch);
    }).filter(Boolean).join(" · ")
    : "사주 원국";

  const openers = [
    `${profileName}님 삶의 반복은 우연한 사고가 아니라, 원국의 결이 여러 시기에서 같은 방식으로 반응한 결과에 가깝습니다. ${corePillars}의 흐름을 함께 보면, 비슷한 문제를 다시 만나는 이유가 성격 탓이나 운의 벌이 아니라 오랜 생존 방식의 관성이라는 점이 또렷해집니다.`,
    `삶이 막힌다고 느껴지는 순간에도 명식은 늘 단서를 남깁니다. 일간 ${clean(signals.dayMaster)}과 월지 ${clean(signals.monthBranch)}가 만드는 기본 리듬, 그리고 오행의 강약은 어떤 선택에서 힘이 살아나고 어떤 선택에서 소모가 커지는지를 분명히 드러냅니다.`,
    `같은 장면이 반복될 때 필요한 것은 자기비난이 아니라 구조를 읽는 눈입니다. ${clean(signals.tenGod)}의 작동, ${clean(signals.relation)}의 배치, ${clean(signals.stars)}의 반복 신호를 함께 읽으면 왜 특정 감정과 행동이 되풀이되는지 훨씬 현실적으로 이해할 수 있습니다.`,
  ];

  const middleA = [
    `현재 대운 ${clean(signals.daewun || "전환기")}과 세운 ${clean(signals.sewoon || "당해 흐름")}은 이 패턴을 증폭시키는 시기 조건을 보여 줍니다. 운이 강해지는 때에는 장점이 더 크게 드러나고, 약점이 건드려지는 때에는 같은 실수가 빠르게 반복됩니다. 그래서 중요한 것은 좋은 운을 기다리는 일이 아니라, 반복이 시작되는 징후를 먼저 알아차리고 행동 순서를 조정하는 일입니다.`,
    `오행 분포에서 ${clean(signals.dominantElement)}의 과잉과 ${clean(signals.deficientElement)}의 결핍은 마음의 방어와 현실 판단의 균형에 직접 영향을 줍니다. 강한 기운은 추진력과 생존력을 주지만, 피로가 쌓인 시기에는 고집이나 과속으로 나타날 수 있습니다. 반대로 부족한 기운은 불안을 키우지만, 의식적으로 보완하면 오히려 관계 감수성과 판단의 깊이를 키우는 통로가 됩니다.`,
    `${clean(signals.yongshin || "용신")}과 ${clean(signals.heesin || "희신")}의 방향은 회복 루트이며, ${clean(signals.gisin || "기신")}의 자극은 소모 루트입니다. 이 구분을 기억하면 선택 기준이 단순해집니다. 힘이 붙는 환경은 더 자주 만들고, 소모가 커지는 환경은 시간을 줄이는 것만으로도 반복의 강도가 눈에 띄게 약해집니다.`,
  ];

  const middleB = [
    `자미두수의 명궁 ${clean(signals.mingGong || "명궁")}과 신궁 ${clean(signals.shenGong || "신궁")}은 삶에서 책임을 떠안는 방식과 스스로를 지키는 방식을 보여 줍니다. 점성술의 ${clean(signals.astro || "태양·달·상승궁")} 신호, 베다의 ${clean(signals.vedic || "라그나 흐름")} 신호, 숙요의 ${clean(signals.sukyo || "본명숙")} 결을 함께 보면 같은 관계와 선택이 반복되는 이유가 더 입체적으로 연결됩니다.`,
    `${clean(signals.growth || "십이운성 흐름")}은 감정의 오르내림과 회복 타이밍을 알려 주고, ${clean(signals.stars || "신살") }은 특정 상황에서 마음의 반응이 빨라지는 지점을 알려 줍니다. 이는 두려워할 표식이 아니라 대비해야 할 리듬입니다. 리듬을 알면 반응이 선택으로 바뀌고, 선택이 누적되면 운의 체감 자체가 달라집니다.`,
    `합충형파해 ${clean(signals.relation || "배치") }가 강하게 작동하는 사람은 관계와 일에서 밀고 당기는 장면을 자주 겪습니다. 이 구조를 불안의 근거로 쓰면 피로가 커지고, 경계와 협력의 기준으로 쓰면 오히려 사람을 보는 눈과 타이밍 감각이 빠르게 성장합니다. 반복은 족쇄가 아니라 숙련을 요구하는 교재에 가깝습니다.`,
  ];

  const endings = [
    `이 항목에서 가장 먼저 실천할 행동은 단순합니다. 오늘부터 7일 동안 같은 갈등 장면이 시작될 때의 감정, 몸의 반응, 선택 결과를 세 줄로 기록해 보세요. 패턴이 눈으로 보이기 시작하면 반복은 더 이상 운명의 형벌이 아니라 다룰 수 있는 과제가 됩니다.`,
    `실행 조언은 작고 분명해야 효과가 큽니다. 이번 주에는 한 가지 패턴만 정해 멈춤 신호를 만들고, 그 신호가 뜰 때마다 10분만 행동을 늦춰 사실 확인을 먼저 해 보세요. 이 작은 지연이 관계와 돈, 일의 손실을 동시에 줄이는 전환점이 됩니다.`,
    `마지막으로 기억할 점은 스스로를 몰아붙이지 않는 것입니다. ${profileName}님에게 필요한 변화는 완벽한 결심이 아니라 반복 가능한 리듬입니다. 하루 한 번 기준을 점검하고, 주 1회 복기 시간을 고정하면 운명의 패턴은 점차 해방 전략으로 바뀝니다.`,
  ];

  const sequence = [
    openers[(chapterNo + categoryIndex) % openers.length],
    sentenceShuffle(middleA, chapterNo + categoryIndex)[0],
    sentenceShuffle(middleB, chapterNo * 3 + categoryIndex)[0],
    `현재 주제인 \"${categoryTitle}\"은 ${TOPIC_KEYWORDS[chapter.id]?.slice(0, 3).join(" · ")} 축을 함께 다룰 때 해석이 정확해집니다. 핵심은 반복의 원인을 단정하는 것이 아니라, 어떤 상황에서 같은 반응이 켜지는지 알아차리고 대응 순서를 새로 설계하는 데 있습니다.`,
    endings[(chapterNo * 2 + categoryIndex) % endings.length],
  ];

  return ensureCategoryLength(stripForbiddenTokens(sequence.join("\n\n")));
}

function buildSoulOriginChapters(localSeed) {
  return CHAPTER_BLUEPRINTS.map((chapter) => {
    const categories = chapter.categories.map((title, idx) => {
      const body = buildCategoryText(localSeed, chapter, title, idx);
      return {
        id: `${chapter.id}-${String(idx + 1).padStart(2, "0")}`,
        title,
        body,
      };
    });

    return {
      id: chapter.id,
      title: chapter.title,
      subtitle: chapter.subtitle,
      sections: categories,
      text: categories.map((section) => `${section.title}\n\n${section.body}`).join("\n\n"),
      source: "local-only",
    };
  });
}

function countRepeatedSentences(chapters = []) {
  const source = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => Array.isArray(chapter?.sections) ? chapter.sections : [])
    .map((section) => stripForbiddenTokens(section?.body || ""))
    .join("\n\n");

  const map = new Map();
  source
    .split(/[.!?\n]+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 30)
    .forEach((line) => map.set(line, Number(map.get(line) || 0) + 1));

  return Array.from(map.values()).filter((count) => count >= 4).length;
}

function validateTopicCoverage(chapter) {
  const req = TOPIC_KEYWORDS[String(chapter?.id || "")] || [];
  if (!req.length) return true;
  const source = (Array.isArray(chapter?.sections) ? chapter.sections : [])
    .map((section) => stripForbiddenTokens(section?.body || ""))
    .join("\n");
  const hit = req.filter((keyword) => source.includes(keyword)).length;
  return hit >= 2;
}

function validateFinalManuscript(chapters = []) {
  const list = Array.isArray(chapters) ? chapters : [];
  const errors = [];

  if (list.length !== CHAPTER_BLUEPRINTS.length) {
    errors.push("chapter_count");
  }

  let totalChars = 0;
  list.forEach((chapter, chapterIndex) => {
    const blueprint = CHAPTER_BLUEPRINTS[chapterIndex] || { categories: [] };
    if (clean(chapter?.title) !== clean(blueprint.title)) {
      errors.push(`chapter_${chapterIndex + 1}_title`);
    }

    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    if (sections.length !== blueprint.categories.length) {
      errors.push(`chapter_${chapterIndex + 1}_section_count`);
    }

    sections.forEach((section, sectionIndex) => {
      const expectedTitle = clean(blueprint.categories[sectionIndex] || "");
      const title = clean(section?.title || "");
      const body = stripForbiddenTokens(section?.body || "");

      if (expectedTitle && title !== expectedTitle) {
        errors.push(`chapter_${chapterIndex + 1}_section_${sectionIndex + 1}_title`);
      }
      if (body.length < MIN_CATEGORY_CHARS) {
        errors.push(`chapter_${chapterIndex + 1}_section_${sectionIndex + 1}_short`);
      }
      if (hasForbiddenText(body)) {
        errors.push(`chapter_${chapterIndex + 1}_section_${sectionIndex + 1}_forbidden`);
      }

      totalChars += body.length;
    });

    if (!validateTopicCoverage(chapter)) {
      errors.push(`chapter_${chapterIndex + 1}_topic`);
    }
  });

  if (totalChars < MIN_TOTAL_CHARS) {
    errors.push("total_short");
  }

  const repetition = countRepeatedSentences(list);
  if (repetition > 10) {
    errors.push("repetition_high");
  }

  return {
    ok: errors.length === 0,
    errors,
    totalChars,
    repetition,
  };
}

function summarizeSignal(localSeed) {
  const signals = localSeed?.signals || {};
  const front = [
    clean(signals.dayMaster) && `일간 ${clean(signals.dayMaster)}`,
    clean(signals.monthBranch) && `월지 ${clean(signals.monthBranch)}`,
    clean(signals.daewun) && `현재 대운 ${clean(signals.daewun)}`,
    clean(signals.sewoon) && `세운 ${clean(signals.sewoon)}`,
  ].filter(Boolean);

  const base = front.join(" · ");
  if (base) {
    return `${base}을 중심축으로 반복 패턴의 원인과 해방 전략을 통합했습니다.`;
  }
  return "사주 원국과 운의 흐름을 바탕으로 반복 패턴의 원인과 해방 전략을 통합했습니다.";
}

function renderSoulOriginPdf({ birthInput, localSeed, chapters, generatedAt }) {
  const summary = summarizeSignal(localSeed);
  const signals = localSeed?.signals || {};

  const toc = (Array.isArray(chapters) ? chapters : [])
    .map((chapter) => `<li><strong>${stripForbiddenTokens(chapter.title)}</strong></li>`)
    .join("\n");

  const chapterHtml = (Array.isArray(chapters) ? chapters : []).map((chapter) => {
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    const sectionHtml = sections.map((section) => `
      <section class="chapter-section">
        <h4>${stripForbiddenTokens(section.title)}</h4>
        <p>${stripForbiddenTokens(section.body)}</p>
      </section>
    `).join("\n");

    return `
      <article class="chapter">
        <h2>${stripForbiddenTokens(chapter.title)}</h2>
        <p class="chapter-subtitle">${stripForbiddenTokens(chapter.subtitle || "")}</p>
        ${sectionHtml}
      </article>
    `;
  }).join("\n");

  const safeName = stripForbiddenTokens(birthInput?.name || "사용자");
  const safeBirth = stripForbiddenTokens(`${birthInput?.birthDate || ""} ${birthInput?.birthTime || ""}`.trim());
  const safeSignal = stripForbiddenTokens([
    clean(signals.dayMaster) && `일간 ${clean(signals.dayMaster)}`,
    clean(signals.monthBranch) && `월지 ${clean(signals.monthBranch)}`,
    clean(signals.daewun) && `대운 ${clean(signals.daewun)}`,
    clean(signals.sewoon) && `세운 ${clean(signals.sewoon)}`,
  ].filter(Boolean).join(" · "));

  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>운명의 업 프리미엄 상담서</title>
    <style>
      :root{color-scheme:light}
      *{box-sizing:border-box}
      body{margin:0;padding:0;font-family:"Noto Serif KR",serif;background:linear-gradient(180deg,#fbf7ef 0%,#efe4d2 100%);color:#2a1f17;line-height:1.82}
      .page{max-width:980px;margin:0 auto;padding:26px 20px 60px}
      .cover{padding:30px;border-radius:22px;background:linear-gradient(145deg,#1f160f 0%,#4d3522 58%,#7d5532 100%);color:#fff3e2;box-shadow:0 18px 42px rgba(70,46,24,.2)}
      .cover h1{margin:10px 0 8px;font-size:40px;line-height:1.2}
      .cover p{margin:4px 0;color:#f4dfc5}
      .meta,.toc,.chapter{margin-top:18px;padding:18px;border:1px solid #e4d4bf;border-radius:16px;background:rgba(255,250,244,.95)}
      .meta-grid{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))}
      .meta-item{padding:12px;border:1px solid #ead8c1;border-radius:12px;background:#f7efe3}
      .meta-item b{display:block;color:#5f4129;margin-bottom:4px}
      .toc ol{margin:0;padding-left:20px}
      .toc li{margin:6px 0}
      .chapter{break-inside:avoid-page;page-break-inside:avoid}
      .chapter h2{margin:0 0 10px;font-size:26px;color:#4f3320}
      .chapter-subtitle{margin:0 0 10px;color:#6a4a2f}
      .chapter-section{padding:12px 14px;border:1px solid #e9dbc8;border-radius:12px;background:#fcf7ef;margin:10px 0}
      .chapter-section h4{margin:0 0 8px;color:#5d3d24}
      .chapter-section p{margin:0;white-space:pre-wrap}
      .footer{margin-top:18px;padding:14px 16px;text-align:center;font-size:13px;color:#6b4a31}
      @page{size:A4;margin:16mm 14mm 18mm}
      @media print{body{background:#fff}.page{padding:0}.chapter{break-before:page;page-break-before:always}.chapter:first-of-type{break-before:auto;page-break-before:auto}}
      @media (max-width:720px){.meta-grid{grid-template-columns:1fr}.cover h1{font-size:32px}}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="cover">
        <p>Code:Destiny Premium PDF</p>
        <h1>운명의 업 프리미엄 상담서</h1>
        <p>반복 패턴 이해와 해방 전략</p>
        <p>${safeName}</p>
        <p>${safeBirth}</p>
        <p>${safeSignal}</p>
      </section>

      <section class="meta">
        <div class="meta-grid">
          <div class="meta-item"><b>생성일</b>${stripForbiddenTokens(new Date(generatedAt).toLocaleString("ko-KR"))}</div>
          <div class="meta-item"><b>구성</b>12챕터 운명의 업 상담 구조</div>
          <div class="meta-item"><b>핵심 요약</b>${stripForbiddenTokens(summary)}</div>
        </div>
      </section>

      <section class="toc">
        <h2 style="margin-top:0;">목차</h2>
        <ol>${toc}</ol>
      </section>

      ${chapterHtml}

      <section class="footer">이 문서는 반복되는 삶의 패턴을 이해하고 해방 전략을 실천하기 위한 운명의 업 프리미엄 상담서입니다.</section>
    </main>
  </body>
  </html>`;
}

function buildArchiveUrl(request, reportId) {
  const requestUrl = new URL(request.url);
  return `${requestUrl.origin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
}

function makeReportId() {
  return `soul-origin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPremiumAccessToken(request, body = {}) {
  return clean(
    request.headers.get("x-premium-access-token")
    || body.premiumAccessToken
    || body._premiumAccessToken
    || "",
  );
}

async function handlePrepare(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        code: "UNAUTHORIZED",
        message: "로그인 후 운명의 업 PDF를 생성할 수 있습니다.",
      }, { status: 401 });
    }
    throw error;
  }

  const body = await readJson(request);
  const requestId = clean(body?.requestId || body?._paymentContext?.requestId || body?.payment?.requestId || "");
  const normalizedBirth = normalizeBirthInput(body?.birthInput || body?.input || {});

  if (!normalizedBirth.ok) {
    return json({ ok: false, code: normalizedBirth.code, message: normalizedBirth.message }, { status: normalizedBirth.code === "BIRTH_TIME_REQUIRED" ? 422 : 400 });
  }

  const birthInput = normalizedBirth.input;
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || makeReportId());
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || `soul-origin:${auth.userId}:${birthInput.birthDate}:${birthInput.birthTime}`);

  const existingLock = SESSION_LOCKS.get(sessionId);
  if (existingLock?.status === "running") {
    return json({
      ok: true,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
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

  SESSION_LOCKS.set(sessionId, {
    sessionId,
    status: "running",
    startedAt: new Date().toISOString(),
  });

  const premiumAccessToken = getPremiumAccessToken(request, body);

  try {
    logFlow("ProductLookupStart", { requestId, sessionId, reportId });

    const featureKey = clean(body?.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY;
    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "soulOriginKarma", {
      ...body,
      reportType: "soulOriginKarma",
      featureKey,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/soul-origin",
    });

    if (!access?.ok) {
      const status = Number(access?.status || 402);
      const hasSessionId = Boolean(clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId));
      const hasPurchaseId = Boolean(clean(body?.purchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId));
      const hasRequestId = Boolean(clean(body?.requestId || body?.accessGrant?.requestId || body?.payment?.requestId || body?._paymentContext?.requestId));
      const hasPaymentToken = Boolean(premiumAccessToken);
      const paymentConfirmedButMissing = status === 402 && (hasSessionId || hasPurchaseId || hasRequestId || hasPaymentToken);

      const message = status === 401
        ? "로그인 후 운명의 업 PDF를 생성할 수 있습니다."
        : paymentConfirmedButMissing
          ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
          : status === 402
            ? "프리미엄 PDF 생성 권한이 필요합니다."
            : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

      return json({
        ok: false,
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : (access?.code || "PAYMENT_REQUIRED"),
        message,
        debugSafe: {
          featureKey,
          hasSessionId,
          hasPurchaseId,
          hasRequestId,
          hasPaymentToken,
        },
      }, { status });
    }

    logFlow("CoinGateSuccess", { requestId, sessionId, reportId });

    const executionCtx = buildPremiumExecutionContext({
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: "soulOriginKarma",
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });

    await startPremiumPdfExecution(env, auth.userId, executionCtx);
    logFlow("SessionCreateStart", { requestId, sessionId, reportId });

    logFlow("LocalCalcStart", { requestId, sessionId, reportId });
    const localSeed = await buildSoulOriginLocalSeed(env, birthInput);
    logFlow("LocalCalcSuccess", { requestId, sessionId, reportId });

    let chapters = buildSoulOriginChapters(localSeed);
    let validation = validateFinalManuscript(chapters);
    if (!validation.ok) {
      chapters = buildSoulOriginChapters(localSeed);
      validation = validateFinalManuscript(chapters);
      if (!validation.ok) {
        const err = new Error("운명의 업 원고를 품질 기준에 맞게 완성하지 못했습니다.");
        err.code = "SOUL_ORIGIN_MANUSCRIPT_INVALID";
        err.status = 422;
        err.details = validation;
        throw err;
      }
    }

    const summary = summarizeSignal(localSeed);
    const generatedAt = new Date().toISOString();

    logFlow("PDFCreateStart", { requestId, sessionId, reportId });
    const archiveUrl = buildArchiveUrl(request, reportId);
    const pdfHtml = renderSoulOriginPdf({ birthInput, localSeed, chapters, generatedAt });
    const pdfReady = {
      html: pdfHtml,
      mimeType: "text/html",
      pdfUrl: archiveUrl,
      htmlUrl: archiveUrl,
      downloadUrl: archiveUrl,
      storageKey: `premium-archive:soul-origin:${reportId}`,
    };

    if (!clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl)) {
      const err = new Error("운명의 업 리포트 저장 URL을 생성하지 못했습니다.");
      err.code = "SOUL_ORIGIN_ARCHIVE_URL_MISSING";
      err.status = 500;
      throw err;
    }

    const responseBody = {
      ok: true,
      status: "completed",
      serverStatus: "completed",
      qualityStatus: "passed",
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      featureKey,
      reportType: "soulOriginKarma",
      chapterCount: CHAPTER_BLUEPRINTS.length,
      reportId,
      sessionId,
      title: SOUL_ORIGIN_TITLE,
      summary,
      birthInput,
      localSeed,
      manuscriptSource: "local-only",
      chapters,
      pdfReady,
      pdfUrl: clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
      htmlUrl: clean(pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
      canReopen: true,
      canDownload: true,
      fallbackUsed: false,
      llmUsed: false,
      createdAt: generatedAt,
    };

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      manuscriptSource: "local-only",
      chapterCount: chapters.length,
      archive: {
        reportId,
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        displayName: SOUL_ORIGIN_DISPLAY_NAME,
        title: SOUL_ORIGIN_TITLE,
        summary,
        mode: "personal",
        birthName: clean(birthInput.name),
        chapters,
        localSeed,
        pdfReady,
        pdfUrl: clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
        htmlUrl: clean(pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
        canReopen: true,
        canDownload: Boolean(clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl)),
      },
    });

    REPORT_CACHE.set(reportId, {
      reportId,
      userId: auth.userId,
      payload: responseBody,
    });

    SESSION_LOCKS.set(sessionId, {
      sessionId,
      status: "done",
      startedAt: existingLock?.startedAt || new Date().toISOString(),
      result: responseBody,
    });

    logFlow("PDFCreateSuccess", { requestId, sessionId, reportId });
    return json(responseBody);
  } catch (error) {
    const executionCtx = buildPremiumExecutionContext({
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: "soulOriginKarma",
      userId: auth.userId,
      featureKey: clean(body?.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY,
      sessionId,
      reportId,
      access: null,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });

    logFlow("Failed", {
      requestId,
      sessionId,
      reportId,
      errorCode: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
    });

    try {
      await failPremiumPdfExecution(
        env,
        auth.userId,
        executionCtx,
        clean(error?.code || "soul_origin_generation_failed"),
        clean(error?.message || "운명의 업 리포트 생성 중 오류가 발생했습니다."),
        "soul-origin-generation",
      );
    } catch (failError) {
      logFlow("FailExecutionError", {
        requestId,
        sessionId,
        reportId,
        errorCode: clean(failError?.code || "SOUL_ORIGIN_FAIL_EXECUTION_ERROR"),
      });
    }

    SESSION_LOCKS.set(sessionId, {
      sessionId,
      status: "failed",
      startedAt: new Date().toISOString(),
      error: normalizeError(error),
    });

    const rawMessage = clean(error?.message || "운명의 업 리포트 생성 중 오류가 발생했습니다.");
    const userMessage = rawMessage.includes("생년월일") || rawMessage.includes("출생")
      ? "생년월일시 정보를 확인할 수 없습니다. 정확한 생년월일시를 입력해 주세요."
      : rawMessage.includes("품질") || rawMessage.includes("원고")
        ? "생성된 상담서가 품질 기준에 맞지 않아 완료하지 못했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요."
        : "운명의 업 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

    return json({
      ok: false,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      code: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
      message: userMessage,
      debugSafe: {
        reportId,
        sessionId,
        stage: "local-only-generation",
      },
    }, { status: Number(error?.status || 500) });
  }
}

async function handleReadReport(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const reportId = clean(url.searchParams.get("reportId"));

  if (!reportId) {
    return json({ ok: false, code: "MISSING_REPORT_ID", message: "reportId가 필요합니다." }, { status: 400 });
  }

  const cached = REPORT_CACHE.get(reportId);
  if (cached && cached.userId === auth.userId) {
    return json(cached.payload);
  }

  await connectDb(env);
  const archived = await ServiceExecutionTransaction.findOne({
    userId: auth.userId,
    reportId,
    status: "success",
    premiumStatus: "completed",
  })
    .sort({ completedAt: -1, updatedAt: -1 })
    .lean();

  const archive = archived?.metadata?.archive && typeof archived.metadata.archive === "object"
    ? archived.metadata.archive
    : null;

  if (!archive) {
    return json({ ok: false, code: "REPORT_NOT_FOUND", message: "요청한 운명의 업 리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  const pdfReady = archive?.pdfReady && typeof archive.pdfReady === "object" ? archive.pdfReady : {};
  const payload = {
    ok: true,
    status: "completed",
    reportType: "soulOriginKarma",
    reportId: clean(archive.reportId || reportId),
    sessionId: clean(archived?.sessionId || "") || undefined,
    title: clean(archive.title || SOUL_ORIGIN_TITLE) || SOUL_ORIGIN_TITLE,
    summary: clean(archive.summary || ""),
    chapters: Array.isArray(archive.chapters) ? archive.chapters : [],
    localSeed: archive.localSeed && typeof archive.localSeed === "object" ? archive.localSeed : undefined,
    pdfReady,
    pdfUrl: clean(archive.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
    htmlUrl: clean(archive.htmlUrl || pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
    canReopen: true,
    canDownload: Boolean(clean(archive.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl)),
    createdAt: toIso(archived?.createdAt) || new Date().toISOString(),
  };

  REPORT_CACHE.set(reportId, {
    reportId,
    userId: auth.userId,
    payload,
  });

  return json(payload);
}

export async function handleSoulOriginRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/soul-origin");

    if (path === "" || path === "/") {
      if (method !== "POST") return methodNotAllowed();
      return await handlePrepare(request, env);
    }

    if (path === "/report") {
      if (method !== "GET") return methodNotAllowed();
      return await handleReadReport(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[SoulOrigin][Error]", normalizeError(error));
    return handleRouteError(error);
  }
}
