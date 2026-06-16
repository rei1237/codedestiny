import { Solar } from "lunar-javascript";
import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { verifyPremiumAccessToken } from "../lib/premium-access-token.js";
import { normalizePaidFeatureKey } from "../lib/paid-feature-registry.js";
import {
  SUKYO_PDF_ALIAS_FEATURE_KEY,
  SUKYO_PDF_CHAPTER_COUNT,
  SUKYO_PDF_CHAPTERS,
  SUKYO_PDF_CONFIG,
  SUKYO_PDF_FEATURE_KEY,
  buildSukyoPdfSeed,
  generateSukyoPremiumReport,
  validateSukyoPdfCompletionPayload,
  validateSukyoPdfInput,
} from "../lib/sukyo-pdf.js";
import { buildCanonicalSukuyoCompatibility, buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ProfileCard, ServiceExecutionTransaction, User } from "../lib/models.js";
import { findActivePaidContentUnlock } from "../lib/content-unlocks.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import { generateSukuyoLocalPdf } from "../pdf-v2/sukuyo-local-pdf.js";

const SUKUYO_SESSION_LOCK_TTL_MS = 20 * 60 * 1000;
const SUKYO_COMPAT_TOKEN_MIN_COINS = 490;
const SUKYO_YEARLY_FORTUNE_PRICE_KRW = 10000;
const SUKYO_YEARLY_FORTUNE_PRICE_COINS = 100;
const SUKYO_YEARLY_FORTUNE_PRODUCT_KEY = "sukyo_yearly_fortune_unlock";
const SUKYO_YEARLY_FORTUNE_SERVICE_KEY = "sukuyo";
const sukuyoPdfGenerationLocks = new Map();

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function toNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSukuyoError(error) {
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
      return {
        message: String(error),
      };
    }
  }

  return {
    message: String(error),
  };
}

