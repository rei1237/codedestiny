'use client';

// guidedFlow 네임스페이스 번역. ko 는 정적 import(첫 화면에 MISSING_TEXT 가 보이지 않게),
// 다른 로케일은 useT 가 /i18n/<lang>/guidedFlow.json 을 읽는다(FirstVisitGuide 와 같은 방식).
import { useCallback } from 'react';
import koGuided from '@/public/i18n/ko/guidedFlow.json';
import { interpolate } from '@/lib/i18n/dictionary';
import { useLocale, useT } from '@/lib/i18n/useT';

function lookup(source: unknown, key: string): string {
  let node: unknown = source;
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object') return '';
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : '';
}

export function useGuidedT() {
  const locale = useLocale();
  const translate = useT('guidedFlow');
  return useCallback(
    (key: string, vars?: Record<string, unknown>) =>
      locale === 'ko' ? interpolate(lookup(koGuided.guidedFlow, key), vars) : translate(`guidedFlow.${key}`, vars),
    [locale, translate],
  );
}
