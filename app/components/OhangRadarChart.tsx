"use client";
/**
 * OhangRadarChart — 오행(五行) 분포 시각화 컴포넌트
 * CRO 전략: 텍스트 대신 고급스러운 데이터 시각화로 "3만 원 이상의 가치" 증명.
 *
 * 사용법:
 *   <OhangRadarChart data={{ wood: 35, fire: 20, earth: 15, metal: 25, water: 5 }} />
 *   <OhangRadarChart data={userOhangData} showBalance showDominant />
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

/* ─────────────────────────────────────────
   타입 & 상수
───────────────────────────────────────── */
export interface OhangData {
  wood: number;   // 목(木)
  fire: number;   // 화(火)
  earth: number;  // 토(土)
  metal: number;  // 금(金)
  water: number;  // 수(水)
}

interface Props {
  data: OhangData;
  showBalance?: boolean;
  showDominant?: boolean;
  showBarView?: boolean;
  className?: string;
}

const OHANG_META = {
  wood:  { label: "목(木)", emoji: "🌳", color: "#4ade80", desc: "성장·추진력", element: "木" },
  fire:  { label: "화(火)", emoji: "🔥", color: "#f97316", desc: "열정·표현력", element: "火" },
  earth: { label: "토(土)", emoji: "🪨", color: "#fbbf24", desc: "안정·신뢰성", element: "土" },
  metal: { label: "금(金)", emoji: "⚔️", color: "#94a3b8", desc: "결단·정밀성", element: "金" },
  water: { label: "수(水)", emoji: "💧", color: "#60a5fa", desc: "지혜·유연성", element: "水" },
};

/* ─────────────────────────────────────────
   커스텀 툴팁
───────────────────────────────────────── */
function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const meta = OHANG_META[d.key as keyof typeof OHANG_META];
  return (
    <div className="rounded-xl px-3 py-2 text-sm shadow-xl"
      style={{ background: "rgba(20,12,40,0.95)", border: "1px solid rgba(212,168,67,0.3)" }}>
      <div className="font-bold text-amber-300">{meta.emoji} {meta.label}</div>
      <div className="text-violet-200">{d.value}점 · {meta.desc}</div>
    </div>
  );
}

/* ─────────────────────────────────────────
   균형 지수 계산
───────────────────────────────────────── */
function calcBalance(data: OhangData): number {
  const vals = Object.values(data);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length;
  const stddev = Math.sqrt(variance);
  return Math.max(0, Math.round(100 - (stddev / avg) * 60));
}

