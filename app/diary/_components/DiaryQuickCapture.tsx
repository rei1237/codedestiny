"use client";

import { useEffect } from "react";

import DiaryEntryFields from "./DiaryEntryFields";
import { useDiaryToday } from "./DiaryStoreProvider";
import { formatKoreanDate } from "../_lib/kst-date";
import styles from "../_styles/diary.module.css";

/**
 * 하단바 ＋ 가 여는 퀵캡처 시트. **오늘 하루**에만 쓴다 — 다른 날에 쓰는 자리는 달력의 Day View 다.
 *
 * 🔴 Day View 와 같은 규칙으로 만든다 — 스크림도 바디 스크롤 락도 걸지 않는다
 * (`app/_lib/body-scroll-lock.ts` 가 이 레포의 락 정본이고, 여기에 두 번째 락을 만들지 않는다).
 * 🔴 저장 버튼이 없으므로 닫기는 취소가 아니다 — 적은 것은 이미 저장되어 있다.
 */

const DIARY_QUICK_CAPTURE_TEXT = {
  ko: { title: "기록 추가", close: "닫기", loading: "오늘의 기록을 불러오는 중입니다." },
  en: { title: "Add entry", close: "Close", loading: "Loading today's entry." },
} as const;

const copy = DIARY_QUICK_CAPTURE_TEXT.ko;

export default function DiaryQuickCapture({ onClose }: { onClose: () => void }) {
  const { hydrated, ymd, entry } = useDiaryToday();

  // 🔴 여는 순간 첫 칸에 초점이 간다(`DiaryEntryFields autoFocus`) — 닫기 버튼으로 초점을
  // 옮기면 열자마자 쓰려던 사람이 한 번 더 눌러야 한다.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <aside className={styles.sheet} aria-label={copy.title}>
      <span className={styles.sheetHandle} aria-hidden="true" />
      <header className={styles.sheetHead}>
        <h2 className={styles.sheetTitle}>
          {hydrated && ymd ? formatKoreanDate(ymd) : copy.title}
        </h2>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onClose}
          aria-label={copy.close}
        >
          ✕
        </button>
      </header>

      <div className={styles.dvPanel}>
        {hydrated && ymd ? (
          <DiaryEntryFields ymd={ymd} entry={entry} autoFocus />
        ) : (
          <p className={styles.empty}>{copy.loading}</p>
        )}
      </div>
    </aside>
  );
}
