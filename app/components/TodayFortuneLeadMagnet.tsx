"use client";

import React, { useState, useEffect } from "react";

export interface TodayFortuneData {
  score: number;
  summaryTitle: string;
  summaryText: string;
  dateStr: string;
  dayPillar: string; // e.g. "경진(庚辰)일"
  scores: {
    wealth: number;    // 재물
    love: number;      // 애정
    career: number;    // 직장/사업
    health: number;    // 건강
    relation: number;  // 대인관계
  };
  lucky: {
    color: string;
    colorHex: string;
    item: string;
    direction: string;
    number: number;
  };
}

const DEFAULT_FORTUNE: TodayFortuneData = {
  score: 94,
  summaryTitle: "금전운과 천을귀인이 동주하는 대길(大吉)의 날",
  summaryText:
    "오늘 당신의 운의 흐름은 맑고 강렬하게 피어납니다. 오랫동안 고심했던 일에서 긍정적인 반전의 물꼬가 트이며, 특히 뜻밖의 조력자나 귀인이 찾아와 성장의 발판을 마련해 줍니다.",
  dateStr: "오늘의 우주 기운",
  dayPillar: "황금 여의주를 품은 청룡의 날",
  scores: {
    wealth: 96,
    love: 88,
    career: 92,
    health: 85,
    relation: 95,
  },
  lucky: {
    color: "로얄 엠버 골드",
    colorHex: "#F59E0B",
    item: "금속 액세서리 또는 차 열쇠",
    direction: "남동쪽",
    number: 7,
  },
};

