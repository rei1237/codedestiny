"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type FeatureId = "flower" | "ziweiDeep" | "olympus";

type UnlockFeature = {
  id: FeatureId;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  accent: string;
  glow: string;
};

const unlockFeatures: UnlockFeature[] = [
  {
    id: "flower",
    title: "운명의 꽃",
    subtitle: "Flower of Destiny",
    description: "사주·점성술·자미두수 흐름을 하나의 상징 꽃으로 결합한 통합 아틀리에.",
    href: "/static/index.html?action=openDestinyFlowerStudio",
    accent: "from-fuchsia-200 via-rose-200 to-amber-200",
    glow: "from-fuchsia-400/35 via-rose-300/20 to-amber-300/25",
  },
  {
    id: "ziweiDeep",
    title: "심화 자미두수",
    subtitle: "Advanced Zi Wei Dou Shu",
    description: "12궁 구조와 핵심 주성을 고급 리포트 관점으로 해석하는 심층 진단.",
    href: "/ziwei/chart",
    accent: "from-violet-200 via-indigo-200 to-cyan-200",
    glow: "from-violet-400/35 via-indigo-300/20 to-cyan-300/25",
  },
  {
    id: "olympus",
    title: "올림푸스 신탁",
    subtitle: "Olympus Oracle",
    description: "수호신, 별자리, 신화 상징을 결합한 프리미엄 신탁 리딩.",
    href: "/olympus",
    accent: "from-amber-200 via-yellow-200 to-orange-200",
    glow: "from-amber-400/35 via-yellow-300/20 to-orange-300/25",
  },
];

export default function FeatureUnlockShowcase() {
  // 요구사항: 기능별 잠금 상태값(boolean)
  const [isFlowerUnlocked, setIsFlowerUnlocked] = useState(false);
  const [isZiweiDeepUnlocked, setIsZiweiDeepUnlocked] = useState(false);
  const [isOlympusUnlocked, setIsOlympusUnlocked] = useState(false);

  const isUnlockedById: Record<FeatureId, boolean> = {
    flower: isFlowerUnlocked,
    ziweiDeep: isZiweiDeepUnlocked,
    olympus: isOlympusUnlocked,
  };

  function toggleFeature(id: FeatureId) {
    if (id === "flower") {
      setIsFlowerUnlocked((prev) => !prev);
      return;
    }
    if (id === "ziweiDeep") {
      setIsZiweiDeepUnlocked((prev) => !prev);
      return;
    }
    setIsOlympusUnlocked((prev) => !prev);
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-violet-200/20 bg-[linear-gradient(145deg,rgba(13,17,38,0.94),rgba(18,26,54,0.92)_48%,rgba(28,16,64,0.92))] p-4 shadow-[0_26px_60px_rgba(8,8,24,0.5)] md:p-6">
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-52 w-52 rounded-full bg-amber-400/15 blur-3xl" aria-hidden />

      <div className="relative z-10">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/80">Preview Unlock States</p>
          <h2 className="mt-2 text-xl font-black text-violet-50 md:text-2xl">신비로운 잠금 해제 UI 테스트</h2>
          <p className="mt-2 text-sm leading-6 text-violet-100/75">
            아래 임시 토글 버튼으로 각 기능의 잠금/해제 상태를 즉시 확인할 수 있습니다.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {unlockFeatures.map((feature) => {
              const unlocked = isUnlockedById[feature.id];
              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => toggleFeature(feature.id)}
                  className="rounded-full border border-violet-200/35 bg-violet-900/35 px-3 py-1.5 text-xs font-bold tracking-wide text-violet-100 transition hover:bg-violet-800/55"
                >
                  {feature.title}: {unlocked ? "UNLOCKED" : "LOCKED"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {unlockFeatures.map((feature) => {
            const unlocked = isUnlockedById[feature.id];
            return (
              <motion.article
                key={feature.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.05] p-4 backdrop-blur-xl"
              >
                <AnimatePresence>
                  {unlocked ? (
                    <motion.div
                      key="glow"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45 }}
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.glow}`}
                    />
                  ) : null}
                </AnimatePresence>

                <div className={unlocked ? "relative z-10" : "relative z-10 blur-[1.4px] opacity-60"}>
                  <p className={`inline-flex rounded-full bg-gradient-to-r ${feature.accent} bg-clip-text text-xs font-bold tracking-[0.14em] text-transparent`}>
                    {feature.subtitle}
                  </p>
                  <h3 className="mt-2 text-lg font-black text-white">{feature.title}</h3>
                  <p className="mt-2 min-h-[64px] text-sm leading-6 text-violet-100/80">{feature.description}</p>

                  <motion.div
                    animate={unlocked ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.75 }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                    className="mt-3 rounded-2xl border border-violet-200/25 bg-slate-950/30 p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200/80">oracle stream</p>
                    <p className="mt-1 text-sm text-violet-50/95">
                      {unlocked ? "빛의 문이 열렸습니다. 리딩 콘텐츠가 활성화되었습니다." : "문이 잠겨 있습니다. 신탁의 입구에서 기다리고 있습니다."}
                    </p>
                  </motion.div>
                </div>

                <AnimatePresence>
                  {!unlocked ? (
                    <motion.div
                      key="locked-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/55 px-5 text-center backdrop-blur-md"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-200/80 bg-[radial-gradient(circle_at_35%_25%,rgba(255,248,220,0.9),rgba(255,188,61,0.82)_45%,rgba(165,113,20,0.95))] text-2xl shadow-[0_8px_22px_rgba(255,179,45,0.45)]">
                        🔒
                      </div>
                      <p className="text-sm font-semibold leading-6 text-amber-50/95">복채를 지불하고 운명을 확인하세요</p>
                      <button
                        type="button"
                        className="rounded-full border border-amber-200/75 bg-[linear-gradient(90deg,rgba(255,215,133,0.96),rgba(253,180,72,0.98))] px-4 py-2 text-xs font-extrabold text-amber-950 shadow-[0_8px_20px_rgba(240,173,55,0.4)]"
                      >
                        ✨ 신탁의 봉인을 해제하기
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <motion.div
                  initial={false}
                  animate={unlocked ? { opacity: 1, y: 0 } : { opacity: 0.25, y: 8 }}
                  transition={{ duration: 0.35 }}
                  className="relative z-10 mt-4"
                >
                  <Link
                    href={feature.href}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-violet-200/35 bg-violet-600/80 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500"
                  >
                    {unlocked ? "콘텐츠 시작하기" : "잠금 해제 후 입장 가능"}
                  </Link>
                </motion.div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
