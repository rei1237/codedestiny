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
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  type Dictionary,
  type RuntimeLocale,
  detectLocale,
  loadDictionary,
  normalizeLocale,
  resolveKey,
  valueAtPath,
} from "./dictionary";

export type Translate = (key: string, vars?: Record<string, unknown> | null) => string;

/** 이미 받아 둔 사전. 훅이 여러 번 마운트돼도 첫 렌더부터 값이 나오게 한다. */
const ready = new Map<string, Dictionary | null>();

function cacheKey(locale: RuntimeLocale, namespace?: string) {
  return namespace ? `${locale}/${namespace}` : locale;
}

/**
 * 경로 프리픽스만으로 정하는 로케일. **서버와 클라이언트가 같은 값을 내는 유일한 소스다** —
 * 쿼리·localStorage·쿠키는 서버에 없다. 로케일 세그먼트가 아니면 normalizeLocale 이 "ko" 를 준다.
 */
function localeFromPathname(pathname: string | null): RuntimeLocale {
  const segment = String(pathname || "").split("/").filter(Boolean)[0];
  return segment ? normalizeLocale(segment) : "ko";
}

/**
 * 🔴 첫 렌더는 **경로만** 본다. 저장된 선택까지 보는 `detectLocale()` 은 하이드레이션 뒤에만 쓴다.
 *
 * 예전에는 `useState(() => detectLocale())` 이었다. `detectLocale()` 은 서버에서 `window` 가
 * 없어 무조건 "ko" 를 돌려주므로, `/en/insights/` 같은 로케일 라우트에서 두 가지가 한꺼번에 깨졌다:
 *   1. **SSR HTML 에 한국어가 그대로 나갔다** — 크롤러가 보는 것이 한국어다.
 *      2026-08-23 실측: `/en/insights/`·`/ja/today/`·`/zh/sukuyo/`·`/zh-tw/ziwei/` 의 서버 렌더
 *      본문에 한글 75자(헤더 내비 "홈"·"운세 인사이트", 정책 링크 "개인정보"·"이용약관" 등).
 *   2. 클라이언트 첫 렌더는 경로에서 "en" 을 읽어 영어를 그리므로 텍스트가 어긋나
 *      **React #418** 이 나고 서브트리가 통째로 다시 그려졌다.
 *
 * 경로에서 얻는 값은 정적 export 산출물과 브라우저가 동일하므로 두 문제가 함께 사라진다.
 * 쿼리(`?lang=`)·저장된 선택의 우선순위는 effect 안의 `detectLocale()` 이 그대로 유지한다.
 */
export function useLocale(): RuntimeLocale {
  const pathLocale = localeFromPathname(usePathname());
  const [locale, setLocale] = useState<RuntimeLocale>(pathLocale);

  useEffect(() => {
    setLocale(detectLocale());
    const onLocaleChange = () => setLocale(detectLocale());
    window.addEventListener("cd:locale-ready", onLocaleChange);
    return () => window.removeEventListener("cd:locale-ready", onLocaleChange);
  }, [pathLocale]);

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
