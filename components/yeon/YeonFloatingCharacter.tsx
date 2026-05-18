"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { YeonMood } from "@/lib/yeon/types";

const SPRITE_URL =
  "/fuctionassets/%EC%97%B0%EC%9D%B4%20%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%8A%A4%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8A%B8%20%EC%8B%9C%ED%8A%B8.webp";

const BASE_URL = "/fuctionassets/yeon.webp";

const moodFrames: Record<YeonMood, number[]> = {
  happy: [4, 10, 3],
  tired: [2, 5],
  anxious: [6, 12],
  lonely: [5, 7],
  angry: [9, 3],
  blank: [8, 2],
  hopeful: [10, 11, 7],
};

const SPRITE_COLS = 4;
const SPRITE_ROWS = 3;

type Props = {
  mood: YeonMood;
};

function frameToPosition(frame: number) {
  const index = Math.max(1, Math.min(12, frame)) - 1;
  const col = index % SPRITE_COLS;
  const row = Math.floor(index / SPRITE_COLS);
  const x = (col / (SPRITE_COLS - 1)) * 100;
  const y = (row / (SPRITE_ROWS - 1)) * 100;
  return { x, y };
}

export default function YeonFloatingCharacter({ mood }: Props) {
  const frames = useMemo(() => moodFrames[mood] || [1], [mood]);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    setCursor(0);
    const timer = window.setInterval(() => {
      setCursor((prev) => (prev + 1) % frames.length);
    }, 850);
    return () => window.clearInterval(timer);
  }, [frames]);

  const frame = frames[cursor] || 1;
  const pos = frameToPosition(frame);

  return (
    <motion.div
      className="relative mx-auto h-56 w-56"
      animate={{ y: [-6, 6, -6] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      aria-label="연이 캐릭터"
    >
      <img
        src={BASE_URL}
        alt="연이"
        className="absolute inset-0 h-full w-full rounded-full object-contain opacity-20 blur-[1px]"
        loading="lazy"
        decoding="async"
      />
      <motion.div
        key={`${mood}-${frame}`}
        className="absolute inset-0 rounded-full"
        initial={{ opacity: 0.85, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        style={{
          backgroundImage: `url(${SPRITE_URL})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${SPRITE_COLS * 100}% ${SPRITE_ROWS * 100}%`,
          backgroundPosition: `${pos.x}% ${pos.y}%`,
        }}
      />

      {[0, 1, 2].map((n) => (
        <motion.span
          key={n}
          className="absolute text-sm text-white/80"
          style={{ left: `${20 + n * 28}%`, top: `${16 + (n % 2) * 24}%` }}
          animate={{ opacity: [0.15, 0.9, 0.15], scale: [0.7, 1.2, 0.7] }}
          transition={{ duration: 2.6 + n * 0.4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          ✦
        </motion.span>
      ))}
    </motion.div>
  );
}
