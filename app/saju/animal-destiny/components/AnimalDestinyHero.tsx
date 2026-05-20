"use client";

import { motion } from "framer-motion";
import CosmicSigil from "./CosmicSigil";

const STAR_POINTS = [
  { top: "8%", left: "14%", size: 2, delay: "0s" },
  { top: "18%", left: "78%", size: 3, delay: "0.6s" },
  { top: "36%", left: "22%", size: 2, delay: "1.1s" },
  { top: "42%", left: "64%", size: 2, delay: "1.7s" },
  { top: "65%", left: "16%", size: 3, delay: "2.2s" },
  { top: "70%", left: "84%", size: 2, delay: "2.9s" },
  { top: "84%", left: "48%", size: 2, delay: "3.3s" },
];

const PREVIEW_ANIMALS = ["🐭", "🐮", "🐯", "🐰", "🐉", "🐍", "🐴", "🐑", "🐵", "🐔", "🐶", "🐷"];

interface Props {
  onStart?: () => void;
}

export default function AnimalDestinyHero({ onStart }: Props) {
  return (
    <section className="relative w-full overflow-hidden px-5 pb-10 pt-6 sm:px-6 sm:pt-10">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,247,233,0.9) 0%, rgba(254,242,218,0.83) 42%, rgba(250,231,197,0.9) 100%), url('/fuctionassets/동물점테스트.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "saturate(1.02)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_24%,rgba(255,193,107,0.34),transparent_42%),radial-gradient(circle_at_76%_72%,rgba(176,133,76,0.2),transparent_45%)]" />
      </div>

      <div className="relative mx-auto max-w-5xl rounded-[34px] border border-[#e6cb9f] bg-white/74 p-6 shadow-[0_24px_58px_rgba(103,76,38,0.18)] backdrop-blur-sm sm:p-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[34px]">
          {STAR_POINTS.map((star, index) => (
            <span
              key={`star-${index}`}
              className="absolute rounded-full bg-[#fff6dd] opacity-70 animate-pulse"
              style={{
                top: star.top,
                left: star.left,
                width: `${star.size * 2}px`,
                height: `${star.size * 2}px`,
                animationDelay: star.delay,
                boxShadow: "0 0 12px rgba(255,200,92,0.35)",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="inline-flex rounded-full bg-[#8a5a2b]/92 px-4 py-1.5 text-[11px] font-black tracking-[0.24em] text-[#fff0d0]"
            >
              SAJU TWELVE STAGE ANIMAL
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="text-balance text-3xl font-black leading-tight text-[#6b3f1d] sm:text-5xl"
            >
              사주 십이운성 동물점
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="max-w-2xl text-sm font-semibold leading-relaxed text-[#7d552f] sm:text-base"
            >
              내 사주 속 생명의 흐름을 12가지 동물로 알아보세요.
              성격, 관계, 일과 재물, 연애 흐름을 한 번에 읽는 직관형 리포트입니다.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="flex flex-wrap gap-2"
            >
              {PREVIEW_ANIMALS.map((animal, index) => (
                <span
                  key={`${animal}-${index}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dfc197] bg-white/85 text-lg shadow-[0_6px_16px_rgba(121,84,35,0.1)]"
                >
                  {animal}
                </span>
              ))}
            </motion.div>

            <motion.button
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.34 }}
              onClick={onStart}
              className="mt-2 inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-[linear-gradient(120deg,#8a5a2b,#d88a35)] px-6 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(138,90,43,0.34)] transition hover:brightness-105 active:scale-[0.99]"
            >
              내 동물 알아보기
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.42 }}
              className="grid gap-2 text-[12px] font-bold sm:grid-cols-3"
            >
              <span className="rounded-xl border border-[#e0c092] bg-[#fff4de] px-3 py-2 text-[#7b542c]">십이운성 기반</span>
              <span className="rounded-xl border border-[#e0c092] bg-[#fff4de] px-3 py-2 text-[#7b542c]">12가지 동물 캐릭터</span>
              <span className="rounded-xl border border-[#e0c092] bg-[#fff4de] px-3 py-2 text-[#7b542c]">성격 · 관계 · 운세 흐름 해석</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto w-full max-w-[260px]"
          >
            <div className="relative rounded-[28px] border border-[#dfbf93] bg-[linear-gradient(145deg,#6b3f1d,#8a5a2b,#d88a35)] p-5 shadow-[0_20px_46px_rgba(84,45,22,0.38)]">
              <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-[#ffdca5]/30 blur-2xl" />
              <CosmicSigil className="mx-auto h-36 w-36 text-[#fff2ce]" />
              <p className="mt-3 text-center text-xs font-black tracking-[0.18em] text-[#ffe7b1]">ORACLE CORE</p>
              <p className="mt-2 text-center text-sm font-semibold leading-relaxed text-[#fff4e6]">
                태어난 순간의 흐름을 읽어 대표 운성과 동물 캐릭터를 찾습니다.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