/* ─────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────── */
export default function OhangRadarChart({ data, showBalance = true, showDominant = true, showBarView = false, className = "" }: Props) {
  const [viewMode, setViewMode] = useState<"radar" | "bar">(showBarView ? "bar" : "radar");
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  /* 레이더 차트 데이터 */
  const radarData = (Object.keys(data) as Array<keyof OhangData>).map((key) => ({
    key,
    subject: OHANG_META[key].label,
    value: data[key],
    fullMark: 100,
  }));

  /* 바 차트 데이터 */
  const barData = [...radarData].sort((a, b) => b.value - a.value);

  /* 균형 지수 */
  const balanceScore = calcBalance(data);

  /* 지배 오행 */
  const dominant = (Object.entries(data) as [keyof OhangData, number][]).reduce((a, b) => a[1] > b[1] ? a : b);
  const dominated = (Object.entries(data) as [keyof OhangData, number][]).reduce((a, b) => a[1] < b[1] ? a : b);

  return (
    <motion.div
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{ background: "linear-gradient(160deg,rgba(20,12,50,0.95),rgba(8,5,20,0.98))", border: "1px solid rgba(167,139,250,0.18)" }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-amber-400 text-sm">☯</span>
            <h3 className="text-sm font-bold text-white tracking-wide">오행(五行) 분포 분석</h3>
          </div>
          <p className="text-[11px] text-violet-400/60">에너지 속성 · 음양오행 균형 진단</p>
        </div>

        {/* 뷰 전환 */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["radar", "bar"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200"
              style={viewMode === mode
                ? { background: "rgba(212,168,67,0.2)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.35)" }
                : { color: "rgba(167,139,250,0.5)" }}
            >
              {mode === "radar" ? "🕸 레이더" : "📊 막대"}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 영역 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3 }}
          className="px-3"
        >
          {viewMode === "radar" ? (
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="rgba(167,139,250,0.15)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={({ x, y, payload }: any) => {
                    const key = radarData.find(d => d.subject === payload.value)?.key;
                    const meta = key ? OHANG_META[key as keyof typeof OHANG_META] : null;
                    return (
                      <text x={x} y={y} fill={meta?.color ?? "#a78bfa"} fontSize={11} fontWeight="600" textAnchor="middle" dominantBaseline="central">
                        {meta?.element ?? payload.value}
                      </text>
                    );
                  }}
                />
                <Radar
                  name="오행"
                  dataKey="value"
                  stroke="rgba(212,168,67,0.8)"
                  fill="rgba(212,168,67,0.15)"
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="px-2 py-2">
              {barData.map(({ key, value }, i) => {
                const meta = OHANG_META[key as keyof typeof OHANG_META];
                return (
                  <motion.div
                    key={key}
                    className="flex items-center gap-3 mb-2.5"
                    initial={{ x: -16, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.07 }}
                    onHoverStart={() => setHoveredKey(key)}
                    onHoverEnd={() => setHoveredKey(null)}
                  >
                    <div className="w-8 text-center text-sm font-bold" style={{ color: meta.color }}>
                      {meta.element}
                    </div>
                    <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        className="h-full rounded-lg flex items-center justify-end pr-2"
                        style={{
                          background: hoveredKey === key
                            ? meta.color
                            : `linear-gradient(90deg,${meta.color}60,${meta.color}90)`,
                          transition: "background 0.2s",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.7, delay: i * 0.07, ease: "easeOut" }}
                      >
                        <span className="text-[10px] font-bold text-white/80">{value}</span>
                      </motion.div>
                    </div>
                    <div className="w-16 text-[10px] text-violet-300/50 leading-tight">{meta.desc}</div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 분석 카드 */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-4 mt-1">
        {/* 지배 오행 */}
        {showDominant && (
          <motion.div
            className="rounded-xl p-3 col-span-1"
            style={{ background: `linear-gradient(135deg,${OHANG_META[dominant[0]].color}18,rgba(8,5,20,0.6))`, border: `1px solid ${OHANG_META[dominant[0]].color}30` }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] text-violet-400/60 mb-1 tracking-wide">지배 오행</div>
            <div className="font-bold text-sm" style={{ color: OHANG_META[dominant[0]].color }}>
              {OHANG_META[dominant[0]].emoji} {OHANG_META[dominant[0]].label}
            </div>
            <div className="text-[10px] text-violet-200/60 mt-0.5">{OHANG_META[dominant[0]].desc}</div>
          </motion.div>
        )}

        {/* 부족 오행 */}
        {showDominant && (
          <motion.div
            className="rounded-xl p-3 col-span-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.15)" }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] text-violet-400/60 mb-1 tracking-wide">보완 필요</div>
            <div className="font-bold text-sm text-violet-300">
              {OHANG_META[dominated[0]].emoji} {OHANG_META[dominated[0]].label}
            </div>
            <div className="text-[10px] text-violet-200/60 mt-0.5">{OHANG_META[dominated[0]].desc} 강화 권장</div>
          </motion.div>
        )}

        {/* 균형 지수 */}
        {showBalance && (
          <motion.div
            className="rounded-xl p-3 col-span-2"
            style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)" }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-amber-400/70 tracking-wide font-semibold">오행 균형 지수</div>
              <div className="text-xl font-bold" style={{ background: "linear-gradient(135deg,#d4a843,#f0c060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {balanceScore}
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(212,168,67,0.15)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg,#d4a843,#f0c060,#d4a843)" }}
                initial={{ width: 0 }}
                animate={{ width: `${balanceScore}%` }}
                transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
              />
            </div>
            <div className="text-[10px] text-amber-400/40 mt-1">
              {balanceScore >= 75 ? "균형이 잘 잡혀 있습니다" : balanceScore >= 50 ? "일부 오행 보완이 권장됩니다" : "오행 불균형 — 상세 분석이 필요합니다"}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
