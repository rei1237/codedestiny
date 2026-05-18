"use client";

import { motion } from "framer-motion";
import type { YeonMessageOutput } from "@/lib/yeon/types";
import YeonTypewriterBubble from "./YeonTypewriterBubble";

type Props = {
  message: YeonMessageOutput;
};

function TimelineCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.18),rgba(255,255,255,0.1))] p-4 shadow-[0_12px_28px_rgba(32,24,74,0.24)] backdrop-blur-lg">
      <h3 className="mb-2 text-base font-bold text-white">{title}</h3>
      <div className="text-sm leading-7 text-white/92">{children}</div>
    </div>
  );
}

export default function YeonMessageTimeline({ message }: Props) {
  const cards = [
    {
      key: "vibe",
      title: "오늘의 별빛 키워드",
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
      title: "연이의 작은 행복 처방",
      content: (
        <>
          <p>아이템: {message.small_joy.item}</p>
          <p>실천: {message.small_joy.action}</p>
          <p>{message.small_joy.reason}</p>
        </>
      ),
    },
    {
      key: "advice",
      title: "사랑/일/돈/관계의 부드러운 힌트",
      content: (
        <>
          <p>사랑: {message.gentle_advice.love}</p>
          <p>일: {message.gentle_advice.work}</p>
          <p>돈: {message.gentle_advice.money}</p>
          <p>관계: {message.gentle_advice.relationship}</p>
        </>
      ),
    },
  ];

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
