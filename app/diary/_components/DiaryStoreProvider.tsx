"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  EMPTY_DIARY_TODAY_SNAPSHOT,
  readDiaryTodaySnapshot,
  type DiaryTodaySnapshot,
} from "../_lib/today-snapshot";
import { kstTodayYmd } from "../_lib/kst-date";

/**
 * 저장소·운기 하이드레이션을 **한 번만** 한다. 셸(레이아웃)이 이것을 보유하므로 탭을 옮겨도
 * 다시 읽지 않는다.
 *
 * 🔴 읽기는 이펙트에서 한다 — `next.config.mjs` 가 프로덕션에서 `output:"export"` 라
 * 첫 렌더는 빌드 시각에 프리렌더된다. 렌더 중에 localStorage 나 오늘 날짜를 보면
 * 하이드레이션 불일치가 난다. 그래서 카드들은 `hydrated` 가 false 인 동안 빈 상태를 그린다.
 */

interface DiaryTodayState extends DiaryTodaySnapshot {
  hydrated: boolean;
}

const INITIAL_STATE: DiaryTodayState = { ...EMPTY_DIARY_TODAY_SNAPSHOT, hydrated: false };

const DiaryTodayContext = createContext<DiaryTodayState>(INITIAL_STATE);

export function useDiaryToday(): DiaryTodayState {
  return useContext(DiaryTodayContext);
}

export default function DiaryStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DiaryTodayState>(INITIAL_STATE);

  useEffect(() => {
    setState({ ...readDiaryTodaySnapshot(kstTodayYmd()), hydrated: true });
  }, []);

  return <DiaryTodayContext.Provider value={state}>{children}</DiaryTodayContext.Provider>;
}
