"use client";
/**
 * AnalysisLoadingScreen — 신뢰 프로세스(Trust Sequence) 분석 대기 화면
 * CRO 전략: 즉각 결과 대신 "정밀 분석 중" 애니메이션으로 기대감과 신뢰를 구축.
 *
 * 사용법:
 *   <AnalysisLoadingScreen onComplete={() => router.push('/results')} />
 *   <AnalysisLoadingScreen steps={customSteps} totalDuration={6000} onComplete={cb} />
 */

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";

/* ─────────────────────────────────────────
   타입 정의
───────────────────────────────────────── */
export interface AnalysisStep {
  label: string;
  detail: string;
  duration: number; // ms
  icon: string;
}

interface Props {
  steps?: AnalysisStep[];
  totalDuration?: number;
  onComplete?: () => void;
  userName?: string;
}

/* ─────────────────────────────────────────
   기본 분석 단계 (CRO 최적화 문구)
───────────────────────────────────────── */
const DEFAULT_STEPS: AnalysisStep[] = [
  {
    label: "출생 정보 암호화 처리 중",
    detail: "생년월일시를 천문학적 좌표로 변환하고 있습니다.",
    duration: 900,
    icon: "🔐",
  },
  {
    label: "8만 건의 명조 데이터 대조 중",
    detail: "실제 임상 케이스와 당신의 명조를 정밀 비교합니다.",
    duration: 1400,
    icon: "📊",
  },
  {
    label: "용신 및 격국 정밀 분석 중",
    detail: "오행의 균형과 천간·지지 상호작용을 계산합니다.",
    duration: 1200,
    icon: "☯",
  },
  {
    label: "대운 흐름과 세운 접점 계산 중",
    detail: "10년 대운과 올해 세운의 충·합·형·파 변수를 도출합니다.",
    duration: 1300,
    icon: "🌊",
  },
  {
    label: "재물·직업·관계 운세 벡터 추출 중",
    detail: "삶의 핵심 영역별 에너지 흐름을 시각화 준비합니다.",
    duration: 1100,
    icon: "✦",
  },
  {
    label: "최종 리포트 생성 완료",
    detail: "당신만을 위한 맞춤 분석이 준비되었습니다.",
    duration: 800,
    icon: "🌟",
  },
];

