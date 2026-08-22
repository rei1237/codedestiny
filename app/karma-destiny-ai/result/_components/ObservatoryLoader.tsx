"use client";

import { memo, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

/**
 * 상담 진행 화면 — 다섯 관점이 순서대로 이어지며 별자리가 완성된다.
 *
 * 노드는 워커의 GENERATION_STAGES 6단계와 1:1로 대응한다. 서버가 generationProgress에
 * stageIndex 를 실어 주므로 percent 로 역산하지 않는다(역산하면 노드 라벨과 실제 계산이
 * 어긋난다).
 *
 * 🔴 성능: 결과 화면은 0.9~2.6초마다 폴링으로 전체 리렌더된다. 이 컴포넌트를 memo 로
 * 감싸고 props 를 (activeIndex, edgeProgress 양자화값)으로 좁혀야 애니메이션이 끊기지 않는다.
 * 애니메이션 속성은 transform / opacity / stroke-dashoffset 만 쓴다.
 */

export const LENS_NODES = [
  { key: "saju", glyph: "柱", x: 26, y: 118 },
  { key: "ziwei", glyph: "紫", x: 88, y: 46 },
  { key: "sukuyo", glyph: "宿", x: 154, y: 104 },
  { key: "western", glyph: "星", x: 218, y: 40 },
  { key: "vedic", glyph: "梵", x: 268, y: 112 },
  { key: "ai", glyph: "業", x: 160, y: 158 },
] as const;

interface ObservatoryLoaderCopy {
  lensLabel: Record<string, string>;
  ariaLabel: (active: number, total: number, label: string) => string;
  stageDefault: string;
  stageSuffix: string;
}

const OBSERVATORY_LOADER_EN: ObservatoryLoaderCopy = {
  lensLabel: { saju: "Saju", ziwei: "Ziwei", sukuyo: "Sukuyo", western: "Western Astrology", vedic: "Vedic", ai: "Synthesis" },
  ariaLabel: (active, total, label) => `Connecting the constellations of destiny — ${active}/${total} ${label}`,
  stageDefault: "Connecting the constellations of destiny",
  stageSuffix: " stage",
};

const OBSERVATORY_LOADER_COPY: Partial<Record<LoadingLocale, ObservatoryLoaderCopy>> = {
  ko: {
    lensLabel: { saju: "사주", ziwei: "자미두수", sukuyo: "숙요", western: "서양점성술", vedic: "베다", ai: "종합" },
    ariaLabel: (active, total, label) => `운명의 별자리를 잇는 중 — ${active}/${total} ${label}`,
    stageDefault: "운명의 별자리를 잇는 중",
    stageSuffix: "단계",
  },
  ja: {
    lensLabel: { saju: "四柱推命", ziwei: "紫微斗数", sukuyo: "宿曜", western: "西洋占星術", vedic: "ヴェーダ", ai: "総合" },
    ariaLabel: (active, total, label) => `運命の星座をつないでいます — ${active}/${total} ${label}`,
    stageDefault: "運命の星座をつないでいます",
    stageSuffix: "段階",
  },
  "zh-CN": {
    lensLabel: { saju: "八字", ziwei: "紫微斗数", sukuyo: "宿曜", western: "西方占星", vedic: "吠陀", ai: "综合" },
    ariaLabel: (active, total, label) => `正在连接命运的星座 — ${active}/${total} ${label}`,
    stageDefault: "正在连接命运的星座",
    stageSuffix: "阶段",
  },
  "zh-TW": {
    lensLabel: { saju: "八字", ziwei: "紫微斗數", sukuyo: "宿曜", western: "西方占星", vedic: "吠陀", ai: "綜合" },
    ariaLabel: (active, total, label) => `正在連接命運的星座 — ${active}/${total} ${label}`,
    stageDefault: "正在連接命運的星座",
    stageSuffix: "階段",
  },
  vi: {
    lensLabel: { saju: "Saju", ziwei: "Tử Vi", sukuyo: "Sukuyo", western: "Chiêm Tinh Phương Tây", vedic: "Vệ Đà", ai: "Tổng Hợp" },
    ariaLabel: (active, total, label) => `Đang kết nối các chòm sao vận mệnh — ${active}/${total} ${label}`,
    stageDefault: "Đang kết nối các chòm sao vận mệnh",
    stageSuffix: " giai đoạn",
  },
  hi: {
    lensLabel: { saju: "साजू", ziwei: "ज़ीवेई", sukuyo: "सुक्यो", western: "पश्चिमी ज्योतिष", vedic: "वैदिक", ai: "संश्लेषण" },
    ariaLabel: (active, total, label) => `भाग्य के तारामंडल को जोड़ा जा रहा है — ${active}/${total} ${label}`,
    stageDefault: "भाग्य के तारामंडल को जोड़ा जा रहा है",
    stageSuffix: " चरण",
  },
  es: {
    lensLabel: { saju: "Saju", ziwei: "Ziwei", sukuyo: "Sukuyo", western: "Astrología Occidental", vedic: "Védica", ai: "Síntesis" },
    ariaLabel: (active, total, label) => `Conectando las constelaciones del destino — ${active}/${total} ${label}`,
    stageDefault: "Conectando las constelaciones del destino",
    stageSuffix: " etapa",
  },
  fr: {
    lensLabel: { saju: "Saju", ziwei: "Ziwei", sukuyo: "Sukuyo", western: "Astrologie Occidentale", vedic: "Védique", ai: "Synthèse" },
    ariaLabel: (active, total, label) => `Connexion des constellations du destin — ${active}/${total} ${label}`,
    stageDefault: "Connexion des constellations du destin",
    stageSuffix: " étape",
  },
  de: {
    lensLabel: { saju: "Saju", ziwei: "Ziwei", sukuyo: "Sukuyo", western: "Westliche Astrologie", vedic: "Vedisch", ai: "Synthese" },
    ariaLabel: (active, total, label) => `Die Sternbilder des Schicksals werden verbunden — ${active}/${total} ${label}`,
    stageDefault: "Die Sternbilder des Schicksals werden verbunden",
    stageSuffix: " Stufe",
  },
  nl: {
    lensLabel: { saju: "Saju", ziwei: "Ziwei", sukuyo: "Sukuyo", western: "Westerse Astrologie", vedic: "Vedisch", ai: "Synthese" },
    ariaLabel: (active, total, label) => `De sterrenbeelden van het lot worden verbonden — ${active}/${total} ${label}`,
    stageDefault: "De sterrenbeelden van het lot worden verbonden",
    stageSuffix: " fase",
  },
  ms: {
    lensLabel: { saju: "Saju", ziwei: "Ziwei", sukuyo: "Sukuyo", western: "Astrologi Barat", vedic: "Veda", ai: "Sintesis" },
    ariaLabel: (active, total, label) => `Menghubungkan buruj nasib — ${active}/${total} ${label}`,
    stageDefault: "Menghubungkan buruj nasib",
    stageSuffix: " peringkat",
  },
};

function getObservatoryLoaderCopy(locale: LoadingLocale): ObservatoryLoaderCopy {
  return OBSERVATORY_LOADER_COPY[locale] || OBSERVATORY_LOADER_EN;
}

function useObservatoryLoaderCopy(): ObservatoryLoaderCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getObservatoryLoaderCopy(locale);
}

