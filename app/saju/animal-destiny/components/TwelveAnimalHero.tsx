"use client";

import { m } from "framer-motion";

const FLOATING_CARDS = ["🦌", "🐈", "🦊", "🐶", "🦁", "🦉", "🐰", "🦋"];

type Props = {
  onStart?: () => void;
  onReview?: () => void;
};

export default function TwelveAnimalHero({ onStart, onReview }: Props) {
  return (
    <section className="relative w-full overflow-hidden px-4 pb-7 pt-4 sm:px-6 sm:pt-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,255,255,0.86),transparent_35%),radial-gradient(circle_at_82%_14%,rgba(176,214,255,0.28),transparent_34%),radial-gradient(circle_at_50%_96%,rgba(255,226,170,0.24),transparent_36%)]" />

      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#b9d5ef] bg-[linear-gradient(165deg,#f7fcff_0%,#f5f9ff_46%,#fff8ef_100%)] p-5 shadow-[0_22px_50px_rgba(64,109,152,0.16)] sm:p-9">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,transparent_0%,rgba(255,255,255,0.56)_41%,transparent_70%)]" />
        <div className="pointer-events-none absolute -left-16 top-12 h-40 w-40 rounded-full bg-[#d9ecff]/60 blur-2xl" />
        <div className="pointer-events-none absolute -right-14 bottom-8 h-40 w-40 rounded-full bg-[#ffe7b8]/55 blur-2xl" />

        <div className="relative z-10 grid min-w-0 items-center gap-7 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 space-y-4">
            <m.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex rounded-full border border-[#9cc3e5] bg-white px-3 py-1 text-[11px] font-black tracking-[0.18em] text-[#375f8a]"
            >
              운명의 동물 도감
            </m.p>

            {/* 페이지의 H1 은 page.tsx 의 ServiceIntroSection 이 소유한다. */}
            <m.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-balance text-3xl font-black leading-tight text-[#254769] sm:text-5xl"
            >
              나의 십이운성 동물은?
            </m.h2>

            <m.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="max-w-2xl text-sm font-semibold leading-relaxed text-[#3b6080] sm:text-base"
            >
              태어난 사주의 에너지로 알아보는 나만의 운명 동물 도감.
              12단계 성장 여정을 통해 핵심 성향과 실전 조언을 한 번에 확인해 보세요.
            </m.p>

            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="flex min-w-0 gap-2 overflow-x-auto pb-1"
            >
              {FLOATING_CARDS.map((animal, index) => (
                <span
                  key={`${animal}-${index}`}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c5ddf3] bg-white/88 text-xl shadow-[0_6px_16px_rgba(80,126,170,0.16)]"
                >
                  {animal}
                </span>
              ))}
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22 }}
              className="flex flex-col gap-2.5 sm:flex-row"
            >
              <button
                type="button"
                onClick={onStart}
                className="min-h-[46px] rounded-2xl bg-[linear-gradient(120deg,#2f80c5,#4aa6d8,#f0b862)] px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(45,117,182,0.3)] transition hover:brightness-105 active:scale-[0.99]"
              >
                내 동물 찾기
              </button>
              <button
                type="button"
                onClick={onReview}
                className="min-h-[46px] rounded-2xl border border-[#a9cbe8] bg-white/92 px-5 py-3 text-sm font-black text-[#2b5f8d] transition hover:bg-[#f3f9ff] active:scale-[0.99]"
              >
                결과 다시 보기
              </button>
            </m.div>
          </div>

          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto w-full max-w-[240px] lg:ml-auto lg:mr-0"
          >
            <div className="rounded-[1.6rem] border border-[#b8d5ef] bg-white/82 p-5 shadow-[0_14px_34px_rgba(58,111,160,0.2)] backdrop-blur-sm">
              <p className="text-xs font-black tracking-[0.12em] text-[#41698f]">12단계 성장 여정</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#355e83]">
                장생부터 양까지,
                당신의 오늘을 움직이는 운성 흐름을
                동물 운명록으로 정리해 드립니다.
              </p>
              <div className="mt-4 grid grid-cols-4 gap-2 text-lg">
                {["⭐", "☁️", "🧭", "🎴", "🌿", "🌙", "✨", "🧿"].map((icon, index) => (
                  <span key={`${icon}-${index}`} className="flex h-9 items-center justify-center rounded-xl bg-[#eef6ff]">
                    {icon}
                  </span>
                ))}
              </div>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  );
}
