"use client";

import { AnimatePresence, m } from "framer-motion";
import SajuComputingAnimation from "./CrackingEggAnimation";
import FlipCardReveal from "./FlipCardReveal";

interface Props {
  mode: "calculating" | "revealing";
}

const ANIMAL_REVEAL_ANIMATION_TEXT_TRANSLATIONS = {
  ko: {
    loading: "사주 천문반에서 십이운성 좌표를 추출하고 있습니다.",
    loadingSub: "입력한 출생 정보를 기준으로 수호 동물의 인장을 호출 중입니다.",
    completeTitle: "별자리 해독 완료",
    completeSubtitle: "당신의 십이운성 수호 동물이 모습을 드러냅니다",
  },
  en: {
    loading: "Extracting Twelve Growth coordinates from the saju celestial chart.",
    loadingSub: "Calling the seal of your guardian animal from the birth information you entered.",
    completeTitle: "Starlight Decoding Complete",
    completeSubtitle: "Your Twelve Growth guardian animal is coming into view",
  },
  ja: {
    loading: "四柱天文盤から十二運星の座標を抽出しています。",
    loadingSub: "入力された出生情報をもとに、守護動物の印を呼び出しています。",
    completeTitle: "星座解読完了",
    completeSubtitle: "あなたの十二運星の守護動物が姿を現します",
  },
} as const;

export default function AnimalRevealAnimation({ mode }: Props) {
  const copy = ANIMAL_REVEAL_ANIMATION_TEXT_TRANSLATIONS.ko;
  return (
    <section className="space-y-4 rounded-2xl border border-cyan-100/20 bg-[linear-gradient(160deg,rgba(9,27,55,0.74),rgba(10,16,40,0.7))] p-4">
      <div className="space-y-1 text-sm font-semibold text-cyan-50">
        <p>{copy.loading}</p>
        <p className="text-xs font-normal text-cyan-100/78">
          {copy.loadingSub}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {mode === "calculating" ? (
          <m.div key="calc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SajuComputingAnimation />
          </m.div>
        ) : (
          <m.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FlipCardReveal title={copy.completeTitle} subtitle={copy.completeSubtitle} />
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}

