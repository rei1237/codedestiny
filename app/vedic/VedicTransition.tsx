"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const DURATION = 0.35;

export function VedicTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DURATION, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ position: "relative", width: "100%", minHeight: "100%", isolation: "isolate" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
