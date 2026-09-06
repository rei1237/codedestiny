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
import {
  readDiaryExtDays,
  type DiaryExtDay,
  type DiaryExtStore,
} from "../_lib/ext-snapshot";
import { kstTodayYmd } from "../_lib/kst-date";
import { updateDiaryEntry } from "@/lib/diary/diary-store";
import { updateExtDay as updateExtDayInStore } from "@/lib/diary/diary-ext-store";
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
  /**
   * `/diary` 전용 확장 기록(일정·할 일). 저장 키가 v2 와 갈려 있어 셸 모달은 이것을 보지 않는다.
   * 🔴 v2 스냅샷과 같은 이유로 전체를 들고 있는다 — 달력이 날짜마다 저장소를 다시 열면
   * 리더가 둘이 된다(원칙 6).
   */
  ext: DiaryExtStore;
}

/** 엔트리를 제자리에서 고치는 함수. 🔴 아는 필드만 건드린다(통째 교체 금지). */
export type DiaryEntryMutate = (entry: DiaryLegacyEntry) => void;

/** 확장 하루치를 제자리에서 고치는 함수. 같은 이유로 아는 필드만 건드린다. */
export type DiaryExtDayMutate = (day: DiaryExtDay) => void;

interface DiaryWriterValue {
  /** 성공하면 true. 날짜가 비었거나 저장소가 가득 차면 false 다. */
  updateEntry: (ymd: string, mutate: DiaryEntryMutate) => boolean;
  /** 확장 기록(일정·할 일) 쓰기. 반환 규칙은 `updateEntry` 와 같다. */
  updateExtDay: (ymd: string, mutate: DiaryExtDayMutate) => boolean;
  /**
   * 저장소를 통째로 다시 읽는다. 🔴 **쓰기 진입점 두 개를 거치지 않은 변경**(백업 불러오기·
   * 기록 전체 삭제)이 날짜 수백 개를 한 번에 바꾸므로, 그때만 부른다.
   * 🔴 새로고침으로 때우지 않는 이유는 하이드레이션 경로가 둘이 되기 때문이다 — 다시 읽는
   * 코드는 최초 하이드레이션과 **같은 한 줄**이어야 한다(원칙 6).
   */
  refresh: () => void;
}

const INITIAL_STATE: DiaryTodayState = {
  ...EMPTY_DIARY_TODAY_SNAPSHOT,
  hydrated: false,
  ext: {},
};

const DiaryTodayContext = createContext<DiaryTodayState>(INITIAL_STATE);
const DiaryWriterContext = createContext<DiaryWriterValue>({
  updateEntry: () => false,
  updateExtDay: () => false,
  refresh: () => {},
});

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

  /* 🔴 하이드레이션과 재읽기가 같은 한 줄을 부른다 — 갈리면 백업을 불러온 뒤의 화면과
     새로고침한 화면이 서로 다른 것을 그리게 된다. */
  const refresh = useCallback(() => {
    setState({ ...readDiaryTodaySnapshot(kstTodayYmd()), ext: readDiaryExtDays(), hydrated: true });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  /* 확장 기록도 쓰기 진입점은 하나다. 🔴 저장 뒤 화면 상태는 **저장의 결과**로 갈아 끼운다 —
     `updateExtDay` 가 그 달 샤드를 다시 읽어 병합하므로, 화면이 들고 있던 사본은 입력이 아니다. */
  const updateExtDay = useCallback((ymd: string, mutate: DiaryExtDayMutate) => {
    if (typeof window === "undefined" || !ymd) return false;

    let next: DiaryExtStore | null = null;
    try {
      next = updateExtDayInStore(window.localStorage, ymd, mutate) as DiaryExtStore | null;
    } catch {
      next = null;
    }
    if (!next) {
      setSaveFailed(true);
      return false;
    }

    const saved = next;
    setSaveFailed(false);
    setState((current) => ({ ...current, ext: saved }));
    return true;
  }, []);

  const writer = useMemo<DiaryWriterValue>(
    () => ({ updateEntry, updateExtDay, refresh }),
    [updateEntry, updateExtDay, refresh],
  );

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
