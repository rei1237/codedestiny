"use client";

import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";

import { fortuneTeaHouseAssets } from "@/src/features/fortune-tea-house/data/assets";
import { ACCENT, INK, INK_MUTED } from "../_lib/styles";

export default function FeedbackHero() {
  const reduceMotion = useReducedMotion();

  return (
    <header className="flex flex-col-reverse items-center gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="w-full text-center sm:text-left">
        <p className={`text-[11px] font-black uppercase tracking-[0.28em] ${ACCENT}`}>
          CODE DESTINY 연구소
        </p>
        <h1 className={`mt-3 text-[clamp(1.75rem,5vw,2.5rem)] font-black leading-tight tracking-tight ${INK}`}>
          버그 제보실
        </h1>
        <p className={`mt-4 max-w-[52ch] text-[15px] leading-[1.8] ${INK_MUTED}`}>
          화면이 이상하거나, 결과가 어색하거나, &ldquo;이런 게 있었으면&rdquo; 싶을 때.
          <br className="hidden sm:block" />
          한 줄이라도 좋으니 알려주세요 &mdash; 연구소가 직접 읽습니다.
        </p>
        <p className={`mt-4 text-[13px] ${INK_MUTED}`}>
          평균 확인 1~2일 · 답변은 가입하신 이메일로 보내드립니다
        </p>
      </div>

      <m.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="shrink-0"
      >
        <Image
          src={fortuneTeaHouseAssets.cutout.flowerPig}
          alt="의견을 기다리는 꽃돼지 연이"
          width={148}
          height={148}
          unoptimized
          priority
          className="h-[104px] w-[104px] object-contain drop-shadow-[0_10px_24px_rgba(179,25,85,0.18)] sm:h-[148px] sm:w-[148px] dark:drop-shadow-[0_10px_24px_rgba(196,181,253,0.24)]"
        />
      </m.div>
    </header>
  );
}
