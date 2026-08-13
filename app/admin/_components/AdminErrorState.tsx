"use client";

// 관리자 화면 공용 오류 표시. 여섯 개 목록 화면이 각자 rose 색 <p> 를 새로 발명하는 것을 막고,
// 재시도 버튼과 진단 꼬리표를 한 곳에서 관리한다.
//
// 🔴 dark: 페어를 쓰지 않는다 — 관리자 패널은 시스템 테마와 무관하게 항상 어두운 팔레트(#0d0f18 계열)로
// 하드코딩돼 있고 app/admin 전체에 dark: 는 사실상 존재하지 않는다. 여기서만 dark: 를 쓰면 라이트 모드에서
// 이 카드만 색이 튄다.
import type { AdminErrorView } from "../_lib/admin-api";

interface AdminErrorStateProps {
  view: AdminErrorView;
  /** 없으면 재시도 버튼을 그리지 않는다. 되돌릴 수 없는 변경에는 넘기지 말 것. */
  onRetry?: () => void;
  retrying?: boolean;
  /** 헤더 스트립처럼 좁은 자리에 한 줄로 넣을 때. 기본은 목록 본문용 카드. */
  compact?: boolean;
}

export default function AdminErrorState({ view, onRetry, retrying = false, compact = false }: AdminErrorStateProps) {
  const showRetry = Boolean(onRetry) && view.retryable;

  return (
    <div
      role="alert"
      className={compact
        ? "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200"
        : "rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-5 text-center text-sm text-rose-200"}
    >
      <p className={compact ? "min-w-0 flex-1" : ""}>{view.message}</p>

      {showRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          aria-label="다시 시도"
          className={`inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-600 bg-rose-900/50 px-3 py-1.5 text-xs font-bold text-rose-100 transition-colors hover:bg-rose-800/60 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "" : "mt-3"}`}
        >
          {retrying ? "다시 시도 중…" : "다시 시도"}
        </button>
      ) : null}

      {/* select-all: 관리자가 세 번 클릭해 그대로 복사할 수 있어야 문의·로그 조회에 쓸 수 있다. */}
      {view.diagnostic ? (
        <p className={`select-all text-[11px] text-rose-300/60 ${compact ? "basis-full" : "mt-2"}`}>{view.diagnostic}</p>
      ) : null}
    </div>
  );
}
