"use client";
/**
 * PremiumSalesContent — 인생 총운 해금 세일즈 페이지 (클라이언트 컴포넌트)
 * CRO 전략: 공감 → 문제제기 → 차별성 → 베네핏 → 사회적 증명 → 가격 → CTA
 */

import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import OhangRadarChart from "../components/OhangRadarChart";

/* ─────────────────────────────────────────
   애니메이션 헬퍼
───────────────────────────────────────── */
function FadeInSection({ children, delay = 0, className = "", style }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   파티클 배경
───────────────────────────────────────── */
function StarField() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    x: (i * 137.5) % 100,
    y: (i * 73.1) % 100,
    size: 1 + (i % 3),
    dur: 3 + (i % 4),
    delay: (i * 0.35) % 3,
    color: i % 3 === 0 ? "#d4a843" : "#a78bfa",
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {stars.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, background: s.color }}
          animate={{ opacity: [0.1, 0.6, 0.1] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity }}
        />
      ))}
      {/* 배경 오브 */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-8"
        style={{ background: "radial-gradient(circle,#7c3aed,transparent 70%)", filter: "blur(80px)" }} />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full opacity-6"
        style={{ background: "radial-gradient(circle,#d4a843,transparent 70%)", filter: "blur(70px)" }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   섹션: 헤드라인 히어로
───────────────────────────────────────── */
function HeroSection({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center text-center px-4 py-20">
      <div className="max-w-2xl mx-auto">
        {/* 배지 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-8 border"
          style={{ background: "rgba(212,168,67,0.12)", borderColor: "rgba(212,168,67,0.35)", color: "#d4a843" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          CODE DESTINY · 인생 총운 해금
        </motion.div>

        {/* 메인 헤드라인 */}
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6 tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <span className="block text-white">노력해도</span>
          <span className="block" style={{
            background: "linear-gradient(135deg,#d4a843 0%,#f0c060 35%,#a78bfa 70%,#d4a843 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "gradient-x 4s ease infinite",
          }}>
            안 풀리는 이유,
          </span>
          <span className="block text-white">사주가 알고 있습니다</span>
        </motion.h1>

        {/* 서브헤드라인 */}
        <motion.p
          className="text-lg sm:text-xl text-violet-200/70 leading-relaxed mb-10 max-w-lg mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          AI가 분석한 <strong className="text-violet-100">8만 건의 실제 명조 데이터</strong>를 기반으로,
          당신의 운명이 막힌 <strong className="text-amber-300">정확한 이유와 타이밍</strong>을 알려드립니다.
        </motion.p>

        {/* CTA 버튼 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 items-center justify-center"
        >
          <GoldCTAButton onClick={onCTA} size="lg">
            🔓 지금 운명을 해금하기 — ₩49,000
          </GoldCTAButton>
          <span className="text-xs text-violet-400/40">· 즉시 발급 · 앱 설치 없음</span>
        </motion.div>

        {/* 신뢰 지표 */}
        <motion.div
          className="flex items-center justify-center gap-6 mt-10 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {[
            { num: "8만+", label: "분석 케이스" },
            { num: "98%", label: "사용자 만족도" },
            { num: "즉시", label: "리포트 발급" },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-xl font-black" style={{ background: "linear-gradient(135deg,#d4a843,#f0c060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {item.num}
              </div>
              <div className="text-[11px] text-violet-400/50 tracking-wide">{item.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 공감 (당신의 이야기)
───────────────────────────────────────── */
function EmpathySection() {
  const pains = [
    { icon: "😔", text: "분명히 열심히 했는데, 왜 나만 이렇게 제자리인 걸까요?" },
    { icon: "💸", text: "돈은 벌어도 자꾸 나가고, 재물이 쌓이지 않는 느낌" },
    { icon: "❤️‍🩹", text: "인연은 와도 오래 가지 않고, 외로움이 반복됩니다" },
    { icon: "😰", text: "중요한 선택 앞에서 확신이 없어 항상 뒤늦게 후회합니다" },
  ];

  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-xl mx-auto">
        <FadeInSection className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-4"
            style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>
            ✦ 당신만의 이야기가 아닙니다
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-4">
            혹시 이런 생각,<br />
            <span style={{ color: "#a78bfa" }}>해본 적 있으신가요?</span>
          </h2>
          <p className="text-sm text-violet-300/60 leading-relaxed">
            이 감정들은 의지 부족이 아닙니다. 당신의 명조(命造)에 담긴<br />
            에너지 흐름이 아직 당신에게 전달되지 않았을 뿐입니다.
          </p>
        </FadeInSection>

        <div className="space-y-3">
          {pains.map((pain, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <motion.div
                className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.12)" }}
                whileHover={{ borderColor: "rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.12)" }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-2xl flex-shrink-0">{pain.icon}</span>
                <p className="text-sm text-violet-100/80 leading-relaxed pt-0.5">{pain.text}</p>
              </motion.div>
            </FadeInSection>
          ))}
        </div>

        <FadeInSection delay={0.4} className="mt-8 p-5 rounded-2xl text-center"
          style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.1),rgba(167,139,250,0.08))", border: "1px solid rgba(212,168,67,0.2)" } as React.CSSProperties}>
          <p className="text-sm text-violet-200/80 leading-relaxed">
            <strong className="text-amber-300">사주 명리학</strong>은 당신을 탓하지 않습니다.<br />
            다만, 당신이 <strong className="text-white">어떤 에너지의 흐름 위에 태어났는지</strong>,<br />
            그 흐름이 <strong className="text-amber-300">지금 어느 방향으로 향하는지</strong>를 알려줍니다.
          </p>
        </FadeInSection>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 차별성 (왜 코드 데스티니인가)
───────────────────────────────────────── */
function DifferentiatorSection() {
  const diffs = [
    {
      icon: "📊",
      title: "8만 케이스 임상 DB",
      desc: "실제 인물 명조와 삶의 궤적을 대조한 8만 건 이상의 데이터로 학습된 패턴 매칭 엔진.",
    },
    {
      icon: "🧠",
      title: "AI + 전통 명리 융합",
      desc: "AI의 데이터 처리 능력과 천간·지지·신살·격국의 전통 이론이 결합된 하이브리드 분석.",
    },
    {
      icon: "🕐",
      title: "시분 단위 정밀 계산",
      desc: "생시(生時)를 시·분 단위로 정밀 반영. 같은 날 태어나도 다른 운명을 구별합니다.",
    },
    {
      icon: "🔄",
      title: "대운·세운 실시간 연동",
      desc: "현재 나이와 해당 연도 세운까지 실시간으로 연산해 지금 당장 쓸 수 있는 인사이트를 제공.",
    },
  ];

  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-2xl mx-auto">
        <FadeInSection className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-4"
            style={{ background: "rgba(212,168,67,0.12)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.25)" }}>
            ✦ 왜 코드 데스티니인가
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3">
            5,000원짜리 운세와<br />
            <span style={{ background: "linear-gradient(135deg,#d4a843,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              무엇이 다른가요?
            </span>
          </h2>
          <p className="text-sm text-violet-300/60 leading-relaxed">
            일반 운세는 생년월일로 12가지 패턴 중 하나를 고릅니다.<br />
            코드 데스티니는 <strong className="text-violet-200">당신의 고유 명조(命造)</strong>를 분석합니다.
          </p>
        </FadeInSection>

        {/* 비교 테이블 */}
        <FadeInSection>
          <div className="rounded-2xl overflow-hidden mb-10" style={{ border: "1px solid rgba(167,139,250,0.18)" }}>
            <div className="grid grid-cols-3 text-center text-xs font-bold tracking-wide py-3 px-4"
              style={{ background: "rgba(167,139,250,0.1)", borderBottom: "1px solid rgba(167,139,250,0.15)" }}>
              <div className="text-violet-400/60">항목</div>
              <div className="text-violet-300/50">일반 운세</div>
              <div style={{ color: "#d4a843" }}>코드 데스티니</div>
            </div>
            {[
              ["분석 기반", "생년월일 12패턴", "명조 고유 DB 매칭"],
              ["시간 정밀도", "일(日) 단위", "시·분 단위"],
              ["대운 분석", "없음 / 미흡", "10년 단위 정밀"],
              ["데이터 학습", "이론 기반", "8만 케이스 실증"],
              ["세운 연동", "연간 일반 예측", "현재 나이 실시간"],
            ].map(([label, bad, good], i) => (
              <div key={i} className={`grid grid-cols-3 text-center text-xs py-3 px-4 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}
                style={{ borderBottom: i < 4 ? "1px solid rgba(167,139,250,0.08)" : "none" }}>
                <div className="text-violet-300/60 font-medium">{label}</div>
                <div className="text-violet-400/40">{bad}</div>
                <div className="font-semibold" style={{ color: "#d4a843" }}>{good}</div>
              </div>
            ))}
          </div>
        </FadeInSection>

        {/* 특징 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {diffs.map((diff, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <motion.div
                className="p-4 rounded-xl h-full"
                style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.14)" }}
                whileHover={{ borderColor: "rgba(212,168,67,0.35)", background: "rgba(212,168,67,0.06)" }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-2xl mb-2">{diff.icon}</div>
                <div className="font-bold text-sm text-white mb-1">{diff.title}</div>
                <div className="text-xs text-violet-300/60 leading-relaxed">{diff.desc}</div>
              </motion.div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 샘플 오행 차트 미리보기
───────────────────────────────────────── */
function SampleChartSection() {
  const sampleData = { wood: 65, fire: 40, earth: 28, metal: 55, water: 18 };

  return (
    <section className="py-16 px-4 relative z-10">
      <div className="max-w-md mx-auto">
        <FadeInSection className="text-center mb-8">
          <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-4"
            style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>
            ✦ 리포트 샘플 미리보기
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
            이런 분석이 포함됩니다
          </h2>
          <p className="text-xs text-violet-300/50">아래는 샘플 오행 분포 분석입니다</p>
        </FadeInSection>
        <FadeInSection delay={0.15}>
          <OhangRadarChart data={sampleData} showBalance showDominant />
        </FadeInSection>
        <FadeInSection delay={0.25} className="mt-4 text-center">
          <p className="text-xs text-violet-400/40 leading-relaxed">
            실제 리포트에는 오행 분포 외에도 대운 흐름 차트, 신살 분석,<br />
            연도별 행운 지수 그래프가 추가로 포함됩니다.
          </p>
        </FadeInSection>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 베네핏 (5가지 가치)
───────────────────────────────────────── */
function BenefitsSection({ onCTA }: { onCTA: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const benefits = [
    {
      no: "01",
      title: "10년 대운의 터닝포인트 확인",
      short: "언제 뒤집힐지 모르는 운세 대신, 대운이 바뀌는 정확한 시점을 미리 압니다.",
      detail:
        "대운(大運)은 10년 단위로 당신의 운명 에너지를 바꿉니다. 현재 어느 대운에 있는지, 다음 전환이 몇 살에 오는지 — 이 타이밍을 알면 사업, 이직, 투자 시점을 전략적으로 설계할 수 있습니다.",
      icon: "🔭",
    },
    {
      no: "02",
      title: "재물운이 열리는 정확한 타이밍",
      short: "노력이 결실을 맺는 월·연도가 있습니다. 그 시기를 알면 타이밍을 맞출 수 있습니다.",
      detail:
        "재성(財星)과 식신(食神)의 활성화 시기를 세운·월운 단위로 계산합니다. '이 시기에 이런 활동을 하면 수입이 증가할 가능성이 높다'는 구체적인 인사이트를 제공합니다.",
      icon: "💰",
    },
    {
      no: "03",
      title: "숨겨진 직업 재능 발굴",
      short: "사주에서 드러나는 천간·지지의 특성이 당신만의 강점 직군을 알려줍니다.",
      detail:
        "단순 MBTI 수준이 아닌, 관록(官祿)·인성(印星)·식상(食傷)의 구성 비율로 당신이 빛나는 분야를 특정합니다. 창업, 전문직, 예술, 리더십 — 어디서 당신의 에너지가 극대화되는지 명료하게 드러납니다.",
      icon: "🌟",
    },
    {
      no: "04",
      title: "연인·배우자 궁합 심층 분석",
      short: "현재 파트너 또는 이상형과의 오행·십신 상성을 정밀 분석합니다.",
      detail:
        "상대방의 생년월일만 있으면 됩니다. 두 명조 간의 충(沖)·합(合)·형(刑)·파(破)를 분석해 갈등이 발생하는 구조와 조화로운 운영 방법을 제시합니다.",
      icon: "💑",
    },
    {
      no: "05",
      title: "건강 취약 시기와 에너지 관리",
      short: "어떤 오행이 과부하 상태인지 파악해 건강 리스크 시기를 사전에 대비합니다.",
      detail:
        "오행과 신체 장기의 대응 관계를 통해 당신의 선천적 약점과 후천적 리스크 시기를 예측합니다. '이 해에는 특히 소화기관에 주의'처럼 실용적인 건강 가이드를 제공합니다.",
      icon: "🌿",
    },
  ];

  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-xl mx-auto">
        <FadeInSection className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-4"
            style={{ background: "rgba(212,168,67,0.12)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.25)" }}>
            ✦ 해금 시 얻게 되는 것
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            단 한 번의 해금으로<br />
            <span style={{ color: "#d4a843" }}>평생 나침반</span>을 갖게 됩니다
          </h2>
        </FadeInSection>

        <div className="space-y-3">
          {benefits.map((b, i) => (
            <FadeInSection key={i} delay={i * 0.08}>
              <motion.div
                className="rounded-xl overflow-hidden cursor-pointer"
                style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}
                onClick={() => setExpanded(expanded === i ? null : i)}
                whileHover={{ borderColor: "rgba(212,168,67,0.3)" }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="text-xl flex-shrink-0 mt-0.5">{b.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black tracking-widest" style={{ color: "#d4a843" }}>{b.no}</span>
                      <h3 className="font-bold text-sm text-white">{b.title}</h3>
                    </div>
                    <p className="text-[13px] text-violet-300/70 leading-relaxed">{b.short}</p>
                  </div>
                  <motion.div
                    className="text-violet-400/40 text-sm flex-shrink-0 mt-0.5"
                    animate={{ rotate: expanded === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    ▼
                  </motion.div>
                </div>

                <AnimatePresence>
                  {expanded === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 text-[13px] text-violet-200/70 leading-relaxed border-t border-violet-700/20 pt-3">
                        {b.detail}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 사회적 증명 (후기)
───────────────────────────────────────── */
function TestimonialsSection() {
  const reviews = [
    {
      name: "김○○",
      age: "34세 · 마케터",
      text: "대운 전환 시기를 미리 알고 이직을 준비했더니, 딱 그 시기에 좋은 제안이 왔어요. 우연이라 생각했지만 지금은 확신합니다.",
      stars: 5,
      tag: "직업·커리어",
    },
    {
      name: "박○○",
      age: "28세 · 프리랜서",
      text: "재물운이 막힌 구체적인 이유와 언제 풀리는지를 알고 나서 오히려 마음이 편해졌어요. 기다릴 줄 알게 됐달까요.",
      stars: 5,
      tag: "재물·투자",
    },
    {
      name: "이○○",
      age: "41세 · 자영업",
      text: "5천 원짜리 운세랑은 차원이 달랐어요. 내 명조가 왜 이런 구조인지 납득이 가는 설명을 처음 받았습니다.",
      stars: 5,
      tag: "종합 만족도",
    },
  ];

  return (
    <section className="py-16 px-4 relative z-10">
      <div className="max-w-2xl mx-auto">
        <FadeInSection className="text-center mb-10">
          <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-4"
            style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>
            ✦ 실제 사용자 후기
          </div>
          <h2 className="text-xl font-bold text-white">이미 바뀐 사람들의 이야기</h2>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {reviews.map((r, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <motion.div
                className="p-4 rounded-xl h-full flex flex-col"
                style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.15)" }}
                whileHover={{ borderColor: "rgba(212,168,67,0.3)", scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-amber-400 text-sm mb-2">{"★".repeat(r.stars)}</div>
                <p className="text-[13px] text-violet-200/80 leading-relaxed flex-1 mb-3">
                  "{r.text}"
                </p>
                <div>
                  <div className="text-xs font-bold text-white">{r.name}</div>
                  <div className="text-[10px] text-violet-400/50">{r.age}</div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: "rgba(212,168,67,0.12)", color: "#d4a843" }}>
                    {r.tag}
                  </span>
                </div>
              </motion.div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   섹션: 가격 & 최종 CTA
───────────────────────────────────────── */
function PricingCTASection({ onCTA }: { onCTA: () => void }) {
  const includes = [
    "사주팔자 전체 명조 분석",
    "오행 분포 & 균형 레이더 차트",
    "10년 대운 흐름 & 전환 시기",
    "2024~2034 세운별 행운 지수",
    "재물·직업·연애 핵심 인사이트",
    "건강 취약 시기 & 관리 가이드",
    "용신·기신 맞춤 컬러·방향·음식",
    "PDF 다운로드 제공",
  ];

  return (
    <section className="py-20 px-4 relative z-10">
      <div className="max-w-sm mx-auto">
        <FadeInSection>
          <motion.div
            className="rounded-3xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg,rgba(20,12,50,0.97) 0%,rgba(8,5,20,0.99) 100%)",
              border: "1px solid rgba(212,168,67,0.35)",
              boxShadow: "0 0 60px rgba(212,168,67,0.08)",
            }}
          >
            {/* 상단 배지 */}
            <div className="text-center py-4 border-b border-amber-700/20"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.12),rgba(212,168,67,0.06))" }}>
              <span className="text-[11px] font-black tracking-widest" style={{ color: "#d4a843" }}>
                👑 인생 총운 해금 패키지
              </span>
            </div>

            <div className="p-6">
              {/* 가격 */}
              <div className="text-center mb-6">
                <div className="text-sm text-violet-400/50 line-through mb-1">정가 ₩89,000</div>
                <div className="flex items-end justify-center gap-2">
                  <span className="text-5xl font-black" style={{ background: "linear-gradient(135deg,#d4a843,#f0c060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    ₩49,000
                  </span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-2"
                  style={{ background: "rgba(212,168,67,0.15)", color: "#d4a843" }}>
                  45% 할인 · 지금만
                </div>
              </div>

              {/* 포함 항목 */}
              <div className="space-y-2 mb-6">
                {includes.map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-2.5 text-[13px] text-violet-200/80"
                    initial={{ x: -8, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <span className="text-amber-400 flex-shrink-0 text-[11px]">✦</span>
                    {item}
                  </motion.div>
                ))}
              </div>

              {/* 메인 CTA */}
              <GoldCTAButton onClick={onCTA} size="lg" fullWidth>
                🔓 지금 당신의 운명을 해금하고<br />
                <span className="font-normal text-xs opacity-90">미래의 기회를 선점하세요</span>
              </GoldCTAButton>

              {/* 보증 */}
              <div className="flex items-center justify-center gap-4 mt-4">
                {["🔒 보안 결제", "⚡ 즉시 발급", "📱 모바일 최적화"].map((v, i) => (
                  <span key={i} className="text-[10px] text-violet-400/40">{v}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </FadeInSection>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   골드 CTA 버튼 공통 컴포넌트
───────────────────────────────────────── */
function GoldCTAButton({
  children,
  onClick,
  size = "md",
  fullWidth = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: "md" | "lg";
  fullWidth?: boolean;
}) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      className={`relative font-bold rounded-2xl overflow-hidden leading-tight ${fullWidth ? "w-full" : ""} ${size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm"}`}
      style={{
        background: "linear-gradient(135deg,#c9940f 0%,#e8b828 40%,#f5cc4a 60%,#b8860b 100%)",
        color: "#1a0e00",
        boxShadow: "0 4px 28px rgba(212,168,67,0.4), 0 2px 8px rgba(0,0,0,0.4)",
      }}
      whileHover={{ scale: 1.02, boxShadow: "0 6px 36px rgba(212,168,67,0.6), 0 2px 12px rgba(0,0,0,0.4)" }}
      whileTap={{ scale: 0.98 }}
      animate={{ boxShadow: ["0 4px 28px rgba(212,168,67,0.35)", "0 4px 40px rgba(212,168,67,0.6)", "0 4px 28px rgba(212,168,67,0.35)"] }}
      transition={{ boxShadow: { duration: 2.5, repeat: Infinity }, scale: { duration: 0.15 } }}
    >
      {/* 빛 스위프 효과 */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.4) 50%,transparent 100%)" }}
        animate={isHovering ? { x: ["-100%", "100%"] } : { x: "-100%" }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

/* ─────────────────────────────────────────
   고정 하단 CTA 바
───────────────────────────────────────── */
function StickyBottomCTA({ onCTA }: { onCTA: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 safe-area-bottom"
          style={{ background: "linear-gradient(0deg,rgba(8,5,20,0.97) 0%,rgba(8,5,20,0.9) 60%,transparent 100%)" }}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          <div className="max-w-sm mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs font-bold text-white">인생 총운 해금</div>
              <div className="text-[10px] text-amber-400/70">₩49,000 · 즉시 발급</div>
            </div>
            <GoldCTAButton onClick={onCTA} size="md">
              지금 해금하기 🔓
            </GoldCTAButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────
   메인 내보내기
───────────────────────────────────────── */
export default function PremiumSalesContent() {
  const handleCTA = () => {
    // 실제 결제 페이지로 연결
    window.location.href = "/points";
  };

  return (
    <div className="relative min-h-screen bg-[#08050f]" style={{ fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      <StarField />

      <div className="relative z-10">
        <HeroSection onCTA={handleCTA} />
        <EmpathySection />
        <DifferentiatorSection />
        <SampleChartSection />
        <BenefitsSection onCTA={handleCTA} />
        <TestimonialsSection />
        <PricingCTASection onCTA={handleCTA} />

        {/* 푸터 안심 구매 */}
        <footer className="text-center py-12 px-4 text-[11px] text-violet-400/30 leading-relaxed">
          <div className="mb-2">Code Destiny · AI 사주 명리 분석 서비스</div>
          <div>결제 후 즉시 리포트 발급 · 앱 설치 불필요 · 개인정보 수집 최소화</div>
        </footer>
      </div>

      <StickyBottomCTA onCTA={handleCTA} />
    </div>
  );
}
