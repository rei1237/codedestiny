"use client";

import { memo } from "react";
import type { CSSProperties } from "react";

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
  { key: "saju", label: "사주", glyph: "柱", x: 26, y: 118 },
  { key: "ziwei", label: "자미두수", glyph: "紫", x: 88, y: 46 },
  { key: "sukuyo", label: "숙요", glyph: "宿", x: 154, y: 104 },
  { key: "western", label: "서양점성술", glyph: "星", x: 218, y: 40 },
  { key: "vedic", label: "베다", glyph: "梵", x: 268, y: 112 },
  { key: "ai", label: "종합", glyph: "業", x: 160, y: 158 },
] as const;

const EDGES = LENS_NODES.slice(0, -1).map((node, index) => {
  const next = LENS_NODES[index + 1];
  return `M${node.x} ${node.y} L${next.x} ${next.y}`;
});

function ConstellationProgress({ activeIndex, edgeProgress }: { activeIndex: number; edgeProgress: number }) {
  const active = Math.max(0, Math.min(LENS_NODES.length - 1, activeIndex));
  const current = LENS_NODES[active];
  return (
    <svg
      className="kdo-loader__sky"
      viewBox="0 0 300 190"
      role="img"
      aria-label={`운명의 별자리를 잇는 중 — ${active + 1}/${LENS_NODES.length} ${current.label}`}
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
          <text className="kdo-loader__label" x={node.x} y={node.y + 25} textAnchor="middle">{node.label}</text>
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

  return (
    <section className="kdo-loader" aria-live="polite">
      <MemoConstellation activeIndex={active} edgeProgress={edgeProgress} />
      <span className="kdo-loader__kicker">Premium Destiny Observatory</span>
      <h1>{stageLabel || "운명의 별자리를 잇는 중"}</h1>
      {detail && <p>{detail}</p>}
      {/* 애니메이션을 못 보는 사용자에게도 진행 정보가 그대로 전달되어야 한다. */}
      <strong className="kdo-loader__meter">
        {percent}% · {active + 1} / {LENS_NODES.length}단계
      </strong>
      {children}
    </section>
  );
}
