"use client";

import DiaryStoreProvider from "@/app/diary/_components/DiaryStoreProvider";
import HomeDaily from "./HomeDaily";

/** 공개 홈의 개인화 영역만 기존 다이어리 저장소와 연결한다. */
export default function HomeDailyEntry() {
  return <DiaryStoreProvider><HomeDaily surface="home" /></DiaryStoreProvider>;
}
