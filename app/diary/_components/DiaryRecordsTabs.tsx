"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "../_styles/diary.module.css";

/**
 * 기록 화면 머리의 「목록 · 통계」 세그먼트. 두 페이지가 함께 쓴다.
 *
 * 🔴 하단바에 5번째 탭을 만들지 않는다(승인본 결정 1) — 통계가 세는 대상이 곧 기록 목록이라
 * 두 화면이 한 쌍이고, 탭을 늘리면 `DiaryBottomNav` 의 4탭 배치(＋ 를 가운데 두는 3+1)가 깨진다.
 * 그래서 `/diary/stats/` 에서도 하단바는 「기록」이 활성인 채로 둔다.
 *
 * 🔴 활성 판정은 `usePathname` 하나로 한다 — 하단바와 같은 방식이라(`DiaryBottomNav:62`)
 * 뒤 슬래시가 있든 없든 같은 칸이 켜진다.
 */

const DIARY_RECORDS_TABS_TEXT = {
  ko: { label: "기록 보기 방식", list: "목록", stats: "통계" },
  en: { label: "Entry view", list: "List", stats: "Stats" },
} as const;

const copy = DIARY_RECORDS_TABS_TEXT.ko;

const TABS = [
  { key: "list", href: "/diary/records/", label: copy.list },
  { key: "stats", href: "/diary/stats/", label: copy.stats },
] as const;

const stripSlash = (value: string) => (value.length > 1 ? value.replace(/\/+$/, "") : value);

export default function DiaryRecordsTabs() {
  const current = stripSlash(usePathname() || "/diary/records");

  return (
    <nav className={styles.segment} aria-label={copy.label}>
      {TABS.map((tab) => {
        const isCurrent = stripSlash(tab.href) === current;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={isCurrent ? styles.segmentItemOn : styles.segmentItem}
            aria-current={isCurrent ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
