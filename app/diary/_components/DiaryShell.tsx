"use client";

import { useEffect, useState, type ReactNode } from "react";

import DiaryBottomNav from "./DiaryBottomNav";
import DiaryStoreProvider from "./DiaryStoreProvider";
import DiaryTopBar from "./DiaryTopBar";
import { formatKoreanDate, kstTodayYmd } from "../_lib/kst-date";
import styles from "../_styles/diary.module.css";

/**
 * 다이어리 셸. 레이아웃이 이것을 보유하므로 탭을 옮겨도 언마운트되지 않는다
 * (PR-B 의 localStorage 하이드레이션이 탭 전환마다 재실행되지 않게 하는 것이 목적이다).
 *
 * 🔴 `.shell` 에 transform / filter / backdrop-filter / contain 을 넣지 않는다 —
 * 시트를 포털 없이 `position:fixed` 로 덮으려면 조상에 containing block 이 없어야 한다.
 * 🔴 스크롤러는 body 다. 내부 div 스크롤러를 만들면 `app/_lib/body-scroll-lock.ts` 의
 * 정본 락이 무효가 되고 새 락을 만들게 된다(원칙 6).
 */
export default function DiaryShell({ children }: { children: ReactNode }) {
  // 🔴 날짜는 이펙트에서 채운다 — `output:"export"` 는 빌드 시각에 프리렌더하므로 렌더 중에
  // 오늘을 계산하면 배포일과 열람일이 다를 때 하이드레이션 불일치가 난다.
  // 저장소·운기 스냅샷은 같은 이유로 `DiaryStoreProvider` 가 이펙트에서 한 번만 읽는다.
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(formatKoreanDate(kstTodayYmd()));
  }, []);

  return (
    <div className={styles.shell}>
      <DiaryTopBar subtitle={today || undefined} />
      {/* 🔴 하단바도 provider 안이다 — ＋ 퀵캡처가 오늘 스냅샷과 저장 함수를 쓴다(PR-E). */}
      <DiaryStoreProvider>
        <main className={styles.main}>{children}</main>
        <DiaryBottomNav />
      </DiaryStoreProvider>
    </div>
  );
}
