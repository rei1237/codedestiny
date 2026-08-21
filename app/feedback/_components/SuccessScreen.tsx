"use client";

import { useState } from "react";
import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";
import { Check, Copy, Home, PenLine } from "lucide-react";

import { fortuneTeaHouseAssets } from "@/src/features/fortune-tea-house/data/assets";
import { hardNavigateToShellHome } from "@/lib/navigation/shellHome";
import type { SubmittedFeedback } from "../_lib/api";
import { useFeedbackCopy } from "../_lib/copy";
import { CTA_BUTTON, GHOST_BUTTON, GLASS_CARD, INK, INK_MUTED } from "../_lib/styles";

// 좌표 링은 유틸리티 클래스로 표현할 수 없어 장식용 span 에만 인라인 좌표를 쓴다.
const SPARKLES = Object.freeze([
  { left: "8%", top: "18%" }, { left: "22%", top: "6%" }, { left: "38%", top: "22%" },
  { left: "54%", top: "4%" }, { left: "70%", top: "20%" }, { left: "86%", top: "12%" },
  { left: "14%", top: "62%" }, { left: "32%", top: "76%" }, { left: "66%", top: "70%" },
  { left: "88%", top: "56%" },
]);

interface SuccessScreenProps {
  submitted: SubmittedFeedback;
  onWriteAnother: () => void;
}

export default function SuccessScreen({ submitted, onWriteAnother }: SuccessScreenProps) {
  const reduceMotion = useReducedMotion();
  const copy = useFeedbackCopy();
  const [copied, setCopied] = useState(false);

  const copyTicket = async () => {
    try {
      await navigator.clipboard.writeText(submitted.ticketNo);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없을 수 있다. 티켓번호는 화면에 그대로 보이므로 조용히 넘어간다.
    }
  };

  return (
    <div className={`${GLASS_CARD} relative overflow-hidden px-6 py-10 text-center sm:px-10`}>
      {/* Lottie 대체 — lottie/canvas-confetti 는 의존성에 없고 신규 도입은 프로젝트 규칙상 지양이다.
          styles/fortune-ui.css 의 hv-sparkle 키프레임을 framer 배열로 옮겼다. */}
      {!reduceMotion && SPARKLES.map((sparkle, index) => (
        <m.span
          key={index}
          aria-hidden="true"
          className="pointer-events-none absolute h-2 w-2 rounded-full bg-[#ead089] dark:bg-[#e8d5a3]"
          style={{ left: sparkle.left, top: sparkle.top }}
          initial={{ scale: 0, opacity: 0, rotate: 0 }}
          animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 1.4, delay: index * 0.08, repeat: 2, ease: "easeInOut" }}
        />
      ))}

      <m.div
        initial={reduceMotion ? false : { scale: 0.6, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="mx-auto w-fit"
      >
        <Image
          src={fortuneTeaHouseAssets.rewards.flowerPigHoneyHug}
          alt={copy.successImageAlt}
          width={180}
          height={180}
          unoptimized
          priority
          className="h-[150px] w-[150px] object-contain sm:h-[180px] sm:w-[180px]"
        />
      </m.div>

      <h2 className={`mt-5 text-[clamp(1.4rem,4vw,1.9rem)] font-black tracking-tight ${INK}`}>
        {copy.successTitle}
      </h2>
      <p className={`mx-auto mt-3 max-w-[44ch] text-[15px] leading-[1.8] ${INK_MUTED}`} role="status" aria-live="polite">
        {copy.successBody}
      </p>

      {submitted.ticketNo && (
        <div className="mx-auto mt-6 flex w-fit items-center gap-3 rounded-2xl border border-[rgba(216,63,120,0.2)] bg-white/70 px-4 py-3 dark:border-white/12 dark:bg-white/[0.05]">
          <div className="text-left">
            <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${INK_MUTED}`}>{copy.successTicketLabel}</p>
            <p className={`font-mono text-[15px] font-black ${INK}`}>{submitted.ticketNo}</p>
          </div>
          <button
            type="button"
            onClick={copyTicket}
            aria-label={copy.successCopyAria}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(216,63,120,0.2)] text-[#b31955] transition-colors hover:bg-[#b31955]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b31955] dark:border-white/12 dark:text-[#c4b5fd] dark:hover:bg-white/[0.08] dark:focus-visible:ring-[#c4b5fd]"
          >
            {copied
              ? <Check aria-hidden="true" className="h-4 w-4" />
              : <Copy aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
      )}

      <p className={`mt-4 text-[13px] ${INK_MUTED}`}>
        {copy.avgResponseNote}
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button type="button" onClick={onWriteAnother} className={`${CTA_BUTTON} w-full sm:w-auto`}>
          <PenLine aria-hidden="true" className="h-4 w-4" />
          {copy.successWriteAnother}
        </button>
        {/* 홈은 정적 셸이라 router.push 로 가면 플래시가 난다. */}
        <button type="button" onClick={() => hardNavigateToShellHome()} className={`${GHOST_BUTTON} w-full sm:w-auto`}>
          <Home aria-hidden="true" className="h-4 w-4" />
          {copy.successGoHome}
        </button>
      </div>
    </div>
  );
}
