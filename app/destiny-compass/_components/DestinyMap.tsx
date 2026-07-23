"use client";
/**
 * 운명의 지도 — RPG 맵 허브. 은하수 배경 + 다층 SVG 대륙 + 6지역 랜드마크 + 캐릭터.
 * 대기 원근(Z0 딥스페이스 → Z1 대륙 → Z2 노드 → Z3 대기베일 → Z4 캐릭터 → Z5 UI).
 * 노드는 자체 SVG(NodeIcon), 이모지 미사용. children = 하단 UI 슬롯(고민 입력/처리).
 */
import { useEffect, useState, type ReactNode } from "react";
import { Starfield } from "./Starfield";
import { PigFace } from "./PigFace";
import { SpriteImage } from "./SpriteImage";
import { NodeIcon, type NodeKind } from "./NodeIcon";
import { compassAssets } from "../data/assets";
import { REGIONS, HERE, regionByKey } from "./mapRegions";
import styles from "./map.module.css";

// 지역 고유 강조 톤(불투명 hex — NodeIcon 채색용). region.glow(rgba)와 짝.
const NODE_TONE: Record<string, string> = {
  castle: "#f0d9a0",
  forest: "#8fe0a2",
  city: "#8fd0ff",
  lake: "#a9c2ff",
  fog: "#d7ccf2",
};

// % 좌표 → 섬 SVG viewBox(400×300) 좌표
function toViewBox(x: number, y: number) {
  return { vx: (x / 100) * 400, vy: (y / 100) * 300 };
}

interface DestinyMapProps {
  title?: string;
  kicker?: string;
  showFog?: boolean;
  /** 설정 시 현재 위치 → 해당 지역으로 빛나는 운명의 길을 그린다(STEP 4 길 발견). */
  pathTo?: string;
  /** 설정 시 해당 지역 랜드마크를 목적지로 강조(펄스). reveal 전용. */
  highlightRegion?: string;
  /** 입력 화면에서 칩 hover/선택 시 대응 노드를 은은히 밝힌다(highlight와 독립). */
  spotlightRegion?: string | null;
  /** 현재 위치 꽃돼지 표정(입력 상태머신과 동기화). */
  pigExpr?: "neutral" | "happy" | "talk" | "think" | "surprise";
  /** 무입력 대기 시 사자가 고개를 살짝 기울임. */
  guideTilt?: boolean;
  onRegion?: (key: string) => void;
  children?: ReactNode;
}

