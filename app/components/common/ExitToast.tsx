"use client";

import { AnimatePresence, m } from "framer-motion";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type ExitToastProps = {
  visible: boolean;
  message?: string;
};

const EXIT_TOAST_MESSAGE: Record<LoadingLocale, string> = {
  ko: "한 번 더 누르면 종료됩니다",
  en: "Press once more to exit",
  ja: "もう一度押すと終了します",
  "zh-CN": "再按一次即可退出",
  "zh-TW": "再按一次即可結束",
  vi: "Nhấn thêm một lần để thoát",
  hi: "बाहर निकलने के लिए एक बार और दबाएँ",
  es: "Pulsa una vez más para salir",
  fr: "Appuyez encore une fois pour quitter",
  de: "Noch einmal drücken, um zu beenden",
  nl: "Druk nogmaals om af te sluiten",
  ms: "Tekan sekali lagi untuk keluar",
};

export default function ExitToast({
  visible,
  message,
}: ExitToastProps) {
  const [locale, setLocale] = useState<LoadingLocale>("ko");

  useEffect(() => {
    if (!visible) return;
    setLocale(getCurrentLoadingLocale());
  }, [visible]);

  const resolvedMessage = message || EXIT_TOAST_MESSAGE[locale] || EXIT_TOAST_MESSAGE.ko;

  return (
    <AnimatePresence>
      {visible ? (
        <m.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.985 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 z-[1400] flex justify-center px-4"
          style={{ bottom: "max(20px, env(safe-area-inset-bottom))" }}
        >
          <div className="max-w-[92vw] rounded-2xl border border-cyan-100/35 bg-slate-950/72 px-4 py-3 text-center text-sm font-semibold tracking-[0.01em] text-cyan-50 shadow-[0_20px_52px_rgba(7,13,36,0.55)] backdrop-blur-xl">
            <span className="mr-1 text-[13px]">✦</span>
            {resolvedMessage}
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
