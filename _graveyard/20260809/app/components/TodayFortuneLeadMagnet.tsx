"use client";

import React, { useState, useEffect } from "react";

export interface TodayFortuneData {
  score: number;
  summaryTitle: string;
  summaryText: string;
  dateStr: string;
  dayPillar: string;
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
    }, 24);

    return () => clearInterval(timer);
  }, [data.summaryText]);

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

  const categories = [
    { label: "재물운", value: data.scores.wealth },
    { label: "연애운", value: data.scores.love },
    { label: "직장운", value: data.scores.career },
    { label: "건강운", value: data.scores.health },
    { label: "대인운", value: data.scores.relation },
  ];

  const numSides = categories.length;
  const radius = 68;
  const center = 100;

  const getCoordinates = (index: number, val: number) => {
    const angle = (Math.PI * 2 / numSides) * index - Math.PI / 2;
    const r = (val / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
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
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      })
      .join(" ");

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateY(${mousePos.x * 6}deg) rotateX(${-mousePos.y * 6}deg) translateY(-4px)`
          : "perspective(1000px) rotateY(0deg) rotateX(0deg) translateY(0px)",
        transition: isHovered
          ? "transform 0.15s ease-out, box-shadow 0.3s ease"
          : "transform 0.5s ease, box-shadow 0.5s ease",
        boxShadow: isHovered
          ? "0 25px 50px -12px rgba(139, 92, 246, 0.45), 0 0 35px rgba(245, 158, 11, 0.25)"
          : "0 15px 35px -10px rgba(15, 23, 42, 0.8)",
        fontFamily: "'CodeDestinyBody', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
      className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#0A0E17] via-[#131A2E] to-[#1E1238] p-6 sm:p-10 text-slate-100 select-none shadow-2xl"
    >
      {/* Background Ambient Glow */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-purple-600/30 blur-3xl transition-opacity duration-500"
        style={{ opacity: isHovered ? 0.85 : 0.45 }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl transition-opacity duration-500"
        style={{ opacity: isHovered ? 0.75 : 0.35 }}
      />

      {/* Header Badge */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </span>
          <span className="text-xs sm:text-sm font-bold tracking-widest text-amber-300 uppercase">
            {data.dateStr} • {data.dayPillar}
          </span>
        </div>
        <div className="rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs sm:text-sm font-bold text-amber-200 backdrop-blur-md shadow-inner">
          🌟 오늘의 총운 지수
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="relative z-10 grid grid-cols-1 gap-10 lg:grid-cols-12 items-center py-8">
        {/* Left: SVG Radar Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative h-64 w-64 sm:h-72 sm:w-72 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="radarGradHigh" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.75" />
                </linearGradient>
                <filter id="glowG" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {[0.25, 0.5, 0.75, 1.0].map((scale, idx) => (
                <polygon
                  key={idx}
                  points={bgPoints(scale)}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1.2"
                  strokeDasharray={scale === 1 ? "none" : "3,3"}
                />
              ))}

              {categories.map((_, i) => {
                const { x, y } = getCoordinates(i, 100);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.18)"
                    strokeWidth="1.2"
                  />
                );
              })}

              <polygon
                points={polygonPoints}
                fill="url(#radarGradHigh)"
                stroke="#FCD34D"
                strokeWidth="2.5"
                filter="url(#glowG)"
                className="transition-all duration-700 ease-out"
              />

              {categories.map((c, i) => {
                const p = getCoordinates(i, c.value);
                const labelPos = getCoordinates(i, 126);
                return (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#F8FAFC"
                      fontSize="11"
                      fontWeight="700"
                      className="drop-shadow-md"
                    >
                      {c.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Center Score Circle */}
            <div className="absolute inset-0 m-auto h-24 w-24 rounded-full bg-slate-950/90 border-2 border-amber-400/60 flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-100">
                {data.score}
              </span>
              <span className="text-xs text-slate-300 font-bold tracking-tight">
                / 100점
              </span>
            </div>
          </div>
        </div>

        {/* Right: High-Legibility Fortune Summary */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
          <h3 className="text-2xl sm:text-3xl font-extrabold leading-snug text-white tracking-tight">
            "{data.summaryTitle}"
          </h3>

          <div className="relative rounded-2xl border border-white/10 bg-slate-950/70 p-5 sm:p-6 backdrop-blur-md shadow-inner">
            <p className="text-base sm:text-lg leading-relaxed sm:leading-loose text-slate-200 font-medium">
              {typedText}
              {!isTypingDone && (
                <span className="inline-block w-2 h-5 ml-1 bg-amber-400 animate-pulse align-middle" />
              )}
            </p>
          </div>

          {/* Lucky Info Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-2.5 rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
              <span className="text-xs text-slate-400 font-medium">행운의 색</span>
              <span
                className="inline-block h-4 w-4 rounded-full border border-white/60 shadow-md"
                style={{ backgroundColor: data.lucky.colorHex }}
              />
              <span className="text-xs sm:text-sm font-bold text-white">{data.lucky.color}</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
              <span className="text-xs text-slate-400 font-medium">행운의 수</span>
              <span className="text-xs sm:text-sm font-bold text-amber-300">{data.lucky.number}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
              <span className="text-xs text-slate-400 font-medium">길한 방향</span>
              <span className="text-xs sm:text-sm font-bold text-purple-300">{data.lucky.direction}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5 pt-6 mt-2 border-t border-slate-700/60">
        <p className="text-xs sm:text-sm text-slate-300 text-center sm:text-left leading-relaxed">
          ✨ 오늘 나만을 위한 시간대별 상세 운세와 1:1 명리학자 풀이가 준비되어 있습니다.
        </p>

        <a
          href="/today"
          onClick={(e) => {
            if (onDetailClick) {
              e.preventDefault();
              onDetailClick();
            }
          }}
          className="relative group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 px-8 py-3.5 text-base font-extrabold text-white shadow-xl shadow-purple-600/30 transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50 active:scale-95 text-center"
        >
          <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping pointer-events-none opacity-75" />
          <span className="relative z-10">오늘의 운세 전체보기 →</span>
        </a>
      </div>
    </div>
  );
}
