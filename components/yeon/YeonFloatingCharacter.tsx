"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { YeonMood, ZodiacSign } from "@/lib/yeon/types";
import { getYeonSpriteSequence } from "@/lib/yeon/sprite";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import YeonSpriteFrame from "./YeonSpriteFrame";

type Props = {
  mood: YeonMood;
  sign: ZodiacSign;
};

const YEON_FLOATING_CHARACTER_COPY = {
  ko: {
    ariaLabel: "연이 캐릭터",
  },
  en: {
    ariaLabel: "Yeon character",
  },
  ja: {
    ariaLabel: "ヨニのキャラクター",
  },
  zh: {
    ariaLabel: "缘伊角色",
  },
};

function getYeonFloatingCharacterCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja") return YEON_FLOATING_CHARACTER_COPY[locale];
  if (locale === "zh-CN" || locale === "zh-TW") return YEON_FLOATING_CHARACTER_COPY.zh;
  return YEON_FLOATING_CHARACTER_COPY.ko;
}

export default function YeonFloatingCharacter({ mood, sign }: Props) {
  const frames = useMemo(() => getYeonSpriteSequence(sign, mood), [sign, mood]);
  const [cursor, setCursor] = useState(0);
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getYeonFloatingCharacterCopy(locale);

  useEffect(() => {
    setCursor(0);
    const timer = window.setInterval(() => {
      setCursor((prev) => (prev + 1) % frames.length);
    }, 850);
    return () => window.clearInterval(timer);
  }, [frames]);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
    };
  }, []);

  const frame = frames[cursor] || 1;

  return (
    <motion.div
      className="relative mx-auto h-56 w-56 md:h-64 md:w-64"
      animate={{ y: [-6, 6, -6] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      aria-label={copy.ariaLabel}
    >
      <div className="absolute inset-0 rounded-full border border-white/35 bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.36),transparent_44%),radial-gradient(circle_at_74%_72%,rgba(145,164,255,0.24),transparent_46%),rgba(8,10,34,0.35)]" />
      <motion.div
        key={`${mood}-${frame}`}
        className="absolute inset-[8%] rounded-full border border-white/45 bg-white/10 p-2 backdrop-blur-sm"
        initial={{ opacity: 0.85, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <YeonSpriteFrame frame={frame} className="h-full w-full rounded-full" ariaLabel={`연이 ${sign} ${mood}`} />
      </motion.div>

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
