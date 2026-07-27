/**
 * 사전 로드·키 해석 공용 코어.
 *
 * 지금까지 이 로직은 최소 세 벌로 흩어져 있었다.
 *   - js/cd-lang-native.js        정적 셸용
 *   - app/components/LocaleRuntimeBridge.tsx  React 용
 *   - 각 엔진의 _sajuEngineCurrentLang 등 모듈별 언어 감지
 * 서로 조금씩 다르게 동작해서 같은 키가 화면마다 다르게 풀리는 원인이 됐다.
 * 새 코드는 전부 여기를 거친다. 두 번째 구현을 만들지 않는다.
 */

export const RUNTIME_LOCALES = [
  "ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms",
] as const;

export type RuntimeLocale = (typeof RUNTIME_LOCALES)[number];

/** 런타임 로케일 → public/i18n 파일 basename */
export const DICTIONARY_FILE: Record<RuntimeLocale, string> = {
  ko: "ko",
  en: "en",
  ja: "ja",
  "zh-CN": "zh-cn",
  "zh-TW": "zh-tw",
  vi: "vi",
  hi: "hi",
  es: "es",
  fr: "fr",
  de: "de",
  nl: "nl",
  ms: "ms",
};

/**
 * 키가 없을 때의 런타임 안전망. 커밋되는 콘텐츠에서는 fallback 을 금지하지만
 * (verify:i18n-no-fallback 이 강제), 사전 fetch 실패·CDN 장애 시 화면이 통째로
 * 비는 것은 막아야 한다. 누락 키 자체는 빌드 게이트가 0으로 유지한다.
 */
const MISSING_TEXT: Record<RuntimeLocale, string> = {
  ko: "번역을 준비 중입니다",
  en: "Translation pending",
  ja: "翻訳を準備しています",
  "zh-CN": "翻译准备中",
  "zh-TW": "翻譯準備中",
  vi: "Đang chuẩn bị bản dịch",
  hi: "अनुवाद तैयार हो रहा है",
  es: "Traducción en preparación",
  fr: "Traduction en préparation",
  de: "Übersetzung wird vorbereitet",
  nl: "Vertaling wordt voorbereid",
  ms: "Terjemahan sedang disediakan",
};

export type Dictionary = Record<string, unknown>;

export function isRuntimeLocale(value: string): value is RuntimeLocale {
  return (RUNTIME_LOCALES as readonly string[]).includes(value);
}

/** 쿼리·경로·저장소에서 오는 온갖 표기를 지원 로케일로 정규화한다. */
export function normalizeLocale(value?: string | null): RuntimeLocale {
  const raw = String(value || "").trim();
  if (isRuntimeLocale(raw)) return raw;
  const lower = raw.toLowerCase().replace("_", "-");
  if (lower === "zh" || lower === "zh-cn" || lower === "zh-hans") return "zh-CN";
  if (lower === "zh-tw" || lower === "zh-hant" || lower === "zh-hk" || lower === "zh-mo") return "zh-TW";
  if (lower === "en-us" || lower === "en-gb") return "en";
  if (lower === "ja-jp") return "ja";
  if (lower === "vi-vn") return "vi";
  if (lower === "ko-kr") return "ko";
  return isRuntimeLocale(lower) ? (lower as RuntimeLocale) : "ko";
}

/** `a.b.c` / `a.b[0]` 경로로 값을 꺼낸다. */
export function valueAtPath(source: Dictionary | null, path: string): unknown {
  if (!source) return undefined;
  return String(path || "")
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce<unknown>((acc, key) => {
      if (!acc || typeof acc !== "object" || !key) return undefined;
      return (acc as Record<string, unknown>)[key];
    }, source);
}

/** `{name}` 과 `{{name}}` 두 표기를 모두 채운다(기존 사전이 둘 다 쓴다). */
export function interpolate(value: string, vars?: Record<string, unknown> | null): string {
  if (!vars || typeof vars !== "object") return value;
  return String(value || "").replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}|\{\s*([a-zA-Z0-9_.-]+)\s*\}/g,
    (_match, doubleKey, singleKey) => {
      const key = doubleKey || singleKey;
      // 값이 없으면 빈 문자열. 기존 런타임(LocaleRuntimeBridge·cd-lang-native)과
      // 동일한 동작이다. 원문을 남기면 화면에 `{name}` 이 그대로 노출된다.
      return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : "";
    },
  );
}

/** 키 해석 실패 시 보여 줄 문구. 런타임 안전망이며 빌드 게이트가 누락 키를 0으로 유지한다. */
export function missingText(locale: RuntimeLocale): string {
  return MISSING_TEXT[locale] || MISSING_TEXT.en;
}

const missingKeyLog = new Set<string>();

export function resolveKey(
  dictionary: Dictionary | null,
  key: string,
  locale: RuntimeLocale,
  vars?: Record<string, unknown> | null,
): string {
  const value = valueAtPath(dictionary, key);
  if (typeof value === "string") return interpolate(value, vars);
  const id = `${locale}|${key}`;
  if (!missingKeyLog.has(id)) {
    missingKeyLog.add(id);
    if (process.env.NODE_ENV !== "production") console.warn("[cd-i18n-missing]", { locale, key });
  }
  return MISSING_TEXT[locale] || MISSING_TEXT.en;
}

const cache = new Map<string, Promise<Dictionary | null>>();

/**
 * 사전을 받아 온다. 코어 번들(`/i18n/<lang>.json`)과 기능 네임스페이스
 * (`/i18n/<lang>/<ns>.json`)를 같은 캐시로 다룬다.
 *
 * 네임스페이스를 나눈 이유: 코어 사전이 이미 220KB 다. 현지화가 진행되며 여기에
 * 본문까지 얹으면 홈 첫 페인트가 사전 다운로드를 기다리게 된다. 기능 문구는
 * 그 화면이 열릴 때만 받는다.
 */
export function loadDictionary(locale: RuntimeLocale, namespace?: string): Promise<Dictionary | null> {
  const file = DICTIONARY_FILE[locale];
  if (!file) return Promise.resolve(null);
  const url = namespace ? `/i18n/${file}/${namespace}.json` : `/i18n/${file}.json`;
  const cached = cache.get(url);
  if (cached) return cached;

  const request = fetch(url, { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`i18n fetch failed: ${url}`);
      return response.json() as Promise<Dictionary>;
    })
    .catch(() => {
      cache.delete(url); // 일시적 장애면 다음 시도에서 다시 받도록
      return null;
    });

  cache.set(url, request);
  return request;
}

/** 쿼리 → 경로 → localStorage → 쿠키 순으로 현재 로케일을 정한다. */
export function detectLocale(): RuntimeLocale {
  if (typeof window === "undefined") return "ko";
  try {
    const queryLang = new URLSearchParams(window.location.search || "").get("lang");
    if (queryLang) return normalizeLocale(queryLang);
  } catch {}
  try {
    const segment = window.location.pathname.split("/").filter(Boolean)[0];
    if (segment && segment.toLowerCase() !== "ko") {
      const fromPath = normalizeLocale(segment);
      if (fromPath !== "ko") return fromPath;
    }
  } catch {}
  try {
    const stored = window.localStorage.getItem("cd_lang");
    if (stored) return normalizeLocale(stored);
  } catch {}
  try {
    const prefix = "cd_locale=";
    const cookie = String(document.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    if (cookie) return normalizeLocale(decodeURIComponent(cookie.slice(prefix.length)));
  } catch {}
  return "ko";
}
