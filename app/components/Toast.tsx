"use client";

/**
 * Toast — 전역 Toast 알림 시스템
 *
 * 사용법:
 *   1. app/layout.js 에 <ToastProvider /> 추가 (이미 추가됨)
 *   2. 아무 클라이언트 컴포넌트에서 showToast("메시지") 호출
 *
 * showToast(message, type?)
 *   - type: "success" | "error" | "info" (기본값: "success")
 */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

// 모듈 레벨 싱글턴 — React Context 없이 어디서든 호출 가능
let _dispatch: ((item: Omit<ToastItem, "id">) => void) | null = null;

export function showToast(message: string, type: ToastType = "success") {
  _dispatch?.({ message, type });
}

// ──────────────────────────────────────────────────────────────────────────
// 개별 Toast 아이템 컴포넌트

const GRADIENTS: Record<ToastType, string> = {
  success: "from-violet-700/95 to-fuchsia-700/95 border-violet-300/30",
  error: "from-rose-700/95 to-red-700/95 border-rose-300/30",
  info: "from-indigo-700/95 to-blue-700/95 border-indigo-300/30",
};

const ICONS: Record<ToastType, string> = {
  success: "✦",
  error: "✗",
  info: "◈",
};

const TOAST_CLOSE_LABEL: Record<LoadingLocale, string> = {
  ko: "닫기",
  en: "Close",
  ja: "閉じる",
  "zh-CN": "关闭",
  "zh-TW": "關閉",
  vi: "Đóng",
  hi: "बंद करें",
  es: "Cerrar",
  fr: "Fermer",
  de: "Schließen",
  nl: "Sluiten",
  ms: "Tutup",
};

function SingleToast({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: (id: number) => void;
}) {
  const [visible, setVisible] = useState(false);
  const closeLabel = TOAST_CLOSE_LABEL[getCurrentLoadingLocale()] || TOAST_CLOSE_LABEL.ko;

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 16);
    const t2 = setTimeout(() => setVisible(false), 3800);
    const t3 = setTimeout(() => onRemove(item.id), 4300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [item.id, onRemove]);

  return (
    <div
      style={{
        minWidth: 280,
        maxWidth: 390,
        transition: "opacity 0.45s ease, transform 0.45s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(-14px) scale(0.95)",
      }}
      className={`flex items-start gap-3 rounded-2xl border bg-gradient-to-r backdrop-blur-xl px-4 py-3.5 shadow-[0_20px_56px_rgba(0,0,0,0.6)] ${GRADIENTS[item.type]}`}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-sm font-bold text-white leading-none">
        {ICONS[item.type]}
      </span>
      <p className="flex-1 text-sm font-medium leading-relaxed text-white/95">{item.message}</p>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="ml-1 shrink-0 text-lg leading-none text-white/45 transition-colors hover:text-white/90 focus:outline-none"
        aria-label={closeLabel}
      >
        ×
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 최상위 Provider — app/layout.js 에 한 번만 마운트

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    _dispatch = ({ message, type }) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
    };
    return () => {
      _dispatch = null;
    };
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // SSR 하이드레이션 방지 — 클라이언트에서만 포털로 렌더
  if (!mounted) return null;

  const render = (items: ToastItem[]) => items.map((item) => (
    <div key={item.id} className="pointer-events-auto">
      <SingleToast item={item} onRemove={remove} />
    </div>
  ));
  const errors = toasts.filter((t) => t.type === "error");
  const notices = toasts.filter((t) => t.type !== "error");

  // 라이브 영역은 한 겹만 둔다. 토스트마다 role="alert"를 또 달면 같은 말을 두 번 읽는다.
  // 오류만 바로 끊고 읽고, 나머지는 읽던 말을 마친 뒤 읽는다.
  return createPortal(
    <div className="pointer-events-none fixed right-4 top-[62px] z-[9999] flex flex-col items-end">
      <div aria-live="assertive" aria-atomic="false" className="flex flex-col items-end gap-2.5">{render(errors)}</div>
      <div aria-live="polite" aria-atomic="false" className={`flex flex-col items-end gap-2.5${errors.length && notices.length ? " mt-2.5" : ""}`}>{render(notices)}</div>
    </div>,
    document.body,
  );
}

export function useToast() {
  return { showToast };
}
