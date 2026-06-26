"use client";

import { useEffect } from "react";

const SUPPORTED_LANGS = new Set(["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"]);
const I18N_FILE_BY_LANG: Record<string, string> = {
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
const MISSING_TEXT_BY_LANG: Record<string, string> = {
  ko: "번역을 준비 중입니다",
  en: "Translation pending",
  ja: "Translation pending",
  "zh-CN": "Translation pending",
  "zh-TW": "Translation pending",
  vi: "Translation pending",
  hi: "Translation pending",
  es: "Translation pending",
  fr: "Translation pending",
  de: "Translation pending",
  nl: "Translation pending",
  ms: "Translation pending",
};

type I18nDictionary = Record<string, unknown>;

const dictionaryCache: Record<string, Promise<I18nDictionary | null> | undefined> = {};
const missingKeyLog = new Set<string>();
let activeDictionary: I18nDictionary | null = null;
let activeDictionaryLang = "ko";

function normalizeRuntimeLang(value?: string | null) {
  const raw = String(value || "").trim();
  const normalized = raw.toLowerCase().replace("_", "-");
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk" || normalized === "zh-mo") return "zh-TW";
  if (normalized === "en-us") return "en";
  if (normalized === "ja-jp") return "ja";
  if (normalized === "vi-vn") return "vi";
  return SUPPORTED_LANGS.has(raw) ? raw : SUPPORTED_LANGS.has(normalized) ? normalized : "ko";
}

function readCookie(name: string) {
  const prefix = `${name}=`;
  return String(document.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) || "";
}

function resolveRuntimeLang() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const queryLang = params.get("lang");
    if (queryLang) return normalizeRuntimeLang(queryLang);
  } catch {}

  try {
    const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
    if (firstSegment) {
      const pathLang = normalizeRuntimeLang(firstSegment);
      if (pathLang !== "ko" || firstSegment.toLowerCase() === "ko") return pathLang;
    }
  } catch {}

  try {
    const stored = window.localStorage.getItem("cd_lang");
    if (stored) return normalizeRuntimeLang(stored);
  } catch {}

  try {
    const cookieLang = readCookie("cd_locale");
    if (cookieLang) return normalizeRuntimeLang(decodeURIComponent(cookieLang));
  } catch {}

  return "ko";
}

function writeLocale(lang: string) {
  const normalized = normalizeRuntimeLang(lang);
  const cookieValue = encodeURIComponent(normalized);
  try { window.localStorage.setItem("cd_lang", normalized); } catch {}
  document.cookie = `cd_locale=${cookieValue}; path=/; max-age=315360000; SameSite=Lax`;
  document.cookie = "cd_locale_ack=1; path=/; max-age=315360000; SameSite=Lax";
  document.documentElement.setAttribute("lang", normalized);
  document.documentElement.setAttribute("data-cd-lang", normalized);
  window.dispatchEvent(new CustomEvent("cd:locale-ready", { detail: { lang: normalized } }));
  return normalized;
}

function valueAtPath(source: I18nDictionary | null, path: string) {
  return String(path || "")
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce<unknown>((acc, key) => {
      if (!acc || typeof acc !== "object" || !key) return undefined;
      return (acc as Record<string, unknown>)[key];
    }, source || {});
}

function interpolate(value: string, vars?: Record<string, unknown> | null) {
  if (!vars || typeof vars !== "object") return value;
  return String(value || "").replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}|\{\s*([a-zA-Z0-9_.-]+)\s*\}/g, (_, doubleKey, singleKey) => {
    const key = doubleKey || singleKey;
    return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : "";
  });
}

function readVars(el: Element) {
  const raw = el.getAttribute("data-cd-vars");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function reportMissingKey(lang: string, key: string, attrName = "text") {
  const id = `${lang}|${key}|${attrName}`;
  if (missingKeyLog.has(id)) return;
  missingKeyLog.add(id);
  if (process.env.NODE_ENV !== "production") {
    console.warn("[cd-i18n-missing]", { lang, key, attr: attrName });
  }
}

function resolveValue(dictionary: I18nDictionary | null, key: string, lang: string, attrName = "text") {
  const value = valueAtPath(dictionary, key);
  if (typeof value === "string") return value;
  reportMissingKey(lang, key, attrName);
  return MISSING_TEXT_BY_LANG[lang] || MISSING_TEXT_BY_LANG.en;
}

function loadDictionary(lang: string) {
  const file = I18N_FILE_BY_LANG[lang];
  if (!file) return Promise.resolve(null);
  if (dictionaryCache[file]) return dictionaryCache[file];
  dictionaryCache[file] = fetch(`/i18n/${file}.json`, { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`i18n fetch failed: ${file}`);
      return res.json() as Promise<I18nDictionary>;
    })
    .catch(() => {
      delete dictionaryCache[file];
      return null;
    });
  return dictionaryCache[file];
}

