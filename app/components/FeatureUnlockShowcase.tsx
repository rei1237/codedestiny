"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type FeatureId = "flower" | "ziweiDeep" | "olympus";

type UnlockFeature = {
  id: FeatureId;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  badge: string;
  cta: string;
  accent: string;
  glow: string;
};

const premiumFeatures: UnlockFeature[] = [
  {
    id: "flower",
    title: "운명의 꽃",
    subtitle: "Flower of Destiny",
    description: "사주·점성술·자미두수 흐름을 하나의 상징 꽃으로 결합한 통합 아틀리에.",
    href: "/?action=openDestinyFlowerStudio",
    badge: "통합 상징 리딩",
    cta: "아틀리에 열기",
    accent: "from-fuchsia-200 via-rose-200 to-amber-200",
    glow: "from-fuchsia-400/35 via-rose-300/20 to-amber-300/25",
  },
  {
    id: "ziweiDeep",
    title: "심화 자미두수",
    subtitle: "Advanced Zi Wei Dou Shu",
    description: "명궁·신궁·사화·삼방사정·대한을 엮어 12궁의 실제 선택 흐름을 읽는 심화 상담.",
    href: "/ziwei/chart",
    badge: "12궁 심화 상담",
    cta: "심화 명반 열기",
    accent: "from-violet-200 via-indigo-200 to-cyan-200",
    glow: "from-violet-400/35 via-indigo-300/20 to-cyan-300/25",
  },
  {
    id: "olympus",
    title: "올림푸스 신탁",
    subtitle: "Olympus Oracle",
    description: "수호신, 별자리, 신화 상징을 결합한 프리미엄 신탁 리딩.",
    href: "/olympus",
    badge: "신화 상징 신탁",
    cta: "신탁 열기",
    accent: "from-amber-200 via-yellow-200 to-orange-200",
    glow: "from-amber-400/35 via-yellow-300/20 to-orange-300/25",
  },
];

export default function FeatureUnlockShowcase() {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-violet-200/20 bg-[linear-gradient(145deg,rgba(13,17,38,0.94),rgba(18,26,54,0.92)_48%,rgba(28,16,64,0.92))] p-4 shadow-[0_26px_60px_rgba(8,8,24,0.5)] md:p-6">
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-52 w-52 rounded-full bg-amber-400/15 blur-3xl" aria-hidden />

      <div className="relative z-10">
        <div className="mb-5 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/80">Premium Reading Paths</p>
          <h2 className="mt-2 text-xl font-black text-violet-50 md:text-2xl">심화 리딩 컬렉션</h2>
          <p className="mt-2 text-sm leading-6 text-violet-100/75">
            기본 명반 이후 더 깊은 해석이 필요할 때, 상징과 명반 근거를 분리해 상담형 리딩으로 이어갑니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {premiumFeatures.map((feature) => {
            return (
              <motion.article
                key={feature.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.05] p-4 backdrop-blur-xl"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.glow} opacity-35`} />

                <div className="relative z-10">
                  <p className={`inline-flex rounded-full bg-gradient-to-r ${feature.accent} bg-clip-text text-xs font-bold tracking-[0.14em] text-transparent`}>
                    {feature.subtitle}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-black text-white">{feature.title}</h3>
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-violet-50">{feature.badge}</span>
                  </div>
                  <p className="mt-2 min-h-[64px] text-sm leading-6 text-violet-100/80">{feature.description}</p>

                  <div className="mt-3 rounded-2xl border border-violet-200/25 bg-slate-950/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200/80">reading focus</p>
                    <p className="mt-1 text-sm text-violet-50/95">
                      개인 입력값과 서비스별 계산 근거를 바탕으로 다음 장면의 해석을 엽니다.
                    </p>
                  </div>
                </div>

                <motion.div
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="relative z-10 mt-4"
                >
                  <Link
                    href={feature.href}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-violet-200/35 bg-violet-600/80 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500"
                  >
                    {feature.cta}
                  </Link>
                </motion.div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
