"use client";

import { forwardRef } from "react";
import type { YeonMessageOutput, YeonMood } from "@/lib/yeon/types";

const CARD_YEON_IMAGE =
  "/fuctionassets/%EC%97%B0%EC%9D%B4%EC%9D%98%20%EB%A7%88%EC%9D%8C%20%EB%B3%84%EC%9E%90%EB%A6%AC.webp";
const SPRITE_URL =
  "/fuctionassets/%EC%97%B0%EC%9D%B4%20%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%8A%A4%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8A%B8%20%EC%8B%9C%ED%8A%B8.webp";

const moodFrameMap: Record<YeonMood, number> = {
  happy: 4,
  tired: 2,
  anxious: 6,
  lonely: 7,
  angry: 9,
  blank: 8,
  hopeful: 10,
};

function frameToPosition(frame: number) {
  const cols = 4;
  const rows = 3;
  const index = Math.max(1, Math.min(12, frame)) - 1;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: (col / (cols - 1)) * 100,
    y: (row / (rows - 1)) * 100,
  };
}

type Props = {
  mode: "story" | "square";
  mood: YeonMood;
  message: YeonMessageOutput;
  background: string;
};

const YeonShareCard = forwardRef<HTMLDivElement, Props>(function YeonShareCard(
  { mode, mood, message, background },
  ref
) {
  const framePos = frameToPosition(moodFrameMap[mood]);
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
        <div
          className="h-full w-full rounded-xl"
          style={{
            backgroundImage: `url(${SPRITE_URL})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "400% 300%",
            backgroundPosition: `${framePos.x}% ${framePos.y}%`,
          }}
        />
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
          <img
            src={CARD_YEON_IMAGE}
            alt="연이"
            className="h-24 w-24 rounded-2xl border border-white/35 object-cover"
            loading="lazy"
            decoding="async"
          />
          <p className="text-right text-xs font-semibold text-white/82">Code:Destiny</p>
        </div>
      </div>
    </div>
  );
});

export default YeonShareCard;
