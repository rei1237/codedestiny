"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 글자 입력용 초안 상태. 타자마다 저장하지 않고 **멈춘 뒤 한 번** 저장한다.
 *
 * 왜 디바운스인가: 저장 한 번이 v2 평면 맵 전체를 `JSON.stringify` 한다(계약 그대로다).
 * 타자마다 부르면 기록이 쌓인 기기에서 입력이 끊긴다.
 *
 * 왜 그냥 blur 저장이 아닌가: 다이어리는 적다가 그대로 탭을 닫는 화면이다. 그래서
 * **멈춤(디바운스) · 포커스 이탈 · 언마운트** 세 지점에서 흘려보낸다.
 *
 * 🔴 저장 자체는 여기서 하지 않는다 — `commit` 은 `useDiaryWriter().updateEntry` 로 이어지고,
 * 저장소 접근은 `lib/diary/diary-store.js` 계약 하나를 거친다.
 */

const DIARY_DRAFT_DELAY_MS = 600;

export interface DiaryDraft {
  value: string;
  onChange: (next: string) => void;
  /** 포커스가 빠질 때 부른다 — 기다리지 않고 지금 저장한다. */
  flush: () => void;
}

export function useDiaryDraft(stored: string, commit: (next: string) => void): DiaryDraft {
  const [value, setValue] = useState(stored);

  const valueRef = useRef(value);
  valueRef.current = value;
  /** 마지막으로 저장에 넘긴 값. 저장소 값이 밖에서 바뀐 것과 내가 쓴 것을 구별한다. */
  const committedRef = useRef(stored);
  const commitRef = useRef(commit);
  commitRef.current = commit;
  /* 🔴 타자를 친 시점의 저장 함수를 따로 붙잡아 둔다. 저장 함수는 그 순간 화면이 보여 주던
     날짜에 쓰는데, 600ms 안에 사용자가 다른 날짜를 고르면 최신 함수는 이미 **다른 날**을
     가리킨다 — 그대로 흘려보내면 어제 적은 글이 오늘 칸에 들어간다. */
  const pendingRef = useRef<((next: string) => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (valueRef.current === committedRef.current) return;
    committedRef.current = valueRef.current;
    (pending || commitRef.current)(valueRef.current);
  }, []);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  /* 밖에서 값이 바뀌면(다른 날짜를 골랐거나 하이드레이션이 끝났다) 초안을 그 값으로 맞춘다.
     내가 방금 저장한 값이 돌아온 것뿐이면 타자 중인 초안을 건드리지 않는다.
     🔴 맞추기 전에 흘려보낸다 — 안 그러면 남은 초안이 저장되지 않고 사라진다. */
  useEffect(() => {
    if (stored === committedRef.current) return;
    flushRef.current();
    committedRef.current = stored;
    setValue(stored);
  }, [stored]);

  const onChange = useCallback((next: string) => {
    setValue(next);
    valueRef.current = next;
    pendingRef.current = commitRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushRef.current();
    }, DIARY_DRAFT_DELAY_MS);
  }, []);

  // 화면을 떠날 때 남은 초안을 흘려보낸다(시트를 닫거나 탭을 옮기는 경우).
  useEffect(() => () => flushRef.current(), []);

  return { value, onChange, flush };
}
