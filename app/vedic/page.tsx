"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GalaxyNav from "./GalaxyNav";

type View = "gate" | "galaxy";

export default function VedicHome() {
  const [view, setView] = useState<View>("gate");

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020617] text-slate-50">
      {/* 우주 배경 메쉬 그라디언트 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.22),transparent_55%),radial-gradient(circle_at_90%_10%,rgba(129,140,248,0.28),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(56,189,248,0.18),transparent_60%),radial-gradient(circle_at_15%_70%,rgba(244,114,182,0.22),transparent_60%),radial-gradient(1200px_900px_at_50%_50%,#020617,#020617)]" />
        <div className="absolute inset-0 opacity-60 mix-blend-screen">
          <div className="absolute -inset-[40%] bg-[radial-gradient(1px_1px_at_10%_20%,rgba(248,250,252,0.9),transparent),radial-gradient(1px_1px_at_30%_80%,rgba(148,163,184,0.8),transparent),radial-gradient(1.2px_1.2px_at_70%_30%,rgba(226,232,240,0.9),transparent),radial-gradient(1px_1px_at_80%_60%,rgba(148,163,184,0.85),transparent)] animate-[cosmicStars_80s_linear_infinite]" />
        </div>
        <div className="absolute inset-0 mix-blend-screen opacity-80">
          <div className="absolute -inset-[20%] bg-[radial-gradient(500px_300px_at_50%_0%,rgba(56,189,248,0.32),transparent_70%),radial-gradient(600px_360px_at_0%_100%,rgba(236,72,153,0.24),transparent_70%),radial-gradient(600px_360px_at_100%_100%,rgba(129,140,248,0.26),transparent_70%)] blur-[2px]" />
        </div>
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <AnimatePresence mode="wait">
          {view === "gate" ? (
            <CosmicGate key="gate" onOpen={() => setView("galaxy")} />
          ) : (
            <motion.div
              key="galaxy"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex w-full items-center justify-center"
            >
              <GalaxyNav />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

type CosmicGateProps = {
  onOpen: () => void;
};

function CosmicGate({ onOpen }: CosmicGateProps) {
  return (
    <div className="relative flex w-full max-w-5xl flex-col items-center">
      {/* 상단 타이포 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-8 text-center"
      >
        <p className="text-xs tracking-[0.28em] text-slate-300/80">
          VEDIC ASTROLOGY
        </p>
        <h1 className="mt-2 text-lg font-semibold tracking-[0.32em] text-slate-100/90">
          우주적 비밀의 문, 베다점
        </h1>
      </motion.div>

      {/* 중앙 프로필 카드 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.08, y: -12, filter: "blur(14px)" }}
        transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full max-w-md sm:max-w-xl"
      >
        {/* 은은한 궤도 링 */}
        <div className="pointer-events-none absolute -inset-6 rounded-[40px] border border-cyan-200/10 bg-gradient-to-br from-cyan-400/5 via-fuchsia-500/5 to-emerald-400/5 blur-[2px]" />

        <div className="relative overflow-hidden rounded-[32px] border border-cyan-100/20 bg-white/5 bg-clip-padding shadow-[0_28px_80px_rgba(15,23,42,0.95),0_0_0_1px_rgba(56,189,248,0.4)] backdrop-blur-3xl">
          {/* 카드 상단 오로라 */}
          <div className="pointer-events-none absolute inset-0 opacity-80 mix-blend-screen">
            <div className="absolute -inset-[40%] bg-[conic-gradient(from_180deg_at_50%_0%,rgba(59,130,246,0.3),rgba(14,165,233,0.0),rgba(244,114,182,0.4),rgba(56,189,248,0.0),rgba(59,130,246,0.3))] blur-2xl" />
          </div>

          <div className="relative px-7 pb-7 pt-8 sm:px-10 sm:pb-8 sm:pt-9">
            {/* 천체 아이콘 */}
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative h-40 w-40 rounded-full bg-gradient-to-br from-sky-200 via-emerald-200 to-fuchsia-200 shadow-[0_0_40px_rgba(56,189,248,0.85)]"
              >
                <div className="absolute inset-[18%] rounded-full bg-[#020617]/80 backdrop-blur-3xl" />
                <div className="absolute inset-[22%] rounded-full border border-cyan-200/40" />
                <div className="absolute inset-[30%] rotate-[18deg] rounded-full border border-fuchsia-200/40 border-dashed" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl">
                  ✶
                </div>
                {/* 작은 궤도 점 */}
                <motion.div
                  className="absolute left-1/2 top-[14%] h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_16px_rgba(56,189,248,0.9)]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "50% 120px" }}
                />
              </motion.div>
            </div>

            {/* 이름 / 정보 (Serif) */}
            <div className="mt-8 text-center font-atelier-serif">
              <p className="text-sm tracking-[0.18em] text-slate-200/80">
                당신의 별자리 카드
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[0.14em] text-slate-50">
                당신의 별자리
              </p>
              <p className="mt-4 text-sm text-slate-200/80">
                1990-06-15 · 14:30 · 서울 · KST (UTC+9)
              </p>
            </div>
          </div>
        </div>

        {/* 운명의 문 열기 - 빛의 구체 버튼 */}
        <motion.button
          type="button"
          onClick={onOpen}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          className="group absolute -bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center"
        >
          <motion.div
            className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-300 via-sky-200 to-emerald-200 shadow-[0_0_30px_rgba(56,189,248,0.9)]"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex h-full w-full items-center justify-center text-slate-900 text-xl">
              ⊙
            </div>
          </motion.div>
          <span className="mt-2 text-xs tracking-[0.22em] text-slate-200/90 group-hover:text-sky-200">
            운명의 문 열기
          </span>
        </motion.button>

        {/* 아래 안내 텍스트 */}
        <p className="mt-16 max-w-md text-center text-xs text-slate-300/80">
          빛의 구체를 터치하면, 출생 차트와 다샤, 요가가 펼쳐지는 은하수 네비게이션으로 진입합니다.
        </p>
      </motion.div>
    </div>
  );
}