function getSukuyoSessionId(body = {}) {
  const raw = clean(body?.sessionId || body?.requestId || body?.reportId);
  return raw || `sukyo-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanupExpiredSukuyoLocks() {
  const now = Date.now();
  for (const [key, value] of sukuyoPdfGenerationLocks.entries()) {
    const startedAtMs = Date.parse(value?.startedAt || "") || 0;
    if (startedAtMs <= 0 || now - startedAtMs > SUKUYO_SESSION_LOCK_TTL_MS) {
      sukuyoPdfGenerationLocks.delete(key);
    }
  }
}

function parseDateParts(value) {
  const raw = clean(value);
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = toNumber(match[1]);
  const month = toNumber(match[2]);
  const day = toNumber(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

const KOREAN_HOUR_MAP = {
  자시: 23,
  축시: 1,
  인시: 3,
  묘시: 5,
  진시: 7,
  사시: 9,
  오시: 11,
  미시: 13,
  신시: 15,
  유시: 17,
  술시: 19,
  해시: 21,
};

function parseTimeParts(value) {
  const raw = clean(value);
  const lower = raw.toLowerCase();

  if (!raw || /모름|unknown/.test(lower)) {
    return { hour: 12, minute: 0, hasTime: false, isTimeUnknown: true, normalizedTime: "" };
  }

  if (Number.isFinite(KOREAN_HOUR_MAP[raw])) {
    const hour = KOREAN_HOUR_MAP[raw];
    return { hour, minute: 0, hasTime: true, isTimeUnknown: false, normalizedTime: `${String(hour).padStart(2, "0")}:00` };
  }

  let hour = null;
  let minute = 0;

  const hhmm = lower.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (hhmm) {
    hour = Number(hhmm[1]);
    minute = Number(hhmm[2] || "0");
  }

  const korean = lower.match(/^(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?$/);
  if (korean) {
    const base = Number(korean[2]);
    const isPm = korean[1] === "오후";
    hour = base % 12;
    if (isPm) hour += 12;
    minute = Number(korean[3] || "0");
  }

  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return { hour: 12, minute: 0, hasTime: false, isTimeUnknown: true, normalizedTime: "" };
  }

  return {
    hour,
    minute,
    hasTime: true,
    isTimeUnknown: false,
    normalizedTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function normalizeGender(raw) {
  const token = clean(raw).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(token)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(token)) return "female";
  return "unknown";
}

function normalizeCalendarType(raw) {
  const token = clean(raw).toLowerCase();
  if (token.includes("lunar_leap") || token.includes("lunar-leap") || token.includes("leap") || token.includes("\uc724")) return "lunar_leap";
  if (token.includes("solar") || token.includes("양")) return "solar";
  if (token.includes("lunar") || token.includes("음")) return "lunar";
  return "unknown";
}

function normalizeRequestedMode(raw) {
  const token = clean(raw).toLowerCase();
  if (["compatibility", "compat", "couple", "궁합"].some((v) => token.includes(v))) return "compatibility";
  if (["personal", "solo", "single", "개인", "나만"].some((v) => token.includes(v))) return "personal";
  return "compatibility";
}

function normalizePersonInput(raw = {}, fallbackName = "사용자") {
  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : raw;
  const birthDate = clean(
    profile.birthDate
      || profile.birthday
      || profile.solarDate
      || profile.lunarDate
      || profile.date
      || profile.partnerBirth
      || profile.partnerBirthDate
      || profile.targetBirth
      || profile.targetDate,
  );

  const date = parseDateParts(birthDate);
  const time = parseTimeParts(
    profile.birthTime
      || profile.time
      || profile.partnerTime
      || profile.hour
      || profile.birth_hour,
  );

  return {
    name: clean(profile.name || profile.label || fallbackName),
    gender: normalizeGender(profile.gender || profile.sex),
    calendarType: normalizeCalendarType(profile.calendarType || profile.calType),
    birthDate,
    birthYear: date?.year ?? null,
    birthMonth: date?.month ?? null,
    birthDay: date?.day ?? null,
    birthTime: time.normalizedTime,
    birthHour: time.hasTime ? time.hour : null,
    birthMinute: time.hasTime ? time.minute : null,
    timezone: clean(profile.timezone || "Asia/Seoul") || "Asia/Seoul",
    isTimeUnknown: time.isTimeUnknown,
  };
}

function buildSukuyoGenderValidationError(input) {
  const fieldErrors = {};
  const missing = [];
  if (!["male", "female"].includes(clean(input?.self?.gender))) {
    missing.push("self.gender");
    fieldErrors.skSelfGender = "나의 성별을 남자 또는 여자로 선택해 주세요.";
  }
  if (!["male", "female"].includes(clean(input?.partner?.gender))) {
    missing.push("partner.gender");
    fieldErrors.skPartnerGender = "상대방 성별을 남자 또는 여자로 선택해 주세요.";
  }
  if (!missing.length) return null;
  return {
    ok: false,
    code: "SUKUYO_GENDER_REQUIRED",
    message: "숙요점 프리미엄 PDF는 두 사람의 성별을 남자 또는 여자로 확정해야 생성할 수 있습니다.",
    hardMissingFields: missing,
    fieldErrors,
  };
}

function toLunarBirth(person) {
  if (!Number.isFinite(person.birthYear) || !Number.isFinite(person.birthMonth) || !Number.isFinite(person.birthDay)) {
    throw Object.assign(new Error("두 사람의 생년월일을 정확히 입력해 주세요."), { status: 400, code: "SUKUYO_MISSING_BIRTH" });
  }

  if (person.calendarType === "lunar") {
    return {
      lunarYear: person.birthYear,
      lunarMonth: person.birthMonth,
      lunarDay: person.birthDay,
      isLeapMonth: false,
      source: "user-lunar-input",
    };
  }

  const hour = Number.isFinite(person.birthHour) ? person.birthHour : 12;
  const minute = Number.isFinite(person.birthMinute) ? person.birthMinute : 0;
  const solar = Solar.fromYmdHms(person.birthYear, person.birthMonth, person.birthDay, hour, minute, 0);
  const lunar = solar.getLunar();
  const lunarMonth = Number(lunar.getMonth());

  return {
    lunarYear: Number(lunar.getYear()),
    lunarMonth: Math.abs(lunarMonth),
    lunarDay: Number(lunar.getDay()),
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  };
}

function buildPersonSukuyo(person) {
  const lunar = toLunarBirth(person);
  const sukuyo = buildSukuyoFromLunar(lunar.lunarMonth, lunar.lunarDay, {
    isLeapMonth: lunar.isLeapMonth,
    source: lunar.source,
  });
  if (!sukuyo) {
    throw Object.assign(new Error("숙요점 27숙 계산에 실패했습니다."), { status: 422, code: "SUKUYO_CALC_FAILED" });
  }
  return { ...sukuyo, lunarYear: lunar.lunarYear };
}

function normalizeCompatibilityInput(body = {}) {
  const mode = normalizeRequestedMode(body?.mode || body?.reportMode || body?.questionType);
  const self = normalizePersonInput(body.self || body.user || body.userProfile || body.birthInput || {}, "사용자");
  const partner = normalizePersonInput(body.partner || body.partnerProfile || body.partnerInput || {}, "상대방");
  return { mode, self, partner };
}

function buildSukuyoSeedFromCompatibility(input = {}) {
  const selfSukuyo = buildPersonSukuyo(input.self);
  const partnerSukuyo = buildPersonSukuyo(input.partner);

  const canonical = buildCanonicalSukuyoCompatibility({
    reportType: "compatibility",
    personAName: input.self.name,
    personBName: input.partner.name,
    personAInput: {
      year: input.self.birthYear,
      month: input.self.birthMonth,
      day: input.self.birthDay,
      hour: input.self.birthHour,
      minute: input.self.birthMinute,
    },
    personBInput: {
      year: input.partner.birthYear,
      month: input.partner.birthMonth,
      day: input.partner.birthDay,
      hour: input.partner.birthHour,
      minute: input.partner.birthMinute,
    },
    personASukuyo: selfSukuyo,
    personBSukuyo: partnerSukuyo,
    calendarSource: "lunar-javascript",
    methodVersion: "sukyo-premium-compat-v2",
  });

  if (!canonical?.validation?.hasPersonAHost || !canonical?.validation?.hasPersonBHost || !canonical?.validation?.hasRelationType) {
    throw Object.assign(new Error("숙요점 궁합 계산 필수값이 부족합니다."), {
      status: 422,
      code: "SUKUYO_PDF_MISSING_FIELDS",
      missing: canonical?.validation?.missingFields || [],
    });
  }

  return buildSukyoPdfSeed({
    mode: "compatibility",
    userProfile: input.self,
    partnerProfile: input.partner,
    userSukyo: canonical.personA?.sukuyo,
    partnerSukyo: canonical.personB?.sukuyo,
    canonical,
  });
}

function buildSukuyoSeedErrorResponse(error, fallbackMessage = "숙요점 궁합 계산에 필요한 입력값을 확인해 주세요.") {
  return {
    ok: false,
    code: clean(error?.code || "SUKUYO_SEED_BUILD_FAILED"),
    message: clean(error?.message) || fallbackMessage,
    missing: Array.isArray(error?.missing) ? error.missing : undefined,
  };
}

const SUKYO_PAST_LIFE_FEATURE_KEY = "sukuyo-past-life-reading";
const SUKYO_PAST_LIFE_REPORT_TYPE = "sukuyoPastLifeReading";
const SUKYO_PAST_LIFE_LOGIC_VERSION = "sukyo-past-life-v1";
const SUKYO_PAST_LIFE_PURPOSES = new Set(["love", "reunion", "marriage", "crush", "friend", "family", "business", "work", "general"]);

const SUKYO_PAST_LIFE_SCORE_RANGES = Object.freeze({
  "업태": { pastLifeFeeling: [85, 98], attraction: [75, 92], unfinishedTask: [80, 98], repeatPattern: [70, 90], emotionalExhaustion: [50, 75], healingPotential: [65, 85], realityPotential: [45, 70] },
  "안괴": { pastLifeFeeling: [75, 95], attraction: [85, 98], unfinishedTask: [70, 92], repeatPattern: [75, 95], emotionalExhaustion: [75, 98], healingPotential: [55, 80], realityPotential: [30, 60] },
  "명": { pastLifeFeeling: [65, 85], attraction: [60, 78], unfinishedTask: [55, 78], repeatPattern: [75, 92], emotionalExhaustion: [40, 65], healingPotential: [60, 82], realityPotential: [55, 75] },
  "영친": { pastLifeFeeling: [60, 82], attraction: [55, 78], unfinishedTask: [35, 58], repeatPattern: [45, 65], emotionalExhaustion: [20, 45], healingPotential: [75, 95], realityPotential: [75, 95] },
  "우쇠": { pastLifeFeeling: [55, 78], attraction: [55, 75], unfinishedTask: [55, 78], repeatPattern: [60, 82], emotionalExhaustion: [45, 70], healingPotential: [60, 82], realityPotential: [45, 70] },
  "성위": { pastLifeFeeling: [60, 82], attraction: [60, 80], unfinishedTask: [60, 85], repeatPattern: [60, 82], emotionalExhaustion: [50, 75], healingPotential: [65, 88], realityPotential: [50, 75] },
});

const SUKYO_PAST_LIFE_META = Object.freeze({
  "업태": {
    title: "오래된 약속처럼 남는 인연",
    subtitle: "설명하기 어려운 익숙함과 미완의 여운이 강하게 떠오릅니다.",
    theme: "미완의 약속",
    summary: "두 사람 사이에는 처음부터 오래 알고 지낸 듯한 결이 흐릅니다. 다만 그 익숙함이 곧 안정으로 이어지는 것은 아니어서, 감정의 깊이보다 현재의 태도와 약속이 더 또렷한 기준으로 떠오릅니다.",
    first: "낯설지 않은 느낌은 서로의 빈칸을 빠르게 알아보는 데서 시작됩니다. 오래된 기억처럼 마음이 반응하지만, 그 감각에 기대면 현실의 행동을 놓치기 쉽습니다.",
    story: "전생의 기억처럼 느껴질 만큼 여운이 긴 관계입니다. 끝나지 않은 문장이 다시 펼쳐지는 듯하고, 기다림과 해석이 반복되기 쉬운 흐름이 드러납니다.",
    task: "이번 생에서의 숙제는 의미보다 약속을 먼저 보는 것입니다. 말보다 실제로 시간을 내는지, 책임을 피하지 않는지가 관계의 진짜 온도를 비춥니다.",
    trigger: "상대의 애매한 태도, 늦은 답, 불분명한 관계 정의가 미완의 감정을 크게 흔들 수 있습니다.",
    lesson: "깊은 끌림을 현실의 신뢰로 바꾸는 법을 익힐 때 이 인연의 여운은 상처보다 성숙으로 남습니다.",
  },
  "안괴": {
    title: "강하게 흔들고 방향을 바꾸는 인연",
    subtitle: "끌림은 빠르게 올라오지만 경계와 약속이 함께 서야 합니다.",
    theme: "흔들림과 경계",
    summary: "이 관계는 서로의 약한 부분을 빠르게 비춥니다. 강렬한 끌림이 떠오르지만, 확인과 시험이 반복되면 감정 소모가 커지므로 경계와 동의가 중심에 놓여야 합니다.",
    first: "처음부터 시선이 오래 머물거나 마음이 과하게 반응하기 쉽습니다. 그 강도는 매력인 동시에 불안의 문을 함께 엽니다.",
    story: "전생 서사처럼 보면 서로에게 강한 흔적을 남긴 관계입니다. 다만 이번 생에서는 흔들림을 사랑의 증거로 삼기보다, 안전한 거리와 약속을 세우는 일이 먼저 드러납니다.",
    task: "미완의 숙제는 통제하지 않고 가까워지는 법입니다. 연락, 돈, 관계 정의, 개인 시간을 흐릿하게 두면 긴장이 커집니다.",
    trigger: "상대의 침묵, 질투, 비교, 갑작스러운 거리감이 자존심 싸움으로 번지기 쉽습니다.",
    lesson: "끌림의 크기보다 서로가 안전하게 느끼는 방식을 먼저 존중할 때 관계의 강한 빛이 상처로 번지지 않습니다.",
  },
  "명": {
    title: "거울처럼 닮은 영혼의 인연",
    subtitle: "빠른 이해와 반복 패턴이 동시에 비칩니다.",
    theme: "거울과 반복",
    summary: "두 사람은 서로의 감각을 빠르게 알아차리기 쉽습니다. 그러나 닮은 결은 장점만이 아니라 약점까지 비추므로, 같은 방식으로 물러서지 못하는 장면이 반복될 수 있습니다.",
    first: "낯설지 않은 이유는 상대 안에서 자신의 표정과 반응을 발견하기 때문입니다. 말하지 않아도 통하는 듯하지만, 같은 불안도 함께 떠오릅니다.",
    story: "전생 서사처럼 보면 같은 문을 여러 번 지나온 듯한 관계입니다. 이번에는 닮은 점에 기대기보다 반복되는 방식을 함께 다루는 흐름이 열립니다.",
    task: "미완의 숙제는 닮은 약점을 인정하는 것입니다. 서로를 고치려 하기보다 같은 패턴이 켜지는 순간을 함께 알아차려야 합니다.",
    trigger: "상대의 고집, 회피, 예민함이 자신의 모습처럼 느껴질 때 답답함이 커집니다.",
    lesson: "거울에 비친 모습을 탓하지 않고, 함께 정돈할 때 이 관계는 자기 이해의 문이 됩니다.",
  },
  "영친": {
    title: "익숙한 품처럼 쉬어 가는 인연",
    subtitle: "돌봄과 안정의 기운이 잔잔하게 머뭅니다.",
    theme: "보호와 회복",
    summary: "이 관계에는 편안하게 기대고 싶은 흐름이 있습니다. 함께 있을수록 생활 리듬이 맞기 쉽지만, 너무 익숙해지면 표현이 줄어들 수 있어 애정을 의식적으로 남겨야 합니다.",
    first: "처음부터 긴장을 많이 쓰지 않아도 되는 느낌이 있습니다. 상대의 존재가 마음을 부드럽게 낮추고, 일상의 온도를 안정시키는 쪽으로 흐릅니다.",
    story: "전생 서사처럼 보면 서로를 돌보거나 지켜본 듯한 보호자형 인연입니다. 강렬한 사건보다 오래 머무는 품의 기억처럼 다가옵니다.",
    task: "미완의 숙제는 편안함을 당연하게 여기지 않는 것입니다. 고마움과 애정을 말로 남겨야 관계의 온기가 오래 갑니다.",
    trigger: "표현 부족, 익숙함, 가족 같은 거리감이 설렘의 빈칸으로 느껴질 수 있습니다.",
    lesson: "안정 위에 작은 표현을 계속 쌓을 때 이 인연은 지치는 관계가 아니라 회복의 자리가 됩니다.",
  },
  "우쇠": {
    title: "다른 온도로 서로를 배우는 인연",
    subtitle: "속도 차이와 보완의 과제가 함께 드러납니다.",
    theme: "배움과 온도차",
    summary: "두 사람은 감정의 속도와 표현 방식이 다르게 느껴질 수 있습니다. 한쪽이 더 맞추는 흐름이 생기면 소모가 커지므로, 같은 방식의 사랑을 요구하지 않는 태도가 중요합니다.",
    first: "낯익음과 낯섦이 함께 옵니다. 끌리지만 상대의 속도가 다르게 느껴져, 마음의 보폭을 맞추는 시간이 필요합니다.",
    story: "전생 서사처럼 보면 서로에게 부족한 감각을 배워 온 관계입니다. 이번 생에서도 역할 차이와 표현 차이가 관계의 과제로 떠오릅니다.",
    task: "미완의 숙제는 균형입니다. 맞춰주는 사람만 계속 양보하지 않도록 부탁, 거절, 기다림의 기준을 나눠야 합니다.",
    trigger: "연락 빈도, 만남의 속도, 애정 표현 방식의 차이가 서운함으로 번지기 쉽습니다.",
    lesson: "다름을 부족함으로 보지 않을 때 이 관계는 서로의 세계를 넓히는 배움으로 남습니다.",
  },
  "성위": {
    title: "서로를 밀어 올리는 성장 계약형 인연",
    subtitle: "목표와 자극이 강하지만 감정의 안전감도 필요합니다.",
    theme: "성장과 현실 과제",
    summary: "두 사람은 편안함보다 자극과 성장의 흐름이 강하게 뜹니다. 함께 있으면 목표 의식이 살아나지만, 관계가 평가나 경쟁처럼 느껴지면 피로가 쌓일 수 있습니다.",
    first: "상대에게서 자극을 받고 더 나아지고 싶은 마음이 생깁니다. 처음부터 편안하기보다는 깨어나는 감각이 먼저 떠오릅니다.",
    story: "전생 서사처럼 보면 함께 어떤 목표를 이루기로 약속한 듯한 인연입니다. 이번 생에서는 성과보다 감정의 안전을 함께 세우는 일이 중요합니다.",
    task: "미완의 숙제는 목표와 마음을 분리하는 것입니다. 현실 성취가 관계의 가치 평가로 흐르지 않게 조심해야 합니다.",
    trigger: "비교, 평가, 인정 욕구, 역할 경쟁이 감정 피로로 이어질 수 있습니다.",
    lesson: "서로를 성장시키되 쉼까지 허락할 때 이 인연은 과제가 아니라 동행으로 깊어집니다.",
  },
});

function ymd(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizePastLifePurpose(raw) {
  const purpose = clean(raw || "general").toLowerCase();
  return SUKYO_PAST_LIFE_PURPOSES.has(purpose) ? purpose : "general";
}

function normalizePastLifeRelation(raw, forwardDistance) {
  const token = clean(raw);
  if (token.includes("업태")) return "업태";
  if (token.includes("영친")) return "영친";
  if (token.includes("우쇠")) return "우쇠";
  if (token.includes("안괴")) return "안괴";
  if (token.includes("성위") || token.includes("위성")) return "성위";
  if (token.includes("명")) return "명";
  const d = ((Math.floor(Number(forwardDistance) || 0) % 27) + 27) % 27;
  if (d === 0) return "명";
  if (d === 9 || d === 18) return "업태";
  if ([1, 8, 10, 17, 19, 26].includes(d)) return "영친";
  if ([2, 7, 11, 16, 20, 25].includes(d)) return "우쇠";
  if ([3, 6, 12, 15, 21, 24].includes(d)) return "안괴";
  return "성위";
}

function normalizePastLifeDistance(raw, relationType) {
  const token = clean(raw);
  if (relationType === "명" || relationType === "업태") return "해당없음";
  if (token.includes("근")) return "근거리";
  if (token.includes("중")) return "중거리";
  if (token.includes("원")) return "원거리";
  return "해당없음";
}

function normalizePastLifeDirection(forwardDistance) {
  const d = ((Math.floor(Number(forwardDistance) || 0) % 27) + 27) % 27;
  if (d === 0 || d === 9 || d === 18) return "상호작용";
  if ([1, 2, 3, 4, 10, 11, 12, 13, 19, 20, 21, 22].includes(d)) return "상대가 나에게 작용";
  if ([5, 6, 7, 8, 14, 15, 16, 17, 23, 24, 25, 26].includes(d)) return "내가 상대에게 작용";
  return "해당없음";
}

function hashPastLifeSeed(seed) {
  const text = clean(seed);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clampPastLifeScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function scorePastLifeField(relationType, field, seed, distance) {
  const range = (SUKYO_PAST_LIFE_SCORE_RANGES[relationType] || SUKYO_PAST_LIFE_SCORE_RANGES["명"])[field] || [45, 70];
  const base = Math.round((range[0] + range[1]) / 2);
  const driftRaw = hashPastLifeSeed(`${seed}:${field}`) % 11;
  let drift = driftRaw - 5;
  if (drift > 0 && drift < 3) drift = 3;
  if (drift < 0 && drift > -3) drift = -3;
  let distanceDelta = 0;
  if (distance === "근거리") {
    if (field === "attraction") distanceDelta = 5;
    if (field === "repeatPattern") distanceDelta = 4;
    if (field === "emotionalExhaustion") distanceDelta = 3;
  }
  if (distance === "중거리") {
    if (field === "healingPotential") distanceDelta = 4;
    if (field === "realityPotential") distanceDelta = 3;
  }
  if (distance === "원거리") {
    if (field === "pastLifeFeeling") distanceDelta = 4;
    if (field === "unfinishedTask") distanceDelta = 5;
  }
  return clampPastLifeScore(base + drift + distanceDelta);
}

function buildPastLifeScores(relationType, distance, seed) {
  const scores = {
    pastLifeFeeling: scorePastLifeField(relationType, "pastLifeFeeling", seed, distance),
    attraction: scorePastLifeField(relationType, "attraction", seed, distance),
    unfinishedTask: scorePastLifeField(relationType, "unfinishedTask", seed, distance),
    repeatPattern: scorePastLifeField(relationType, "repeatPattern", seed, distance),
    emotionalExhaustion: scorePastLifeField(relationType, "emotionalExhaustion", seed, distance),
    healingPotential: scorePastLifeField(relationType, "healingPotential", seed, distance),
    realityPotential: scorePastLifeField(relationType, "realityPotential", seed, distance),
  };
  if (relationType === "영친") {
    scores.emotionalExhaustion = Math.min(scores.emotionalExhaustion, 45);
    scores.healingPotential = Math.max(scores.healingPotential, 75);
    scores.realityPotential = Math.max(scores.realityPotential, 75);
  }
  if (relationType === "안괴") {
    scores.emotionalExhaustion = Math.max(scores.emotionalExhaustion, 75);
    scores.realityPotential = Math.min(scores.realityPotential, 60);
  }
  if (relationType === "업태") {
    scores.pastLifeFeeling = Math.max(scores.pastLifeFeeling, 85);
    scores.unfinishedTask = Math.max(scores.unfinishedTask, 80);
  }
  if (relationType === "명") scores.repeatPattern = Math.max(scores.repeatPattern, 75);
  return scores;
}

function directionPastLifeLine(direction, userName, partnerName) {
  if (direction === "내가 상대에게 작용") return `${userName}님의 반응과 선택이 ${partnerName}님의 마음에 더 오래 남는 흐름입니다. 다가가는 방식이 부드러울수록 인연의 결도 차분해집니다.`;
  if (direction === "상대가 나에게 작용") return `${partnerName}님의 존재가 ${userName}님의 기억과 감정 버튼을 더 강하게 건드립니다. 흔들림이 커질수록 현재의 동의와 경계를 먼저 보아야 합니다.`;
  if (direction === "상호작용") return "두 사람 모두에게 흔적이 남기 쉬운 관계입니다. 어느 한쪽만의 감정으로 몰아가기보다, 서로에게 반복되는 장면을 함께 살피는 일이 필요합니다.";
  return "";
}

function purposePastLifeReading(purpose, relationType, userName, partnerName) {
  if (purpose === "love") return `연애로는 끌림과 불안을 함께 다루는 흐름입니다. ${relationType}의 결이 강할수록 표현 방식과 연락 온도를 분명히 나누어야 사랑이 소모로 기울지 않습니다.`;
  if (purpose === "reunion") return "재회에서는 다시 만나는 가능성보다 같은 패턴을 반복하지 않을 조건이 먼저 떠오릅니다. 상대의 거절 의사가 명확하다면 더 밀어붙이지 않는 것이 중요합니다. 전생처럼 느껴지는 감정이 있어도 현재의 동의와 경계가 우선입니다.";
  if (purpose === "marriage") return "결혼으로 이어질 때는 전생감보다 현실 지속 가능성이 더 중요합니다. 생활 리듬, 돈, 책임 분담, 가족 경계를 구체적으로 나눌수록 오래 머물 힘이 생깁니다.";
  if (purpose === "crush") return `짝사랑에서는 ${partnerName}님의 마음을 단정하지 않는 태도가 필요합니다. ${userName}님의 감정이 오래 머문다면, 그리움보다 실제로 확인 가능한 행동 기준을 먼저 세우세요.`;
  if (purpose === "friend") return "친구로는 신뢰와 거리감이 핵심입니다. 편안함이 있어도 감정 노동이 한쪽으로 몰리지 않게 부탁과 거절의 선을 함께 두는 편이 좋습니다.";
  if (purpose === "family") return "가족으로는 반복되는 상처 버튼과 역할 고착이 드러날 수 있습니다. 화해는 감정을 덮는 일이 아니라, 같은 장면이 다시 오지 않도록 거리를 조절하는 데서 시작됩니다.";
  if (purpose === "business") return "동업에서는 감성적 여운보다 계약, 지분, 돈, 책임 범위가 먼저입니다. 신뢰가 있어도 문서와 의사결정 규칙을 세워야 인연이 현실에서 흔들리지 않습니다.";
  if (purpose === "work") return "직장 관계에서는 권한, 평가, 협업 방식이 중요합니다. 감정 해석보다 업무 기준과 피드백 방식을 분명히 할 때 피로가 줄어듭니다.";
  return "전체 흐름에서는 감성적 끌림과 현실적 기준이 함께 떠오릅니다. 오래된 인연처럼 느껴질수록 지금의 태도, 약속, 안전한 경계를 더 또렷하게 보아야 합니다.";
}

function buildPastLifeWarningSigns(purpose, relationType) {
  const base = ["감정 확인을 반복하며 상대를 시험하게 되는 흐름", "연락, 돈, 관계 정의가 흐릿한 채로 미뤄지는 장면", "나만 더 기다리거나 더 맞춘다고 느끼는 순간"];
  if (relationType === "안괴") base.unshift("질투, 통제, 비교가 사랑의 증거처럼 둔갑하는 흐름");
  if (purpose === "reunion" || purpose === "crush") {
    base.push("상대의 거절 이후에도 일방적인 연락을 이어가고 싶은 충동");
    base.push("기다림이 나를 망가뜨리는데도 인연이라는 말로 붙잡는 흐름");
  }
  return base.slice(0, 5);
}

function buildPastLifeHealingActions(purpose, relationType) {
  const actions = ["연락 빈도, 만남 간격, 혼자 있는 시간을 구체적으로 합의하세요.", "감정이 크게 올라온 날에는 결론보다 24시간의 회복 시간을 먼저 두세요.", "말보다 지켜진 약속을 기준으로 관계의 온도를 확인하세요."];
  if (relationType === "안괴") actions.unshift("경계, 돈, 관계 정의를 흐릿하게 두지 마세요.");
  if (purpose === "reunion" || purpose === "crush") actions.push("상대가 안전하게 느낄 수 있는 거리와 동의를 가장 앞에 두세요.");
  return actions.slice(0, 5);
}

function buildSukuyoPastLifeResult({ body, self, partner, selfSukuyo, partnerSukuyo, canonical, userProfileId = "" } = {}) {
  const compatibility = canonical?.compatibility || {};
  const forwardDistance = Number(compatibility.forwardDistance ?? compatibility.distanceMetrics?.forwardDistance ?? 0);
  const relationType = normalizePastLifeRelation(compatibility.relationType, forwardDistance);
  const distance = normalizePastLifeDistance(compatibility.distanceLabel, relationType);
  const direction = normalizePastLifeDirection(forwardDistance);
  const purpose = normalizePastLifePurpose(body?.purpose || body?.relationshipPurpose);
  const userName = clean(self?.name || body?.userName || "나");
  const partnerName = clean(partner?.name || body?.partnerName || "상대");
  const userMansion = `${clean(selfSukuyo?.nameKo || "본명")}숙`;
  const partnerMansion = `${clean(partnerSukuyo?.nameKo || "상대")}숙`;
  const meta = SUKYO_PAST_LIFE_META[relationType] || SUKYO_PAST_LIFE_META["명"];
  const seed = [userMansion, partnerMansion, relationType, self?.birthDate || "", partner?.birthDate || "", purpose].join("|");
  const scores = buildPastLifeScores(relationType, distance, seed);
  const directionLine = directionPastLifeLine(direction, userName, partnerName);
  return {
    userProfileId: clean(userProfileId || body?.userProfileId || ""),
    userName,
    partnerName,
    user宿: userMansion,
    partner宿: partnerMansion,
    relationType,
    distance,
    direction,
    purpose,
    title: `${userName}님과 ${partnerName}님의 숙요 전생 인연 리딩`,
    subtitle: meta.subtitle,
    karmicTheme: meta.theme,
    scores,
    summary: meta.summary,
    firstImpression: meta.first,
    pastLifeStory: `${meta.story} ${directionLine}`.trim(),
    unfinishedTask: meta.task,
    repeatPattern: `${relationType}의 흐름에서는 비슷한 감정 장면이 다시 떠오르기 쉽습니다. 그 장면을 운명으로만 붙잡기보다, 내가 어떤 반응을 반복하는지 먼저 알아차려야 합니다.`,
    emotionalTrigger: meta.trigger,
    currentLifeLesson: meta.lesson,
    relationshipAdvice: "오래된 인연처럼 느껴질수록 지금의 태도와 안전한 경계를 더 또렷하게 보세요. 감정의 크기는 소중하지만, 관계를 지키는 힘은 약속과 존중에서 열립니다.",
    purposeReading: purposePastLifeReading(purpose, relationType, userName, partnerName),
    warningSigns: buildPastLifeWarningSigns(purpose, relationType),
    healingActions: buildPastLifeHealingActions(purpose, relationType),
    oneLine: `${relationType}의 결은 ${meta.theme}을 비추며, 이번 생에서는 감정보다 현실의 태도가 더 중요한 표식으로 떠오릅니다.`,
    disclaimer: "이 리딩은 전생을 사실로 단정하지 않습니다. 숙요점 관계 구조 위에 오래된 인연처럼 느껴지는 감정 패턴을 비춘 상담입니다.",
    generatedAt: new Date().toISOString(),
    logicVersion: SUKYO_PAST_LIFE_LOGIC_VERSION,
  };
}

function normalizeProfileCardForSukuyo(profile) {
  if (!profile) return null;
  const birth = profile.birth && typeof profile.birth === "object" ? profile.birth : {};
  const birthDate = ymd(birth.year, birth.month, birth.day);
  if (!birthDate) return null;
  const hour = Number.isFinite(Number(birth.hour)) ? Number(birth.hour) : 12;
  const minute = Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0;
  return {
    profileId: clean(profile.profileId || ""),
    name: clean(profile.name || "나"),
    gender: normalizeGender(profile.gender),
    birthDate,
    calendarType: normalizeCalendarType(birth.calType || "solar"),
    birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    timezone: clean(profile.location?.tz || "Asia/Seoul") || "Asia/Seoul",
  };
}

async function resolvePastLifeProfile(userId, body = {}) {
  const profileId = clean(body.userProfileId || body.profileId || body.selectedProfileId);
  if (profileId) {
    const profile = await ProfileCard.findOne({ userId, profileId }).lean();
    if (!profile) throw Object.assign(new Error("대표 프로필을 찾지 못했습니다."), { status: 404, code: "PROFILE_REQUIRED" });
    return normalizeProfileCardForSukuyo(profile);
  }
  const manualBirthDate = clean(body.userBirthDate || body.birthDate);
  if (manualBirthDate) {
    return {
      profileId: "",
      name: clean(body.userName || body.name || "나"),
      gender: normalizeGender(body.userGender || body.gender),
      birthDate: manualBirthDate,
      calendarType: normalizeCalendarType(body.userCalendarType || body.calendarType || "solar"),
      birthTime: clean(body.userBirthTime || body.birthTime || "12:00"),
      timezone: clean(body.timezone || "Asia/Seoul") || "Asia/Seoul",
    };
  }
  const user = await User.findById(userId).select("destinyProfilesCurrentId destinyProfilesLockedCurrentId").lean();
  const currentId = clean(user?.destinyProfilesLockedCurrentId || user?.destinyProfilesCurrentId);
  const profile = currentId
    ? await ProfileCard.findOne({ userId, profileId: currentId }).lean()
    : await ProfileCard.findOne({ userId }).sort({ updatedAt: -1, createdAt: -1 }).lean();
  const normalized = normalizeProfileCardForSukuyo(profile);
  if (!normalized) throw Object.assign(new Error("대표 프로필이 필요합니다."), { status: 404, code: "PROFILE_REQUIRED" });
  return normalized;
}

function normalizePastLifePartner(body = {}) {
  return {
    name: clean(body.partnerName || body.partnerNickname || "상대"),
    gender: normalizeGender(body.partnerGender),
    birthDate: clean(body.partnerBirthDate || body.partnerDate),
    calendarType: normalizeCalendarType(body.partnerCalendarType || "solar"),
    birthTime: clean(body.partnerBirthTime || body.partnerTime || "12:00"),
    timezone: clean(body.partnerTimezone || "Asia/Seoul") || "Asia/Seoul",
  };
}

function buildPastLifeSignature(input = {}) {
  const seed = [SUKYO_PAST_LIFE_LOGIC_VERSION, input.userProfileId || "", input.userBirthDate || "", input.userCalendarType || "", input.partnerName || "", input.partnerBirthDate || "", input.partnerCalendarType || "", input.purpose || ""].join("|");
  return `spl-${hashPastLifeSeed(seed).toString(36)}`;
}

async function readSukuyoPastLifeArchive(env, userId, signature) {
  await connectDb(env);
  const doc = await ServiceExecutionTransaction.findOne({
    userId,
    reportType: SUKYO_PAST_LIFE_REPORT_TYPE,
    featureKey: SUKYO_PAST_LIFE_FEATURE_KEY,
    status: "success",
    "metadata.signature": signature,
    "metadata.logicVersion": SUKYO_PAST_LIFE_LOGIC_VERSION,
  }).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();
  return doc?.metadata?.archive?.result || null;
}

async function writeSukuyoPastLifeArchive(env, userId, signature, result, access, body = {}) {
  await connectDb(env);
  const now = new Date();
  const reportId = clean(body.reportId || `sukuyo-past-life-${signature}`);
  const sessionId = clean(body.sessionId || body.reportSessionId || body.requestId || signature);
  const executionKey = `sukuyo-past-life:${clean(userId)}:${signature}`.slice(0, 120);
  const cost = Math.max(0, Math.floor(Number(access?.chargedCoins || body?.consume?.chargedCoins || body?.cost || 100)));
  return ServiceExecutionTransaction.findOneAndUpdate(
    { userId, executionKey },
    {
      $setOnInsert: {
        userId,
        executionKey,
        featureKey: SUKYO_PAST_LIFE_FEATURE_KEY,
        timeoutAt: now,
        nextRetryAt: now,
        retentionUntil: new Date(now.getTime() + (365 * 86400000)),
      },
      $set: {
        reportType: SUKYO_PAST_LIFE_REPORT_TYPE,
        reportId,
        sessionId,
        status: "success",
        premiumStatus: "completed",
        completedAt: now,
        generationStartedAt: now,
        generationCompletedAt: now,
        coinAmount: cost,
        cost,
        coinTransactionId: clean(access?.matchedTransactionId || body?.consume?.transactionId || body?.transactionId),
        sourceTransactionId: clean(access?.matchedTransactionId || body?.consume?.transactionId || body?.transactionId),
        metadata: {
          signature,
          logicVersion: SUKYO_PAST_LIFE_LOGIC_VERSION,
          featureKey: SUKYO_PAST_LIFE_FEATURE_KEY,
          reportType: SUKYO_PAST_LIFE_REPORT_TYPE,
          accessType: clean(access?.accessType || body?.accessType || ""),
          archive: {
            reportType: SUKYO_PAST_LIFE_REPORT_TYPE,
            title: result.title,
            displayName: result.userName,
            targetName: result.partnerName,
            summary: result.summary,
            generatedAt: result.generatedAt,
            logicVersion: result.logicVersion,
            result,
            payload: result,
          },
        },
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean();
}

function pastLifeErrorResponse(code, message, status = 400) {
  return json({ ok: false, error: { code, message } }, { status });
}

async function handleSukuyoPastLifeReading(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  await connectDb(env);
  const profile = await resolvePastLifeProfile(auth.userId, body);
  const partnerRaw = normalizePastLifePartner(body);
  if (!parseDateParts(profile.birthDate)) return pastLifeErrorResponse("INVALID_BIRTH_DATE", "내 생년월일 형식을 확인해 주세요.", 400);
  if (!parseDateParts(partnerRaw.birthDate)) return pastLifeErrorResponse("INVALID_BIRTH_DATE", "상대 생년월일 형식을 확인해 주세요.", 400);

  const self = normalizePersonInput(profile, "나");
  const partner = normalizePersonInput(partnerRaw, "상대");
  const purpose = normalizePastLifePurpose(body.purpose || body.relationshipPurpose);
  const signature = buildPastLifeSignature({
    userProfileId: profile.profileId,
    userBirthDate: self.birthDate,
    userCalendarType: self.calendarType,
    partnerName: partner.name,
    partnerBirthDate: partner.birthDate,
    partnerCalendarType: partner.calendarType,
    purpose,
  });
  const archived = await readSukuyoPastLifeArchive(env, auth.userId, signature);
  if (archived) return json({ ok: true, data: archived, source: "archive", reportId: `sukuyo-past-life-${signature}` });

  let selfSukuyo;
  let partnerSukuyo;
  let canonical;
  try {
    selfSukuyo = buildPersonSukuyo(self);
    partnerSukuyo = buildPersonSukuyo(partner);
    canonical = buildCanonicalSukuyoCompatibility({
      reportType: "compatibility",
      personAName: self.name,
      personBName: partner.name,
      personAInput: { year: self.birthYear, month: self.birthMonth, day: self.birthDay, hour: self.birthHour, minute: self.birthMinute },
      personBInput: { year: partner.birthYear, month: partner.birthMonth, day: partner.birthDay, hour: partner.birthHour, minute: partner.birthMinute },
      personASukuyo: selfSukuyo,
      personBSukuyo: partnerSukuyo,
      calendarSource: "lunar-javascript",
      methodVersion: "sukyo-past-life-v1",
    });
  } catch (error) {
    return pastLifeErrorResponse(clean(error?.code || "SUKYO_CALCULATION_FAILED"), clean(error?.message || "숙요 계산에 실패했습니다."), Number(error?.status) || 422);
  }

  if (!canonical?.validation?.hasRelationType) return pastLifeErrorResponse("RELATION_MATRIX_NOT_FOUND", "숙요 관계를 찾지 못했습니다.", 422);

  const access = await requirePremiumReportAccess(env, auth.userId, SUKYO_PAST_LIFE_REPORT_TYPE, {
    ...body,
    userProfileId: profile.profileId,
    profileId: profile.profileId || body.profileId,
    selectedProfileId: profile.profileId || body.selectedProfileId,
    featureKey: SUKYO_PAST_LIFE_FEATURE_KEY,
    reportType: SUKYO_PAST_LIFE_REPORT_TYPE,
    mode: "past-life-reading",
    purpose,
    _accessRoute: "/api/sukuyo/past-life-reading",
  });
  if (!access?.ok) {
    return json({
      ok: false,
      error: {
        code: access?.code || "PAYMENT_REQUIRED",
        message: access?.message || "숙요 전생 인연 리딩 해금이 필요합니다.",
      },
      pricing: { featureKey: SUKYO_PAST_LIFE_FEATURE_KEY, coinPrice: 100, krwEquivalent: 10000 },
    }, { status: Number(access?.status) || 402 });
  }

  const result = buildSukuyoPastLifeResult({
    body: { ...body, purpose },
    self,
    partner,
    selfSukuyo,
    partnerSukuyo,
    canonical,
    userProfileId: profile.profileId,
  });
  await writeSukuyoPastLifeArchive(env, auth.userId, signature, result, access, body);
  return json({ ok: true, data: result, source: "generated", reportId: `sukuyo-past-life-${signature}` });
}

function buildSukuyoRunningResponse(request, { sessionId = "", reportId = "", featureKey = "", progress = null, startedAt = "" } = {}) {
  const runningLinks = buildSukuyoRunningLinks(request, sessionId, reportId);
  return {
    ok: true,
    status: "running",
    serverStatus: "running",
    sessionId,
    reportId,
    featureKey,
    reportType: "sookyoPremium",
    mode: "compatibility",
    message: "같은 세션의 숙요점 PDF 생성이 이미 진행 중입니다.",
    progress,
    startedAt,
    archiveUrl: runningLinks.archiveUrl,
    statusPollUrl: runningLinks.statusPollUrl,
  };
}

async function findSukuyoReusableExecution(env, userId, executionCtx = {}, fallback = {}) {
  try {
    await connectDb(withPdfFastDbEnv(env));
    const filters = [];
    const executionKey = clean(executionCtx.executionKey);
    const sessionId = clean(executionCtx.sessionId || fallback.sessionId);
    const reportId = clean(executionCtx.reportId || fallback.reportId);
    const paymentSessionId = clean(executionCtx.paymentSessionId);
    if (executionKey) filters.push({ executionKey });
    if (sessionId) filters.push({ sessionId });
    if (reportId) filters.push({ reportId });
    if (paymentSessionId) filters.push({ paymentSessionId });
    if (!filters.length) return null;
    return await ServiceExecutionTransaction.findOne({
      userId,
      reportType: "sookyoPremium",
      $or: filters,
    }).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();
  } catch (error) {
    console.warn("[SukuyoPremiumPDF][ReusableExecutionLookupFailed]", { reason: clean(error?.message || error) });
    return null;
  }
}

function buildSukuyoReusableExecutionResponse(request, doc = {}, fallback = {}) {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : {};
  const reportId = clean(doc.reportId || archive.reportId || metadata.reportId || fallback.reportId);
  const sessionId = clean(doc.sessionId || metadata.sessionId || fallback.sessionId);
  const featureKey = clean(doc.featureKey || metadata.featureKey || fallback.featureKey);
  const status = clean(doc.status);
  const premiumStatus = clean(doc.premiumStatus);

  if (status === "success" && premiumStatus === "completed" && isSukuyoCompletedPayloadReady(archive)) {
    return {
      status: 200,
      payload: {
        ...archive,
        ok: true,
        status: "completed",
        serverStatus: "completed",
        qualityStatus: "passed",
        reportId,
        sessionId,
        featureKey,
        fromCache: true,
      },
    };
  }

  if (status === "pending" || premiumStatus === "generating") {
    return {
      status: 202,
      payload: buildSukuyoRunningResponse(request, {
        sessionId,
        reportId,
        featureKey,
        progress: metadata.progress || { stage: "payment-verified" },
        startedAt: doc.generationStartedAt || doc.createdAt || "",
      }),
    };
  }

  return null;
}

async function acquireSukuyoExecutionLease(env, userId, executionCtx = {}) {
  const executionKey = clean(executionCtx.executionKey);
  if (!executionKey) return { ok: true };
  try {
    await connectDb(withPdfFastDbEnv(env));
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + Math.max(20 * 60 * 1000, Number(executionCtx.timeoutSeconds || 1800) * 1000));
    const token = `${executionKey}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    const doc = await ServiceExecutionTransaction.findOneAndUpdate(
      {
        userId,
        executionKey,
        status: "pending",
        $or: [
          { "lock.until": { $lte: now } },
          { "lock.until": null },
          { "lock.until": { $exists: false } },
          { "lock.token": "" },
        ],
      },
      {
        $set: {
          "lock.token": token,
          "lock.until": leaseUntil,
          "lock.acquiredAt": now,
          heartbeatAt: now,
        },
      },
      { returnDocument: "after" },
    ).lean();
    return { ok: Boolean(doc), doc, token };
  } catch (error) {
    console.warn("[SukuyoPremiumPDF][ExecutionLeaseAcquireFailed]", { reason: clean(error?.message || error) });
    return { ok: false, error };
  }
}

