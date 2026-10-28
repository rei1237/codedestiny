"use client";

// 운영본부 화면 공용 조회 훅 — adminFetch(401/403 → 로그인, GET 1회 재시도)를 그대로 쓰고 위에 재시도 루프를 얹지 않는다.

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminApiError, adminFetch, describeAdminError, type AdminErrorView } from "../_lib/admin-api";

export interface HqResource<T> {
  data: T | null;
  error: AdminErrorView | null;
  loading: boolean;
  reload: () => void;
  /** 변경 API 응답으로 받은 최신 값을 그대로 반영할 때. */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useHqResource<T>(path: string | null, fallback: string): HqResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AdminErrorView | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [tick, setTick] = useState(0);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    adminFetch<T>(path, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((caught) => {
        if (controller.signal.aborted || (caught as Error)?.name === "AbortError") return;
        setError(describeAdminError(caught, fallbackRef.current));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { data, error, loading, reload, setData };
}

/** 주소 쿼리를 읽는다. 정적 export 라 useSearchParams 대신 마운트 후 window 에서 읽는다. */
export function readQuery(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/** 히스토리를 쌓지 않고 쿼리만 바꾼다(필터·보기 전환을 새로고침 뒤에도 유지). */
export function writeQuery(params: Record<string, string | null | undefined>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

/**
 * 변경 요청 오류용. describeAdminError 는 409 를 모두 "다른 곳에서 먼저 바뀜"으로 바꾸는데,
 * 운영본부 API 의 409 중 판 충돌(…_VERSION_CONFLICT)이 아닌 것("완료하려면 증빙이 필요합니다: …",
 * "재집계가 이미 진행 중" 등)은 서버의 한국어 문구가 곧 해야 할 일이라 그대로 보여 준다.
 */
export function describeHqError(caught: unknown, fallback: string): AdminErrorView {
  const view = describeAdminError(caught, fallback);
  if (
    caught instanceof AdminApiError
    && caught.status === 409
    && !/VERSION_CONFLICT$/.test(caught.code)
    && /[가-힣]/.test(caught.message)
  ) {
    return { ...view, message: caught.message };
  }
  return view;
}
