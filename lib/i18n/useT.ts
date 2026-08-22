"use client";

/**
 * React 용 번역 훅.
 *
 * 왜 DOM 덮어쓰기 방식으로는 안 되는가: LocaleRuntimeBridge 는 마운트 시 1회
 * `el.textContent` 를 교체한다. React 가 리렌더하면 자기 가상 DOM 기준으로
 * 되돌려 놓으므로 번역이 즉시 사라진다. React 쪽은 값이 렌더 트리를 통해
 * 흘러야 하고, 그래서 훅이 필요하다.
 *
 * 사용:
 *   const t = useT("saju");
 *   <p>{t("intro.pillars")}</p>
 *   <p>{t("greeting", { name })}</p>
 */
import { useCallback, useEffect, useState } from "react";
import {
  type Dictionary,
  type RuntimeLocale,
  detectLocale,
  loadDictionary,
  resolveKey,
  valueAtPath,
} from "./dictionary";

export type Translate = (key: string, vars?: Record<string, unknown> | null) => string;

/** 이미 받아 둔 사전. 훅이 여러 번 마운트돼도 첫 렌더부터 값이 나오게 한다. */
const ready = new Map<string, Dictionary | null>();

function cacheKey(locale: RuntimeLocale, namespace?: string) {
  return namespace ? `${locale}/${namespace}` : locale;
}

export function useLocale(): RuntimeLocale {
  const [locale, setLocale] = useState<RuntimeLocale>(() => detectLocale());

  useEffect(() => {
    setLocale(detectLocale());
    const onLocaleChange = () => setLocale(detectLocale());
    window.addEventListener("cd:locale-ready", onLocaleChange);
    return () => window.removeEventListener("cd:locale-ready", onLocaleChange);
  }, []);

  return locale;
}

/** 사전 자체를 돌려준다. `useT` 와 `useTPick` 이 같은 로딩·캐시를 공유한다. */
function useDictionary(namespace?: string): { locale: RuntimeLocale; dictionary: Dictionary | null } {
  const locale = useLocale();
  const key = cacheKey(locale, namespace);
  const [dictionary, setDictionary] = useState<Dictionary | null>(() => ready.get(key) ?? null);

  useEffect(() => {
    let cancelled = false;
    if (ready.has(key)) {
      setDictionary(ready.get(key) ?? null);
      return () => { cancelled = true; };
    }
    loadDictionary(locale, namespace).then((loaded) => {
      ready.set(key, loaded);
      if (!cancelled) setDictionary(loaded);
    });
    return () => { cancelled = true; };
  }, [key, locale, namespace]);

  return { locale, dictionary };
}

/**
 * @param namespace 기능 네임스페이스. 생략하면 코어 사전(`/i18n/<lang>.json`)을 본다.
 */
export function useT(namespace?: string): Translate {
  const { locale, dictionary } = useDictionary(namespace);

  return useCallback(
    (translationKey: string, vars?: Record<string, unknown> | null) =>
      resolveKey(dictionary, translationKey, locale, vars),
    [dictionary, locale],
  );
}

export type TranslatePick = (key: string, current: string | undefined) => string | undefined;

/**
 * 사전에 값이 없으면 **넘긴 원본을 그대로 놓아둔다**.
 *
 * `useT` 는 키가 없을 때 `MISSING_TEXT`("번역을 준비 중입니다")를 돌려준다. 그게 맞는
 * 화면도 있지만, **한국어 원문이 소스에 있고 `ko.json` 은 그 네임스페이스를 아예 갖지
 * 않는** 데이터(예: `featureMarketing.*` — 한국어는 소스가 정본이라 사전에 없다)에
 * `useT` 를 쓰면 ko 로케일에서 화면이 통째로 "번역을 준비 중입니다"로 덮인다.
 * 정적 셸(index.html)의 `_pvwTrKeep` 과 같은 계약을 React 쪽에 준다 — 원본 값이
 * 비어 있으면 조회 자체를 건너뛰고, 사전에 값이 없으면 원본을 유지한다.
 */
export function useTPick(namespace?: string): TranslatePick {
  const { dictionary } = useDictionary(namespace);

  return useCallback(
    (translationKey: string, current: string | undefined) => {
      if (typeof current !== "string" || !current) return current;
      const value = valueAtPath(dictionary, translationKey);
      return typeof value === "string" && value ? value : current;
    },
    [dictionary],
  );
}
