import type { Metadata } from "next";

import DiaryShell from "./_components/DiaryShell";

const DIARY_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "운기 다이어리 | 코드 데스티니",
    description: "오늘의 운기를 보고 계획·기록·회고를 한 곳에 남기는 개인 다이어리입니다.",
  },
  en: {
    title: "Fortune Diary | Code Destiny",
    description: "A private diary that keeps your daily fortune, plans, entries, and reflections in one place.",
  },
} as const;

const diaryLayoutCopy = DIARY_LAYOUT_TEXT_TRANSLATIONS.ko;

/**
 * 🔴 canonical 을 넣지 않는다 — `app/points/history/layout.tsx`(짝 구현)는 canonical 을 두지만
 * 그쪽은 색인 대상 근처의 계정 화면이고, `/diary` 는 사이트맵·색인에서 완전히 빠지는 개인 화면이다.
 * noindex 와 self-canonical 을 함께 보내면 크롤러에 모순 신호가 되므로 여기서는 robots 만 둔다.
 *
 * noindex 는 한 곳만 고치면 GSC 「제출된 URL에 noindex」가 난다. 함께 봐야 하는 5면:
 *   scripts/generate-sitemap.mjs 의 noindexPathPrefixes
 *   lib/seo/siteSeo.ts 의 noindexPathPrefixes
 *   리포 루트 _headers (🔴 public/_headers 는 sync:public 사본이다)
 *   app/components/adsense-route-policy.js 의 BLOCKED_PREFIXES
 *   scripts/verify-adsense-readiness.mjs 의 xRobotsNoindexHeaderPatterns
 */
export const metadata: Metadata = {
  title: diaryLayoutCopy.title,
  description: diaryLayoutCopy.description,
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return <DiaryShell>{children}</DiaryShell>;
}
