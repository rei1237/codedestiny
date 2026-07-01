"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import type { YeonMood, ZodiacSign } from "@/lib/yeon/types";
import { getYeonSpriteSequence } from "@/lib/yeon/sprite";
import YeonSpriteFrame from "./YeonSpriteFrame";

type Props = {
  mood: YeonMood;
  sign: ZodiacSign;
};

type LoadingLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW";

function normalizeYeonFloatingLocale(value?: string | null): LoadingLocale {
  const normalized = String(value || "").toLowerCase();
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized === "zh-tw" || normalized === "zh-hant") return "zh-TW";
  if (normalized.startsWith("zh")) return "zh-CN";
  return "ko";
}

function getCurrentYeonFloatingLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { cdGetCurrentLanguage?: () => string }).cdGetCurrentLanguage?.();
  if (runtimeLanguage) return normalizeYeonFloatingLocale(runtimeLanguage);
  try {
    const stored = window.localStorage.getItem("cd_locale") || window.localStorage.getItem("locale");
    if (stored) return normalizeYeonFloatingLocale(stored);
  } catch (_) {}
  return normalizeYeonFloatingLocale(window.document?.documentElement?.lang || window.navigator?.language);
}

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
  const spriteGate = useSpritePlaybackGate<HTMLDivElement>();
  const frames = useMemo(() => getYeonSpriteSequence(sign, mood), [sign, mood]);
  const [cursor, setCursor] = useState(0);
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentYeonFloatingLocale());
  const copy = getYeonFloatingCharacterCopy(locale);

  useEffect(() => {
    setCursor(0);
    if (!spriteGate.canAnimate) return undefined;
    const timer = window.setInterval(() => {
      setCursor((prev) => (prev + 1) % frames.length);
    }, 850);
    return () => window.clearInterval(timer);
  }, [frames, spriteGate.canAnimate]);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentYeonFloatingLocale());
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
      ref={spriteGate.ref}
      className="relative mx-auto h-56 w-56 md:h-64 md:w-64"
      animate={spriteGate.canAnimate ? { y: [-6, 6, -6] } : { y: 0 }}
      transition={spriteGate.canAnimate ? { duration: 4.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
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
          animate={spriteGate.canAnimate ? { opacity: [0.15, 0.9, 0.15], scale: [0.7, 1.2, 0.7] } : { opacity: 0.3, scale: 1 }}
          transition={spriteGate.canAnimate ? { duration: 2.6 + n * 0.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
          aria-hidden
        >
          ✦
        </motion.span>
      ))}
    </motion.div>
  );
}
