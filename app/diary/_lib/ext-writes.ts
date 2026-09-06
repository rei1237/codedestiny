/**
 * 확장 기록 변경 함수 모음. `useDiaryWriter().updateExtDay(ymd, …)` 에 넘기는 것들이다.
 *
 * 🔴 여기 있는 함수는 **자기가 아는 필드만** 건드린다. 하루치 객체를 새로 만들어 갈아끼우면
 * 뒤 PR 이 같은 날짜에 더한 필드가 그 자리에서 사라진다(`lib/diary/diary-ext-store.js` 머리 주석).
 *
 * 🔴 셸 모달이 쓰는 v2 필드는 여기서 만지지 않는다 — 그쪽은 `./entry-writes.ts` 다. 한 화면에서
 * 두 저장 자리를 섞어 쓰면, 어느 것이 셸과 공유되는 값인지가 호출부마다 갈린다.
 */

import { createExtItemId, DIARY_EXT_TEXT_MAX } from "@/lib/diary/diary-ext-store";
import type { DiaryExtDayMutate } from "../_components/DiaryStoreProvider";
import { DIARY_TAG_MAX_PER_DAY, DIARY_TAG_TEXT_MAX } from "./ext-snapshot";

/** 입력을 저장 형태로 다듬는다. 빈 글자는 항목을 만들지 않는다(빈 줄이 목록에 쌓이지 않게). */
export function normalizePlanText(text: string): string {
  return text.trim().slice(0, DIARY_EXT_TEXT_MAX);
}

/** `HH:MM` 만 통과시킨다. 그 밖은 시간 미정으로 둔다(브라우저마다 시간 입력 값이 다르다). */
export function normalizePlanTime(at: string): string {
  return /^\d{2}:\d{2}$/.test(at) ? at : "";
}

/** 일정 추가. 시간은 비워 둘 수 있다 — 시간이 정해지지 않은 약속도 그날의 일정이다. */
export function addSchedule(at: string, text: string): DiaryExtDayMutate {
  return (day) => {
    const items = Array.isArray(day.schedules) ? day.schedules : [];
    day.schedules = [
      ...items,
      {
        id: createExtItemId(),
        at: normalizePlanTime(at),
        text: normalizePlanText(text),
        createdAt: Date.now(),
      },
    ];
  };
}

/** 할 일 추가. */
export function addTodo(text: string): DiaryExtDayMutate {
  return (day) => {
    const items = Array.isArray(day.todos) ? day.todos : [];
    day.todos = [
      ...items,
      { id: createExtItemId(), text: normalizePlanText(text), done: false, createdAt: Date.now() },
    ];
  };
}

/** 할 일 완료 토글. 항목 안의 `done` 하나만 뒤집는다(완료 목록을 따로 두지 않는다). */
export function toggleTodo(id: string): DiaryExtDayMutate {
  return (day) => {
    const items = Array.isArray(day.todos) ? day.todos : [];
    day.todos = items.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
  };
}

/** 항목 삭제. id 로만 지운다 — 목록 인덱스로 지우면 정렬된 화면 순서와 저장 순서가 달라 엉뚱한 줄이 사라진다. */
export function removeSchedule(id: string): DiaryExtDayMutate {
  return (day) => {
    const items = Array.isArray(day.schedules) ? day.schedules : [];
    day.schedules = items.filter((item) => item.id !== id);
  };
}

export function removeTodo(id: string): DiaryExtDayMutate {
  return (day) => {
    const items = Array.isArray(day.todos) ? day.todos : [];
    day.todos = items.filter((item) => item.id !== id);
  };
}

/**
 * 태그를 저장 형태로 다듬는다. 🔴 정규화가 여기 하나여야 한다 — 입력과 필터가 다른 규칙을 쓰면
 * 「산책」과 「산책 」이 다른 태그가 되어 필터에 걸리지 않는 날이 생긴다.
 * 앞뒤 공백만 없앤다(가운데 공백은 살린다 — 「아침 산책」은 한 태그다).
 */
export function normalizeTag(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, DIARY_TAG_TEXT_MAX);
}

/** 태그 추가. 같은 태그를 두 번 담지 않고, 하루 상한을 넘기면 아무것도 하지 않는다. */
export function addTag(text: string): DiaryExtDayMutate {
  return (day) => {
    const tag = normalizeTag(text);
    if (!tag) return;
    const items = Array.isArray(day.tags) ? day.tags : [];
    if (items.includes(tag) || items.length >= DIARY_TAG_MAX_PER_DAY) return;
    day.tags = [...items, tag];
  };
}

/** 태그 삭제. 이름이 곧 동일성이라 이름으로 지운다. */
export function removeTag(text: string): DiaryExtDayMutate {
  return (day) => {
    const items = Array.isArray(day.tags) ? day.tags : [];
    day.tags = items.filter((tag) => tag !== text);
  };
}
