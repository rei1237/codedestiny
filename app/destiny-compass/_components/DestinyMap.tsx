"use client";
/**
 * 운명의 나침반 선택 무대. 은하수 배경 + 다층 SVG 대륙 + 6지역 랜드마크 + 캐릭터.
 * 대기 원근(Z0 딥스페이스 → Z1 대륙 → Z2 노드 → Z3 대기베일 → Z4 캐릭터 → Z5 UI).
 * 노드는 자체 SVG(NodeIcon), 이모지 미사용. children = 하단 UI 슬롯(고민 입력/처리).
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Starfield } from "./Starfield";
import { PigFace } from "./PigFace";
import { SpriteImage } from "./SpriteImage";
import { NodeIcon, type NodeKind } from "./NodeIcon";
import { compassAssets, compassPaintings } from "../data/assets";
import { REGIONS, HERE, regionByKey } from "./mapRegions";
import { useFxTier } from "../_hooks/useFxTier";
import { useDestinyCompassCopy } from "../_lib/copy";
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
  /** 처리(수정구) 단계 등에서 현재 위치 꽃돼지를 숨긴다(수정구 crystalPig와 중복 방지). */
  hideHero?: boolean;
  /** 선택 화면 등에서 절차적 SVG 대륙 대신 밝은 '운명의 섬' 포스터를 지도 배경으로 쓴다. */
  islandArt?: boolean;
  /**
   * 무대 위상. "day"(기본)는 지금까지와 완전히 동일하다.
   * 처리 단계에서 dusk → night 로 올리면 배경 레이어가 크로스페이드되고 밤 토큰이 부착된다.
   */
  phase?: "day" | "dusk" | "night";
  /**
   * 처리 단계처럼 children 이 자기 제목을 갖는 화면에서 지도 헤더를 숨긴다.
   * 제목이 둘이면 중복일 뿐 아니라, 반투명 스크림 위로 지도 제목이 비쳐 겹쳐 읽힌다.
   */
  hideHeader?: boolean;
  onRegion?: (key: string) => void;
  children?: ReactNode;
}

