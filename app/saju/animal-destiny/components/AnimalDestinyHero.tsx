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

export default function AnimalDestinyHero() {
  return (
    <section className="relative w-full overflow-hidden px-6 pb-14 pt-8 sm:pt-12">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(250,246,234,0.9) 0%, rgba(236,244,255,0.7) 42%, rgba(247,250,255,0.96) 100%), url('/fuctionassets/동물점테스트.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "saturate(0.9)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_24%,rgba(255,179,71,0.3),transparent_42%),radial-gradient(circle_at_76%_72%,rgba(23,154,147,0.18),transparent_45%)]" />
      </div>

      <div className="relative mx-auto max-w-5xl rounded-[34px] border border-[#ebdfc6] bg-white/66 p-6 shadow-[0_24px_58px_rgba(27,47,76,0.16)] backdrop-blur-sm sm:p-10">
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
              className="inline-flex rounded-full bg-[#15324f]/88 px-4 py-1.5 text-[11px] font-black tracking-[0.24em] text-[#f8edcf]"
            >
              CELESTIAL ANIMAL ORACLE
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="text-balance text-3xl font-black leading-tight text-[#18314f] sm:text-5xl"
            >
              사주 십이운성
              <br />
              동물점 테스트
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="max-w-2xl text-sm font-semibold leading-relaxed text-[#2f4d6a] sm:text-base"
            >
              태어난 순간의 십이운성을 읽어, 당신의 기질과 관계 패턴을 동물 아키타입으로 해석합니다.
              성격, 연애, 진로, 재물운까지 한 번에 보는 프리미엄 리포트입니다.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="grid gap-2 text-[12px] font-bold text-[#214767] sm:grid-cols-3"
            >
              <span className="rounded-full border border-[#bfe3de] bg-[#ecf8f7] px-3 py-2">12단계 운성 정규화</span>
              <span className="rounded-full border border-[#f3d8a4] bg-[#fff4df] px-3 py-2">성격/연애/직업 분석</span>
              <span className="rounded-full border border-[#ced8f5] bg-[#eef2ff] px-3 py-2">두 사람 궁합 계산</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto w-full max-w-[260px]"
          >
            <div className="relative rounded-[28px] border border-[#d5c29a] bg-[linear-gradient(145deg,#173957,#1c5970)] p-5 shadow-[0_20px_46px_rgba(20,42,61,0.42)]">
              <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-[#ffdca5]/30 blur-2xl" />
              <CosmicSigil className="mx-auto h-36 w-36 text-[#fff2ce]" />
              <p className="mt-3 text-center text-xs font-black tracking-[0.18em] text-[#ffe7b1]">ORACLE CORE</p>
              <p className="mt-2 text-center text-sm font-semibold leading-relaxed text-[#d7e6f3]">
                입력한 생년월일을 바탕으로 대표 운성(일주 우선)을 선택해 동물 프로필을 완성합니다.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
