"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Sun, Sunrise, ShieldAlert, Compass, Trophy } from "lucide-react";

type SolarCardRole = "상처" | "현재" | "조언" | "결과";

type SolarCard = {
  role: SolarCardRole;
  title: string;
  solarSymbol: string;
  message: string;
};

const defaultCards: SolarCard[] = [
  {
    role: "상처",
    title: "마음의 균열",
    solarSymbol: "새벽 전의 짙은 그림자",
    message: "자네, 마음속 그늘이 깊었구먼. 그러나 이 어둠은 해가 떠오르기 직전의 시간이라네.",
  },
  {
    role: "현재",
    title: "숨결의 온도",
    solarSymbol: "정오의 태양열",
    message: "지금의 감정은 약함이 아니라 살아 있다는 증표라네. 그 뜨거움을 두려워하지 말게.",
  },
  {
    role: "조언",
    title: "빛의 길잡이",
    solarSymbol: "황금빛 사선 광선",
    message: "한 번에 다 고치려 하지 말게. 볕 드는 창가에서 작은 결심 하나면 충분하네.",
  },
  {
    role: "결과",
    title: "해오름의 결실",
    solarSymbol: "내일을 여는 첫 햇살",
    message: "자네의 발걸음이 다시 환해질 걸세. 오늘의 작은 실행이 내일의 큰 회복이 된다네.",
  },
];

const roleIconMap = {
  상처: ShieldAlert,
  현재: Sun,
  조언: Compass,
  결과: Trophy,
} as const;

export default function SolarOracleTarot({
  cards = defaultCards,
  welcomeMessage = "어서 오게. 나는 반세기 동안 카드를 읽어 온 사람일세. 자네 마음에 드리운 구름도 결국 태양 앞에선 길을 내주게 되어 있지.",
}: {
  cards?: SolarCard[];
  welcomeMessage?: string;
}) {
  const [awakened, setAwakened] = useState(false);

  const normalizedCards = useMemo(() => cards.slice(0, 4), [cards]);

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-amber-300/40 bg-white/10 p-6 text-amber-50 shadow-[0_30px_80px_rgba(21,6,38,0.55)] backdrop-blur-xl md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(255,211,116,0.34)_0%,rgba(255,201,101,0.12)_26%,rgba(62,30,108,0.85)_70%,rgba(26,10,45,1)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(155deg,#1b0b32_0%,#31185a_40%,#7d5494_72%,#c9954e_100%)] opacity-80" />

      <AnimatePresence>
        {awakened ? (
          <motion.div
            key="solar-burst"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0.2], scale: [0.5, 1.05, 1.2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,rgba(255,233,170,0.95)_0%,rgba(255,215,120,0.45)_36%,transparent_72%)]"
            onAnimationComplete={() => setAwakened(false)}
          />
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 space-y-5">
        <header className="rounded-2xl border border-amber-200/40 bg-white/15 p-5 backdrop-blur-md">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200/45 bg-white/10 px-3 py-1 text-xs tracking-[0.18em] text-amber-100/90">
            <Sunrise className="h-3.5 w-3.5" />
            THE SOLAR ORACLE
          </div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">태양의 화답</h2>
          <p className="mt-3 text-sm leading-7 text-amber-50/90">{welcomeMessage}</p>
        </header>

        <button
          type="button"
          onClick={() => setAwakened(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-200/95 to-amber-400/90 px-5 py-3 font-semibold text-amber-950 shadow-[0_10px_30px_rgba(255,194,90,0.35)] transition hover:brightness-105"
        >
          <Sparkles className="h-4 w-4" />
          내 안의 빛을 깨우기
        </button>

        <div className="grid gap-3 md:grid-cols-2">
          {normalizedCards.map((card, idx) => {
            const Icon = roleIconMap[card.role];
            return (
              <motion.article
                key={`${card.role}-${idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="rounded-2xl border border-amber-200/45 bg-white/12 p-4 backdrop-blur-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100">
                    <Icon className="h-4 w-4" />
                    {card.role}
                  </div>
                  <span className="text-xs text-amber-200/90">{card.solarSymbol}</span>
                </div>
                <p className="text-sm font-medium text-amber-50">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-amber-100/90">{card.message}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
