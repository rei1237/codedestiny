"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { YeonMessageOutput } from "@/lib/yeon/types";
import YeonTypewriterBubble from "./YeonTypewriterBubble";

type Props = {
  message: YeonMessageOutput;
};

type LoadingLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW";

function normalizeYeonTimelineLocale(value?: string | null): LoadingLocale {
  const normalized = String(value || "").toLowerCase();
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized === "zh-tw" || normalized === "zh-hant") return "zh-TW";
  if (normalized.startsWith("zh")) return "zh-CN";
  return "ko";
}

function getCurrentYeonTimelineLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { cdGetCurrentLanguage?: () => string }).cdGetCurrentLanguage?.();
  if (runtimeLanguage) return normalizeYeonTimelineLocale(runtimeLanguage);
  try {
    const stored = window.localStorage.getItem("cd_locale") || window.localStorage.getItem("locale");
    if (stored) return normalizeYeonTimelineLocale(stored);
  } catch (_) {}
  return normalizeYeonTimelineLocale(window.document?.documentElement?.lang || window.navigator?.language);
}

function TimelineCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.18),rgba(255,255,255,0.1))] p-4 shadow-[0_12px_28px_rgba(32,24,74,0.24)] backdrop-blur-lg">
      <h3 className="mb-2 text-base font-bold text-white">{title}</h3>
      <div className="text-sm leading-7 text-white/92">{children}</div>
    </div>
  );
}

const YEON_MESSAGE_TIMELINE_TEXT_TRANSLATIONS = {
  ko: {
    vibeTitle: "오늘의 별빛 키워드",
    joyTitle: "연이의 작은 행복 처방",
    adviceTitle: "사랑/일/돈/관계의 부드러운 힌트",
    itemLabel: "아이템",
    actionLabel: "실천",
    loveLabel: "사랑",
    workLabel: "일",
    moneyLabel: "돈",
    relationshipLabel: "관계",
  },
  en: {
    vibeTitle: "Today’s Starlight Keyword",
    joyTitle: "Yeon’s Small Joy Prescription",
    adviceTitle: "Gentle Hints for Love, Work, Money, and Ties",
    itemLabel: "Item",
    actionLabel: "Practice",
    loveLabel: "Love",
    workLabel: "Work",
    moneyLabel: "Money",
    relationshipLabel: "Relationships",
  },
  ja: {
    vibeTitle: "今日の星明かりキーワード",
    joyTitle: "ヨンの小さな幸せ処方",
    adviceTitle: "恋・仕事・お金・関係へのやさしいヒント",
    itemLabel: "アイテム",
    actionLabel: "実践",
    loveLabel: "恋愛",
    workLabel: "仕事",
    moneyLabel: "お金",
    relationshipLabel: "関係",
  },
} as const;

function getYeonMessageTimelineCopy(locale: LoadingLocale) {
  return YEON_MESSAGE_TIMELINE_TEXT_TRANSLATIONS[locale as "ko" | "en" | "ja"] || YEON_MESSAGE_TIMELINE_TEXT_TRANSLATIONS.ko;
}

export default function YeonMessageTimeline({ message }: Props) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentYeonTimelineLocale());
  const copy = getYeonMessageTimelineCopy(locale);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentYeonTimelineLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  const cards = useMemo(() => [
    {
      key: "vibe",
      title: copy.vibeTitle,
      content: (
        <>
          <p className="font-semibold">{message.weekly_vibe.keyword}</p>
          <p className="text-white/80">{message.weekly_vibe.sub_keyword}</p>
          <p>{message.weekly_vibe.summary}</p>
        </>
      ),
    },
    {
      key: "hug",
      title: message.yeon_is_hug.title,
      content: <YeonTypewriterBubble lines={message.yeon_is_hug.message} />,
    },
    {
      key: "joy",
      title: copy.joyTitle,
      content: (
        <>
          <p>{copy.itemLabel}: {message.small_joy.item}</p>
          <p>{copy.actionLabel}: {message.small_joy.action}</p>
          <p>{message.small_joy.reason}</p>
        </>
      ),
    },
    {
      key: "advice",
      title: copy.adviceTitle,
      content: (
        <>
          <p>{copy.loveLabel}: {message.gentle_advice.love}</p>
          <p>{copy.workLabel}: {message.gentle_advice.work}</p>
          <p>{copy.moneyLabel}: {message.gentle_advice.money}</p>
          <p>{copy.relationshipLabel}: {message.gentle_advice.relationship}</p>
        </>
      ),
    },
  ], [copy, message]);

  return (
    <div className="space-y-3.5">
      {cards.map((card, idx) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: idx * 0.08, ease: "easeOut" }}
        >
          <TimelineCard title={card.title}>{card.content}</TimelineCard>
        </motion.div>
      ))}
    </div>
  );
}
