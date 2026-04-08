"use client";
/**
 * PremiumFeatureCard — 마이크로 인터랙션이 살아있는 프리미엄 기능 카드
 * 효과: hover 시 골드 빛 스윕 + 3D 틸트 + 오행 카드 뒤집기 애니메이션
 *
 * 사용법:
 *   <PremiumFeatureCard title="대운 흐름" icon="🔭" locked onFlip={() => router.push('/premium-unlock')} />
 *   <PremiumFeatureCard title="오행 분포" icon="☯" ohang={{ wood: 60, fire: 30, earth: 20, metal: 45, water: 15 }} />
 */

import { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/* ─────────────────────────────────────────
   타입
───────────────────────────────────────── */
interface PremiumFeatureCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  /** 잠금 여부 */
  locked?: boolean;
  /** 뒷면 콘텐츠 (뒤집기 애니메이션) */
  backContent?: React.ReactNode;
  /** 앞면 콘텐츠 */
  frontContent?: React.ReactNode;
  /** 잠금 클릭 콜백 */
  onUnlock?: () => void;
  /** 카드 크기 */
  size?: "sm" | "md" | "lg";
  /** 색상 테마 */
  theme?: "gold" | "violet" | "teal";
  className?: string;
}

/* ─────────────────────────────────────────
   테마 설정
───────────────────────────────────────── */
const THEMES = {
  gold: {
    glow: "rgba(212,168,67,0.4)",
    border: "rgba(212,168,67,0.3)",
    bg: "rgba(212,168,67,0.06)",
    accent: "#d4a843",
    gradient: "linear-gradient(135deg,#d4a843,#f0c060)",
  },
  violet: {
    glow: "rgba(167,139,250,0.45)",
    border: "rgba(167,139,250,0.28)",
    bg: "rgba(167,139,250,0.06)",
    accent: "#a78bfa",
    gradient: "linear-gradient(135deg,#a78bfa,#7c3aed)",
  },
  teal: {
    glow: "rgba(45,212,191,0.35)",
    border: "rgba(45,212,191,0.25)",
    bg: "rgba(45,212,191,0.05)",
    accent: "#2dd4bf",
    gradient: "linear-gradient(135deg,#2dd4bf,#0891b2)",
  },
};

/* ─────────────────────────────────────────
   3D 틸트 훅
───────────────────────────────────────── */
function useTilt() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { rotateX, rotateY, onMouseMove, onMouseLeave };
}

