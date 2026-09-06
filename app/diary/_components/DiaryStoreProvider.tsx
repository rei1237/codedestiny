"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  EMPTY_DIARY_TODAY_SNAPSHOT,
  readDiaryTodaySnapshot,
  type DiaryLegacyEntry,
  type DiaryLegacyStore,
  type DiaryTodaySnapshot,
} from "../_lib/today-snapshot";
import { kstTodayYmd } from "../_lib/kst-date";
import { updateDiaryEntry } from "@/lib/diary/diary-store";
import styles from "../_styles/diary.module.css";

/**
 * 저장소·운기 하이드레이션을 **한 번만** 한다. 셸(레이아웃)이 이것을 보유하므로 탭을 옮겨도
 * 다시 읽지 않는다. 쓰기 진입점도 여기 하나다.
 *
 * 🔴 읽기는 이펙트에서 한다 — `next.config.mjs` 가 프로덕션에서 `output:"export"` 라
 * 첫 렌더는 빌드 시각에 프리렌더된다. 렌더 중에 localStorage 나 오늘 날짜를 보면
 * 하이드레이션 불일치가 난다. 그래서 카드들은 `hydrated` 가 false 인 동안 빈 상태를 그린다.
 *
 * 🔴 저장은 **화면이 들고 있는 스냅샷을 쓰지 않는다** — `updateDiaryEntry` 가 그때그때
 * 저장소를 다시 읽어 해당 날짜만 병합한다. 셸 모달이 그사이 저장한 값을 덮어쓰지 않으려는 것이고,
 * 그래서 화면 상태는 저장의 입력이 아니라 **결과**다(쓰고 나서 새 저장소로 갈아 끼운다).
 * 🔴 저장 뒤에도 원국 차트·운기는 다시 만들지 않는다 — 차트는 차트당 1회여야 하고
 * (`fortune-adapter.ts:91`), 기록이 바뀐다고 그날의 결이 바뀌지도 않는다.
 */

interface DiaryTodayState extends DiaryTodaySnapshot {
  hydrated: boolean;
}

/** 엔트리를 제자리에서 고치는 함수. 🔴 아는 필드만 건드린다(통째 교체 금지). */
export type DiaryEntryMutate = (entry: DiaryLegacyEntry) => void;

interface DiaryWriterValue {
  /** 성공하면 true. 날짜가 비었거나 저장소가 가득 차면 false 다. */
  updateEntry: (ymd: string, mutate: DiaryEntryMutate) => boolean;
}

const INITIAL_STATE: DiaryTodayState = { ...EMPTY_DIARY_TODAY_SNAPSHOT, hydrated: false };

const DiaryTodayContext = createContext<DiaryTodayState>(INITIAL_STATE);
const DiaryWriterContext = createContext<DiaryWriterValue>({ updateEntry: () => false });

export function useDiaryToday(): DiaryTodayState {
  return useContext(DiaryTodayContext);
}

export function useDiaryWriter(): DiaryWriterValue {
  return useContext(DiaryWriterContext);
}

const DIARY_SAVE_NOTICE = {
  ko: { failed: "저장 공간이 가득 차 저장하지 못했습니다. 오래된 기록을 정리한 뒤 다시 시도해 주세요." },
  en: { failed: "Storage is full, so this was not saved. Free up space and try again." },
} as const;

const copy = DIARY_SAVE_NOTICE.ko;

export default function DiaryStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DiaryTodayState>(INITIAL_STATE);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setState({ ...readDiaryTodaySnapshot(kstTodayYmd()), hydrated: true });
  }, []);

  const updateEntry = useCallback((ymd: string, mutate: DiaryEntryMutate) => {
    if (typeof window === "undefined" || !ymd) return false;

    let next: DiaryLegacyStore | null = null;
    try {
      next = updateDiaryEntry(window.localStorage, ymd, mutate) as DiaryLegacyStore | null;
    } catch {
      next = null;
    }
    if (!next) {
      setSaveFailed(true);
      return false;
    }

    const saved = next;
    setSaveFailed(false);
    setState((current) => ({
      ...current,
      store: saved,
      entry: current.ymd ? saved[current.ymd] || current.entry : current.entry,
    }));
    return true;
  }, []);

  const writer = useMemo<DiaryWriterValue>(() => ({ updateEntry }), [updateEntry]);

  return (
    <DiaryTodayContext.Provider value={state}>
      <DiaryWriterContext.Provider value={writer}>
        {children}
        {saveFailed ? (
          <p className={styles.saveNotice} role="status">
            {copy.failed}
          </p>
        ) : null}
      </DiaryWriterContext.Provider>
    </DiaryTodayContext.Provider>
  );
}
