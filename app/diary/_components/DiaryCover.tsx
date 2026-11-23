"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useDiaryToday } from "./DiaryStoreProvider";
import { formatKoreanDate } from "../_lib/kst-date";
import styles from "../_styles/diary.module.css";

export default function DiaryCover() {
  const { profileName, ymd } = useDiaryToday();
  return (
      <section className={styles.gardenCover} aria-label="달빛 정원 다이어리">
        <img className={styles.coverCompanion} src="/images/fortune-tea-house/renewal/pig-welcome.webp" width={64} height={64} alt="" />
        <div className="flex min-w-0 items-center gap-2">
          <span className={styles.ownerInitial} aria-hidden="true">{Array.from(profileName)[0] || <UserRound size={16} />}</span>
          <span className={styles.ownerName}>{profileName ? profileName + "님의 다이어리" : "나의 달빛 기록장"}</span>
        </div>
        <h2><time dateTime={ymd}>{ymd ? formatKoreanDate(ymd) : "오늘의 기록"}</time></h2>
        <div className={styles.bookmarks}>
          <a href="#diaryTodayLine">오늘 한 줄 쓰기</a>
          <Link href="/diary/calendar/">달력 펼치기</Link>
          <Link href="/diary/records/">지난 기록 읽기</Link>
        </div>
      </section>
  );
}
