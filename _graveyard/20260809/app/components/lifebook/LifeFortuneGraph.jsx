"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";

const SAMPLE_DATA = [
  { age: 6, stem: "己", branch: "丑", score: -60, status: "주의" },
  { age: 16, stem: "戊", branch: "子", score: 20, status: "길" },
  { age: 26, stem: "丁", branch: "亥", score: -30, status: "주의" },
  { age: 36, stem: "丙", branch: "戌", score: 90, status: "최고" },
  { age: 46, stem: "乙", branch: "酉", score: 48, status: "길" },
  { age: 56, stem: "甲", branch: "申", score: 55, status: "길" },
  { age: 66, stem: "癸", branch: "未", score: 62, status: "길" },
  { age: 76, stem: "壬", branch: "午", score: 96, status: "최고" },
  { age: 86, stem: "辛", branch: "巳", score: 88, status: "최고" },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function deriveStatus(score, status) {
  if (typeof status === "string" && status.trim()) return status.trim();
  if (score >= 80) return "최고";
  if (score >= 15) return "길";
  if (score <= -60) return "흉";
  if (score < -10) return "주의";
  return "중립";
}

function getTone(score, status) {
  const label = String(status || "").trim();

  if (score >= 15 || /최고|길/.test(label)) {
    return {
      key: "good",
      stroke: "#4aa56f",
      fill: "#f9fffb",
      glow: "rgba(74, 165, 111, 0.28)",
      text: "#356749",
      card: "linear-gradient(180deg, rgba(244,255,247,.96), rgba(233,249,238,.92))",
      badge: "rgba(85, 183, 115, 0.12)",
    };
  }

  if (score <= -15 || /흉|주의/.test(label)) {
    return {
      key: "bad",
      stroke: "#d95f76",
      fill: "#fff8fb",
      glow: "rgba(217, 95, 118, 0.28)",
      text: "#915161",
      card: "linear-gradient(180deg, rgba(255,247,249,.96), rgba(255,236,243,.92))",
      badge: "rgba(217, 95, 118, 0.12)",
    };
  }

  return {
    key: "neutral",
    stroke: "#e9a23d",
    fill: "#fffdfa",
    glow: "rgba(233, 162, 61, 0.25)",
    text: "#8f6630",
    card: "linear-gradient(180deg, rgba(255,252,245,.96), rgba(255,246,227,.92))",
    badge: "rgba(233, 162, 61, 0.12)",
  };
}

function normalizeData(data) {
  const list = Array.isArray(data) ? data : [];

  return list
    .map((item, index) => {
      const age = Number(item?.age);
      const score = clamp(Number(item?.score) || 0, -100, 100);

      if (!Number.isFinite(age)) return null;

      const status = deriveStatus(score, item?.status);

      return {
        age,
        stem: String(item?.stem || "").trim(),
        branch: String(item?.branch || "").trim(),
        score,
        status,
        tone: getTone(score, status),
        key: `${age}-${item?.stem || ""}-${item?.branch || ""}-${score}-${status}-${index}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.age - b.age);
}

function getCurrentAge(dateText) {
  const [year, month, day] = String(dateText || "").split("-").map((value) => Number(value));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const today = new Date();
  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime())) return null;

  let age = today.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

  if (!hasBirthdayPassed) age -= 1;
  return Math.max(age, 0);
}

function mapScoreToY(score, neutralY, topY, bottomY) {
  const positiveRange = neutralY - topY;
  const negativeRange = bottomY - neutralY;

  if (score >= 0) {
    return neutralY - (positiveRange * score) / 100;
  }

  return neutralY + (negativeRange * Math.abs(score)) / 100;
}

function buildPoints(data, frame) {
  if (!data.length) return [];

  const { left, right, top, bottom, neutralY } = frame;
  const usableWidth = right - left;
  const step = data.length === 1 ? 0 : usableWidth / (data.length - 1);

  return data.map((item, index) => ({
    ...item,
    x: left + step * index,
    y: mapScoreToY(item.score, neutralY, top, bottom),
  }));
}

function buildPath(points, frame) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const commands = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const span = end.x - start.x;
    const startDirection = start.score > 0 ? -1 : start.score < 0 ? 1 : 0;
    const endDirection = end.score > 0 ? -1 : end.score < 0 ? 1 : 0;
    const startBias = Math.max(18, span * 0.18) + Math.abs(start.score) * 0.18;
    const endBias = Math.max(18, span * 0.18) + Math.abs(end.score) * 0.18;
    const cp1x = start.x + span * 0.34;
    const cp2x = end.x - span * 0.34;
    const cp1y = clamp(start.y + startDirection * startBias, frame.top, frame.bottom);
    const cp2y = clamp(end.y - endDirection * endBias, frame.top, frame.bottom);

    commands.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`);
  }

  return commands.join(" ");
}

function getCurrentLineX(points, currentAge) {
  if (!points.length || !Number.isFinite(currentAge)) return null;
  if (currentAge <= points[0].age) return points[0].x;
  if (currentAge >= points[points.length - 1].age) return points[points.length - 1].x;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (currentAge >= current.age && currentAge <= next.age) {
      const ratio = (currentAge - current.age) / Math.max(next.age - current.age, 1);
      return current.x + (next.x - current.x) * ratio;
    }
  }

  return points[0]?.x ?? null;
}

function isCurrentBlock(points, index, currentAge) {
  if (!Number.isFinite(currentAge) || !points[index]) return false;

  const current = points[index];
  const next = points[index + 1];
  if (!next) return currentAge >= current.age;
  return currentAge >= current.age && currentAge < next.age;
}

export function resolveLifeFortuneGraphData(result) {
  const candidates = [
    result?.daewoonGraph,
    result?.fortuneGraph,
    result?.lifeGraph,
    result?.daewoonTimeline,
    result?.timeline,
    result?.analysis?.daewoonGraph,
    result?.analysis?.fortuneGraph,
  ];

  return candidates.find((candidate) => Array.isArray(candidate) && candidate.some((item) => item && item.age != null)) || null;
}

export function resolveLifeFortuneCurrentAge(result, fallbackBirthDate) {
  const explicitAge = Number(result?.currentAge ?? result?.profile?.currentAge ?? result?.analysis?.currentAge);
  if (Number.isFinite(explicitAge)) return explicitAge;
  return getCurrentAge(fallbackBirthDate);
}

const LIFE_FORTUNE_GRAPH_COPY = {
  ko: {
    title: "인생 길흉 그래프 (억부+조후+종격 통합)",
    sampleFlow: "샘플 흐름",
    good: "길",
    neutral: "중립",
    bad: "흉",
    current: "현재",
    goodLuck: "길운",
    badTrend: "흉경향",
    statusLabels: { 최고: "최고", 길: "길", 흉: "흉", 주의: "주의", 중립: "중립" },
    ageLabel(age) { return `${age}세`; },
    ageFromLabel(age) { return `${age}세~`; },
    scoreLabel(score) { return `${score > 0 ? `+${score}` : score}점`; },
  },
  en: {
    title: "Life Fortune Graph (Strength, Season, and Special Pattern)",
    sampleFlow: "Sample flow",
    good: "Good",
    neutral: "Neutral",
    bad: "Low",
    current: "Now",
    goodLuck: "Favorable luck",
    badTrend: "Challenging trend",
    statusLabels: { 최고: "Peak", 길: "Good", 흉: "Difficult", 주의: "Caution", 중립: "Neutral" },
    ageLabel(age) { return `Age ${age}`; },
    ageFromLabel(age) { return `Age ${age}+`; },
    scoreLabel(score) { return `${score > 0 ? `+${score}` : score} pts`; },
  },
  ja: {
    title: "人生運勢グラフ（抑扶・調候・従格の統合）",
    sampleFlow: "サンプルの流れ",
    good: "吉",
    neutral: "中立",
    bad: "凶",
    current: "現在",
    goodLuck: "吉運",
    badTrend: "凶の傾向",
    statusLabels: { 최고: "最高", 길: "吉", 흉: "凶", 주의: "注意", 중립: "中立" },
    ageLabel(age) { return `${age}歳`; },
    ageFromLabel(age) { return `${age}歳〜`; },
    scoreLabel(score) { return `${score > 0 ? `+${score}` : score}点`; },
  },
  zh: {
    title: "人生吉凶図（抑扶・調候・従格の統合）",
    sampleFlow: "示例流向",
    good: "吉",
    neutral: "中性",
    bad: "凶",
    current: "现在",
    goodLuck: "吉运",
    badTrend: "凶向",
    statusLabels: { 최고: "最佳", 길: "吉", 흉: "凶", 주의: "注意", 중립: "中性" },
    ageLabel(age) { return `${age}岁`; },
    ageFromLabel(age) { return `${age}岁起`; },
    scoreLabel(score) { return `${score > 0 ? `+${score}` : score}分`; },
  },
};

function getLifeFortuneGraphCopy(locale) {
  if (locale === "en" || locale === "ja") return LIFE_FORTUNE_GRAPH_COPY[locale];
  if (locale === "zh-CN" || locale === "zh-TW") return LIFE_FORTUNE_GRAPH_COPY.zh;
  return LIFE_FORTUNE_GRAPH_COPY.ko;
}

function getLifeFortuneStatusLabel(status, copy) {
  return copy.statusLabels[String(status || "").trim()] || String(status || "");
}

export default function LifeFortuneGraph({
  data,
  currentAge,
  title,
  preview = false,
}) {
  const [locale, setLocale] = useState(() => getCurrentLoadingLocale());
  const copy = getLifeFortuneGraphCopy(locale);
  const displayTitle = title || copy.title;
  const gradientId = useId().replace(/:/g, "");
  const normalizedData = useMemo(() => normalizeData(data), [data]);
  const visibleData = normalizedData.length ? normalizedData : normalizeData(SAMPLE_DATA);
  const frame = useMemo(
    () => ({
      left: 72,
      right: 920,
      top: 44,
      bottom: 248,
      neutralY: 146,
    }),
    [],
  );
  const points = useMemo(() => buildPoints(visibleData, frame), [frame, visibleData]);
  const path = useMemo(() => buildPath(points, frame), [frame, points]);
  const activeAge = Number.isFinite(currentAge) ? currentAge : null;
  const currentLineX = useMemo(() => getCurrentLineX(points, activeAge), [activeAge, points]);
  const animationKey = useMemo(
    () => `${visibleData.map((item) => `${item.age}:${item.score}`).join("|")}-${activeAge ?? "na"}`,
    [activeAge, visibleData],
  );
  const isPreview = preview || !normalizedData.length;

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
    };
  }, []);

  return (
    <section
      style={{
        marginTop: 20,
        borderRadius: 24,
        border: "1px solid rgba(221, 203, 230, 0.88)",
        background: "linear-gradient(180deg, rgba(255,250,242,.98), rgba(255,248,255,.94))",
        boxShadow: "0 18px 50px rgba(124, 86, 129, 0.12)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "18px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            aria-hidden="true"
            style={{
              width: 15,
              height: 15,
              borderRadius: 4,
              border: "2px solid #c87c34",
              background: "linear-gradient(135deg, rgba(255,255,255,.88), rgba(255,239,214,.95))",
              boxShadow: "0 0 0 2px rgba(255,255,255,.7) inset",
            }}
          />
          <h2 style={{ margin: 0, color: "#6f5a4b", fontSize: 18, fontWeight: 700 }}>{displayTitle}</h2>
        </div>
        {isPreview ? (
          <span
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              background: "rgba(138, 92, 246, 0.1)",
              border: "1px solid rgba(138, 92, 246, 0.22)",
              color: "#7b57d1",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {copy.sampleFlow}
          </span>
        ) : null}
      </div>

      <div style={{ padding: "0 12px 16px" }}>
        <svg viewBox="0 0 960 320" role="img" aria-label={displayTitle} style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <linearGradient id={`${gradientId}-top`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(169, 224, 183, 0.42)" />
              <stop offset="100%" stopColor="rgba(240, 252, 243, 0.2)" />
            </linearGradient>
            <linearGradient id={`${gradientId}-bottom`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 239, 240, 0.06)" />
              <stop offset="100%" stopColor="rgba(230, 184, 221, 0.38)" />
            </linearGradient>
            <linearGradient id={`${gradientId}-border`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#edd7bf" />
              <stop offset="45%" stopColor="#e3cce5" />
              <stop offset="100%" stopColor="#d8e4f2" />
            </linearGradient>
          </defs>

          <rect x="12" y="10" width="936" height="292" rx="24" fill={`url(#${gradientId}-border)`} opacity="0.22" />
          <rect x="18" y="16" width="924" height="280" rx="22" fill="rgba(255,255,255,.82)" stroke={`url(#${gradientId}-border)`} strokeWidth="1.2" />

          <rect x={frame.left} y={frame.top} width={frame.right - frame.left} height={frame.neutralY - frame.top} fill={`url(#${gradientId}-top)`} />
          <rect x={frame.left} y={frame.neutralY} width={frame.right - frame.left} height={frame.bottom - frame.neutralY} fill={`url(#${gradientId}-bottom)`} />

          {points.map((point) => (
            <line
              key={`grid-${point.key}`}
              x1={point.x}
              x2={point.x}
              y1={frame.top}
              y2={frame.bottom}
              stroke="rgba(137, 129, 120, 0.12)"
              strokeWidth="1"
            />
          ))}

          <line x1={frame.left} x2={frame.right} y1={frame.neutralY} y2={frame.neutralY} stroke="rgba(214, 186, 166, 0.92)" strokeDasharray="6 7" strokeWidth="1.2" />

          <text x="44" y={frame.top + 8} fill="#88a06f" fontSize="15" fontWeight="700">
            {copy.good}
          </text>
          <text x="29" y={frame.neutralY + 5} fill="#c7a18b" fontSize="13" fontWeight="700">
            {copy.neutral}
          </text>
          <text x="44" y={frame.bottom - 8} fill="#c67a8a" fontSize="15" fontWeight="700">
            {copy.bad}
          </text>

          {currentLineX != null ? (
            <g>
              <line x1={currentLineX} x2={currentLineX} y1={frame.top - 8} y2={frame.bottom} stroke="#8b5cf6" strokeDasharray="7 6" strokeWidth="2" opacity="0.9" />
              <rect x={currentLineX - 23} y={frame.top - 28} width="46" height="22" rx="10" fill="#8b5cf6" />
              <text x={currentLineX} y={frame.top - 13} fill="#ffffff" fontSize="12" fontWeight="700" textAnchor="middle">
                {copy.current}
              </text>
            </g>
          ) : null}

          <g key={animationKey} className="fortune-curve-layer">
            <path d={path} pathLength="1" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" className="fortune-curve-shadow" />
            <path d={path} pathLength="1" fill="none" stroke={`url(#${gradientId}-path)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="fortune-curve-main" />
            <defs>
              <linearGradient id={`${gradientId}-path`} x1={frame.left} x2={frame.right} y1={frame.top} y2={frame.bottom} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#d8556c" />
                <stop offset="28%" stopColor="#bb9a78" />
                <stop offset="54%" stopColor="#48a77b" />
                <stop offset="80%" stopColor="#f2ae2b" />
                <stop offset="100%" stopColor="#da8b1d" />
              </linearGradient>
            </defs>
          </g>

          {points.map((point, index) => {
            const isCurrent = point.age === activeAge || isCurrentBlock(points, index, activeAge);

            return (
              <g key={point.key} className="fortune-node" style={{ animationDelay: `${index * 70}ms` }}>
                <circle cx={point.x} cy={point.y} r="12" fill={point.tone.glow} />
                <circle cx={point.x} cy={point.y} r="9" fill={point.tone.fill} stroke={point.tone.stroke} strokeWidth="3.2" />
                <circle cx={point.x} cy={point.y} r={isCurrent ? "4" : "3"} fill={isCurrent ? "#8b5cf6" : point.tone.stroke} />
              </g>
            );
          })}

          {points.map((point) => (
            <text key={`age-${point.key}`} x={point.x} y={frame.bottom + 18} textAnchor="middle" fill="#9b8f86" fontSize="13" fontWeight="700">
              {copy.ageLabel(point.age)}
            </text>
          ))}
        </svg>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 18,
            flexWrap: "wrap",
            marginTop: 8,
            color: "#9d8a8b",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: "#4aa56f" }} />
            {copy.goodLuck}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: "#e9a23d" }} />
            {copy.neutral}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: "#d95f76" }} />
            {copy.badTrend}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: "#8b5cf6" }} />
            {copy.current}
          </span>
        </div>

        <div
          className="fortune-card-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
            gap: 10,
            marginTop: 16,
          }}
        >
          {points.map((point, index) => {
            const current = isCurrentBlock(points, index, activeAge) || point.age === activeAge;

            return (
              <article
                key={`card-${point.key}`}
                style={{
                  borderRadius: 18,
                  padding: "14px 10px 12px",
                  background: point.tone.card,
                  border: `1.5px solid ${current ? "#8b5cf6" : point.tone.stroke}`,
                  boxShadow: current ? "0 10px 24px rgba(139, 92, 246, 0.18)" : "none",
                  textAlign: "center",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                  <span style={{ color: "#ff7e9a", fontWeight: 700, fontSize: 11 }}>{copy.ageFromLabel(point.age)}</span>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "3px 7px",
                      background: current ? "rgba(139, 92, 246, 0.12)" : point.tone.badge,
                      color: current ? "#7b57d1" : point.tone.text,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {current ? copy.current : getLifeFortuneStatusLabel(point.status, copy)}
                  </span>
                </div>
                <div style={{ marginTop: 12, color: "#4d4a46", fontSize: 34, lineHeight: 1, fontWeight: 700 }}>{point.stem}</div>
                <div style={{ marginTop: 8, color: "#5e5b57", fontSize: 30, lineHeight: 1, fontWeight: 700 }}>{point.branch}</div>
                <div style={{ marginTop: 12, color: "#9a8a7d", fontSize: 12, fontWeight: 600 }}>{copy.scoreLabel(point.score)}</div>
              </article>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .fortune-curve-main {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: draw-curve 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .fortune-curve-shadow {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: draw-curve 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .fortune-node {
          opacity: 0;
          transform-origin: center;
          animation: reveal-node 0.45s ease-out forwards;
        }

        @keyframes draw-curve {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes reveal-node {
          from {
            opacity: 0;
            transform: scale(0.72);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 720px) {
          .fortune-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </section>
  );
}
