/**
 * 확장 기록(일정·할 일)의 화면 쪽 시야. 🔴 저장소 접근은 `lib/diary/diary-ext-store.js`
 * 계약 하나를 거친다 — 제 손으로 키를 열면 `__tests__/ui/diary-store-roundtrip.test.js` 의
 * 확장 케이스 밖으로 나간다.
 *
 * 🔴 셸 모달이 공유하는 v2 필드(`./today-snapshot`)와 **자리가 다르다**. 여기 있는 것은
 * `/diary` 만 쓰는 신규 키라 셸이 읽지도 쓰지도 않는다 — 그래서 셸과의 필드 대응을 맞출
 * 필요가 없는 대신, 셸 쪽 필드를 여기로 옮겨 오지도 않는다.
 *
 * 리더는 하나다 — 하이드레이션 때 `DiaryStoreProvider` 가 한 번 읽어 스냅샷으로 들고 있고,
 * 화면은 그 맵에서 날짜로 꺼내 본다(달력이 날짜마다 저장소를 다시 열지 않게).
 */

import { readAllExtDays } from "@/lib/diary/diary-ext-store";

/** 시간이 정해진 것. `at` 은 `HH:MM` 이고, 비어 있으면 시간 미정이다. */
export interface DiaryScheduleItem {
  id?: string;
  at?: string;
  text?: string;
  createdAt?: number;
}

/** 오늘 끝낼 것. 완료는 항목 안의 `done` 하나로만 판정한다(별도 완료 목록을 두지 않는다). */
export interface DiaryTodoItem {
  id?: string;
  text?: string;
  done?: boolean;
  createdAt?: number;
}

/** 하루치 확장 기록. 🔴 뒤 PR 이 같은 객체에 필드를 더한다 — 모르는 키는 저장소에 그대로 남는다. */
export interface DiaryExtDay {
  schedules?: DiaryScheduleItem[];
  todos?: DiaryTodoItem[];
  /** 그날의 태그. 문자열 배열이다 — 태그에 id 나 색을 두지 않는다(이름이 곧 동일성이다). */
  tags?: string[];
  updatedAt?: string;
}

/** 태그 하나의 최대 길이. 필터 칩이 한 줄에 앉는 폭이 상한의 근거다. */
export const DIARY_TAG_TEXT_MAX = 12;

/** 하루에 달 수 있는 태그 수. 넘으면 더 받지 않는다(태그가 본문을 밀어내지 않게). */
export const DIARY_TAG_MAX_PER_DAY = 8;

/** 날짜 키 → 확장 기록. 월 샤드를 편 결과다(샤드 경계는 저장에서만 의미가 있다). */
export type DiaryExtStore = Record<string, DiaryExtDay>;

export const EMPTY_DIARY_EXT_STORE: DiaryExtStore = {};

/** 저장된 확장 기록을 한 번에 읽는다. 브라우저에서만 부른다(정적 export 는 빌드 때 프리렌더된다). */
export function readDiaryExtDays(): DiaryExtStore {
  if (typeof window === "undefined") return {};
  try {
    return readAllExtDays(window.localStorage) as DiaryExtStore;
  } catch {
    return {};
  }
}

/** 하루치를 있는 그대로 꺼낸다. 기록이 없으면 `null` 이다(빈 껍데기를 만들지 않는다). */
export function readExtDay(ext: DiaryExtStore, ymd: string): DiaryExtDay | null {
  const day = ext?.[ymd];
  return day && typeof day === "object" ? day : null;
}

/**
 * 화면에 그릴 일정 목록. 🔴 정렬은 여기 한 곳이다 — 저장 순서는 적은 순서라,
 * 홈과 Day View 가 각자 정렬하면 같은 하루가 두 화면에서 다른 순서로 보인다.
 * 시간 미정은 시간이 정해진 것 뒤에 둔다(그날의 시간축을 먼저 읽게).
 */
export function readSchedules(day: DiaryExtDay | null): DiaryScheduleItem[] {
  const items = (day?.schedules || []).filter((item) => item?.text);
  return [...items].sort((a, b) => {
    const at = a.at || "";
    const bt = b.at || "";
    if (at !== bt) {
      if (!at) return 1;
      if (!bt) return -1;
      return at < bt ? -1 : 1;
    }
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

/** 화면에 그릴 할 일 목록. 완료한 것을 아래로 내리지 않는다 — 줄이 움직이면 잘못 누른다. */
export function readTodos(day: DiaryExtDay | null): DiaryTodoItem[] {
  return (day?.todos || []).filter((item) => item?.text);
}

/**
 * 화면에 그릴 태그 목록. 🔴 정렬하지 않는다 — 사용자가 단 순서가 그 하루의 순서다.
 * 빈 값·문자열이 아닌 값은 걸러 낸다(저장소는 손으로도 고쳐질 수 있다).
 */
export function readTags(day: DiaryExtDay | null): string[] {
  const items = Array.isArray(day?.tags) ? day.tags : [];
  return items.filter((tag): tag is string => typeof tag === "string" && tag.length > 0);
}

/** 할 일 진행도. 성취 바가 루틴 진행도와 합산해 쓴다(`./today-snapshot` 의 `readAchievement`). */
export function readTodoProgress(day: DiaryExtDay | null): { done: number; total: number } {
  const todos = readTodos(day);
  return { done: todos.filter((item) => item.done === true).length, total: todos.length };
}
