"use client";

import { useEffect } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type RouteMetadataEntry = {
  title?: string;
  description?: string;
};

/**
 * 🔴 이 라우트들은 미들웨어 없이 서버에서 로케일을 알 방법이 없어 title/meta description 태그가
 * 항상 한국어로 렌더된다(SSR·크롤러 기준). 이미 준비돼 있던 로케일별 title/description을
 * 화면에 반영하려고 서버 렌더를 동적으로 바꾸는 대신, LocaleRuntimeBridge 가 이미 하는 것과
 * 같은 방식으로 하이드레이션 후 document 를 갱신한다 — 크롤러/소셜 공유 미리보기는 항상
 * 서버가 렌더한 한국어 canonical 값을 그대로 보므로(hreflang 미비 상태에서 더 안전),
 * 실사용자 브라우저 탭/설명만 로케일에 맞게 바뀐다.
 */
export type RouteMetadataByLocale = Partial<Record<"ko" | "en" | "ja" | "zh", RouteMetadataEntry>>;

function pickEntry(entries: RouteMetadataByLocale, locale: LoadingLocale): RouteMetadataEntry | null {
  if (locale === "ko") return entries.ko || null;
  if (locale === "ja") return entries.ja || entries.en || null;
  if (locale === "zh-CN" || locale === "zh-TW") return entries.zh || entries.en || null;
  // en 과 아직 실번역이 없는 나머지 로케일(vi/hi/es/fr/de/nl/ms) 전부 영어로 채운다.
  return entries.en || null;
}

function applyEntry(entry: RouteMetadataEntry | null) {
  if (!entry) return;
  if (entry.title) document.title = entry.title;
  if (entry.description) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", entry.description);
  }
}

export default function RouteMetadataLocaleSync({ entries }: { entries: RouteMetadataByLocale }) {
  useEffect(() => {
    const sync = () => applyEntry(pickEntry(entries, getCurrentLoadingLocale()));
    sync();
    window.addEventListener("cd:locale-ready", sync);
    window.addEventListener("cd:locale-change", sync);
    return () => {
      window.removeEventListener("cd:locale-ready", sync);
      window.removeEventListener("cd:locale-change", sync);
    };
  }, [entries]);

  return null;
}