export function DestinyMap({
  title,
  kicker = "Destiny Compass",
  showFog = false,
  pathTo,
  highlightRegion,
  spotlightRegion,
  pigExpr = "happy",
  guideTilt = false,
  hideHero = false,
  islandArt = false,
  phase = "day",
  hideHeader = false,
  onRegion,
  children,
}: DestinyMapProps) {
  const copy = useDestinyCompassCopy();
  const resolvedTitle = title ?? copy.mapDefaultTitle;
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
  const fxTier = useFxTier();
  return (
    <div
      className={`${styles.stage} ${phase === "night" ? styles.nightStage : ""}`}
      data-fx={fxTier}
      data-phase={phase}
    >
      {/* Z0 — 딥스페이스 */}
      <Starfield />
      {/* 낮 → 황혼 → 밤. opacity 만 움직이는 크로스페이드 레이어(토큰은 원자적으로 교체된다). */}
      {phase !== "day" && (
        <>
          <div className={`${styles.skyLayer} ${styles.skyScrim}`} aria-hidden="true" />
          <div className={`${styles.skyLayer} ${styles.skyDusk}`} aria-hidden="true" />
        </>
      )}

      {!hideHeader && (
        <header className={styles.mapHeader}>
          <span className={styles.mapKicker}>{kicker}</span>
          <h1 className={styles.mapTitle}>{resolvedTitle}</h1>
        </header>
      )}

      <div className={`${styles.mapField} ${showFog ? styles.mapFieldZoom : ""}`}>
        {/* Z1 — 선택 화면: 밝은 '운명의 섬' 포스터를 지도 배경으로 */}
        {islandArt && (
          <div
            className={styles.islandArt}
            role="img"
            aria-label={copy.mapIslandArtAriaLabel}
            style={
              {
                "--island-art-desktop": `url("${compassPaintings.premiumIslandDesktop}")`,
                "--island-art-mobile": `url("${compassPaintings.premiumIslandMobile}")`,
              } as CSSProperties
            }
          />
        )}
        {/* Z1 — 대륙(다층 텍스처 + 해안 + 부양 그림자 + 숨쉬기) */}
        {!islandArt && (
        <svg className={styles.islandSvg} viewBox="0 0 400 300" aria-hidden="true">
          <defs>
            <radialGradient id="cd-water" cx="50%" cy="52%" r="60%">
              <stop offset="0%" stopColor="rgba(126,108,210,.3)" />
              <stop offset="68%" stopColor="rgba(60,72,170,.16)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            {/* 대륙 — 남보라 4단계(그림자→베이스→중간→상단 하이라이트). 주광원 상단이라 위가 밝다. */}
            <linearGradient id="cd-land" x1="0.35" y1="0" x2="0.6" y2="1">
              <stop offset="0%" stopColor="#3d2e70" />
              <stop offset="34%" stopColor="#2c2154" />
              <stop offset="70%" stopColor="#221a44" />
              <stop offset="100%" stopColor="#150f30" />
            </linearGradient>
            <radialGradient id="cd-land-light" cx="46%" cy="24%" r="60%">
              <stop offset="0%" stopColor="rgba(210,196,255,.42)" />
              <stop offset="58%" stopColor="rgba(210,196,255,0)" />
            </radialGradient>
            <linearGradient id="cd-shore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffe9b8" />
              <stop offset="100%" stopColor="#c9a86a" />
            </linearGradient>
            <filter id="cd-isle-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="cd-land-clip">
              <path d="M150,78 C175,52 220,58 250,74 C292,60 330,92 328,128 C326,150 342,172 320,198 C300,232 258,252 214,250 C180,249 150,264 120,240 C92,222 70,196 80,166 C86,138 108,96 150,78 Z" />
            </clipPath>
          </defs>

          {/* 물결 글로우 + 궤도 링 */}
          <ellipse cx="200" cy="168" rx="190" ry="124" fill="url(#cd-water)" />
          <ellipse cx="200" cy="168" rx="150" ry="96" fill="none" stroke="rgba(180,168,255,.16)" strokeWidth="1.5" />
          <ellipse cx="200" cy="168" rx="116" ry="72" fill="none" stroke="rgba(180,168,255,.1)" strokeWidth="1" />

          {/* L1 — 부양 그림자(대륙 아래, 넓게 퍼져 부양감) */}
          <ellipse cx="204" cy="250" rx="138" ry="30" fill="rgba(4,3,14,.6)" filter="url(#cd-isle-glow)" />

          <g className={styles.islandBreathe} style={{ transformOrigin: "200px 168px" }}>
            {/* 레이 라인(중앙→지역, 은은한 금빛 성좌 연결선) */}
            <g stroke="rgba(232,213,163,.22)" strokeWidth="1" strokeDasharray="3 5" fill="none">
              <path d="M200,168 L200,66" />
              <path d="M200,168 L92,128" />
              <path d="M200,168 L318,134" />
              <path d="M200,168 L122,222" />
              <path d="M200,168 L286,228" />
            </g>

            {/* L2 — 섬 베이스(남보라 4단계) */}
            <path
              d="M150,78 C175,52 220,58 250,74 C292,60 330,92 328,128 C326,150 342,172 320,198 C300,232 258,252 214,250 C180,249 150,264 120,240 C92,222 70,196 80,166 C86,138 108,96 150,78 Z"
              fill="url(#cd-land)"
              filter="url(#cd-isle-glow)"
            />
            {/* L3 — 지형 텍스처(등고선/능선) + L4 상단 라이팅 (대륙 클립 내부) */}
            <g clipPath="url(#cd-land-clip)" fill="none" strokeLinecap="round">
              <path d="M96,150 C140,132 180,138 214,128 C250,118 288,124 320,110" stroke="rgba(10,6,30,.42)" strokeWidth="2" />
              <path d="M104,178 C150,166 196,172 236,160 C270,150 300,156 326,146" stroke="rgba(10,6,30,.34)" strokeWidth="1.6" />
              <path d="M120,208 C158,200 198,204 232,196 C262,189 288,192 312,184" stroke="rgba(10,6,30,.26)" strokeWidth="1.4" />
              <path d="M150,120 C176,132 176,150 158,166" stroke="rgba(206,192,255,.2)" strokeWidth="1.3" />
              <path d="M262,116 C282,130 282,150 266,168" stroke="rgba(206,192,255,.16)" strokeWidth="1.3" />
              {/* L4 상단 하이라이트 면(주광원 방향) */}
              <path d="M150,78 C175,52 220,58 250,74 C292,60 330,92 328,128 C326,150 342,172 320,198 C300,232 258,252 214,250 C180,249 150,264 120,240 C92,222 70,196 80,166 C86,138 108,96 150,78 Z" fill="url(#cd-land-light)" stroke="none" />
            </g>
            {/* L5 — 금색 해안선 + 바깥 발광 */}
            <path
              d="M150,78 C175,52 220,58 250,74 C292,60 330,92 328,128 C326,150 342,172 320,198 C300,232 258,252 214,250 C180,249 150,264 120,240 C92,222 70,196 80,166 C86,138 108,96 150,78 Z"
              fill="none"
              stroke="url(#cd-shore)"
              strokeWidth="2.4"
              opacity="0.7"
              filter="url(#cd-isle-glow)"
            />
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
        )}

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
              aria-label={copy.regionLabel[r.key as keyof typeof copy.regionLabel]}
            >
              <span className={styles.regionBadge}>
                <NodeIcon kind={r.key as NodeKind} tone={NODE_TONE[r.key]} size={44} />
              </span>
              <span className={styles.regionLabel}>{copy.regionLabel[r.key as keyof typeof copy.regionLabel]}</span>
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
          <span className={styles.regionLabel}>{copy.mapHereLabel}</span>
        </div>
        {!hideHero && (
          <div className={styles.hero} style={{ left: `${HERE.x}%`, top: `${HERE.y}%` }}>
            <span className={styles.heroGround} aria-hidden="true" />
            <PigFace expression={pigExpr} height={92} className={styles.heroPig} />
          </div>
        )}

        {showFog && <div className={styles.fogVeil} />}
      </div>

      {/* Z4 — 사자 가이드(무대 존 — UI/노드 비가림) */}
      <div className={`${styles.guideStage} ${guideTilt ? styles.guideTilt : ""}`} aria-hidden="true">
        <SpriteImage
          src={compassAssets.neo.main}
          alt={copy.mapGuideAlt}
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
