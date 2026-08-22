"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type OverlayLineKey = "lifeLine" | "headLine" | "heartLine" | "fateLine";
export type OverlayPathMap = Partial<Record<OverlayLineKey, string>>;

type OverlayMeta = {
  key: OverlayLineKey;
  stroke: string;
  glow: string;
};

const LINE_META: OverlayMeta[] = [
  { key: "lifeLine", stroke: "#8FBF7C", glow: "rgba(171, 214, 132, 0.55)" },
  { key: "headLine", stroke: "#78ABD9", glow: "rgba(131, 188, 255, 0.55)" },
  { key: "heartLine", stroke: "#DEA4BE", glow: "rgba(250, 178, 212, 0.55)" },
  { key: "fateLine", stroke: "#B89ADA", glow: "rgba(203, 170, 245, 0.55)" },
];

const PALM_LINE_OVERLAY_TEXT_TRANSLATIONS = {
  ko: {
    labels: { lifeLine: "생명선", headLine: "두뇌선", heartLine: "감정선", fateLine: "운명선" },
    noImage: "오버레이를 표시할 손바닥 이미지가 없습니다.",
    title: "손바닥 흐름 오버레이",
    aiDetected: "전문가가 인식한 주요 흐름",
    symbolic: "상징적 안내선",
    symbolicNote: "현재 라인은 정밀 좌표가 아닌 상징적 안내선입니다. 정밀 인식 결과가 없을 때 흐름 이해를 돕기 위한 시각화입니다.",
  },
  en: {
    labels: { lifeLine: "Life line", headLine: "Head line", heartLine: "Heart line", fateLine: "Fate line" },
    noImage: "No palm image is available for the overlay.",
    title: "Palm Flow Overlay",
    aiDetected: "AI-detected major lines",
    symbolic: "Symbolic guide lines",
    symbolicNote: "These lines are symbolic guides rather than precise coordinates. They help visualize the flow when detailed recognition data is unavailable.",
  },
  ja: {
    labels: { lifeLine: "生命線", headLine: "頭脳線", heartLine: "感情線", fateLine: "運命線" },
    noImage: "オーバーレイを表示できる手のひら画像がありません。",
    title: "手のひらの流れオーバーレイ",
    aiDetected: "AIが認識した主要な流れ",
    symbolic: "象徴的なガイド線",
    symbolicNote: "現在の線は精密座標ではなく象徴的なガイド線です。精密認識結果がないときに流れを理解しやすくするための表示です。",
  },
  "zh-CN": {
    labels: { lifeLine: "生命线", headLine: "智慧线", heartLine: "感情线", fateLine: "命运线" },
    noImage: "没有可用于叠加显示的手掌图片。",
    title: "手掌流向叠加图",
    aiDetected: "AI 识别的主要纹路",
    symbolic: "象征性引导线",
    symbolicNote: "当前线条并非精确坐标,而是象征性引导线,用于在没有精确识别结果时帮助理解纹路走向。",
  },
  "zh-TW": {
    labels: { lifeLine: "生命線", headLine: "智慧線", heartLine: "感情線", fateLine: "命運線" },
    noImage: "沒有可用於疊加顯示的手掌圖片。",
    title: "手掌流向疊加圖",
    aiDetected: "AI 辨識的主要紋路",
    symbolic: "象徵性引導線",
    symbolicNote: "目前線條並非精確座標,而是象徵性引導線,用於在沒有精確辨識結果時幫助理解紋路走向。",
  },
} as const;

function palmLineOverlayCopy(locale: LoadingLocale) {
  return PALM_LINE_OVERLAY_TEXT_TRANSLATIONS[locale as keyof typeof PALM_LINE_OVERLAY_TEXT_TRANSLATIONS] || PALM_LINE_OVERLAY_TEXT_TRANSLATIONS.en;
}

const SYMBOLIC_PATHS: Record<OverlayLineKey, string> = {
  lifeLine: "M62 19 C 43 27, 30 46, 27 65 C 25 76, 30 86, 38 91",
  headLine: "M68 42 C 55 46, 46 48, 37 52 C 31 54, 26 56, 20 58",
  heartLine: "M78 31 C 64 26, 51 24, 38 26 C 28 28, 19 33, 13 40",
  fateLine: "M49 88 C 49 76, 49 66, 50 56 C 51 45, 52 34, 54 22",
};

function normalizePath(pathLike: unknown): string | null {
  if (typeof pathLike !== "string") return null;
  const text = pathLike.trim();
  if (!text) return null;
  if (!/[MLCQAZmlcqaz]/.test(text)) return null;
  return text;
}

