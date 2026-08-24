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

// 로케일 목록·정규화는 locale-normalize.js 가 정본이다(worker 와 Jest 가 .ts 를 못 읽어 분리).
// 기존 임포트 경로를 깨지 않기 위해 여기서 그대로 재export 한다.
export { RUNTIME_LOCALES, isRuntimeLocale, normalizeLocale } from "./locale-normalize.js";
export type { RuntimeLocale } from "./locale-normalize.js";

import { normalizeLocale } from "./locale-normalize.js";
import type { RuntimeLocale } from "./locale-normalize.js";

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

/**
 * `@some.dict.key` 꼴 변수값을 사전에서 풀어 준다.
 *
 * 왜 필요한가: 마커는 **서버에서 한 번 렌더된 HTML** 에 붙고, 그 시점에는 로케일을 모른다.
 * 그래서 `data-cd-vars` 에 한국어 값을 박으면 번역된 문장 안에 한국어가 그대로 남는다
 * (실측: `/fortune` 의 일진·궁 문장은 조합이 3,456가지라 완성문을 키로 고정할 수도 없다).
 * 변수 자리에 값 대신 **키**를 넣게 하면 문장과 변수가 각자 자기 로케일로 풀린다.
 *
 * 안전장치: `@` 뒤가 실제 키로 해석되지 않으면 원문을 그대로 둔다. 이메일이나
 * 핸들처럼 `@` 로 시작하는 평범한 값을 삼키지 않기 위한 것이다.
 */
export function resolveVars(
  dictionary: Dictionary | null,
  vars: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null | undefined {
  if (!vars || typeof vars !== "object") return vars;
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [name, raw] of Object.entries(vars)) {
    if (typeof raw === "string" && raw.length > 1 && raw.charCodeAt(0) === 64 /* @ */) {
      const looked = valueAtPath(dictionary, raw.slice(1));
      if (typeof looked === "string") {
        out[name] = looked;
        changed = true;
        continue;
      }
    }
    out[name] = raw;
  }
  return changed ? out : vars;
}

export function resolveKey(
  dictionary: Dictionary | null,
  key: string,
  locale: RuntimeLocale,
  vars?: Record<string, unknown> | null,
): string {
  const value = valueAtPath(dictionary, key);
  if (typeof value === "string") return interpolate(value, resolveVars(dictionary, vars));
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

/**
 * 한국어 원문 → 키 역인덱스.
 *
 * 마커가 없는 노드를 텍스트 자체로 조회해 번역하기 위한 것이다. React 페이지의
 * 공용 푸터·랜딩 카피처럼 **서버에서 한국어로 렌더된 뒤 마커가 없는** 구간이 많은데,
 * 컴포넌트마다 마커를 심는 대신 ko 사전을 뒤집어 쓴다.
 *
 * 정적 셸(js/cd-lang-native.js)에도 같은 알고리즘이 있다. 그쪽은 ES5 IIFE 라
 * 이 모듈을 import 할 수 없어 불가피한 이중 구현이다 — 규칙을 바꿀 때 양쪽을 같이 본다.
 */
const REPAIR_NAMESPACE = "shellRuntime";
let koReverseIndex: Record<string, string> | null = null;

async function buildKoReverseIndex(): Promise<Record<string, string>> {
  if (koReverseIndex) return koReverseIndex;
  const sources = await Promise.all([loadDictionary("ko"), loadDictionary("ko", REPAIR_NAMESPACE)]);
  const index: Record<string, string> = {};
  for (const source of sources) {
    if (!source) continue;
    (function walk(node: Dictionary, path: string) {
      for (const [key, value] of Object.entries(node)) {
        const next = path ? `${path}.${key}` : key;
        if (typeof value === "string") {
          const text = value.replace(/\s+/g, " ").trim();
          // 2자 미만은 사용자 데이터와 겹칠 위험이 커서 넣지 않는다
          if (text.length >= 2 && !(text in index)) index[text] = next;
        } else if (value && typeof value === "object") {
          walk(value as Dictionary, next);
        }
      }
    })(source, "");
  }
  koReverseIndex = index;
  return index;
}

/** 평면 키("a.b.c" 자체가 프로퍼티)와 중첩 키를 모두 지원하는 조회. */
function lookupTranslation(source: Dictionary | null, key: string): unknown {
  if (!source) return undefined;
  if (typeof source[key] === "string") return source[key];
  return valueAtPath(source, key);
}

/**
 * 마커 없는 한국어 텍스트 노드를 번역한다. ko 로케일에서는 아무것도 하지 않는다.
 * 반환값은 고친 노드 수.
 */
export async function repairUnmarkedKoreanText(locale: RuntimeLocale): Promise<number> {
  if (typeof document === "undefined" || locale === "ko") return 0;
  const [index, core, namespaced] = await Promise.all([
    buildKoReverseIndex(),
    loadDictionary(locale),
    loadDictionary(locale, REPAIR_NAMESPACE),
  ]);
  if (!document.body) return 0;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const pending: Array<{ node: Text; raw: string; translated: string }> = [];
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const raw = node.nodeValue || "";
    const text = raw.replace(/\s+/g, " ").trim();
    if (!text || !/[가-힣]/.test(text)) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    if (parent.closest("script, style, template, noscript, [data-cd-no-trans]")) continue;
    // 사용자가 넣은 값이 우리 문구와 우연히 같을 수 있는 자리는 건드리지 않는다
    if (parent.closest("input, textarea, [contenteditable], [data-cd-user-content]")) continue;
    const key = index[text];
    if (!key) continue;
    let translated = lookupTranslation(core, key);
    if (typeof translated !== "string") translated = lookupTranslation(namespaced, key);
    if (typeof translated !== "string" || !translated || translated === text) continue;
    pending.push({ node, raw, translated });
  }

  for (const item of pending) {
    // 앞뒤 공백을 보존해야 인접 인라인 요소와의 간격이 무너지지 않는다
    const lead = item.raw.match(/^\s*/)?.[0] ?? "";
    const tail = item.raw.match(/\s*$/)?.[0] ?? "";
    item.node.nodeValue = lead + item.translated + tail;
  }
  return pending.length;
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