export default function TodayFortuneLeadMagnet({
  data = DEFAULT_FORTUNE,
  onDetailClick,
}: {
  data?: TodayFortuneData;
  onDetailClick?: () => void;
}) {
  const [typedText, setTypedText] = useState("");
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Typing animation effect
  useEffect(() => {
    let index = 0;
    setTypedText("");
    setIsTypingDone(false);
    const fullText = data.summaryText;

    const timer = setInterval(() => {
      if (index < fullText.length) {
        setTypedText((prev) => prev + fullText.charAt(index));
        index++;
      } else {
        setIsTypingDone(true);
        clearInterval(timer);
      }
    }, 28);

    return () => clearInterval(timer);
  }, [data.summaryText]);

  // 3D Card Tilt Effect on Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  // SVG Radar Chart Math calculations
  const categories = [
    { label: "재물운", value: data.scores.wealth, key: "wealth" },
    { label: "연애운", value: data.scores.love, key: "love" },
    { label: "직장운", value: data.scores.career, key: "career" },
    { label: "건강운", value: data.scores.health, key: "health" },
    { label: "대인운", value: data.scores.relation, key: "relation" },
  ];

  const numSides = categories.length;
  const radius = 70;
  const center = 100;

  const getCoordinates = (index: number, val: number) => {
    const angle = (Math.PI * 2 / numSides) * index - Math.PI / 2;
    const r = (val / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const polygonPoints = categories
    .map((c, i) => {
      const { x, y } = getCoordinates(i, c.value);
      return `${x},${y}`;
    })
    .join(" ");

  const bgPoints = (scale: number) =>
    categories
      .map((_, i) => {
        const angle = (Math.PI * 2 / numSides) * i - Math.PI / 2;
        const r = scale * radius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateY(${mousePos.x * 8}deg) rotateX(${-mousePos.y * 8}deg) translateY(-4px)`
          : "perspective(1000px) rotateY(0deg) rotateX(0deg) translateY(0px)",
        transition: isHovered
          ? "transform 0.15s ease-out, box-shadow 0.3s ease"
          : "transform 0.5s ease, box-shadow 0.5s ease",
        boxShadow: isHovered
          ? "0 20px 40px -15px rgba(139, 92, 246, 0.4), 0 0 30px rgba(245, 158, 11, 0.2)"
          : "0 10px 30px -10px rgba(15, 23, 42, 0.6)",
      }}
      className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[#0B0F19] via-[#111827] to-[#1A102F] p-6 sm:p-8 text-white select-none"
    >
      {/* Dynamic Celestial Glow Overlay */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl transition-opacity duration-500"
        style={{ opacity: isHovered ? 0.8 : 0.4 }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl transition-opacity duration-500"
        style={{ opacity: isHovered ? 0.7 : 0.3 }}
      />

      {/* Header Tag */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-amber-400" />
          <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
            {data.dateStr} • {data.dayPillar}
          </span>
        </div>
        <div className="rounded-full border border-purple-400/30 bg-purple-950/40 px-3 py-1 text-xs font-medium text-purple-200 backdrop-blur-md">
          오늘의 종합 운세 지수
        </div>
      </div>

      {/* Body: Radar Chart + Score & Summary */}
      <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-12 items-center py-6">
        {/* Left: Radar Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative h-60 w-60 flex items-center justify-center">
            {/* SVG Radar */}
            <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.6" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Background Levels */}
              {[0.25, 0.5, 0.75, 1.0].map((scale, idx) => (
                <polygon
                  key={idx}
                  points={bgPoints(scale)}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                  strokeDasharray={scale === 1 ? "none" : "2,2"}
                />
              ))}

              {/* Grid Spoke Lines */}
              {categories.map((_, i) => {
                const { x, y } = getCoordinates(i, 100);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Radar Area */}
              <polygon
                points={polygonPoints}
                fill="url(#radarGrad)"
                stroke="#FBBF24"
                strokeWidth="2"
                filter="url(#glow)"
                className="transition-all duration-700 ease-out"
              />

              {/* Radar Data Points & Labels */}
              {categories.map((c, i) => {
                const p = getCoordinates(i, c.value);
                const labelPos = getCoordinates(i, 122);
                return (
                  <g key={i}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill="#F59E0B"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#E2E8F0"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {c.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Center Score Badge */}
            <div className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-slate-950/80 border border-amber-400/40 flex flex-col items-center justify-center backdrop-blur-md shadow-inner">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-100">
                {data.score}
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-tighter">
                / 100점
              </span>
            </div>
          </div>
        </div>

        {/* Right: Summary Text with Typewriter & Highlights */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
          <h3 className="text-xl sm:text-2xl font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-amber-200">
            "{data.summaryTitle}"
          </h3>

          <div className="relative min-h-[90px] rounded-2xl border border-white/5 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-sm">
            <p className="text-sm sm:text-base leading-relaxed text-slate-300">
              {typedText}
              {!isTypingDone && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-amber-400 animate-pulse align-middle" />
              )}
            </p>
          </div>

          {/* Quick Lucky Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 border border-white/5">
              <span className="text-xs text-slate-400">행운의 색</span>
              <span
                className="inline-block h-3 w-3 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: data.lucky.colorHex }}
              />
              <span className="text-xs font-semibold text-white">{data.lucky.color}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 border border-white/5">
              <span className="text-xs text-slate-400">행운의 수</span>
              <span className="text-xs font-semibold text-amber-300">{data.lucky.number}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 border border-white/5">
              <span className="text-xs text-slate-400">길한 방향</span>
              <span className="text-xs font-semibold text-purple-300">{data.lucky.direction}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Footer with Pulse Button */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 mt-2 border-t border-white/10">
        <p className="text-xs text-slate-400 text-center sm:text-left">
          ✨ 오늘 나만을 위한 맞춤 시간대별 운세와 1:1 심층 풀이가 준비되어 있습니다.
        </p>

        <button
          onClick={onDetailClick}
          className="relative group w-full sm:w-auto inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-purple-500/40 active:scale-95"
        >
          {/* Pulsing Outer Glow ring */}
          <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping pointer-events-none opacity-75" />

          <span className="relative z-10">오늘의 운세 전체보기</span>
          <svg
            className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
