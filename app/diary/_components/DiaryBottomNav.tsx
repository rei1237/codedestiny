"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "../_styles/diary.module.css";

/**
 * 다이어리 자체 하단바. 사이트 공용 `MobileBottomNav` 는 `/diary` 에서 렌더 자체가 되지 않는다
 * (`AppChrome.tsx` 의 `CHROMELESS_ROUTES` + `FEATURE_NAV_SELF_MANAGED_ROUTES` 양쪽 등록).
 * 🔴 그래서 `--cd-mnav-offset` 을 참조하면 안 된다 — `styles/mobile-bottom-nav.css` 가 전역
 * import 라 값은 해석되지만 그 바가 없어 80px 유령 띠만 남는다.
 *
 * 공용 탭바에 6번째 탭을 추가하지 않는 이유: `app/_lib/mobile-tabs.ts` + 셸 7벌 손 미러 +
 * `verify:mobile-bottom-nav-sync` + 12자 라벨 상한을 동시에 흔들고, 개인 앱 탭을 사이트 전역
 * 탭바에 넣는 것은 IA 오류다.
 */

const DIARY_NAV_TEXT = {
  ko: {
    home: "오늘",
    calendar: "달력",
    capture: "기록 추가",
    records: "기록",
    more: "더보기",
    pending: "준비 중입니다",
  },
  en: {
    home: "Today",
    calendar: "Calendar",
    capture: "Add entry",
    records: "Entries",
    more: "More",
    pending: "Coming soon",
  },
} as const;

const copy = DIARY_NAV_TEXT.ko;

interface DiaryNavTab {
  key: string;
  href: string;
  icon: string;
  label: string;
  /** 해당 PR 에서 화면이 생기면 true 로 바꾼다. false 면 링크가 아니라 비활성 표시다. */
  ready: boolean;
}

/** ＋ 는 라우트가 아니라 퀵캡처 시트 액션이다(PR-E). */
export const DIARY_NAV_TABS: readonly DiaryNavTab[] = [
  { key: "home", href: "/diary/", icon: "☀", label: copy.home, ready: true },
  { key: "calendar", href: "/diary/calendar/", icon: "▦", label: copy.calendar, ready: true },
  { key: "records", href: "/diary/records/", icon: "✎", label: copy.records, ready: false },
  { key: "more", href: "/diary/more/", icon: "⋯", label: copy.more, ready: false },
];

const stripSlash = (value: string) => (value.length > 1 ? value.replace(/\/+$/, "") : value);

export default function DiaryBottomNav() {
  const pathname = usePathname() || "/diary";
  const current = stripSlash(pathname);

  const renderTab = (tab: DiaryNavTab) => {
    const isCurrent = stripSlash(tab.href) === current;
    if (!tab.ready) {
      return (
        <span
          key={tab.key}
          className={styles.navItem}
          aria-disabled="true"
          title={`${tab.label} — ${copy.pending}`}
        >
          <span className={styles.navIcon} aria-hidden="true">
            {tab.icon}
          </span>
          {tab.label}
        </span>
      );
    }
    return (
      <Link
        key={tab.key}
        href={tab.href}
        className={styles.navItem}
        aria-current={isCurrent ? "page" : undefined}
      >
        <span className={styles.navIcon} aria-hidden="true">
          {tab.icon}
        </span>
        {tab.label}
      </Link>
    );
  };

  return (
    <nav className={styles.bottomNav} aria-label={copy.home}>
      {DIARY_NAV_TABS.slice(0, 2).map(renderTab)}
      <span
        className={`${styles.navItem} ${styles.navCapture}`}
        aria-disabled="true"
        title={`${copy.capture} — ${copy.pending}`}
      >
        <span className={styles.navCaptureDot} aria-hidden="true">
          ＋
        </span>
      </span>
      {DIARY_NAV_TABS.slice(2).map(renderTab)}
    </nav>
  );
}
