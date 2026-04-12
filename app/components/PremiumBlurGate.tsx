"use client";
/**
 * PremiumBlurGate — 프리미엄 블러 게이트 컴포넌트
 * CRO 전략: 무료 미리보기 일부 노출 → 핵심 인사이트 블러 → 황금 잠금 해제 CTA
 *
 * 사용법:
 *   <PremiumBlurGate
 *     previewContent={<FreeContent />}
 *     lockedContent={<PremiumContent />}
 *     lockedTitle="당신의 재물운이 막힌 결정적 이유"
 *     price={49000}
 *     onUnlock={() => router.push('/premium-unlock')}
 *   />
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────
   타입 정의
───────────────────────────────────────── */
interface PremiumBlurGateProps {
  /** 무료로 표시되는 콘텐츠 */
  previewContent?: React.ReactNode;
  /** 잠긴 콘텐츠 (블러 처리됨) */
  lockedContent?: React.ReactNode;
  /** 잠긴 섹션 제목 */
  lockedTitle?: string;
  /** 잠긴 항목들 (목록 미리보기) */
  lockedItems?: string[];
  /** 가격 */
  price?: number;
  /** 상품명 */
  productName?: string;
  /** 코인 수 (코인 결제 시) */
  coinCost?: number;
  /** 잠금 해제 콜백 */
  onUnlock?: () => void;
  /** 상품 설명 짧게 */
  subDesc?: string;
}

/* ─────────────────────────────────────────
   샘플 잠긴 콘텐츠 렌더러
───────────────────────────────────────── */
function DefaultLockedContent({ items }: { items: string[] }) {
  return (
    <div className="space-y-3 p-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="text-amber-400 mt-0.5 text-sm flex-shrink-0">✦</span>
          <p className="text-sm text-violet-100/90 leading-relaxed">{item}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   별 파티클 (잠금 오버레이용)
───────────────────────────────────────── */
function LockParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-amber-400/30 select-none"
          style={{
            left: `${8 + (i * 137.5) % 84}%`,
            top: `${10 + (i * 73) % 80}%`,
            fontSize: 10 + (i % 3) * 5,
          }}
          animate={{ opacity: [0.1, 0.5, 0.1], y: [0, -8, 0] }}
          transition={{ duration: 2.5 + (i % 3), delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
        >
          {["✦", "✧", "⋆", "·"][i % 4]}
        </motion.div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────── */
export default function PremiumBlurGate({
  previewContent,
  lockedContent,
  lockedTitle = "당신의 재물운이 막힌 결정적 이유",
  lockedItems = [
    "2024~2034년 핵심 대운 전환점과 준비 전략",
    "재물운이 열리는 핵심 월·일 타이밍",
    "숨겨진 직업적 재능과 최적 커리어 경로",
    "연인·배우자와의 궁합 심층 분석",
    "건강 취약 시기와 에너지 관리 방법",
  ],
  price = 49000,
  productName = "인생 총운 해금",
  coinCost,
  onUnlock,
  subDesc = "AI + 사주명리 · 8만 케이스 기반 정밀 분석",
}: PremiumBlurGateProps) {
  const [isHovering, setIsHovering] = useState(false);

  const formattedPrice = price.toLocaleString("ko-KR");

  return (
    <div className="relative space-y-4">
      {/* ── 무료 미리보기 섹션 ───────────────── */}
      {previewContent && (
        <motion.div
          className="relative rounded-2xl overflow-hidden border border-violet-700/20 bg-gradient-to-b from-violet-950/40 to-slate-900/60 p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* FREE 배지 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-widest"
              style={{ background: "rgba(167,139,250,0.18)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}>
              ✦ 무료 분석 결과
            </span>
          </div>
          {previewContent}
        </motion.div>
      )}

      {/* ── 잠긴 프리미엄 섹션 ───────────────── */}
      <motion.div
        className="relative rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(212,168,67,0.25)" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {/* 블러 처리된 콘텐츠 */}
        <div
          className="relative"
          style={{
            background: "linear-gradient(180deg, rgba(30,20,60,0.85) 0%, rgba(20,12,40,0.95) 100%)",
            filter: "blur(4px)",
            userSelect: "none",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <div className="p-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-widest"
                style={{ background: "rgba(212,168,67,0.18)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.3)" }}>
                👑 PREMIUM
              </span>
            </div>
            {lockedContent || <DefaultLockedContent items={lockedItems} />}
          </div>
        </div>

        {/* 잠금 오버레이 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6"
          style={{ background: "linear-gradient(180deg, rgba(8,5,20,0.2) 0%, rgba(8,5,20,0.88) 40%, rgba(8,5,20,0.97) 100%)" }}>
          <LockParticles />

          <div className="relative z-10 text-center max-w-xs">
            {/* 잠금 아이콘 */}
            <motion.div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
              style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.08))", border: "1px solid rgba(212,168,67,0.4)" }}
              animate={{ boxShadow: ["0 0 12px rgba(212,168,67,0.2)", "0 0 30px rgba(212,168,67,0.5)", "0 0 12px rgba(212,168,67,0.2)"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              🔐
            </motion.div>

            {/* 제목 */}
            <h3 className="text-base font-bold text-white mb-1 leading-tight">
              {lockedTitle}
            </h3>
            <p className="text-xs text-violet-300/60 mb-4 leading-relaxed">
              {subDesc}
            </p>

            {/* 잠긴 항목 힌트 */}
            <div className="text-left space-y-1.5 mb-5">
              {lockedItems.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-violet-200/50">
                  <span className="text-amber-500/60 flex-shrink-0">⊹</span>
                  <span className="truncate">{item}</span>
                </div>
              ))}
              {lockedItems.length > 3 && (
                <div className="text-xs text-violet-400/40 pl-4">+ {lockedItems.length - 3}개 항목 더...</div>
              )}
            </div>

            {/* CTA 버튼 */}
            <motion.button
              type="button"
              onClick={onUnlock}
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
              className="relative w-full py-3.5 rounded-xl font-bold text-sm tracking-wide overflow-hidden"
              style={{
                background: "linear-gradient(135deg,#d4a843 0%,#f0c060 50%,#b8860b 100%)",
                color: "#1a0e00",
                boxShadow: "0 4px 24px rgba(212,168,67,0.35)",
              }}
              whileHover={{ scale: 1.02, boxShadow: "0 6px 32px rgba(212,168,67,0.55)" }}
              whileTap={{ scale: 0.98 }}
            >
              {/* 버튼 빛 효과 */}
              <motion.div
                className="absolute inset-0 rounded-xl"
                style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)" }}
                animate={isHovering ? { x: ["-100%", "100%"] } : { x: "-100%" }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
              <span className="relative z-10">
                {coinCost
                  ? `🪙 코인 ${coinCost}개로 해금하기`
                  : `🔓 ${productName} 해금 — ₩${formattedPrice}`}
              </span>
            </motion.button>

            <p className="text-[10px] text-violet-400/35 mt-2.5">
              · 1회 결제 · 앱 설치 없이 즉시 확인
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
