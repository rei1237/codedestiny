"use client";

import { type ReactNode } from "react";

import DiaryAudioProvider from "@/app/diary/_components/DiaryAudioProvider";
import DiaryBottomNav from "@/app/diary/_components/DiaryBottomNav";
import DiaryStoreProvider from "@/app/diary/_components/DiaryStoreProvider";
import styles from "@/app/diary/_styles/diary.module.css";
import ProfileDiaryBridge from "./ProfileDiaryBridge";

/** 운기 기록은 프로필 시트가 제목과 닫기를 소유하므로 독립 상단바를 렌더하지 않는다. */
export default function ProfileDiaryShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.shell} ${styles.profileEmbed}`} data-profile-diary-root="">
      <ProfileDiaryBridge />
      <DiaryStoreProvider>
        <DiaryAudioProvider>
          <main className={styles.main}>{children}</main>
          <DiaryBottomNav />
        </DiaryAudioProvider>
      </DiaryStoreProvider>
    </div>
  );
}
