"use client";

import { motion } from "framer-motion";

type Props = {
  onStart: () => void;
  onPreview: () => void;
};

const ELEMENTS = ["木", "火", "土", "金", "水"];

export default function FptiHero({ onStart, onPreview }: Props) {
  return (
    <section className="relative isolate overflow-hidden rounded-[32px] border border-white/15 bg-[radial-gradient(circle_at_14%_18%,rgba(124,58,237,0.34),transparent_46%),radial-gradient(circle_at_82%_22%,rgba(96,165,250,0.28),transparent_44%),radial-gradient(circle_at_60%_84%,rgba(246,211,101,0.17),transparent_52%),linear-gradient(135deg,#050617_0%,#0b1026_44%,#130a2a_100%)] p-6 text-slate-50 shadow-[0_28px_90px_rgba(4,8,28,0.62)] md:p-10">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background:radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.18)_1px,transparent_1px),radial-gradient(circle_at_78%_72%,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:26px_26px,32px_32px]" />
      <div className="pointer-events-none absolute -left-24 top-10 h-60 w-60 rounded-full bg-[#7C3AED]/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-60 w-60 rounded-full bg-[#60A5FA]/30 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-end"
      >
        <div>
          <p className="inline-flex rounded-full border border-[#E9C46A]/55 bg-[#E9C46A]/12 px-3 py-1 text-[11px] tracking-[0.22em] text-[#F6D365]">
            운명은 타고나고, 성격은 발견된다
          </p>
          <h1
            className="mt-4 text-4xl leading-[1.02] text-[#F8FAFC] md:text-6xl"
            style={{ fontFamily: "'Cormorant Garamond', 'Noto Serif KR', serif", textShadow: "0 8px 42px rgba(76,29,149,0.45)" }}
          >
            사주로 보는 FPTI 테스트
          </h1>
          <p className="mt-4 text-base text-[#dbe5ff] md:text-lg">생년월일시로 읽는 나만의 성격 코드</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#CBD5E1] md:text-[15px]">
            일간, 오행, 십성, 월지, 조후의 흐름을 분석해 당신의 타고난 기질과 관계 방식, 성장 전략을
            하나의 FPTI 코드로 보여드립니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onStart}
              className="rounded-full bg-[linear-gradient(120deg,#7C3AED,#4C1D95,#F6D365)] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(246,211,101,0.35)]"
            >
              성격 유형 분석 시작하기
            </button>
            <button
              type="button"
              onClick={onPreview}
              className="rounded-full border border-[#E9C46A]/60 bg-white/5 px-5 py-3 text-sm text-[#F6D365] transition hover:bg-[#F6D365]/10"
            >
              샘플 결과 보기
            </button>
          </div>

          <div className="mt-6 grid max-w-xl grid-cols-5 gap-2 text-center text-sm">
            {ELEMENTS.map((item, idx) => (
              <motion.div
                key={item}
                animate={{ y: [0, -4, 0], opacity: [0.82, 1, 0.82] }}
                transition={{ duration: 3.2, repeat: Infinity, delay: idx * 0.18 }}
                className="rounded-xl border border-white/15 bg-white/5 py-2 backdrop-blur"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
          transition={{ delay: 0.15, duration: 0.45, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
          className="rounded-[28px] border border-white/20 bg-white/10 p-5 backdrop-blur-xl"
        >
          <p className="text-[11px] tracking-[0.2em] text-[#bfdbfe]">SAMPLE RESULT</p>
          <p className="mt-2 text-4xl font-bold text-[#F6D365]">A-S-D-H</p>
          <p className="mt-1 text-base font-semibold text-white">심해의 예언자</p>
          <p className="mt-1 text-sm text-[#d4dcff]">깊은 통찰과 직관으로 보이지 않는 가능성을 읽어내는 타입</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#f8fafc]">
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">A: Water / 지성형</div>
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">S: Scholar / 통찰형</div>
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">D: Deep / 깊은 관계형</div>
            <div className="rounded-xl border border-white/15 bg-[#0B1026]/65 p-2">H: Healing / 치유 성장형</div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px] text-[#CBD5E1]">
            {[
              ["년주", "甲子"],
              ["월주", "壬子"],
              ["일주", "壬辰"],
              ["시주", "乙卯"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/15 bg-black/25 p-2">
                <p>{label}</p>
                <p className="mt-1 text-sm font-semibold text-[#F6D365]">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
