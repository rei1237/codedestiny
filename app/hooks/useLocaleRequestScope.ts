"use client";

import { useCallback, useEffect, useRef } from "react";
import { toAiLocale } from "@/lib/i18n/ai-locale";
import { detectLocale } from "@/lib/i18n/dictionary";

export type LocaleRequestScope = { locale: string; isCurrent: () => boolean };

/** UI 응답의 수명만 관리한다. 결제 키와 저장된 결과의 언어는 바꾸지 않는다. */
export function useLocaleRequestScope(onChange: () => void) {
  const epoch = useRef(0);
  const currentLocale = useRef(toAiLocale(detectLocale()));
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const sync = () => {
      const next = toAiLocale(detectLocale());
      if (next === currentLocale.current) return;
      currentLocale.current = next;
      epoch.current += 1;
      onChangeRef.current();
    };
    sync();
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      epoch.current += 1;
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);

  return useCallback((): LocaleRequestScope => {
    const generation = epoch.current;
    const locale = toAiLocale(detectLocale());
    return {
      locale,
      isCurrent: () => generation === epoch.current && locale === toAiLocale(detectLocale()),
    };
  }, []);
}
