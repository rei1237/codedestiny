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

// 연이 정원 라이트 — 피부색 사진 위에서도 선이 묻히지 않게 짙은 색에 흰빛 번짐을 둘렀다.
const LINE_META: OverlayMeta[] = [
  { key: "lifeLine", stroke: "#3f7d4c", glow: "rgba(255, 255, 255, 0.85)" },
  { key: "headLine", stroke: "#3f6fa8", glow: "rgba(255, 255, 255, 0.85)" },
  { key: "heartLine", stroke: "#b53660", glow: "rgba(255, 255, 255, 0.85)" },
  { key: "fateLine", stroke: "#6e5a8e", glow: "rgba(255, 255, 255, 0.85)" },
];

const PALM_LINE_OVERLAY_TEXT_TRANSLATIONS = {
  ko: {
    labels: { lifeLine: "생명선", headLine: "두뇌선", heartLine: "감정선", fateLine: "운명선" },
    noImage: "오버레이를 표시할 손바닥 이미지가 없습니다.",
    title: "손바닥 흐름 오버레이",
    aiDetected: "전문가가 인식한 주요 흐름",
    symbolic: "상징적 안내선",
    symbolicNote: "현재 라인은 정밀 좌표가 아닌 상징적 안내선입니다. 정밀 인식 결과가 없을 때 흐름 이해를 돕기 위한 시각화입니다.",
    undetectedNote: "점선은 이번 사진에서 판독되지 않은 선이에요. 자리만 짐작해 보여 주는 안내선입니다.",
  },
  en: {
    labels: { lifeLine: "Life line", headLine: "Head line", heartLine: "Heart line", fateLine: "Fate line" },
    noImage: "No palm image is available for the overlay.",
    title: "Palm Flow Overlay",
    aiDetected: "AI-detected major lines",
    symbolic: "Symbolic guide lines",
    symbolicNote: "These lines are symbolic guides rather than precise coordinates. They help visualize the flow when detailed recognition data is unavailable.",
    undetectedNote: "Dashed lines were not read in this photo. They only suggest where the line would be.",
  },
  ja: {
    labels: { lifeLine: "生命線", headLine: "頭脳線", heartLine: "感情線", fateLine: "運命線" },
    noImage: "オーバーレイを表示できる手のひら画像がありません。",
    title: "手のひらの流れオーバーレイ",
    aiDetected: "AIが認識した主要な流れ",
    symbolic: "象徴的なガイド線",
    symbolicNote: "現在の線は精密座標ではなく象徴的なガイド線です。精密認識結果がないときに流れを理解しやすくするための表示です。",
    undetectedNote: "点線はこの写真で読み取れなかった線です。位置の目安として表示しています。",
  },
  "zh-CN": {
    labels: { lifeLine: "生命线", headLine: "智慧线", heartLine: "感情线", fateLine: "命运线" },
    noImage: "没有可用于叠加显示的手掌图片。",
    title: "手掌流向叠加图",
    aiDetected: "AI 识别的主要纹路",
    symbolic: "象征性引导线",
    symbolicNote: "当前线条并非精确坐标,而是象征性引导线,用于在没有精确识别结果时帮助理解纹路走向。",
    undetectedNote: "虚线是这张照片中未能判读的纹线,仅作为位置参考。",
  },
  "zh-TW": {
    labels: { lifeLine: "生命線", headLine: "智慧線", heartLine: "感情線", fateLine: "命運線" },
    noImage: "沒有可用於疊加顯示的手掌圖片。",
    title: "手掌流向疊加圖",
    aiDetected: "AI 辨識的主要紋路",
    symbolic: "象徵性引導線",
    symbolicNote: "目前線條並非精確座標,而是象徵性引導線,用於在沒有精確辨識結果時幫助理解紋路走向。",
    undetectedNote: "虛線是這張照片中未能判讀的紋線,僅作為位置參考。",
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
  undetectedLines,
  activeLine,
  immersive,
  onSelectLine,
}: {
  imageUrl: string | null;
  imageAlt: string;
  pathMap?: OverlayPathMap | null;
  /** 판독이 detected:false 라 한 선. 점선·옅게 그린다. */
  undetectedLines?: OverlayLineKey[];
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
      <div className="rounded-2xl border border-[#b53660]/20 bg-[#fff9f4] p-4 text-sm text-[#6b4d5e]">
        {copy.noImage}
      </div>
    );
  }

  return (
    <section className={`cd-ink-card cd-hanji relative overflow-hidden rounded-2xl border border-[#b53660]/20 bg-white shadow-[0_10px_30px_rgba(64,42,56,0.06)] ${immersive ? "cd-overlay-immersive" : ""}`}>
      <span aria-hidden className="cd-seal-dot pointer-events-none absolute right-2 top-2 h-3 w-3 rounded-full border border-[#c9a46a] bg-[#e9a7bc]" />
      <div className="flex items-center justify-between border-b border-[#b53660]/15 px-3 py-2 md:px-4">
        <h3 className="text-sm font-black text-[#402a38] md:text-base">{copy.title}</h3>
        <span className="rounded-full border border-[#b53660]/25 bg-[#f8e4ea] px-2 py-1 text-[11px] font-bold text-[#b53660]">
          {hasPreciseCoordinates ? copy.aiDetected : copy.symbolic}
        </span>
      </div>

      <div className="relative w-full bg-[#fff9f4]">
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
            const undetected = undetectedLines?.includes(line.key) ?? false;
            return (
              <g key={line.key}>
                <path
                  d={renderedPaths[line.key]}
                  fill="none"
                  stroke={line.stroke}
                  strokeWidth={isActive ? 2.3 : 1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={undetected ? "2.4 2.6" : undefined}
                  opacity={undetected ? (isActive ? 0.72 : 0.5) : isActive ? 0.98 : 0.88}
                  style={{
                    filter: undetected
                      ? "none"
                      : isActive
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
                  ? "border-[#b53660] bg-[#f8e4ea] text-[#b53660] shadow-[inset_0_-2px_0_#b53660]"
                  : "border-[#b53660]/20 bg-white text-[#402a38] hover:bg-[#fdf0f4] hover:shadow-[0_4px_10px_rgba(181,54,96,0.14)]"
              }`}
            >
              {copy.labels[line.key]}
            </button>
          );
        })}
      </div>

      {undetectedLines?.length ? (
        <p className="border-t border-[#b53660]/15 px-3 py-2 text-[11px] leading-5 text-[#6b4d5e] md:px-4 md:text-xs">
          {copy.undetectedNote}
        </p>
      ) : null}

      {!hasPreciseCoordinates ? (
        <p className="border-t border-[#b53660]/15 px-3 py-2 text-[11px] leading-5 text-[#6b4d5e] md:px-4 md:text-xs">
          {copy.symbolicNote}
        </p>
      ) : null}

      <style jsx>{`
        .cd-overlay-immersive {
          box-shadow:
            0 0 0 1px rgba(181, 54, 96, 0.12),
            0 20px 48px rgba(64, 42, 56, 0.12);
        }

        .cd-overlay-noise {
          background-image:
            radial-gradient(circle at 10% 20%, rgba(233, 167, 188, 0.35) 0 1px, transparent 2px),
            radial-gradient(circle at 70% 80%, rgba(201, 164, 106, 0.3) 0 1px, transparent 2px);
          opacity: 0.6;
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
