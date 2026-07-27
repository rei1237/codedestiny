/**
 * 서버 컴포넌트용 번역 접근자 (빌드타임).
 *
 * 🔴 왜 클라이언트 useT() 로 통일하면 안 되는가.
 * scripts/verify-adsense-readiness.mjs 는 빌드 산출물 HTML 의 **서버 렌더된 텍스트**
 * 분량을 센다(`<script>/<style>/<svg>` 제거 후 태그 텍스트 합산). 비-AdSense 색인
 * 라우트는 1,800자, AdSense 라우트는 1,200자를 요구하고 미달이면 **배포가 실패**한다.
 * 본문을 클라이언트 훅으로 옮기면 서버 HTML 이 비어 이 게이트에 걸린다.
 *
 * 그래서 서버 렌더 본문은 여기서 빌드타임에 값을 박는다. 사전을 정적 import 하므로
 * 클라이언트 번들에는 실리지 않는다(정적 export 시 결과 HTML 에만 남는다).
 *
 * 사용:
 *   const t = getContent("ja", "saju");
 *   <p>{t("intro.pillars")}</p>
 */
import koDictionary from "@/public/i18n/ko.json";
import enDictionary from "@/public/i18n/en.json";
import jaDictionary from "@/public/i18n/ja.json";
import zhDictionary from "@/public/i18n/zh-cn.json";

import { type Dictionary, type RuntimeLocale, resolveKey, normalizeLocale } from "./dictionary";

/**
 * 빌드타임에 정적으로 실을 로케일. 경로 세그먼트를 가진 4개(ko//ja//zh//en)만이
 * 서버 렌더 대상이다. 나머지 8개는 색인하지 않고 런타임 전환만 지원하므로
 * 여기에 넣지 않는다 — 넣으면 빌드 산출물만 불어난다.
 */
const BUILD_TIME_DICTIONARIES: Partial<Record<RuntimeLocale, Dictionary>> = {
  ko: koDictionary as Dictionary,
  en: enDictionary as Dictionary,
  ja: jaDictionary as Dictionary,
  "zh-CN": zhDictionary as Dictionary,
};

/** App Router 의 `[locale]` 세그먼트(ko|ja|zh|en) → 런타임 로케일 */
export function localeFromSegment(segment?: string): RuntimeLocale {
  return normalizeLocale(segment);
}

export type ContentReader = (key: string, vars?: Record<string, unknown> | null) => string;

export function getContent(locale: RuntimeLocale | string, namespace?: string): ContentReader {
  const normalized = normalizeLocale(String(locale));
  const dictionary = BUILD_TIME_DICTIONARIES[normalized] ?? BUILD_TIME_DICTIONARIES.ko ?? null;
  const scoped = namespace
    ? ((dictionary?.[namespace] as Dictionary | undefined) ?? null)
    : dictionary;
  return (key, vars) => resolveKey(scoped, key, normalized, vars);
}
