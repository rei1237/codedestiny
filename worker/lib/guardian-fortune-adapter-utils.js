const ADAPTER_NAMES = Object.freeze([
  "saju",
  "ziwei",
  "vedic",
  "sukuyo",
  "astrology",
  "tarot",
]);

const VALID_TOPICS = new Set(["daily", "love", "money_work", "relationship", "mind", "decision"]);
const VALID_CATEGORIES = new Set(["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"]);
const VALID_MODES = new Set(["yeoni", "neo"]);
const VALID_CALENDAR_TYPES = new Set(["solar", "lunar"]);
const VALID_GENDERS = new Set(["female", "male", "unknown"]);
const DEFAULT_TIMEZONE = "Asia/Seoul";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const MAX_CONCERN_LENGTH = 120;

const GUARDIAN_TOPIC_ADAPTER_PRIORITY = Object.freeze({
  daily: ["saju", "tarot", "astrology", "ziwei", "vedic", "sukuyo"],
  love: ["sukuyo", "saju", "tarot", "ziwei", "astrology", "vedic"],
  money_work: ["saju", "ziwei", "tarot", "vedic", "astrology", "sukuyo"],
  relationship: ["sukuyo", "saju", "ziwei", "tarot", "astrology", "vedic"],
  mind: ["vedic", "astrology", "saju", "sukuyo", "tarot", "ziwei"],
  decision: ["tarot", "saju", "ziwei", "astrology", "vedic", "sukuyo"],
});

const GUARDIAN_CATEGORY_ADAPTER_PRIORITY = Object.freeze({
  saju: ["saju"],
  ziwei: ["ziwei"],
  vedic: ["vedic"],
  sukuyo: ["sukuyo"],
  astrology: ["astrology"],
  tarot: ["tarot"],
});

const SENSITIVE_TEXT_PATTERNS = [
  /\b\d{6}[- ]?\d{7}\b/,
  /\b\d{2,4}[- ]?\d{3,4}[- ]?\d{4}\b/,
  /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
  /(?:주민|계좌|카드|비밀번호|password|의료|법률)/i,
];

function text(value, max = 220) {
  if (value === null || value === undefined) return "";
  const normalized = String(value)
    .replace(/\d{4}-\d{2}-\d{2}(?:T[^\s]+)?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.slice(0, max);
}

function nonEmptyText(value, max = 220) {
  const result = text(value, max);
  return result || undefined;
}

function arrayText(value, maxItems = 4) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => nonEmptyText(item, 120)).filter(Boolean).slice(0, maxItems);
}

function objectText(value, maxItems = 5) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value)
    .map(([key, item]) => {
      const rendered = typeof item === "object" ? text(item?.name || item?.label || item?.value) : text(item);
      return rendered ? `${text(key, 60)} ${rendered}` : "";
    })
    .filter(Boolean)
    .slice(0, maxItems);
}

function hasMeaningfulProjection(value) {
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some((item) => {
    if (Array.isArray(item)) return item.length > 0;
    if (item && typeof item === "object") return Object.keys(item).length > 0;
    return Boolean(text(item));
  });
}

function isValidDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidTime(value) {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isValidTimezone(value) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function isValidBirthPlace(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    && isValidTimezone(value.timezone)
    && (value.city === undefined || typeof value.city === "string")
    && (value.country === undefined || typeof value.country === "string");
}

function containsSensitiveText(value) {
  return typeof value === "string" && SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function kstDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function createWarning(adapter, code, message = "계산 결과를 사용할 수 없습니다.") {
  const safeAdapter = ADAPTER_NAMES.includes(adapter) ? adapter : "integrated";
  const safeCode = text(code, 80).replace(/[^a-zA-Z0-9_.-]/g, "_") || "adapter_failed";
  return { adapter: safeAdapter, code: safeCode, message: text(message, 180) };
}

async function runGuardianAdapterSafely({ adapterName, run, fallback, logger }) {
  try {
    const data = await run();
    if (hasMeaningfulProjection(data)) return { ok: true, data };
    if (typeof fallback === "function") {
      const fallbackData = await fallback();
      if (hasMeaningfulProjection(fallbackData)) {
        return {
          ok: true,
          data: fallbackData,
          warnings: [createWarning(adapterName, "fallback_used", "보조 계산 결과를 사용했습니다.")],
        };
      }
    }
    return {
      ok: false,
      errorCode: "EMPTY_PROJECTION",
      message: "계산 결과가 비어 있습니다.",
      warnings: [createWarning(adapterName, "empty_projection")],
    };
  } catch (error) {
    const errorCode = text(error?.code || "ADAPTER_FAILED", 80).replace(/[^a-zA-Z0-9_.-]/g, "_");
    const warning = createWarning(adapterName, errorCode, "일부 운세 계산을 건너뛰었습니다.");
    if (typeof logger === "function") {
      try {
        logger({ adapter: adapterName, errorCode });
      } catch {
        // Logging must never change the result path.
      }
    }
    if (typeof fallback === "function") {
      try {
        const fallbackData = await fallback();
        if (hasMeaningfulProjection(fallbackData)) {
          return { ok: true, data: fallbackData, warnings: [warning, createWarning(adapterName, "fallback_used")] };
        }
      } catch {
        // Fall through to the structured adapter failure.
      }
    }
    return { ok: false, errorCode, message: "일부 운세 계산을 사용할 수 없습니다.", warnings: [warning] };
  }
}

function maskGuardianFortuneInputForLog(input = {}) {
  return {
    hasBirthDate: Boolean(input.birthDate),
    hasBirthTime: Boolean(input.birthTime),
    hasBirthPlace: Boolean(input.birthPlace),
    calendarType: VALID_CALENDAR_TYPES.has(input.calendarType) ? input.calendarType : "unknown",
    topic: VALID_TOPICS.has(input.topic) ? input.topic : "unknown",
    category: VALID_CATEGORIES.has(input.category) ? input.category : "unknown",
    mode: VALID_MODES.has(input.mode) ? input.mode : "unknown",
    locale: typeof input.locale === "string" ? input.locale.slice(0, 20) : "unknown",
    hasConcern: Boolean(input.concern),
  };
}

export {
  ADAPTER_NAMES,
  DEFAULT_TIMEZONE,
  GUARDIAN_CATEGORY_ADAPTER_PRIORITY,
  GUARDIAN_TOPIC_ADAPTER_PRIORITY,
  MAX_CONCERN_LENGTH,
  VALID_CALENDAR_TYPES,
  VALID_CATEGORIES,
  VALID_GENDERS,
  VALID_MODES,
  VALID_TOPICS,
  arrayText,
  containsSensitiveText,
  createWarning,
  hasMeaningfulProjection,
  isValidBirthPlace,
  isValidDate,
  isValidTime,
  kstDateKey,
  maskGuardianFortuneInputForLog,
  nonEmptyText,
  objectText,
  runGuardianAdapterSafely,
  text,
};
