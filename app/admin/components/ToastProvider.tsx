"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; msg: string; type: ToastType };

interface ToastContextValue {
  showToast: (msg: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let _nextId = 0;

  const showToast = useCallback((msg: string, type: ToastType = "success") => {
    const id = ++_nextId;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const colorMap: Record<ToastType, string> = {
    success: "bg-emerald-600 border-emerald-500",
    error: "bg-red-700 border-red-600",
    info: "bg-blue-700 border-blue-600",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-5 py-3 rounded-lg border text-sm text-white shadow-xl
              transition-all duration-300 animate-fade-in-down
              ${colorMap[t.type]}`}
          >
            {t.type === "success" && <span className="mr-2">✓</span>}
            {t.type === "error" && <span className="mr-2">✕</span>}
            {t.type === "info" && <span className="mr-2">ℹ</span>}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
