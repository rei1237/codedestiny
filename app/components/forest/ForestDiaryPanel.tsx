"use client";

import { useDailyJourney } from "./useDailyJourney";
import ForestWalk from "./ForestWalk";

/** `/diary/` 안에 놓는 숲길. 저장소는 다이어리 레이아웃의 Provider 를 그대로 쓴다. */
export default function ForestDiaryPanel() {
  const journey = useDailyJourney({ surface: "diary", enabled: true });
  return <ForestWalk mode="inline" journey={journey} />;
}
