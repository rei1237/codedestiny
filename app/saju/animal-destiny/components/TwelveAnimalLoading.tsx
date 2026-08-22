"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { useAnimalDestinyCopy } from "../_lib/copy";

type Props = {
  mode: "calculating" | "revealing";
};

export default function TwelveAnimalLoading({ mode }: Props) {
  const copy = useAnimalDestinyCopy();
  const reduced = useReducedMotion();

  return (
    <section className="rounded-[1.8rem] border border-[#b8d5ee] bg-[linear-gradient(160deg,#f8fcff_0%,#eef7ff_56%,#fff7ec_100%)] p-5 shadow-[0_16px_36px_rgba(64,114,158,0.17)]">
      <div className="space-y-1.5 text-[#2f5f85]">
        <p className="text-sm font-black">{copy.loadingTitle}</p>
        <p className="text-xs font-semibold text-[#547c9f]">{copy.loadingDesc}</p>
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={mode}
          initial={{ opacity: 0, y: reduced ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -8 }}
          transition={{ duration: reduced ? 0.1 : 0.35 }}
          className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <m.div
              key={`loading-card-${index}`}
              className="h-20 rounded-2xl border border-[#cae0f3] bg-white/86"
              animate={
                reduced
                  ? undefined
                  : mode === "calculating"
                  ? { y: [0, -6, 0], rotate: [0, -2, 0] }
                  : { rotateY: [0, 180, 360], scale: [1, 1.04, 1] }
              }
              transition={{
                duration: reduced ? 0 : mode === "calculating" ? 1.6 : 1.8,
                repeat: reduced ? 0 : Number.POSITIVE_INFINITY,
                delay: index * 0.08,
              }}
            />
          ))}
        </m.div>
      </AnimatePresence>
    </section>
  );
}
