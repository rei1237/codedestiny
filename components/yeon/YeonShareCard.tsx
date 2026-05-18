"use client";

import { forwardRef } from "react";
import type { YeonMessageOutput, YeonMood, ZodiacSign } from "@/lib/yeon/types";
import { getYeonSpriteSequence } from "@/lib/yeon/sprite";
import YeonSpriteFrame from "./YeonSpriteFrame";

type Props = {
  mode: "story" | "square";
  mood: YeonMood;
  sign: ZodiacSign;
  message: YeonMessageOutput;
  background: string;
};

const YeonShareCard = forwardRef<HTMLDivElement, Props>(function YeonShareCard(
  { mode, mood, sign, message, background },
  ref
) {
  const frame = getYeonSpriteSequence(sign, mood)[0] || 1;
  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-[28px] border border-white/25 p-6 text-white ${
        mode === "story" ? "aspect-[9/16] w-full max-w-[360px]" : "aspect-square w-full max-w-[360px]"
      }`}
      style={{ background }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_14%,rgba(255,255,255,0.26),transparent_38%)]" aria-hidden />
      <div className="absolute right-4 top-4 h-16 w-16 rounded-2xl border border-white/35 bg-white/12 p-1">
        <YeonSpriteFrame frame={frame} className="h-full w-full rounded-xl" ariaLabel={`연이 카드 ${sign} ${mood}`} />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <p className="text-xs font-semibold tracking-[0.14em] text-white/85">오늘의 마음 별자리</p>
        <h4 className="mt-2 text-2xl font-black">{message.zodiac_sign}</h4>
        <p className="mt-2 text-sm font-semibold text-white/95">키워드: {message.weekly_vibe.keyword}</p>

        <div className="mt-4 rounded-2xl border border-white/30 bg-black/15 p-3 text-sm leading-6">
          {message.share_card.short_message}
        </div>

        <div className="mt-4 rounded-2xl border border-white/30 bg-black/15 p-3 text-sm leading-6">
          <p className="font-semibold">연이의 작은 행복</p>
          <p>{message.small_joy.item}</p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="h-24 w-24 rounded-2xl border border-white/35 bg-white/10 p-2">
            <YeonSpriteFrame frame={frame} className="h-full w-full rounded-xl" ariaLabel={`연이 카드 하단 ${sign}`} />
          </div>
          <p className="text-right text-xs font-semibold text-white/82">Code:Destiny</p>
        </div>
      </div>
    </div>
  );
});

export default YeonShareCard;