function readPremiumAccessToken(request, body = {}) {
  const headerToken = clean(request.headers.get("x-premium-access-token"));
  if (headerToken) return headerToken;
  return clean(
    body?.premiumAccessToken
    || body?._premiumAccessToken
    || body?.accessToken
    || body?.accessGrant?.premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || cookieValue(request, "cd_premium_access_token"),
  );
}

function resolveSukuyoReportId(body = {}, sessionId = "") {
  return clean(
    body?.reportId
    || body?.accessGrant?.reportId
    || body?.reportSessionId
    || sessionId
    || `sukyo-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );
}

function hasSukuyoButtonPaymentEvidence(body = {}, sessionId = "", reportId = "") {
  const payment = body?.payment && typeof body.payment === "object" ? body.payment : {};
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  const accessGrant = body?.accessGrant && typeof body.accessGrant === "object"
    ? body.accessGrant
    : payment.accessGrant && typeof payment.accessGrant === "object"
      ? payment.accessGrant
      : paymentContext.accessGrant && typeof paymentContext.accessGrant === "object"
        ? paymentContext.accessGrant
        : {};
  const consume = body?.consume && typeof body.consume === "object" ? body.consume : {};
  const tx = clean(
    body?.transactionId
    || body?.sourceTransactionId
    || body?.purchaseId
    || body?.requestId
    || payment.transactionId
    || payment.purchaseId
    || payment.requestId
    || paymentContext.transactionId
    || paymentContext.purchaseId
    || paymentContext.requestId
    || consume.transactionId
    || consume.purchaseId
    || consume.requestId
    || accessGrant.evidenceId
    || accessGrant.transactionId
    || accessGrant.purchaseId
    || accessGrant.requestId,
  );
  const boundSessionId = clean(
    body?.sessionId
    || body?.reportSessionId
    || payment.sessionId
    || payment.reportSessionId
    || paymentContext.sessionId
    || paymentContext.reportSessionId
    || consume.sessionId
    || consume.reportSessionId
    || accessGrant.sessionId
    || accessGrant.reportSessionId,
  );
  const boundReportId = clean(
    body?.reportId
    || payment.reportId
    || paymentContext.reportId
    || consume.reportId
    || accessGrant.reportId,
  );
  const featureKey = clean(body?.featureKey || payment.featureKey || paymentContext.featureKey || consume.featureKey || accessGrant.featureKey);
  return Boolean(
    tx
    && (!sessionId || boundSessionId === sessionId)
    && (!reportId || boundReportId === reportId)
    && (!featureKey || isSukuyoCompatibilityFeatureKey(featureKey)),
  );
}

function buildSukuyoRunningLinks(request, sessionId, reportId) {
  const origin = new URL(request.url).origin;
  const resolvedReportId = clean(reportId);
  const params = new URLSearchParams();
  if (clean(sessionId)) params.set("sessionId", clean(sessionId));
  if (resolvedReportId) params.set("reportId", resolvedReportId);
  return {
    archiveUrl: resolvedReportId ? `${origin}/api/premium/pdf-archive/${encodeURIComponent(resolvedReportId)}` : "",
    statusPollUrl: `${origin}/api/billing/executions/status${params.toString() ? `?${params.toString()}` : ""}`,
  };
}

function withSukuyoArchiveFormat(url, format = "pdf") {
  const value = clean(url);
  const targetFormat = clean(format) || "pdf";
  if (!value || !/\/api\/premium\/pdf-archive\//.test(value)) return value;
  if (/[?&]format=/i.test(value)) {
    return value.replace(/([?&]format=)[^&]+/i, `$1${encodeURIComponent(targetFormat)}`);
  }
  return `${value}${value.includes("?") ? "&" : "?"}format=${encodeURIComponent(targetFormat)}`;
}

function buildSukuyoPdfFilename(reportId = "") {
  const id = clean(reportId).replace(/[^\w.-]+/g, "-") || new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `sukyo-premium-${id}.pdf`;
}

function isSukuyoCompatibilityFeatureKey(value = "") {
  const raw = clean(value).toLowerCase();
  const normalized = clean(normalizePaidFeatureKey(value)).toLowerCase();
  const candidates = [SUKYO_PDF_FEATURE_KEY, SUKYO_PDF_ALIAS_FEATURE_KEY]
    .flatMap((key) => [clean(key).toLowerCase(), clean(normalizePaidFeatureKey(key)).toLowerCase()]);
  return Boolean(raw && candidates.includes(raw)) || Boolean(normalized && candidates.includes(normalized));
}

function isSukuyoReportType(value = "") {
  return ["sookyoPremium", "sukyoPremium", "sukyo_book"].includes(clean(value));
}

async function resolveSukuyoSignedTokenAccess(env, userId, premiumAccessToken) {
  const token = clean(premiumAccessToken);
  if (!token) return null;

  const tokenCheck = await verifyPremiumAccessToken(token, env, { userId: clean(userId) });
  if (!tokenCheck?.ok) return null;

  const payload = tokenCheck.payload || {};
  const tokenFeatureKey = clean(payload.featureKey);
  const normalizedFeatureKey = clean(normalizePaidFeatureKey(tokenFeatureKey));
  const reason = clean(payload.reason).replace(/\s+/g, "");
  const chargedCoins = Math.max(0, Math.abs(Number(payload.chargedCoins || 0)));
  const transactionId = clean(payload.transactionId);
  const isCompatFeature = isSukuyoCompatibilityFeatureKey(tokenFeatureKey);
  const isCoinGateCompat = normalizedFeatureKey === "coin-gate-per-use"
    && chargedCoins >= SUKYO_COMPAT_TOKEN_MIN_COINS
    && reason.includes("숙요점")
    && reason.includes("궁합");

  if (!isSukuyoReportType(payload.reportType) || (!isCompatFeature && !isCoinGateCompat)) return null;
  if (payload.freeBySubscription !== true && chargedCoins < SUKYO_COMPAT_TOKEN_MIN_COINS && !transactionId) return null;

  return {
    ok: true,
    accessType: "signed-payment-token-route",
    reportType: "sookyoPremium",
    matchedTransactionId: transactionId,
    featureKey: isCompatFeature ? tokenFeatureKey : SUKYO_PDF_FEATURE_KEY,
    chargedCoins,
    signedTokenFallback: true,
  };
}

function buildSukuyoArchiveMetadata(input, generated, pdfReady, reportId) {
  const localContract = buildSukuyoLocalContract(generated, pdfReady);
  const enhancedPdfReady = {
    ...(pdfReady || {}),
    reportId,
    chapterCount: localContract.chapterCount,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    localDraftChapterCount: localContract.localDraftChapterCount,
    localAssemblyOnly: localContract.localAssemblyOnly,
    externalCallsAllowed: localContract.externalCallsAllowed,
    localAssembly: localContract.localAssembly,
    canDownload: true,
  };
  return {
    reportId,
    reportType: "sukyo_book",
    reportTypeAliases: ["sookyoPremium", "sukyoPremium", "sukyo_book"],
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    displayName: "숙요점",
    title: `${clean(input?.self?.name || "사용자")} · ${clean(input?.partner?.name || "상대")} 궁합 리포트`,
    mode: "compatibility",
    birthName: clean(input?.self?.name),
    targetName: clean(input?.partner?.name),
    summary: clean(generated?.chapters?.[0]?.sections?.[0]?.body || "", 1000),
    pdfUrl: enhancedPdfReady.pdfUrl,
    htmlUrl: enhancedPdfReady.htmlUrl,
    downloadUrl: enhancedPdfReady.downloadUrl,
    chapterCount: localContract.chapterCount,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    localDraftChapterCount: localContract.localDraftChapterCount,
    localAssemblyOnly: localContract.localAssemblyOnly,
    externalCallsAllowed: localContract.externalCallsAllowed,
    chapters: generated.chapters,
    payload: generated.payload,
    localSukuyoCompatibilityJson: generated?.payload?.localSukuyoCompatibilityJson || generated?.payload,
    pdfReady: enhancedPdfReady,
    manuscriptSource: generated.manuscriptSource || SUKYO_PDF_CONFIG.generationMode,
    generationMode: generated.generationMode || SUKYO_PDF_CONFIG.generationMode,
    provider: generated.provider || SUKYO_PDF_CONFIG.provider,
    writingPipeline: generated.writingPipeline || "local-calculation-to-local-assembled-pdf",
    localAssembly: localContract.localAssembly,
    pdfCompletionValidation: generated.pdfCompletionValidation,
    canReopen: true,
    canDownload: true,
  };
}

function buildSukuyoLocalContract(generated = {}, pdfReady = {}) {
  const chapters = Array.isArray(generated?.chapters) ? generated.chapters : [];
  const sourceAssembly = generated?.localAssembly && typeof generated.localAssembly === "object"
    ? generated.localAssembly
    : generated?.payload?.localAssembly && typeof generated.payload.localAssembly === "object"
      ? generated.payload.localAssembly
      : pdfReady?.localAssembly && typeof pdfReady.localAssembly === "object"
        ? pdfReady.localAssembly
        : {};
  const chapterCount = Number(
    generated?.chapterCount
    || sourceAssembly.chapterCount
    || chapters.length
    || SUKYO_PDF_CHAPTER_COUNT,
  );
  const localAssembly = {
    ...sourceAssembly,
    enabled: true,
    source: clean(sourceAssembly.source || generated?.manuscriptSource || generated?.payload?.manuscriptSource || SUKYO_PDF_CONFIG.generationMode),
    provider: clean(sourceAssembly.provider || generated?.provider || generated?.payload?.provider || SUKYO_PDF_CONFIG.provider),
    templateVersion: SUKYO_PDF_CONFIG.templateVersion,
    chapterCount,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    externalGeneration: false,
    externalCallsAllowed: false,
  };
  return {
    chapterCount,
    localDraftChapterCount: chapterCount,
    localAssemblyOnly: true,
    externalCallsAllowed: false,
    localAssembly,
  };
}

function hasCompleteSukuyoChapters(chapters = []) {
  if (!Array.isArray(chapters) || chapters.length !== SUKYO_PDF_CHAPTER_COUNT) return false;
  return chapters.every((chapter, index) => {
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    const expectedSections = Array.isArray(SUKYO_PDF_CHAPTERS[index]?.sections) ? SUKYO_PDF_CHAPTERS[index].sections.length : 5;
    return clean(chapter?.title)
      && sections.length === expectedSections
      && sections.every((section) => clean(section?.heading) && clean(section?.body));
  });
}

function isSukuyoCompletedPayloadReady(payload = {}) {
  const chapters = Array.isArray(payload?.chapters) ? payload.chapters : [];
  const ready = payload?.pdfReady && typeof payload.pdfReady === "object" ? payload.pdfReady : {};
  const hasUrl = Boolean(clean(payload?.downloadUrl || payload?.pdfUrl || payload?.htmlUrl || ready?.downloadUrl || ready?.pdfUrl || ready?.htmlUrl));
  const manuscriptSource = clean(payload?.manuscriptSource || ready?.manuscriptSource);
  const localAssembly = payload?.localAssembly && typeof payload.localAssembly === "object"
    ? payload.localAssembly
    : ready?.localAssembly && typeof ready.localAssembly === "object"
      ? ready.localAssembly
      : {};
  const localDraftChapterCount = Number(
    payload?.localDraftChapterCount
    || ready?.localDraftChapterCount
    || localAssembly.chapterCount
    || chapters.length
    || 0,
  );
  const localAssemblyOnly = payload?.localAssemblyOnly !== false
    && ready?.localAssemblyOnly !== false
    && localAssembly.externalGeneration !== true;
  const externalCallsAllowed = payload?.externalCallsAllowed === true
    || ready?.externalCallsAllowed === true
    || localAssembly.externalCallsAllowed === true;
  const sourceIsLocal = ["local", SUKYO_PDF_CONFIG.generationMode].includes(manuscriptSource);
  const localAssemblyOk = localAssembly.enabled === true
    && localAssembly.externalGeneration === false
    && localAssembly.externalCallsAllowed === false
    && Number(localAssembly.chapterCount || 0) === SUKYO_PDF_CHAPTER_COUNT
    && Number(localAssembly.expectedChapterCount || 0) === SUKYO_PDF_CHAPTER_COUNT
    && clean(localAssembly.templateVersion) === SUKYO_PDF_CONFIG.templateVersion;
  const chapterCountContractOk = localDraftChapterCount === SUKYO_PDF_CHAPTER_COUNT
    && localAssemblyOnly
    && !externalCallsAllowed;
  const chapterQuality = payload?.chapterQuality && typeof payload.chapterQuality === "object"
    ? payload.chapterQuality
    : payload?.payload?.chapterQuality && typeof payload.payload.chapterQuality === "object"
      ? payload.payload.chapterQuality
      : null;
  const chapterQualityOk = !chapterQuality || chapterQuality.ok === true;
  return Boolean(
    clean(payload?.reportId)
    && hasUrl
    && hasCompleteSukuyoChapters(chapters)
    && clean(payload?.serverStatus) === "completed"
    && clean(payload?.qualityStatus) === "passed"
    && sourceIsLocal
    && localAssemblyOk
    && chapterCountContractOk
    && chapterQualityOk
  );
}

async function handleSukuyoPremiumPreflight(request) {
  const body = await readJson(request);
  const input = normalizeCompatibilityInput(body);

  if (input.mode !== "compatibility") {
    return json({
      ok: false,
      code: "SUKUYO_COMPATIBILITY_ONLY",
      message: "숙요점 프리미엄 PDF는 궁합 전용입니다. 본인과 상대 숙 정보가 모두 필요합니다.",
      mode: input.mode,
      requiredMode: "compatibility",
    }, { status: 400 });
  }

  const genderError = buildSukuyoGenderValidationError(input);
  if (genderError) return json(genderError, { status: 400 });

  const validation = validateSukyoPdfInput({
    mode: input.mode,
    self: input.self,
    partner: input.partner,
    sukuyoResult: { relationshipType: "preflight" },
  });

  if (!validation.canGenerate) {
    return json({
      ok: false,
      code: "SUKUYO_INVALID_INPUT_BEFORE_PAYMENT",
      message: "두 사람의 생년월일을 정확히 입력해 주세요.",
      hardMissingFields: validation.hardMissingFields,
      softMissingFields: validation.softMissingFields,
    }, { status: 400 });
  }

  let seed = null;
  try {
    seed = buildSukuyoSeedFromCompatibility(input);
  } catch (error) {
    return json(buildSukuyoSeedErrorResponse(error), { status: Number(error?.status) || 422 });
  }

  return json({
    ok: true,
    mode: "compatibility",
    dryRun: {
      selfStarReady: Boolean(clean(seed?.userSukyo?.nameKo)),
      partnerStarReady: Boolean(clean(seed?.partnerSukyo?.nameKo)),
      relationType: clean(seed?.compatibility?.relationType || seed?.localSukuyoCompatibilityJson?.relation?.typeKo),
      relationTypeHan: clean(seed?.compatibility?.relationTypeHan || seed?.localSukuyoCompatibilityJson?.relation?.typeHan),
      distanceLabel: clean(seed?.compatibility?.distanceLabel || seed?.localSukuyoCompatibilityJson?.relation?.distanceLabel),
      compatibilityIndex: Number(seed?.compatibility?.compatibilityIndex || seed?.localSukuyoCompatibilityJson?.relation?.compatibilityIndex || 0),
      chapterCount: SUKYO_PDF_CHAPTER_COUNT,
    },
  });
}

async function handleSukuyoPremiumPrepare(request, env) {
  console.log("[SukuyoPremiumPDF][RequestReceived]");
  cleanupExpiredSukuyoLocks();

  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const sessionId = getSukuyoSessionId(body);
  const premiumAccessToken = readPremiumAccessToken(request, body);
  const featureKey = clean(body?.featureKey) || SUKYO_PDF_FEATURE_KEY;
  const reportId = resolveSukuyoReportId(body, sessionId);
  const pdfDbEnv = withPdfFastDbEnv(env);
  let executionCtx = null;

  const input = normalizeCompatibilityInput(body);
  if (input.mode !== "compatibility") {
    return json({
      ok: false,
      code: "SUKUYO_COMPATIBILITY_ONLY",
      message: "숙요점 프리미엄 PDF는 궁합 전용입니다. 본인과 상대 숙 정보를 모두 입력해 주세요.",
      mode: input.mode,
      requiredMode: "compatibility",
    }, { status: 400 });
  }

  const genderError = buildSukuyoGenderValidationError(input);
  if (genderError) return json(genderError, { status: 400 });

  const validation = validateSukyoPdfInput({
    mode: input.mode,
    self: input.self,
    partner: input.partner,
    sukuyoResult: { relationshipType: "pre-validated" },
  });

  if (!validation.canGenerate) {
    return json({
      ok: false,
      code: "SUKUYO_INVALID_INPUT_BEFORE_PAYMENT",
      message: "두 사람의 생년월일을 정확히 입력해 주세요.",
      hardMissingFields: validation.hardMissingFields,
      softMissingFields: validation.softMissingFields,
    }, { status: 400 });
  }

  let dryRunSeed = null;
  try {
    dryRunSeed = buildSukuyoSeedFromCompatibility(input);
  } catch (error) {
    return json(buildSukuyoSeedErrorResponse(error), { status: Number(error?.status) || 422 });
  }

  const reusableExecutionCtx = buildPremiumExecutionContext({
    serviceKey: "sukuyo-premium",
    reportType: "sookyoPremium",
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId,
    access: null,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  const reusableExecution = await findSukuyoReusableExecution(pdfDbEnv, auth.userId, reusableExecutionCtx, { sessionId, reportId, featureKey });
  const reusableResponse = reusableExecution ? buildSukuyoReusableExecutionResponse(request, reusableExecution, { sessionId, reportId, featureKey }) : null;
  if (reusableResponse) {
    return json(reusableResponse.payload, { status: reusableResponse.status });
  }

  const existingLock = sukuyoPdfGenerationLocks.get(sessionId);
  if (existingLock?.status === "running") {
    return json(buildSukuyoRunningResponse(request, {
      sessionId,
      reportId: clean(existingLock.reportId || reportId),
      featureKey: clean(existingLock.featureKey || featureKey),
      progress: existingLock.progress || null,
      startedAt: existingLock.startedAt,
    }));
  }

  if (existingLock?.status === "done" && existingLock?.result) {
    if (!isSukuyoCompletedPayloadReady(existingLock.result)) {
      sukuyoPdfGenerationLocks.delete(sessionId);
    } else {
    return json({
      ...existingLock.result,
      status: "done",
      sessionId,
      fromCache: true,
    });
    }
  }

  sukuyoPdfGenerationLocks.set(sessionId, {
    sessionId,
    reportId,
    featureKey,
    status: "running",
    startedAt: new Date().toISOString(),
    progress: {
      stage: "input-validated",
      selfBirthDateReady: Boolean(clean(input.self.birthDate)),
      partnerBirthDateReady: Boolean(clean(input.partner.birthDate)),
    },
  });

  console.log("[SukuyoPremiumPDF][CompatibilityInputValidated]", {
    selfBirthDate: Boolean(clean(input.self.birthDate)),
    partnerBirthDate: Boolean(clean(input.partner.birthDate)),
    selfStarReady: Boolean(clean(dryRunSeed?.userSukyo?.nameKo)),
    partnerStarReady: Boolean(clean(dryRunSeed?.partnerSukyo?.nameKo)),
    relationType: clean(dryRunSeed?.compatibility?.relationType),
    distance: clean(dryRunSeed?.compatibility?.distanceLabel),
  });

  try {
    const signedTokenAccess = await resolveSukuyoSignedTokenAccess(env, auth.userId, premiumAccessToken);
    let access = signedTokenAccess;
    if (!access) {
      try {
        access = await requirePremiumReportAccess(
          pdfDbEnv,
          auth.userId,
          "sookyoPremium",
          {
            ...body,
            reportType: "sookyoPremium",
            mode: "compatibility",
            reportMode: "compatibility",
            featureKey,
            premiumAccessToken: premiumAccessToken || undefined,
            _accessRoute: "/api/sukuyo/premium/prepare",
          },
        );
      } catch (accessError) {
        const status = Number(accessError?.status || 0);
        if (status >= 500 && hasSukuyoButtonPaymentEvidence(body, sessionId, reportId)) {
          console.warn("[SukuyoPremiumPDF][AccessCheckDegradedToButtonEvidence]", {
            reportId,
            sessionId,
            status,
            code: clean(accessError?.code || ""),
          });
          access = {
            ok: true,
            accessType: "button-payment-evidence",
            accessMethod: "BUTTON_PAYMENT_EVIDENCE",
            paymentMode: "single_purchase",
            reportType: "sookyoPremium",
            featureKey,
            matchedTransactionId: clean(body?.transactionId || body?.sourceTransactionId || body?.purchaseId || body?.requestId),
            reportId,
            sessionId,
          };
        } else {
          throw accessError;
        }
      }
    }

    if (!access?.ok && Number(access?.status || 0) >= 500 && hasSukuyoButtonPaymentEvidence(body, sessionId, reportId)) {
      console.warn("[SukuyoPremiumPDF][AccessResultDegradedToButtonEvidence]", {
        reportId,
        sessionId,
        status: Number(access?.status || 0),
        code: clean(access?.code || ""),
      });
      access = {
        ok: true,
        accessType: "button-payment-evidence",
        accessMethod: "BUTTON_PAYMENT_EVIDENCE",
        paymentMode: "single_purchase",
        reportType: "sookyoPremium",
        featureKey,
        matchedTransactionId: clean(body?.transactionId || body?.sourceTransactionId || body?.purchaseId || body?.requestId),
        reportId,
        sessionId,
      };
    }

    if (!access?.ok) {
      sukuyoPdfGenerationLocks.set(sessionId, {
        sessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        progress: { stage: "payment-required" },
      });
      return json({
        ok: false,
        code: access?.code || "SUKUYO_PAYMENT_REQUIRED",
        message: access?.message || "프리미엄 궁합 PDF 생성을 위해 원화 결제 또는 이용권 확인이 필요합니다.",
      }, { status: Number(access?.status) || 403 });
    }

    executionCtx = buildPremiumExecutionContext({
      serviceKey: "sukuyo-premium",
      reportType: "sookyoPremium",
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(pdfDbEnv, auth.userId, executionCtx);
    const executionLease = await acquireSukuyoExecutionLease(pdfDbEnv, auth.userId, executionCtx);
    if (!executionLease.ok && !executionLease.error) {
      return json(buildSukuyoRunningResponse(request, {
        sessionId,
        reportId,
        featureKey,
        progress: { stage: "payment-verified" },
        startedAt: new Date().toISOString(),
      }), { status: 202 });
    }

    sukuyoPdfGenerationLocks.set(sessionId, {
      sessionId,
      reportId,
      featureKey,
      status: "running",
      startedAt: new Date().toISOString(),
      progress: { stage: "payment-verified" },
    });

    dryRunSeed.sessionId = sessionId;
    dryRunSeed.reportId = reportId;
    dryRunSeed.requestId = clean(body?.requestId || body?.accessGrant?.requestId || body?._paymentContext?.requestId || sessionId);
    dryRunSeed.featureKey = featureKey;

    const generated = await generateSukyoPremiumReport(env, dryRunSeed);
    const archiveUrl = buildSukuyoRunningLinks(request, sessionId, reportId).archiveUrl;
    const archivePdfUrl = withSukuyoArchiveFormat(archiveUrl, "pdf");
    const archiveHtmlUrl = withSukuyoArchiveFormat(archiveUrl, "html");
    const pdfReady = {
      ...(generated?.pdfReady || {}),
      html: generated?.pdfReady?.html || generated?.html || "",
      filename: clean(generated?.pdfReady?.filename || generated?.filename || buildSukuyoPdfFilename(reportId)).replace(/\.html?$/i, ".pdf"),
      htmlUrl: withSukuyoArchiveFormat(generated?.pdfReady?.htmlUrl || archiveHtmlUrl || archiveUrl, "html"),
      pdfUrl: withSukuyoArchiveFormat(generated?.pdfReady?.pdfUrl || generated?.pdfReady?.downloadUrl || archivePdfUrl || archiveUrl, "pdf"),
      downloadUrl: withSukuyoArchiveFormat(generated?.pdfReady?.downloadUrl || generated?.pdfReady?.pdfUrl || archivePdfUrl || archiveUrl, "pdf"),
      storageKey: clean(generated?.pdfReady?.storageKey || `premium-archive:sukyo:${reportId}`),
      mimeType: "application/pdf",
      contentType: "application/pdf",
      renderFormat: "pdf-archive",
      manuscriptSource: clean(generated?.manuscriptSource || generated?.payload?.manuscriptSource || SUKYO_PDF_CONFIG.generationMode),
      localAssembly: generated?.localAssembly || generated?.payload?.localAssembly || {
        enabled: true,
        source: clean(generated?.manuscriptSource || generated?.payload?.manuscriptSource || SUKYO_PDF_CONFIG.generationMode),
        provider: clean(generated?.provider || generated?.payload?.provider || SUKYO_PDF_CONFIG.provider),
        templateVersion: SUKYO_PDF_CONFIG.templateVersion,
        chapterCount: Number(generated?.chapterCount || SUKYO_PDF_CHAPTER_COUNT),
        expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
        externalGeneration: false,
        externalCallsAllowed: false,
      },
    };
    const localContract = buildSukuyoLocalContract(generated, pdfReady);
    Object.assign(pdfReady, {
      reportId,
      chapterCount: localContract.chapterCount,
      expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
      localDraftChapterCount: localContract.localDraftChapterCount,
      localAssemblyOnly: localContract.localAssemblyOnly,
      externalCallsAllowed: localContract.externalCallsAllowed,
      localAssembly: localContract.localAssembly,
      canDownload: true,
    });
    const responsePayload = generated?.payload && typeof generated.payload === "object"
      ? {
        ...generated.payload,
        chapterCount: localContract.chapterCount,
        expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
        localDraftChapterCount: localContract.localDraftChapterCount,
        localAssemblyOnly: localContract.localAssemblyOnly,
        externalCallsAllowed: localContract.externalCallsAllowed,
        localAssembly: localContract.localAssembly,
        serverStatus: "completed",
        qualityStatus: "passed",
      }
      : generated?.payload;

    if (!clean(pdfReady?.html) || !clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl)) {
      throw Object.assign(new Error("숙요점 PDF 저장 URL 생성에 실패했습니다."), {
        status: 500,
        code: "SUKUYO_REPORT_URL_MISSING",
      });
    }
    const pdfCompletionValidation = validateSukyoPdfCompletionPayload({
      pdfReady,
      chapters: generated.chapters,
      seed: dryRunSeed,
      requireDownloadUrl: true,
    });
    if (!pdfCompletionValidation.ok) {
      throw Object.assign(new Error("숙요점 PDF 완료 검증에 실패했습니다."), {
        status: 500,
        code: "SUKUYO_REPORT_COMPLETION_INVALID",
        issues: pdfCompletionValidation.issues,
      });
    }
    pdfReady.pdfCompletionValidation = pdfCompletionValidation;
    const localPdfResult = await generateSukuyoLocalPdf({
      reportId,
      sessionId,
      featureKey,
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource || SUKYO_PDF_CONFIG.generationMode,
      chapters: generated.chapters,
      localAssembly: localContract.localAssembly,
      pdfReady,
      pdfCompletionValidation,
      pdfUrl: pdfReady.pdfUrl,
      htmlUrl: pdfReady.htmlUrl,
      downloadUrl: pdfReady.downloadUrl,
    }, {
      config: SUKYO_PDF_CONFIG,
      expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
      buildLocalPdf: (payload) => payload,
    });

    const archiveMetadata = buildSukuyoArchiveMetadata(input, generated, pdfReady, reportId);
    let archiveStatus = "completed";
    let archiveErrorCode = "";
    let archiveErrorMessage = "";
    let completedExecution = null;

    try {
      completedExecution = await completePremiumPdfExecution(pdfDbEnv, auth.userId, executionCtx, reportId, {
        chapterCount: generated.chapterCount,
        manuscriptSource: generated.manuscriptSource || SUKYO_PDF_CONFIG.generationMode,
        localAssembly: localContract.localAssembly,
        pdfCompletionValidation,
        archive: archiveMetadata,
      });
      if (!completedExecution?.ok) {
        throw Object.assign(new Error("숙요점 PDF 완료 저장에 실패했습니다."), {
          status: 500,
          code: "SUKUYO_EXECUTION_COMPLETE_FAILED",
        });
      }
    } catch (completionError) {
      archiveStatus = "pending";
      archiveErrorCode = clean(completionError?.code || "SUKUYO_ARCHIVE_PENDING");
      archiveErrorMessage = clean(completionError?.message || "숙요점 PDF 저장소 연결이 지연되고 있습니다.");
      console.warn("[SukuyoPremiumPDF][ArchivePending]", {
        reportId,
        sessionId,
        code: archiveErrorCode,
        message: archiveErrorMessage,
      });
    }

    pdfReady.archiveStatus = archiveStatus;
    pdfReady.archivePending = archiveStatus !== "completed";
    pdfReady.archiveErrorCode = archiveErrorCode || undefined;
    pdfReady.canDownload = true;

    const responseBody = {
      ok: true,
      serviceKey: "sukuyo-premium",
      reportType: "sookyoPremium",
      mode: "compatibility",
      status: "completed",
      serverStatus: "completed",
      qualityStatus: "passed",
      sessionId,
      featureKey,
      canonicalFeatureKey: SUKYO_PDF_FEATURE_KEY,
      aliasFeatureKey: SUKYO_PDF_ALIAS_FEATURE_KEY,
      canonicalReportType: "sookyoPremium",
      aliasReportTypes: ["sukyoPremium", "sukyo_book"],
      chapterCount: localContract.chapterCount,
      expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
      localDraftChapterCount: localContract.localDraftChapterCount,
      manuscriptSource: generated.manuscriptSource || SUKYO_PDF_CONFIG.generationMode,
      generationMode: generated.generationMode || SUKYO_PDF_CONFIG.generationMode,
      provider: generated.provider || SUKYO_PDF_CONFIG.provider,
      writingPipeline: generated.writingPipeline || "local-calculation-to-local-assembled-pdf",
      localAssembly: localContract.localAssembly,
      localAssemblyOnly: localContract.localAssemblyOnly,
      externalCallsAllowed: localContract.externalCallsAllowed,
      localOnly: localPdfResult.localOnly,
      localContract: localPdfResult.localContract,
      pdfCompletionValidation,
      archiveStatus,
      archivePending: archiveStatus !== "completed",
      archiveErrorCode: archiveErrorCode || undefined,
      archiveErrorMessage: archiveErrorMessage || undefined,
      completedExecutionStored: archiveStatus === "completed",
      reportId,
      chapters: generated.chapters,
      payload: responsePayload,
      pdfReady,
      pdfUrl: pdfReady.pdfUrl,
      htmlUrl: pdfReady.htmlUrl,
      downloadUrl: pdfReady.downloadUrl,
      canReopen: true,
      canDownload: true,
    };
    if (!isSukuyoCompletedPayloadReady(responseBody)) {
      throw Object.assign(new Error("숙요점 PDF 완료 응답 검증에 실패했습니다."), {
        status: 500,
        code: "SUKUYO_COMPLETED_PAYLOAD_INVALID",
      });
    }

    sukuyoPdfGenerationLocks.set(sessionId, {
      sessionId,
      reportId,
      featureKey,
      status: "done",
      startedAt: new Date().toISOString(),
      progress: { stage: "done", chapterCount: generated.chapterCount },
      result: responseBody,
    });

    return json(responseBody);
  } catch (error) {
    const failedCtx = executionCtx || buildPremiumExecutionContext({
      serviceKey: "sukuyo-premium",
      reportType: "sookyoPremium",
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId,
      access: null,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await failPremiumPdfExecution(
      pdfDbEnv,
      auth.userId,
      failedCtx,
      "sukuyo_generation_failed",
      clean(error?.message || "숙요점 PDF 생성에 실패했습니다."),
      "sukuyo-generation",
    );
    sukuyoPdfGenerationLocks.set(sessionId, {
      sessionId,
      reportId,
      featureKey,
      status: "failed",
      startedAt: new Date().toISOString(),
      progress: { stage: "failed", error: clean(error?.message || "unknown") },
    });
    throw error;
  }
}

function normalizeSukuyoTargetYear(value) {
  const nowYear = new Date().getFullYear();
  const raw = clean(value);
  if (!raw) return nowYear;
  const year = Number(raw);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    const error = new Error("숙요점 1년운은 1900년부터 2100년까지의 정수 연도만 열 수 있습니다.");
    error.status = 400;
    error.code = "INVALID_TARGET_YEAR";
    throw error;
  }
  return year;
}

function sukuyoYearlyContentKey(targetYear) {
  return `${SUKYO_YEARLY_FORTUNE_PRODUCT_KEY}:${normalizeSukuyoTargetYear(targetYear)}`;
}

function hashSukuyoYearlySeed(value) {
  const text = clean(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickSukuyoYearly(list, seed, offset = 0) {
  if (!Array.isArray(list) || !list.length) return "";
  return list[(Math.abs(Number(seed || 0)) + offset) % list.length];
}

function scoreSukuyoYearly(seed, base = 62, spread = 18, offset = 0) {
  const n = (Math.abs(Number(seed || 0)) + offset * 9973) % (spread * 2 + 1);
  return Math.max(35, Math.min(96, Math.round(base - spread + n)));
}

function normalizeSukuyoGenderLabel(value) {
  const token = clean(value).toUpperCase();
  if (token === "M" || token === "MALE") return "남성";
  if (token === "F" || token === "FEMALE") return "여성";
  return "미지정";
}

function formatSukuyoBirthDate(profile) {
  const birth = profile?.birth || {};
  const y = String(Number(birth.year || 0)).padStart(4, "0");
  const m = String(Number(birth.month || 0)).padStart(2, "0");
  const d = String(Number(birth.day || 0)).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function resolveSukuyoYearlyProfile(env, auth, profileIdRaw) {
  await connectDb(env);
  const requestedProfileId = clean(profileIdRaw);
  const user = await User.findById(auth.userId).select("destinyProfilesCurrentId").lean();
  const profileId = requestedProfileId || clean(user?.destinyProfilesCurrentId);
  if (!profileId) {
    const error = new Error("숙요점 1년운을 열 프로필을 먼저 선택해 주세요.");
    error.status = 403;
    error.code = "PROFILE_REQUIRED";
    throw error;
  }
  const profile = await ProfileCard.findOne({ userId: auth.userId, profileId }).lean();
  if (!profile) {
    const error = new Error("선택한 프로필을 찾지 못했습니다.");
    error.status = 404;
    error.code = "PROFILE_NOT_FOUND";
    throw error;
  }
  return profile;
}

function resolveSukuyoLunarFromProfile(profile) {
  const birth = profile?.birth || {};
  const year = Number(birth.year);
  const month = Number(birth.month);
  const day = Number(birth.day);
  const hour = Number.isFinite(Number(birth.hour)) ? Number(birth.hour) : 12;
  const minute = Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const calendarType = clean(birth.calType || "solar").toLowerCase();
  if (calendarType === "lunar" || calendarType === "lunar_leap") {
    return { year, month, day, isLeap: calendarType === "lunar_leap" };
  }
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const lunarMonth = Number(lunar.getMonth());
  return {
    year: Number(lunar.getYear()),
    month: Math.abs(lunarMonth),
    day: Number(lunar.getDay()),
    isLeap: lunarMonth < 0,
  };
}

function relationFromSukuyoDistance(distance) {
  const d = ((Number(distance) % 27) + 27) % 27;
  if (d === 0) return { label: "명", theme: "내 안의 원형이 또렷해지는 달", opportunity: "정체성과 이름값을 새롭게 세울 기회", caution: "혼자 결정한 기준을 모두에게 적용하려는 마음" };
  if ([1, 8, 10, 17, 19, 26].includes(d)) return { label: "영친", theme: "사람과 자원이 부드럽게 이어지는 달", opportunity: "귀인, 소개, 협업, 재회 흐름", caution: "호의와 의무를 혼동하는 선택" };
  if ([2, 7, 11, 16, 20, 25].includes(d)) return { label: "우쇠", theme: "편안함 속에서 실속을 다지는 달", opportunity: "루틴 정비와 안정적인 수익 구조", caution: "익숙함 때문에 미뤄둔 결정을 방치하는 흐름" };
  if ([3, 6, 12, 15, 21, 24].includes(d)) return { label: "안괴", theme: "경계와 욕망이 동시에 떠오르는 달", opportunity: "낡은 패턴을 끊고 판을 다시 짜는 힘", caution: "감정적인 확장, 충동 계약, 날 선 말" };
  return { label: "성위", theme: "역할과 성취가 현실로 굳어지는 달", opportunity: "성과 발표, 시험, 승진, 사업 구조화", caution: "성과를 빨리 증명하려다 회복을 줄이는 선택" };
}

function buildSukuyoYearlyFortuneResult({ auth, profile, targetYear }) {
  const lunar = resolveSukuyoLunarFromProfile(profile);
  if (!lunar) {
    const error = new Error("숙요점 1년운 계산에 필요한 생년월일이 부족합니다.");
    error.status = 422;
    error.code = "INVALID_PROFILE_BIRTH";
    throw error;
  }
  const natal = buildSukuyoFromLunar(lunar.month, lunar.day, { isLeapMonth: lunar.isLeap, source: "profile-canonical" }) || {};
  const natalName = clean(natal.nameKo || natal.name || natal.label || natal.mansion || "본명숙");
  const natalIndex = Number.isFinite(Number(natal.index)) ? Number(natal.index) : 0;
  const birth = profile.birth || {};
  const seed = hashSukuyoYearlySeed([
    auth.userId,
    profile.profileId,
    birth.year,
    birth.month,
    birth.day,
    birth.hour,
    birth.minute,
    profile.gender,
    targetYear,
    SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
  ].join("|"));
  const archetypes = [
    { key: "달빛 정렬", tone: "흩어진 약속과 감정의 결을 다시 맞추는 해", action: "새로 넓히기보다 이미 가진 관계와 일을 선명하게 정리하세요." },
    { key: "인연 개화", tone: "사람을 통해 길이 열리고 오래된 문이 다시 빛나는 해", action: "소개, 협업, 재회의 신호가 오면 조건을 분명히 두고 받아들이세요." },
    { key: "기반 축성", tone: "느린 축적이 나중의 큰 흐름을 받치는 해", action: "월별 지출, 체력, 업무 루틴을 기록으로 남기세요." },
    { key: "경계 재편", tone: "끌림과 부담을 분리하며 나의 영역을 되찾는 해", action: "급한 계약과 감정적 약속은 하루를 묵힌 뒤 움직이세요." },
    { key: "성과 점등", tone: "이름, 실적, 평판이 밖으로 드러나는 해", action: "드러낼 결과물을 작게라도 완성해 사람 앞에 올리세요." },
  ];
  const themeProfile = archetypes[(seed + natalIndex) % archetypes.length];
  const totalScore = scoreSukuyoYearly(seed, 70 + (natalIndex % 5), 14, 1);
  const firstScore = scoreSukuyoYearly(seed, 66 + (natalIndex % 7), 13, 2);
  const secondScore = scoreSukuyoYearly(seed, 69 + (natalIndex % 6), 13, 3);
  const keywords = [
    themeProfile.key,
    pickSukuyoYearly(["영친의 문", "우쇠의 안정", "안괴의 재편", "성위의 결실", "명궁의 회복"], seed, 4),
    pickSukuyoYearly(["월별 속도 조절", "관계의 선명함", "돈의 기준선", "몸의 리듬", "작은 완성"], seed, 8),
  ];
  const monthTitles = ["문이 열림", "숨 고르기", "관계 조율", "기반 정리", "실행 점화", "감정 정돈", "성과 노출", "계약 검증", "회복과 재배치", "귀인 접속", "돈의 기준", "마무리와 봉인"];
  const monthlyFlow = Array.from({ length: 12 }, (_, index) => {
    const monthSukuyo = buildSukuyoFromLunar(((index + targetYear) % 12) + 1, ((natalIndex + index * 2 + targetYear) % 27) + 1, { source: "yearly-month-seed" }) || {};
    const monthIndex = Number.isFinite(Number(monthSukuyo.index)) ? Number(monthSukuyo.index) : (natalIndex + index + 1) % 27;
    const distance = (monthIndex - natalIndex + 27) % 27;
    const relation = relationFromSukuyoDistance(distance);
    const score = scoreSukuyoYearly(seed, 64 + (distance % 9), 15, index + 10);
    return {
      month: index + 1,
      title: `${monthTitles[index]} · ${relation.label}`,
      score,
      theme: `${index + 1}월에는 월숙 ${clean(monthSukuyo.nameKo || monthSukuyo.name || "월숙")}이 본명숙 ${natalName}에 ${relation.label}의 결로 닿습니다. ${relation.theme}이 강하게 떠오릅니다.`,
      opportunity: relation.opportunity,
      caution: relation.caution,
      action: score >= 74
        ? "좋은 흐름은 바로 약속으로 고정하고, 결과가 보이는 일부터 앞에 두세요."
        : score >= 60
          ? "속도를 일정하게 유지하며 관계와 돈의 조건을 한 번 더 맞추세요."
          : "새로운 확장보다 정리, 검증, 회복을 먼저 두면 손실이 줄어듭니다.",
    };
  });
  const risingMonths = monthlyFlow.filter((item) => item.score >= 74).slice(0, 3).map((item) => `${item.month}월`);
  const cautionMonths = monthlyFlow.filter((item) => item.score < 60).slice(0, 3).map((item) => `${item.month}월`);
  const profileSummary = {
    name: clean(profile.name || "사용자"),
    birthDate: formatSukuyoBirthDate(profile),
    calendarType: clean(profile.birth?.calType || "solar"),
    gender: normalizeSukuyoGenderLabel(profile.gender),
    targetYear,
    "natal宿": natalName,
  };
  return {
    profileSummary,
    yearlyTheme: {
      title: `${targetYear}년 ${natalName}의 ${themeProfile.key}`,
      keywords,
      summary: `${natalName}의 ${targetYear}년에는 ${themeProfile.tone}가 드러납니다. 상승기는 ${risingMonths.join(", ") || "상반기 중반"}에 머물고, 조심해야 할 흐름은 ${cautionMonths.join(", ") || "분기 전환기"}에 비칩니다. ${themeProfile.action}`,
    },
    totalFortune: {
      score: totalScore,
      text: `올해 총운은 본명숙 ${natalName}이 가진 ${pickSukuyoYearly(["예민한 직감", "빠른 반응성", "신중한 판단", "강한 회복력", "관계 감지력"], seed, 12)}이 현실의 선택과 만나는 해입니다. 큰 행운 하나보다 월마다 달라지는 관계의 거리, 돈의 기준, 몸의 리듬을 섬세하게 맞출 때 운이 깊어집니다. ${themeProfile.key}의 흐름은 이미 곁에 있던 기회가 이름을 얻는 모습으로 떠오릅니다.`,
    },
    firstHalf: {
      score: firstScore,
      text: `상반기는 기반을 다지는 달빛이 강합니다. ${monthlyFlow.slice(0, 6).map((item) => `${item.month}월 ${item.title}`).join(", ")}의 순서로 문이 열리며, 관계에서는 말의 속도보다 약속의 정확도가 중요하게 비칩니다.`,
      action: "새로 시작하는 일은 작게 시험하고, 지출과 일정은 숫자로 남기세요.",
    },
    secondHalf: {
      score: secondScore,
      text: `하반기는 성과와 정리의 결이 함께 흐릅니다. ${monthlyFlow.slice(6).map((item) => `${item.month}월 ${item.title}`).join(", ")}의 리듬 속에서 오래 끌던 일이 형태를 얻고, 맞지 않는 인연은 자연스럽게 거리가 잡힙니다.`,
      action: "좋은 제안도 조건표를 먼저 보고, 오래된 부담은 역할을 다시 나누세요.",
    },
    monthlyFlow,
    loveAndRelationship: {
      score: scoreSukuyoYearly(seed, 68, 16, 31),
      text: `연애와 관계에서는 ${pickSukuyoYearly(["영친처럼 다정한 연결", "우쇠처럼 편안한 안정", "안괴처럼 강한 끌림", "성위처럼 현실적인 약속"], seed, 32)}이 떠오릅니다. 마음이 빨라지는 순간일수록 말의 온도와 약속의 범위를 함께 맞춰야 합니다.`,
      advice: "호감은 자주 표현하되, 관계의 이름과 속도는 상대의 현실까지 보고 정하세요.",
    },
    workAndBusiness: {
      score: scoreSukuyoYearly(seed, 69, 15, 41),
      text: `일과 사업운은 본명숙 ${natalName}의 장점이 반복 업무보다 선택과 집중에서 빛납니다. 성과는 한 번에 터지기보다 월별로 쌓이며, 특히 ${risingMonths.join(", ") || "기회가 밝은 달"}에는 외부 제안과 협업이 강하게 떠오릅니다.`,
      advice: "작은 결과물을 먼저 공개하고, 계약은 역할·마감·정산 기준을 문서로 남기세요.",
    },
    money: {
      score: scoreSukuyoYearly(seed, 66, 15, 51),
      text: "금전운은 달마다 온도 차가 납니다. 들어오는 돈보다 새어 나가는 돈의 결을 잡을 때 전체 운이 안정됩니다. 충동 구매와 감정적 투자보다 반복 수입, 고정비 조정, 현금 흐름 정리가 복을 부릅니다.",
      advice: "큰 지출은 하루 늦추고, 월초에는 예산선, 월말에는 남은 현금을 반드시 맞추세요.",
    },
    healthAndMind: {
      score: scoreSukuyoYearly(seed, 67, 14, 61),
      text: "건강과 멘탈은 수면, 눈, 소화, 긴장성 피로 쪽으로 신호가 비칩니다. 운이 커지는 달에는 체력이 먼저 닳을 수 있으니 회복 루틴을 일정 안에 넣어야 달빛이 흐려지지 않습니다.",
      advice: "밤 시간의 화면과 과한 약속을 줄이고, 보름 전후에는 몸을 비우는 루틴을 두세요.",
    },
    noblePersonAndCaution: {
      noblePerson: `${pickSukuyoYearly(["영친", "우쇠", "성위"], seed, 71)}의 기운을 가진 사람, 약속을 숫자와 일정으로 맞춰 주는 사람`,
      cautionPerson: `${pickSukuyoYearly(["안괴", "명", "우쇠"], seed, 72)}의 그림자가 강한 사람, 감정으로 결정을 재촉하는 사람`,
      relationshipAdvice: "올해의 인연은 오래 붙드는 힘보다 서로의 경계를 존중할 때 깊어집니다.",
    },
    sukuyoMasterFocus: {
      yearlyGate: `${targetYear}년의 문은 ${pickSukuyoYearly(["관계의 이름을 다시 세우는 자리", "오래 미룬 약속이 형태를 얻는 자리", "돈과 마음의 경계를 함께 정돈하는 자리", "몸의 리듬을 지켜야 운이 열리는 자리"], seed, 81)}로 열립니다.`,
      moonPacing: `${natalName}에게 올해의 달은 ${pickSukuyoYearly(["초승에는 작게 시작하고 보름에는 약속을 확인하라", "상현에는 말을 아끼고 하현에는 지출을 정리하라", "밝은 달에는 드러내고 어두운 달에는 회복하라"], seed, 82)}고 가리킵니다.`,
      taboo: `${pickSukuyoYearly(["감정이 가장 뜨거운 날 바로 계약하는 일", "상대의 속도를 내 운의 속도로 착각하는 일", "회복되지 않은 인연을 성급히 다시 여는 일"], seed, 83)}은 올해의 숙요 금기로 떠오릅니다.`,
      repairKey: `${pickSukuyoYearly(["사흘의 침묵 뒤 한 문장의 약속", "숫자로 남긴 일정과 정산", "보름 전후의 관계 거리 조율", "월말의 현금 흐름 정리"], seed, 84)}이 복을 다시 부르는 열쇠로 머무릅니다.`,
    },
    finalPrescription: {
      oneLine: `${targetYear}년 ${natalName}에게는 달마다 오는 문을 모두 열기보다, 내 별이 편안히 숨 쉬는 문만 고르는 지혜가 필요합니다.`,
      doThis: ["월초 목표 하나를 정하기", "보름 전후 관계와 지출 점검하기", "좋은 제안은 작은 실행으로 먼저 검증하기"],
      avoidThis: ["감정이 오른 날 계약하기", "다른 프로필의 운을 내 흐름처럼 섞기", "회복 시간을 줄여 성과를 밀어붙이기"],
    },
  };
}

function buildSukuyoYearlyPreview(fullResult) {
  const totalText = clean(fullResult?.totalFortune?.text);
  return {
    profileSummary: fullResult.profileSummary,
    yearlyTheme: fullResult.yearlyTheme,
    totalFortunePreview: {
      score: fullResult.totalFortune.score,
      text: totalText.length > 120 ? `${totalText.slice(0, 120)}...` : totalText,
    },
    monthlyPreview: fullResult.monthlyFlow.slice(0, 2),
    lockedNotice: "전체 12개월 흐름, 사랑/금전/사업/건강운은 잠금 해제 후 열립니다.",
  };
}

async function findSukuyoYearlyUnlock({ userId, profileId, targetYear }) {
  return findActivePaidContentUnlock({
    userId,
    profileId,
    serviceKey: SUKYO_YEARLY_FORTUNE_SERVICE_KEY,
    contentKey: sukuyoYearlyContentKey(targetYear),
  });
}

async function handleSukuyoYearlyFortune(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const targetYear = normalizeSukuyoTargetYear(url.searchParams.get("year"));
  const profile = await resolveSukuyoYearlyProfile(env, auth, url.searchParams.get("profileId"));
  const fullResult = buildSukuyoYearlyFortuneResult({ auth, profile, targetYear });
  const unlock = await findSukuyoYearlyUnlock({ userId: auth.userId, profileId: profile.profileId, targetYear });
  const unlocked = Boolean(unlock?._id);
  return json({
    ok: true,
    productKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
    contentKey: sukuyoYearlyContentKey(targetYear),
    pricing: {
      amountKrw: SUKYO_YEARLY_FORTUNE_PRICE_KRW,
      coinPrice: SUKYO_YEARLY_FORTUNE_PRICE_COINS,
      currency: "KRW",
    },
    unlockScope: {
      userId: auth.userId,
      profileId: profile.profileId,
      productKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
      targetYear,
    },
    unlocked,
    preview: unlocked ? null : buildSukuyoYearlyPreview(fullResult),
    result: unlocked ? fullResult : null,
  });
}

async function handleSukuyoYearlyUnlock(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const targetYear = normalizeSukuyoTargetYear(body?.targetYear || body?.year);
  const profile = await resolveSukuyoYearlyProfile(env, auth, body?.profileId || body?.selectedProfileId);
  const existing = await findSukuyoYearlyUnlock({ userId: auth.userId, profileId: profile.profileId, targetYear });
  const contentKey = sukuyoYearlyContentKey(targetYear);
  if (existing?._id) {
    return json({
      ok: true,
      alreadyUnlocked: true,
      unlocked: true,
      productKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
      contentKey,
      profileId: profile.profileId,
      targetYear,
    });
  }
  return json({
    ok: true,
    alreadyUnlocked: false,
    unlocked: false,
    productKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
    contentKey,
    profileId: profile.profileId,
    targetYear,
    billing: {
      endpoint: "/api/billing/coin-gate",
      payload: {
        featureKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
        contentKey,
        serviceKey: SUKYO_YEARLY_FORTUNE_SERVICE_KEY,
        profileId: profile.profileId,
        selectedProfileId: profile.profileId,
        targetYear,
        reason: "숙요점 1년운 전체 해석 잠금 해제",
        coinPrice: SUKYO_YEARLY_FORTUNE_PRICE_COINS,
        cost: SUKYO_YEARLY_FORTUNE_PRICE_COINS,
        amountKrw: SUKYO_YEARLY_FORTUNE_PRICE_KRW,
        disablePassChoice: true,
        disablePassFirst: true,
      },
    },
  });
}

async function handleSukuyoYearlyVerifyPayment(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const targetYear = normalizeSukuyoTargetYear(body?.targetYear || body?.year);
  const profile = await resolveSukuyoYearlyProfile(env, auth, body?.profileId || body?.selectedProfileId);
  const paymentId = clean(body?.paymentId || body?.impUid || body?.merchantUid || body?.merchant_uid);
  const existing = await findSukuyoYearlyUnlock({ userId: auth.userId, profileId: profile.profileId, targetYear });
  if (existing?._id) {
    return json({ ok: true, unlocked: true, productKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY, contentKey: sukuyoYearlyContentKey(targetYear), profileId: profile.profileId, targetYear });
  }
  if (!paymentId) {
    return json({ ok: false, unlocked: false, code: "PAYMENT_EVIDENCE_REQUIRED", message: "결제 검증 정보가 필요합니다." }, { status: 400 });
  }
  return json({ ok: false, unlocked: false, code: "PAYMENT_NOT_VERIFIED", message: "서버 결제 검증 후 잠금 해제가 필요합니다." }, { status: 402 });
}

export async function handleSukuyoRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/sukuyo");

    if (path === "/yearly-fortune") {
      if (method !== "GET") return methodNotAllowed();
      return await handleSukuyoYearlyFortune(request, env);
    }

    if (path === "/yearly-fortune/unlock") {
      if (method !== "POST") return methodNotAllowed();
      return await handleSukuyoYearlyUnlock(request, env);
    }

    if (path === "/yearly-fortune/verify-payment") {
      if (method !== "POST") return methodNotAllowed();
      return await handleSukuyoYearlyVerifyPayment(request, env);
    }

    if (path === "/past-life-reading") {
      if (method !== "POST") return methodNotAllowed();
      return await handleSukuyoPastLifeReading(request, env);
    }

    if (path === "/premium/chapters") {
      if (method !== "GET") return methodNotAllowed();
      return json({
        ok: true,
        reportType: "sookyoPremium",
        mode: "compatibility",
        featureKey: SUKYO_PDF_FEATURE_KEY,
        aliasFeatureKey: SUKYO_PDF_ALIAS_FEATURE_KEY,
        chapterCount: SUKYO_PDF_CHAPTER_COUNT,
        chapters: SUKYO_PDF_CHAPTERS,
      });
    }

    if (path === "/premium/preflight") {
      if (method !== "POST") return methodNotAllowed();
      return await handleSukuyoPremiumPreflight(request);
    }

    if (path === "/premium/prepare") {
      if (method !== "POST") return methodNotAllowed();
      return await handleSukuyoPremiumPrepare(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[SukuyoPremiumPDF][Error]", normalizeSukuyoError(error));
    const status = Number(error?.status) || 0;
    if (status >= 400 && status < 500) {
      return json({
        ok: false,
        code: clean(error?.code) || "SUKUYO_REQUEST_FAILED",
        message: clean(error?.message) || "숙요점 PDF 요청을 처리하지 못했습니다.",
        missing: Array.isArray(error?.missing) ? error.missing : undefined,
      }, { status });
    }
    return handleRouteError(error);
  }
}