function markTranslatableNodes() {
  document.querySelectorAll("[data-cd-trans], [data-cd-trans-attr], .custom-trans").forEach((el) => {
    el.classList.add("notranslate");
    if (!el.hasAttribute("data-cd-origin-text")) {
      el.setAttribute("data-cd-origin-text", el.textContent || "");
    }
    const attrSpec = el.getAttribute("data-cd-trans-attr") || "";
    attrSpec.split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => {
      const attrName = item.split(":")[0]?.trim();
      if (!attrName) return;
      const originName = `data-cd-origin-attr-${attrName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      if (!el.hasAttribute(originName)) {
        el.setAttribute(originName, el.getAttribute(attrName) || "");
      }
    });
  });
}

function applyAttributeTranslations(el: Element, dictionary: I18nDictionary | null, lang: string, vars: Record<string, unknown> | null) {
  const attrSpec = el.getAttribute("data-cd-trans-attr") || "";
  attrSpec.split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => {
    const parts = item.split(":");
    const attrName = String(parts.shift() || "").trim();
    const attrKey = String(parts.join(":") || "").trim();
    if (!attrName || !attrKey) return;
    el.setAttribute(attrName, interpolate(resolveValue(dictionary, attrKey, lang, attrName), vars));
  });
}

async function applyAppTranslations(lang: string) {
  const normalized = normalizeRuntimeLang(lang);
  markTranslatableNodes();
  if (normalized === "ko") {
    activeDictionary = null;
    activeDictionaryLang = "ko";
    document.querySelectorAll("[data-cd-trans], [data-cd-trans-attr], .custom-trans").forEach((el) => {
      if (el.hasAttribute("data-cd-origin-text")) {
        el.textContent = el.getAttribute("data-cd-origin-text") || "";
      }
      const attrSpec = el.getAttribute("data-cd-trans-attr") || "";
      attrSpec.split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => {
        const attrName = item.split(":")[0]?.trim();
        if (!attrName) return;
        const originName = `data-cd-origin-attr-${attrName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        if (el.hasAttribute(originName)) el.setAttribute(attrName, el.getAttribute(originName) || "");
      });
    });
    return;
  }

  const dictionary = await loadDictionary(normalized);
  activeDictionary = dictionary;
  activeDictionaryLang = normalized;
  document.querySelectorAll("[data-cd-trans], [data-cd-trans-attr], .custom-trans").forEach((el) => {
    const key = el.getAttribute("data-key") || el.getAttribute("data-cd-trans");
    const vars = readVars(el);
    if (key) el.textContent = interpolate(resolveValue(dictionary, key, normalized), vars);
    applyAttributeTranslations(el, dictionary, normalized, vars);
  });
}

export default function LocaleRuntimeBridge() {
  useEffect(() => {
    const runtimeWindow = window as typeof window & {
      cdGetCurrentLanguage?: () => string;
      cdApplyNativeTranslations?: (lang: string) => Promise<void>;
      cdTranslate?: (key: string, vars?: Record<string, unknown>, fallback?: string) => string;
    };
    runtimeWindow.cdGetCurrentLanguage = () => normalizeRuntimeLang(resolveRuntimeLang());
    runtimeWindow.cdApplyNativeTranslations = applyAppTranslations;
    runtimeWindow.cdTranslate = (key, vars, fallback) => {
      const lang = normalizeRuntimeLang(resolveRuntimeLang());
      if (lang === "ko") return typeof fallback === "string" ? interpolate(fallback, vars) : key;
      if (activeDictionary && activeDictionaryLang === lang) {
        return interpolate(resolveValue(activeDictionary, key, lang), vars || {});
      }
      return typeof fallback === "string" ? interpolate(fallback, vars) : MISSING_TEXT_BY_LANG[lang] || MISSING_TEXT_BY_LANG.en;
    };
    const lang = writeLocale(resolveRuntimeLang());
    applyAppTranslations(lang);
  }, []);

  return null;
}