export function DestinyMap({
  title = "운명의 지도",
  kicker = "The Destiny Map",
  showFog = false,
  pathTo,
  highlightRegion,
  spotlightRegion,
  pigExpr = "happy",
  guideTilt = false,
  onRegion,
  children,
}: DestinyMapProps) {
  const dest = pathTo ? regionByKey(pathTo) : undefined;
  let destinyPath: string | null = null;
  if (dest) {
    const from = toViewBox(HERE.x, HERE.y);
    const to = toViewBox(dest.x, dest.y);
    const cx = (from.vx + to.vx) / 2;
    const cy = (from.vy + to.vy) / 2 - 26; // 위로 살짝 아치
    destinyPath = `M${from.vx},${from.vy} Q${cx},${cy} ${to.vx},${to.vy}`;
  }

  // 경로 위를 도는 빛(comet)은 SMIL이라 reduced-motion을 CSS로 못 막음 → 클라이언트에서 게이트
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return (
    <div className={styles.stage}>
      {/* Z0 — 딥스페이스 */}
      <Starfield />

      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>{kicker}</span>
        <h1 className={styles.mapTitle}>{title}</h1>
      </header>

      <div className={`${styles.mapField} ${showFog ? styles.mapFieldZoom : ""}`}>
        {/* Z1 — 대륙(다층 텍스처 + 해안 + 부양 그림자 + 숨쉬기) */}
        <svg className={styles.islandSvg} viewBox="0 0 400 300" aria-hidden="true">
          <defs>
            <radialGradient id="cd-water" cx="50%" cy="52%" r="60%">
              <stop offset="0%" stopColor="rgba(120,150,230,.34)" />
              <stop offset="68%" stopColor="rgba(60,80,170,.18)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <linearGradient id="cd-land" x1="0" y1="0" x2="0.25" y2="1">
              <stop offset="0%" stopColor="#7bb98a" />
              <stop offset="42%" stopColor="#4f8763" />
              <stop offset="100%" stopColor="#2b5340" />
            </linearGradient>
            <radialGradient id="cd-land-light" cx="42%" cy="30%" r="62%">
              <stop offset="0%" stopColor="rgba(226,246,214,.55)" />
              <stop offset="55%" stopColor="rgba(226,246,214,0)" />
            </radialGradient>
            <linearGradient id="cd-shore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffeebb" />
              <stop offset="100%" stopColor="#d8b478" />
            </linearGradient>
            <filter id="cd-isle-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="cd-land-clip">
              <path d="M142,84 C182,54 252,52 298,88 C334,116 342,156 322,196 C304,236 250,260 196,256 C142,252 92,232 76,188 C60,150 98,112 142,84 Z" />
            </clipPath>
          </defs>

          {/* 물결 글로우 + 궤도 링 */}
          <ellipse cx="200" cy="168" rx="190" ry="124" fill="url(#cd-water)" />
          <ellipse cx="200" cy="168" rx="150" ry="96" fill="none" stroke="rgba(160,200,255,.16)" strokeWidth="1.5" />
          <ellipse cx="200" cy="168" rx="116" ry="72" fill="none" stroke="rgba(160,200,255,.1)" strokeWidth="1" />

          {/* 부양 그림자(대륙 아래) */}
          <ellipse cx="200" cy="248" rx="132" ry="30" fill="rgba(6,4,20,.55)" filter="url(#cd-isle-glow)" />

          <g className={styles.islandBreathe} style={{ transformOrigin: "200px 168px" }}>
            {/* 레이 라인(중앙→지역, 은은한 금빛) */}
            <g stroke="rgba(232,213,163,.24)" strokeWidth="1" strokeDasharray="3 5" fill="none">
              <path d="M200,168 L200,60" />
              <path d="M200,168 L86,126" />
              <path d="M200,168 L322,132" />
              <path d="M200,168 L120,224" />
              <path d="M200,168 L286,230" />
            </g>

            {/* 섬 본체 */}
            <path
              d="M142,84 C182,54 252,52 298,88 C334,116 342,156 322,196 C304,236 250,260 196,256 C142,252 92,232 76,188 C60,150 98,112 142,84 Z"
              fill="url(#cd-land)"
              filter="url(#cd-isle-glow)"
            />
            {/* 지형 텍스처 — 등고선/능선 (대륙 클립 내부) */}
            <g clipPath="url(#cd-land-clip)" fill="none" strokeLinecap="round">
              <path d="M96,150 C140,132 180,138 214,128 C250,118 288,124 320,110" stroke="rgba(20,54,38,.35)" strokeWidth="2" />
              <path d="M104,178 C150,166 196,172 236,160 C270,150 300,156 326,146" stroke="rgba(20,54,38,.28)" strokeWidth="1.6" />
              <path d="M120,208 C158,200 198,204 232,196 C262,189 288,192 312,184" stroke="rgba(20,54,38,.22)" strokeWidth="1.4" />
              <path d="M150,120 C176,132 176,150 158,166" stroke="rgba(226,246,214,.22)" strokeWidth="1.4" />
              <path d="M262,116 C282,130 282,150 266,168" stroke="rgba(226,246,214,.18)" strokeWidth="1.4" />
              {/* 상단 라이팅 */}
              <path d="M142,84 C182,54 252,52 298,88 C334,116 342,156 322,196 C304,236 250,260 196,256 C142,252 92,232 76,188 C60,150 98,112 142,84 Z" fill="url(#cd-land-light)" stroke="none" />
            </g>
            {/* 해안 하이라이트(물가 반사) */}
            <path
              d="M142,84 C182,54 252,52 298,88 C334,116 342,156 322,196 C304,236 250,260 196,256 C142,252 92,232 76,188 C60,150 98,112 142,84 Z"
              fill="none"
              stroke="url(#cd-shore)"
              strokeWidth="3"
              opacity="0.6"
            />
            {/* 작은 섬들 */}
            <ellipse cx="70" cy="236" rx="16" ry="7" fill="url(#cd-land)" opacity="0.8" />
            <ellipse cx="336" cy="228" rx="13" ry="6" fill="url(#cd-land)" opacity="0.75" />
          </g>

          {/* 운명의 길 — 현재 위치 → 목적지(빛나는 금빛 경로 + 길 위를 도는 빛) */}
          {destinyPath && (
            <>
              <g filter="url(#cd-isle-glow)">
                <path className={styles.destinyPathGlow} d={destinyPath} />
                <path className={styles.destinyPath} d={destinyPath} />
              </g>
              {!reduceMotion && (
                <circle r="4.5" className={styles.pathComet}>
                  <animateMotion dur="2.2s" repeatCount="indefinite" path={destinyPath} />
                </circle>
              )}
            </>
          )}
        </svg>

        {/* Z2 — 지역 랜드마크 */}
        {REGIONS.map((r) => {
          const state =
            highlightRegion === r.key ? styles.regionTarget : spotlightRegion === r.key ? styles.regionActive : "";
          return (
            <button
              key={r.key}
              type="button"
              className={`${styles.region} ${state}`}
              style={{ left: `${r.x}%`, top: `${r.y}%`, ["--region-glow" as string]: r.glow }}
              onClick={() => onRegion?.(r.key)}
              aria-label={r.label}
            >
              <span className={styles.regionBadge}>
                <NodeIcon kind={r.key as NodeKind} tone={NODE_TONE[r.key]} size={44} />
              </span>
              <span className={styles.regionLabel}>{r.label}</span>
            </button>
          );
        })}

        {/* 현재 위치 마커 + 꽃돼지(접지 그림자·빛무리) */}
        <div
          className={`${styles.region} ${styles.regionHere}`}
          style={{ left: `${HERE.x}%`, top: `${HERE.y}%`, ["--region-glow" as string]: "rgba(244,190,220,.7)" }}
        >
          <span className={styles.regionBadge}>
            <NodeIcon kind="here" tone="#f6c3d6" size={40} />
          </span>
          <span className={styles.regionLabel}>현재 위치</span>
        </div>
        <div className={styles.hero} style={{ left: `${HERE.x}%`, top: `${HERE.y}%` }}>
          <span className={styles.heroGround} aria-hidden="true" />
          <PigFace expression={pigExpr} height={92} className={styles.heroPig} />
        </div>

        {showFog && <div className={styles.fogVeil} />}
      </div>

      {/* Z4 — 사자 가이드(무대 존 — UI/노드 비가림) */}
      <div className={`${styles.guideStage} ${guideTilt ? styles.guideTilt : ""}`} aria-hidden="true">
        <SpriteImage
          src={compassAssets.neo.main}
          alt="망원경을 든 사자 가이드 네오"
          width={320}
          height={420}
          className={styles.guide}
          style={{ height: "auto" }}
        />
      </div>

      {/* Z5 — UI 슬롯 */}
      {children}
    </div>
  );
}