/* ─────────────────────────────────────────
   카드 뒤집기 (오행 설명용)
───────────────────────────────────────── */
function FlipCard({ front, back, locked, onUnlock }: {
  front: React.ReactNode;
  back: React.ReactNode;
  locked?: boolean;
  onUnlock?: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative w-full h-full cursor-pointer"
      style={{ perspective: "1000px" }}
      onClick={() => locked ? onUnlock?.() : setFlipped(!flipped)}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* 앞면 */}
        <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
          {front}
        </div>
        {/* 뒷면 */}
        <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          {back}
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────── */
export default function PremiumFeatureCard({
  title,
  subtitle,
  icon = "✦",
  locked = false,
  backContent,
  frontContent,
  onUnlock,
  size = "md",
  theme = "gold",
  className = "",
}: PremiumFeatureCardProps) {
  const { rotateX, rotateY, onMouseMove, onMouseLeave } = useTilt();
  const [isHovering, setIsHovering] = useState(false);
  const themeConfig = THEMES[theme];

  const sizeClasses = {
    sm: "p-4 min-h-[120px]",
    md: "p-5 min-h-[160px]",
    lg: "p-6 min-h-[200px]",
  };

  const FrontContent = () => (
    <div className={`relative flex flex-col h-full ${sizeClasses[size]}`}>
      {/* 아이콘 + 잠금 오버레이 */}
      <div className="flex items-start justify-between mb-3">
        <motion.span
          className="text-3xl"
          animate={isHovering ? { scale: 1.15, rotate: [0, -5, 5, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.4 }}
        >
          {icon}
        </motion.span>
        {locked && (
          <motion.div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)" }}
            animate={{ boxShadow: ["0 0 6px rgba(212,168,67,0.2)", "0 0 16px rgba(212,168,67,0.5)", "0 0 6px rgba(212,168,67,0.2)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🔒
          </motion.div>
        )}
        {backContent && !locked && (
          <motion.div
            className="text-[10px] text-violet-400/40 mt-1"
            animate={isHovering ? { opacity: 1 } : { opacity: 0 }}
          >
            클릭해서 뒤집기 ↻
          </motion.div>
        )}
      </div>

      {/* 제목 */}
      <h3 className={`font-bold leading-tight mb-1 ${size === "sm" ? "text-sm" : "text-base"}`}
        style={{ color: isHovering ? themeConfig.accent : "#e2e8f0" }}>
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-violet-300/50 leading-relaxed">{subtitle}</p>
      )}

      {/* 커스텀 앞면 콘텐츠 */}
      {frontContent && <div className="mt-2 flex-1">{frontContent}</div>}

      {/* 잠금 상태 안내 */}
      {locked && (
        <motion.div
          className="mt-auto pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovering ? 1 : 0.6 }}
        >
          <div className="text-[11px] font-semibold flex items-center gap-1.5"
            style={{ color: themeConfig.accent }}>
            <span>해금하기</span>
            <motion.span
              animate={{ x: isHovering ? [0, 4, 0] : 0 }}
              transition={{ duration: 0.5, repeat: isHovering ? Infinity : 0 }}
            >
              →
            </motion.span>
          </div>
        </motion.div>
      )}
    </div>
  );

  const BackContentWrapper = () => (
    <div className={`relative flex flex-col h-full ${sizeClasses[size]}`}
      style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(8,5,20,0.95))" }}>
      {backContent}
    </div>
  );

  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden select-none ${className}`}
      style={{
        background: `linear-gradient(160deg,${themeConfig.bg},rgba(8,5,20,0.92))`,
        border: `1px solid ${themeConfig.border}`,
        transformStyle: "preserve-3d",
        rotateX,
        rotateY,
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => { onMouseLeave(); setIsHovering(false); }}
      onMouseEnter={() => setIsHovering(true)}
      whileHover={{
        boxShadow: `0 8px 40px ${themeConfig.glow}, 0 2px 16px rgba(0,0,0,0.5)`,
        borderColor: themeConfig.accent,
      }}
      transition={{ duration: 0.25 }}
      onClick={locked ? onUnlock : undefined}
    >
      {/* 배경 빛 효과 */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%,${themeConfig.glow.replace("0.4)", "0.12)")},transparent 70%)` }}
        animate={isHovering ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* 버튼 빛 스윕 */}
      {isHovering && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(105deg,transparent 40%,${themeConfig.accent}18 50%,transparent 60%)` }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      )}

      {backContent ? (
        <FlipCard
          front={<FrontContent />}
          back={<BackContentWrapper />}
          locked={locked}
          onUnlock={onUnlock}
        />
      ) : (
        <FrontContent />
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   오행 뒤집기 카드 preset
───────────────────────────────────────── */
const OHANG_META = {
  wood:  { label: "목(木)", color: "#4ade80", pos: "성장·추진", neg: "과잉 시 분노", element: "🌳", tip: "봄·동쪽·간장" },
  fire:  { label: "화(火)", color: "#f97316", pos: "열정·표현",  neg: "과잉 시 과격",  element: "🔥", tip: "여름·남쪽·심장" },
  earth: { label: "토(土)", color: "#fbbf24", pos: "안정·신뢰",  neg: "과잉 시 집착",  element: "🪨", tip: "환절기·중앙·비장" },
  metal: { label: "금(金)", color: "#94a3b8", pos: "결단·정밀",  neg: "과잉 시 냉혹",  element: "⚔️", tip: "가을·서쪽·폐" },
  water: { label: "수(水)", color: "#60a5fa", pos: "지혜·유연",  neg: "과잉 시 우유부단", element: "💧", tip: "겨울·북쪽·신장" },
};

export function OhangFlipCard({ element, score }: { element: keyof typeof OHANG_META; score: number }) {
  const meta = OHANG_META[element];

  const FrontInner = (
    <div className="p-4">
      <div className="text-3xl mb-2">{meta.element}</div>
      <div className="font-bold text-sm mb-0.5" style={{ color: meta.color }}>{meta.label}</div>
      <div className="text-xs text-violet-300/60 mb-3">{meta.pos}</div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: meta.color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
      <div className="text-[10px] mt-1" style={{ color: meta.color }}>{score}점</div>
    </div>
  );

  const BackInner = (
    <div className="p-4 flex flex-col justify-center h-full text-center">
      <div className="text-2xl mb-2">🔮</div>
      <div className="text-xs font-bold mb-1" style={{ color: meta.color }}>강점</div>
      <div className="text-[11px] text-violet-200/70 mb-2">{meta.pos}</div>
      <div className="text-xs font-bold mb-1 text-violet-400/60">주의</div>
      <div className="text-[11px] text-violet-300/50 mb-2">{meta.neg}</div>
      <div className="text-[10px] text-amber-400/50 mt-1 border-t border-violet-700/20 pt-2">
        {meta.tip}
      </div>
    </div>
  );

  return (
    <PremiumFeatureCard
      title={meta.label}
      icon={meta.element}
      size="sm"
      theme={element === "fire" ? "teal" : element === "water" ? "violet" : "gold"}
      backContent={BackInner}
      frontContent={
        <div>
          <div className="text-[11px] text-violet-300/50 mb-2">{meta.pos}</div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <motion.div className="h-full rounded-full" style={{ background: meta.color }}
              initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.7 }} />
          </div>
          <div className="text-[10px] mt-1" style={{ color: meta.color }}>{score}점</div>
        </div>
      }
    />
  );
}
