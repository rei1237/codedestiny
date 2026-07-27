"use client";

import { useEffect } from "react";
import {
  type Dictionary as I18nDictionary,
  type RuntimeLocale,
  detectLocale,
  interpolate,
  loadDictionary,
  missingText,
  normalizeLocale,
  resolveKey,
} from "@/lib/i18n/dictionary";

// 사전 로드·언어 감지·키 해석은 lib/i18n/dictionary 로 일원화했다.
// 예전에는 이 파일과 js/cd-lang-native.js, 그리고 엔진별 언어 감지 함수가
// 각자 조금씩 다르게 구현돼 있어 같은 키가 화면마다 다르게 풀렸다.

let activeDictionary: I18nDictionary | null = null;
let activeDictionaryLang: RuntimeLocale = "ko";

const normalizeRuntimeLang = normalizeLocale;
const resolveRuntimeLang = detectLocale;

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

function readVars(el: Element) {
  const raw = el.getAttribute("data-cd-vars");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
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

function applyAttributeTranslations(el: Element, dictionary: I18nDictionary | null, lang: RuntimeLocale, vars: Record<string, unknown> | null) {
  const attrSpec = el.getAttribute("data-cd-trans-attr") || "";
  attrSpec.split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => {
    const parts = item.split(":");
    const attrName = String(parts.shift() || "").trim();
    const attrKey = String(parts.join(":") || "").trim();
    if (!attrName || !attrKey) return;
    el.setAttribute(attrName, resolveKey(dictionary, attrKey, lang, vars));
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
    if (key) el.textContent = resolveKey(dictionary, key, normalized, vars);
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
      // ko 는 아직 사전이 아니라 호출부 fallback 을 쓴다. ko.json 커버리지가 100%가
      // 되면 이 분기를 없애고 다른 로케일과 동일하게 사전에서 읽는다
      // (진행률: verify:i18n-ko-coverage).
      if (lang === "ko") return typeof fallback === "string" ? interpolate(fallback, vars) : key;
      if (activeDictionary && activeDictionaryLang === lang) {
        return resolveKey(activeDictionary, key, lang, vars || {});
      }
      return typeof fallback === "string" ? interpolate(fallback, vars) : missingText(lang);
    };
    const lang = writeLocale(resolveRuntimeLang());
    applyAppTranslations(lang);
  }, []);

  return null;
}