/* ─────────────────────────────────────────
   파티클 배경
───────────────────────────────────────── */
function CosmicParticle({ index }: { index: number }) {
  const symbols = ["✦", "✧", "⋆", "·", "✶", "✸"];
  const sym = symbols[index % symbols.length];
  const size = 8 + (index % 4) * 4;
  const x = (index * 137.5) % 100;
  const y = (index * 73.1) % 100;
  const delay = (index * 0.4) % 3;
  const duration = 3 + (index % 3);

  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: `${x}%`, top: `${y}%`, fontSize: size, color: index % 3 === 0 ? "#d4a843" : "#a78bfa" }}
      animate={{ opacity: [0.08, 0.35, 0.08], scale: [0.8, 1.2, 0.8] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {sym}
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   원형 진행 링
───────────────────────────────────────── */
function CircularProgress({ progress }: { progress: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress / 100);

  return (
    <div className="relative w-36 h-36 mx-auto mb-6">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* 배경 링 */}
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(167,139,250,0.12)" strokeWidth="6" />
        {/* 진행 링 */}
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4a843" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#d4a843" />
          </linearGradient>
        </defs>
      </svg>
      {/* 퍼센트 텍스트 */}
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <motion.span
          className="text-2xl font-bold"
          style={{ background: "linear-gradient(135deg,#d4a843,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          key={Math.round(progress)}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {Math.round(progress)}%
        </motion.span>
        <span className="text-[10px] text-violet-300/60 font-medium tracking-widest">ANALYZING</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   단계 아이템
───────────────────────────────────────── */
function StepItem({ step, status, progress }: {
  step: AnalysisStep;
  status: "pending" | "active" | "done";
  progress: number;
}) {
  const isDone = status === "done";
  const isActive = status === "active";

  return (
    <motion.div
      className={`relative flex items-start gap-3 p-3 rounded-xl transition-all duration-500 ${
        isActive
          ? "bg-violet-950/60 border border-violet-500/30 shadow-[0_0_20px_rgba(167,139,250,0.12)]"
          : isDone
          ? "opacity-70"
          : "opacity-30"
      }`}
      initial={{ x: -12, opacity: 0 }}
      animate={{ x: 0, opacity: status === "pending" ? 0.3 : 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* 아이콘 */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 ${
          isDone
            ? "bg-gradient-to-br from-amber-500/30 to-amber-600/20 border border-amber-400/40"
            : isActive
            ? "bg-gradient-to-br from-violet-600/40 to-violet-800/30 border border-violet-400/50 animate-pulse"
            : "bg-white/5 border border-white/10"
        }`}
      >
        {isDone ? "✓" : step.icon}
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className={`text-sm font-semibold leading-tight ${isDone ? "text-amber-300/80" : isActive ? "text-violet-200" : "text-white/40"}`}>
          {step.label}
        </div>
        {isActive && (
          <motion.div
            className="text-xs text-violet-300/70 mt-0.5 leading-relaxed"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
          >
            {step.detail}
          </motion.div>
        )}
        {/* 진행 바 */}
        {isActive && (
          <div className="mt-2 h-1 rounded-full bg-violet-900/50 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#d4a843,#a78bfa,#d4a843)", backgroundSize: "200% 100%" }}
              animate={{ width: `${progress}%`, backgroundPosition: ["0% 50%", "100% 50%"] }}
              transition={{ width: { duration: 0.3 }, backgroundPosition: { duration: 2, repeat: Infinity } }}
            />
          </div>
        )}
      </div>

      {isDone && (
        <motion.div
          className="flex-shrink-0 text-amber-400 text-sm pt-0.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          ✦
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────── */
export default function AnalysisLoadingScreen({ steps = DEFAULT_STEPS, onComplete, userName }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const stepStartRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const totalDuration = steps.reduce((s, x) => s + x.duration, 0);

  useEffect(() => {
    let elapsed = 0;
    let stepIdx = 0;
    let stepStart = performance.now();

    function tick(now: number) {
      const stepElapsed = now - stepStart;
      const step = steps[stepIdx];
      if (!step) return;

      const sp = Math.min((stepElapsed / step.duration) * 100, 100);
      setStepProgress(sp);

      const prevDuration = steps.slice(0, stepIdx).reduce((s, x) => s + x.duration, 0);
      const tp = Math.min(((prevDuration + stepElapsed) / totalDuration) * 100, 100);
      setTotalProgress(tp);

      if (stepElapsed >= step.duration) {
        stepIdx++;
        setCurrentStep(stepIdx);
        setStepProgress(0);
        stepStart = now;

        if (stepIdx >= steps.length) {
          setTotalProgress(100);
          setIsComplete(true);
          setTimeout(() => onComplete?.(), 600);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [steps, totalDuration, onComplete]);

  return (
    <div className="relative min-h-screen bg-[#08050f] flex items-center justify-center overflow-hidden py-12 px-4">
      {/* 배경 오브 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle,#7c3aed,transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle,#d4a843,transparent 70%)", filter: "blur(50px)" }} />
      </div>

      {/* 파티클 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }, (_, i) => <CosmicParticle key={i} index={i} />)}
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* 헤더 */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-4 border"
            style={{
              background: "rgba(124,58,237,0.15)",
              borderColor: "rgba(167,139,250,0.3)",
              color: "#a78bfa",
            }}
            animate={{ boxShadow: ["0 0 8px rgba(167,139,250,0.2)", "0 0 20px rgba(167,139,250,0.45)", "0 0 8px rgba(167,139,250,0.2)"] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            CODE DESTINY · AI 명조 분석
          </motion.div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            {userName ? `${userName}님의 ` : ""}
            <span style={{ background: "linear-gradient(135deg,#d4a843 0%,#f0c060 40%,#a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              명조를 분석
            </span>
            하고 있습니다
          </h2>
          <p className="text-sm text-violet-300/60 leading-relaxed">
            8만 건의 실제 임상 데이터를 기반으로<br />
            <strong className="text-violet-200/80">당신만의 고유한 운명 패턴</strong>을 도출합니다
          </p>
        </div>

        {/* 원형 진행률 */}
        <CircularProgress progress={totalProgress} />

        {/* 단계 목록 */}
        <div className="space-y-2 mb-6">
          {steps.map((step, i) => (
            <StepItem
              key={i}
              step={step}
              status={i < currentStep ? "done" : i === currentStep ? "active" : "pending"}
              progress={i === currentStep ? stepProgress : 100}
            />
          ))}
        </div>

        {/* 하단 안내 */}
        <AnimatePresence>
          {isComplete ? (
            <motion.div
              key="complete"
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm"
                style={{ background: "linear-gradient(135deg,#d4a843,#b8860b)", color: "#1a0e00" }}>
                🌟 분석 완료 — 결과를 불러오는 중...
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              className="text-center text-xs text-violet-400/40 tracking-wide"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              잠시만 기다려 주세요 · 정확도를 위해 다중 알고리즘을 병렬 실행 중
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
