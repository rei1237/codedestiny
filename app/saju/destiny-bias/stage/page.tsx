"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Orbitron, Noto_Sans_KR } from "next/font/google";
import { Gem, Heart, Orbit, Sparkles, Star } from "lucide-react";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"] });
const notoKr = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700", "900"] });

const shellVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function DestinyBiasStagePage() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 38);

    return () => window.clearInterval(id);
  }, []);

  const stars = useMemo(
    () =>
      Array.from({ length: 34 }, (_, idx) => ({
        id: idx,
        left: `${(idx * 23 + 11) % 100}%`,
        top: `${(idx * 17 + 7) % 100}%`,
        size: idx % 3 === 0 ? 3 : idx % 2 === 0 ? 2 : 1.6,
        duration: 1.7 + (idx % 6) * 0.33,
        delay: (idx % 7) * 0.19,
      })),
    []
  );

  const features = [
    {
      title: "최애 성향 분석",
      subtitle: "Heart Gem Reading",
      icon: Gem,
      gradient: "from-pink-400 via-fuchsia-400 to-violet-400",
      glow: "shadow-[0_0_30px_rgba(236,72,153,0.58)]",
    },
    {
      title: "운명 궁합 매칭",
      subtitle: "Stellar Match Signal",
      icon: Star,
      gradient: "from-violet-400 via-purple-400 to-indigo-400",
      glow: "shadow-[0_0_30px_rgba(167,139,250,0.58)]",
    },
    {
      title: "에너지 연결 리포트",
      subtitle: "Cosmic Orbit Report",
      icon: Orbit,
      gradient: "from-cyan-400 via-sky-400 to-indigo-400",
      glow: "shadow-[0_0_30px_rgba(34,211,238,0.58)]",
    },
  ];

  return (
    <div className={`relative min-h-screen overflow-hidden bg-slate-950 text-white ${notoKr.className}`}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/75 to-fuchsia-900/80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(236,72,153,.34),transparent_35%),radial-gradient(circle_at_82%_16%,rgba(56,189,248,.28),transparent_38%),radial-gradient(circle_at_50%_84%,rgba(192,132,252,.25),transparent_42%)]" />

      <motion.div
        className="pointer-events-none absolute -left-20 top-20 h-[2px] w-[42rem] rotate-[16deg] bg-gradient-to-r from-transparent via-fuchsia-300/80 to-transparent blur-[1px]"
        animate={{ x: [0, 16, -8, 0], opacity: [0.35, 0.92, 0.45, 0.35] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-28 top-44 h-[2px] w-[38rem] -rotate-[19deg] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent blur-[1px]"
        animate={{ x: [0, -18, 10, 0], opacity: [0.34, 0.96, 0.5, 0.34] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="pointer-events-none absolute rounded-full bg-white/90"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
          }}
          animate={{ opacity: [0.2, 1, 0.25], scale: [0.8, 1.25, 0.9] }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.main
        variants={shellVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1520px] grid-cols-1 gap-8 px-5 py-8 sm:px-7 lg:grid-cols-[320px_1fr_560px] lg:px-10"
      >
        <motion.section
          variants={childVariants}
          className="self-start rounded-3xl border border-purple-400/50 bg-black/40 p-5 backdrop-blur-md shadow-[0_0_15px_rgba(192,132,252,0.5)]"
        >
          <p className="text-xs tracking-[0.22em] text-purple-100/85">당신의 운명 속</p>
          <p className="mt-1 text-sm font-semibold text-pink-200">✨ 최애를 만나는 순간 ✨</p>

          <div className="mt-6 flex items-center justify-center gap-4">
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [0, -7, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Heart className="h-6 w-6 fill-pink-400 text-pink-300 drop-shadow-[0_0_12px_rgba(244,114,182,0.95)]" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -7, 0], rotate: [0, 9, 0] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            >
              <Star className="h-7 w-7 fill-violet-300 text-violet-200 drop-shadow-[0_0_14px_rgba(167,139,250,0.95)]" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [0, 7, 0] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut", delay: 0.16 }}
            >
              <Heart className="h-6 w-6 fill-pink-400 text-pink-300 drop-shadow-[0_0_12px_rgba(244,114,182,0.95)]" />
            </motion.div>
          </div>

          <div className="mt-7">
            <motion.p
              className={`mb-2 text-[11px] tracking-[0.24em] text-fuchsia-200/90 ${orbitron.className}`}
              animate={{ opacity: [0.42, 1, 0.5, 1] }}
              transition={{ duration: 1.9, repeat: Infinity }}
            >
              DESTINY LOADING...
            </motion.p>
            <div className="h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-purple-300/35">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-300 shadow-[0_0_20px_rgba(236,72,153,0.86)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-right text-xs font-semibold text-cyan-200/90">{progress}%</div>
          </div>
        </motion.section>

        <motion.section
          variants={childVariants}
          className="relative flex min-h-[430px] items-end justify-center"
        >
          <motion.div
            className="absolute left-1/2 top-8 h-40 w-40 -translate-x-[112%] rounded-full bg-fuchsia-500/20 blur-3xl"
            animate={{ x: [0, -16, 0], y: [0, 12, 0], opacity: [0.38, 0.82, 0.4] }}
            transition={{ duration: 5.3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-1/2 top-6 h-44 w-44 translate-x-[20%] rounded-full bg-cyan-500/20 blur-3xl"
            animate={{ x: [0, 18, 0], y: [0, 8, 0], opacity: [0.33, 0.75, 0.36] }}
            transition={{ duration: 5.1, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="absolute bottom-28 left-[34%] flex h-44 w-32 items-center justify-center rounded-[2rem] border border-pink-300/45 bg-black/35 backdrop-blur-sm shadow-[0_0_28px_rgba(236,72,153,0.45)]"
            animate={{ y: [0, -15, 0], rotate: [0, -1.5, 0] }}
            transition={{ duration: 3.3, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute -bottom-5 h-5 w-20 rounded-full bg-pink-300/30 blur-md" />
            <div className="text-center">
              <Sparkles className="mx-auto h-6 w-6 text-pink-200 drop-shadow-[0_0_12px_rgba(244,114,182,0.96)]" />
              <p className="mt-2 text-xs tracking-wide text-pink-100/90">IDOL</p>
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-24 right-[32%] flex h-40 w-28 items-center justify-center rounded-[2rem] border border-cyan-300/45 bg-black/35 backdrop-blur-sm shadow-[0_0_28px_rgba(34,211,238,0.42)]"
            animate={{ y: [0, -13, 0], rotate: [0, 1.3, 0] }}
            transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut", delay: 0.34 }}
          >
            <div className="absolute -bottom-5 h-5 w-20 rounded-full bg-cyan-300/30 blur-md" />
            <div className="text-center">
              <Sparkles className="mx-auto h-6 w-6 text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.96)]" />
              <p className="mt-2 text-xs tracking-wide text-cyan-100/90">FAN</p>
            </div>
          </motion.div>

          <div className="pointer-events-none absolute bottom-7 left-1/2 h-40 w-[88%] -translate-x-1/2 [perspective:1000px]">
            <motion.div
              className="absolute inset-0 rounded-[100%] border border-fuchsia-300/35 bg-gradient-to-r from-fuchsia-500/25 via-purple-500/20 to-cyan-400/25 [transform:rotateX(70deg)]"
              animate={{
                boxShadow: [
                  "0 0 18px rgba(236,72,153,.35), inset 0 0 18px rgba(59,130,246,.18)",
                  "0 0 34px rgba(236,72,153,.6), inset 0 0 26px rgba(59,130,246,.3)",
                  "0 0 20px rgba(236,72,153,.38), inset 0 0 20px rgba(59,130,246,.2)",
                ],
              }}
              transition={{ duration: 2.7, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-x-[11%] bottom-2 h-7 rounded-full bg-fuchsia-300/20 blur-xl [transform:rotateX(70deg)]" />
          </div>
        </motion.section>

        <motion.section variants={childVariants} className="self-center">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-purple-300/45 bg-black/30 px-5 py-2 text-xs tracking-wide text-purple-100 backdrop-blur-md shadow-[0_0_14px_rgba(192,132,252,0.45)]"
            animate={{ opacity: [0.72, 1, 0.84, 1] }}
            transition={{ duration: 2.1, repeat: Infinity }}
          >
            <Star className="h-4 w-4 fill-yellow-300 text-yellow-200" />
            ⭐ 내 안의 운명 ✨ 최애와 연결되는 시간 ⭐
          </motion.div>

          <div className="mt-5">
            <motion.h1
              className={`text-6xl font-black leading-none tracking-tight sm:text-7xl lg:text-8xl ${orbitron.className} bg-gradient-to-b from-pink-300 via-purple-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(236,72,153,0.74)]`}
              animate={{ opacity: [1, 0.86, 1, 0.9, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              최애운명
            </motion.h1>
            <p className="mt-3 text-lg font-medium tracking-[0.28em] text-purple-100/90 drop-shadow-[0_0_12px_rgba(167,139,250,.9)]">
              ✦ My Destiny Bias ✦
            </p>
          </div>

          <motion.div
            className="mt-8 rounded-3xl border border-purple-400/50 bg-purple-950/50 p-5 backdrop-blur-md shadow-[0_0_15px_rgba(192,132,252,0.5)]"
            variants={childVariants}
          >
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-fuchsia-200 drop-shadow-[0_0_10px_rgba(236,72,153,.94)]" />
              <h2 className="text-sm font-semibold tracking-[0.08em] text-fuchsia-100">
                내 사주 에너지가 최애에게 닿는 방식
              </h2>
            </div>

            <div className="grid grid-cols-1 divide-y divide-purple-300/20 rounded-2xl border border-white/10 bg-black/25 md:grid-cols-3 md:divide-x md:divide-y-0">
              {features.map((feature, idx) => {
                const Icon = feature.icon;

                return (
                  <motion.div
                    key={feature.title}
                    className="relative px-4 py-6 text-center"
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                      duration: 2.35 + idx * 0.35,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: idx * 0.2,
                    }}
                  >
                    <div
                      className={`relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} ${feature.glow}`}
                    >
                      <Icon className="h-8 w-8 text-white" />
                      <div className="absolute -bottom-3 h-3 w-10 rounded-full bg-white/30 blur-md" />
                    </div>
                    <p className="text-sm font-semibold text-purple-50">{feature.title}</p>
                    <p className="mt-1 text-[11px] tracking-wide text-purple-200/70">{feature.subtitle}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.section>
      </motion.main>
    </div>
  );
}
