"use client";

import DiaryStoreProvider from "@/app/diary/_components/DiaryStoreProvider";
import ForestGate from "./forest/ForestGate";

/** 공개 홈의 개인화 영역만 기존 다이어리 저장소와 연결한다. */
export default function HomeDailyEntry() {
  return <DiaryStoreProvider><ForestGate /></DiaryStoreProvider>;
}
