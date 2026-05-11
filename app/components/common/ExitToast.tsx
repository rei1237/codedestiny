"use client";

import { AnimatePresence, motion } from "framer-motion";

type ExitToastProps = {
  visible: boolean;
  message?: string;
};

export default function ExitToast({
  visible,
  message = "한 번 더 누르면 종료됩니다",
}: ExitToastProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
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
            {message}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