const EDGES = LENS_NODES.slice(0, -1).map((node, index) => {
  const next = LENS_NODES[index + 1];
  return `M${node.x} ${node.y} L${next.x} ${next.y}`;
});

function ConstellationProgress({ activeIndex, edgeProgress, copy }: { activeIndex: number; edgeProgress: number; copy: ObservatoryLoaderCopy }) {
  const active = Math.max(0, Math.min(LENS_NODES.length - 1, activeIndex));
  const current = LENS_NODES[active];
  return (
    <svg
      className="kdo-loader__sky"
      viewBox="0 0 300 190"
      role="img"
      aria-label={copy.ariaLabel(active + 1, LENS_NODES.length, copy.lensLabel[current.key])}
    >
      {EDGES.map((path, index) => (
        <path
          key={path}
          className="kdo-loader__edge"
          d={path}
          pathLength={1}
          style={{ "--kdo-edge-p": index < active ? 1 : index === active ? edgeProgress : 0 } as CSSProperties}
        />
      ))}
      {LENS_NODES.map((node, index) => (
        <g
          key={node.key}
          className="kdo-loader__node"
          data-state={index < active ? "done" : index === active ? "active" : "idle"}
        >
          <circle className="kdo-loader__dot" cx={node.x} cy={node.y} r={7} />
          <text className="kdo-loader__glyph" x={node.x} y={node.y + 3.6} textAnchor="middle">{node.glyph}</text>
          <text className="kdo-loader__label" x={node.x} y={node.y + 25} textAnchor="middle">{copy.lensLabel[node.key]}</text>
        </g>
      ))}
    </svg>
  );
}

const MemoConstellation = memo(ConstellationProgress);

export default function ObservatoryLoader({
  stageIndex,
  totalStages = LENS_NODES.length,
  percent,
  stageLabel,
  detail,
  children,
}: {
  stageIndex?: number;
  totalStages?: number;
  percent: number;
  stageLabel?: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  const stages = Math.max(1, totalStages);
  const active = Number.isFinite(Number(stageIndex))
    ? Math.max(0, Math.min(LENS_NODES.length - 1, Number(stageIndex)))
    // 서버가 stageIndex 를 주지 않는 경로(입력 화면)에서만 percent 로 역산한다.
    : Math.min(LENS_NODES.length - 1, Math.floor((percent / 100) * stages));
  const within = (percent % (100 / stages)) / (100 / stages);
  // 미세 변동으로 리렌더가 나지 않도록 20단계로 양자화한다.
  const edgeProgress = Math.round(Math.max(0, Math.min(1, within)) * 20) / 20;
  const copy = useObservatoryLoaderCopy();

  return (
    <section className="kdo-loader" aria-live="polite">
      <MemoConstellation activeIndex={active} edgeProgress={edgeProgress} copy={copy} />
      <span className="kdo-loader__kicker">Premium Destiny Observatory</span>
      <h1>{stageLabel || copy.stageDefault}</h1>
      {detail && <p>{detail}</p>}
      {/* 애니메이션을 못 보는 사용자에게도 진행 정보가 그대로 전달되어야 한다. */}
      <strong className="kdo-loader__meter">
        {percent}% · {active + 1} / {LENS_NODES.length}{copy.stageSuffix}
      </strong>
      {children}
    </section>
  );
}