export default function PalmLineOverlay({
  imageUrl,
  imageAlt,
  pathMap,
  activeLine,
  immersive,
  onSelectLine,
}: {
  imageUrl: string | null;
  imageAlt: string;
  pathMap?: OverlayPathMap | null;
  activeLine: OverlayLineKey | null;
  immersive?: boolean;
  onSelectLine: (line: OverlayLineKey) => void;
}) {
  const [hoverLine, setHoverLine] = useState<OverlayLineKey | null>(null);
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = palmLineOverlayCopy(locale);

  const normalizedMap = useMemo(() => {
    const out: OverlayPathMap = {};
    for (const item of LINE_META) {
      const normalized = normalizePath(pathMap?.[item.key]);
      if (normalized) out[item.key] = normalized;
    }
    return out;
  }, [pathMap]);

  const hasPreciseCoordinates = Object.keys(normalizedMap).length > 0;

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  const renderedPaths: Record<OverlayLineKey, string> = {
    lifeLine: normalizedMap.lifeLine || SYMBOLIC_PATHS.lifeLine,
    headLine: normalizedMap.headLine || SYMBOLIC_PATHS.headLine,
    heartLine: normalizedMap.heartLine || SYMBOLIC_PATHS.heartLine,
    fateLine: normalizedMap.fateLine || SYMBOLIC_PATHS.fateLine,
  };

  if (!imageUrl) {
    return (
      <div className="rounded-2xl border border-[#d8bf72]/40 bg-[#0b111b]/85 p-4 text-sm text-[#f6eecf]/90">
        {copy.noImage}
      </div>
    );
  }

  return (
    <section className={`cd-ink-card cd-hanji relative overflow-hidden rounded-2xl border border-[#d8bf72]/45 bg-[linear-gradient(145deg,rgba(9,14,23,0.95),rgba(26,18,16,0.9))] ${immersive ? "cd-overlay-immersive" : ""}`}>
      <span className="cd-seal-dot pointer-events-none absolute right-2 top-2 h-3 w-3 rounded-full border border-[#f3d888]/65 bg-[#8f1c1c]/85" />
      <div className="flex items-center justify-between border-b border-[#d8bf72]/25 px-3 py-2 md:px-4">
        <h3 className="text-sm font-black text-[#f3de9e] md:text-base">{copy.title}</h3>
        <span className="rounded-full border border-[#d8bf72]/35 bg-[#141f2f]/80 px-2 py-1 text-[11px] font-bold text-[#fce9b4]">
          {hasPreciseCoordinates ? copy.aiDetected : copy.symbolic}
        </span>
      </div>

      <div className="relative w-full bg-[#04070d]">
        {immersive ? <div aria-hidden className="cd-overlay-noise pointer-events-none absolute inset-0 z-[1]" /> : null}
        <img
          src={imageUrl}
          alt={imageAlt}
          className={`block w-full object-contain ${immersive ? "max-h-[84vh]" : "max-h-[70vh]"}`}
        />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
        >
          {LINE_META.map((line) => {
            const isActive = activeLine === line.key || hoverLine === line.key;
            return (
              <g key={line.key}>
                <path
                  d={renderedPaths[line.key]}
                  fill="none"
                  stroke={line.stroke}
                  strokeWidth={isActive ? 2.3 : 1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isActive ? 0.98 : 0.88}
                  style={{
                    filter: isActive
                      ? `drop-shadow(0 0 8px ${line.glow}) drop-shadow(0 0 14px ${line.glow})`
                      : `drop-shadow(0 0 5px ${line.glow})`,
                    transition: "all 200ms ease",
                  }}
                  className="pointer-events-none"
                />
                <path
                  d={renderedPaths[line.key]}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-auto cursor-pointer"
                  onMouseEnter={() => setHoverLine(line.key)}
                  onMouseLeave={() => setHoverLine(null)}
                  onClick={() => onSelectLine(line.key)}
                  onTouchStart={() => onSelectLine(line.key)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 py-3 md:px-4">
        {LINE_META.map((line) => {
          const active = activeLine === line.key;
          return (
            <button
              key={line.key}
              type="button"
              onClick={() => onSelectLine(line.key)}
              className={`min-h-[44px] min-w-[88px] shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition-all duration-200 md:text-sm ${
                active
                  ? "border-[#e5cd82]/70 bg-[#2c1d1c] text-[#ffe7b8] shadow-[0_0_14px_rgba(236,206,126,0.32)]"
                  : "border-[#d8bf72]/30 bg-[#101828] text-[#f4e8c3] hover:bg-[#17233a] hover:shadow-[0_0_12px_rgba(226,193,106,0.24)]"
              }`}
            >
              {copy.labels[line.key]}
            </button>
          );
        })}
      </div>

      {!hasPreciseCoordinates ? (
        <p className="border-t border-[#d8bf72]/25 px-3 py-2 text-[11px] leading-5 text-[#f5eccc]/80 md:px-4 md:text-xs">
          {copy.symbolicNote}
        </p>
      ) : null}

      <style jsx>{`
        .cd-overlay-immersive {
          box-shadow:
            0 0 0 1px rgba(216, 191, 114, 0.35),
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 0 34px rgba(216, 191, 114, 0.08);
        }

        .cd-overlay-noise {
          background-image:
            radial-gradient(circle at 10% 20%, rgba(255, 230, 160, 0.12) 0 1px, transparent 2px),
            radial-gradient(circle at 70% 80%, rgba(255, 230, 160, 0.08) 0 1px, transparent 2px),
            repeating-linear-gradient(0deg, rgba(216, 191, 114, 0.03) 0, rgba(216, 191, 114, 0.03) 1px, transparent 1px, transparent 8px);
          opacity: 0.7;
          animation: cdOverlayDrift 14s ease-in-out infinite alternate;
        }

        @keyframes cdOverlayDrift {
          from { transform: translateY(0); }
          to { transform: translateY(-5px); }
        }
      `}</style>
    </section>
  );
}
