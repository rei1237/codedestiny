"use client";
/**
 * 운명의 나침반 노드 랜드마크 — 이모지 대체용 자체 인라인 SVG.
 * 5지역(성/숲/도시/호수/안개) + 현재위치(beacon). 팔레트: 네오 달빛(골드 #e8d5a3 · 바이올렛 #c4b5fd)
 * + 지역 고유 톤. 구조는 밝은 스톤(#f4eeff 계열), 강조는 지역 톤. Glow는 배지 컨테이너(map.module.css)가 담당.
 * 3D 캐릭터와 어울리도록 납작한 라인아이콘이 아니라 채워진 실루엣 + 림라이트로 그린다.
 */

export type NodeKind = "castle" | "forest" | "city" | "lake" | "fog" | "here";

interface NodeIconProps {
  kind: NodeKind;
  /** 지역 고유 강조 톤(불투명 hex 권장). 미지정 시 골드. */
  tone?: string;
  size?: number;
  className?: string;
}

const STONE = "#eee6ff"; // 밝은 구조체(달빛 받은 표면)
const STONE_DEEP = "#b9a9e6"; // 그림자면
const RIM = "#fff8ec"; // 림라이트(골드빛)

export function NodeIcon({ kind, tone = "#e8d5a3", size = 40, className }: NodeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible", display: "block" }}
    >
      {kind === "castle" && <Castle tone={tone} />}
      {kind === "forest" && <Forest tone={tone} />}
      {kind === "city" && <City tone={tone} />}
      {kind === "lake" && <Lake tone={tone} />}
      {kind === "fog" && <Fog tone={tone} />}
      {kind === "here" && <Beacon tone={tone} />}
    </svg>
  );
}

/* ── 운명의 성 — 중앙 keep + 양 탑 + 크레넬 + 페넌트 ── */
function Castle({ tone }: { tone: string }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* 지반 빛 */}
      <ellipse cx="24" cy="40" rx="15" ry="3.2" fill={tone} opacity="0.28" />
      {/* 좌우 탑 */}
      <path d="M11 21h7v18h-7z" fill={STONE_DEEP} />
      <path d="M30 21h7v18h-7z" fill={STONE_DEEP} />
      {/* 탑 크레넬 */}
      <path d="M11 21v-3h1.6v1.6h1.9V18h1.6v1.6H18V21z M30 21v-3h1.6v1.6h1.9V18h1.6v1.6H37V21z" fill={RIM} />
      {/* 중앙 keep */}
      <path d="M17 27h14v12H17z" fill={STONE} />
      <path d="M17 27v-3h1.7v1.6h2V24h1.7v1.6h2V24h1.7v1.6h2V24H31v3z" fill={RIM} />
      {/* 문 */}
      <path d="M22 39v-6a2 2 0 0 1 4 0v6z" fill={tone} opacity="0.9" />
      {/* 페넌트 */}
      <path d="M24 24V15" stroke={RIM} strokeWidth="1.4" />
      <path d="M24 15l6 2-6 2z" fill={tone} />
    </g>
  );
}

/* ── 성장의 숲 — 겹친 침엽수 3그루 ── */
function Forest({ tone }: { tone: string }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="24" cy="41" rx="14" ry="3" fill={tone} opacity="0.28" />
      {/* 뒤 나무 2 */}
      <path d="M14 34l4.5-11 4.5 11z" fill={STONE_DEEP} opacity="0.9" />
      <path d="M25 34l4.5-11 4.5 11z" fill={STONE_DEEP} opacity="0.9" />
      {/* 앞 큰 나무 */}
      <path d="M17.5 40h13l-6.5-4z" fill={tone} opacity="0" />
      <path d="M24 12l6 9-2.2-.4L31 27l-3-.6L30.5 34H17.5L20 26.4l-3 .6 3.2-6.4L18 21z" fill={tone} />
      <path d="M24 12l4 6-1.5-.3 2 4.5-2-.4 2.2 4.6H24z" fill={RIM} opacity="0.55" />
      {/* 밑동 */}
      <path d="M22.6 34h2.8v6h-2.8z" fill={STONE_DEEP} />
    </g>
  );
}

/* ── 재물의 도시 — 스카이라인 + 창문 불빛 ── */
function City({ tone }: { tone: string }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="24" cy="41" rx="14" ry="3" fill={tone} opacity="0.28" />
      <path d="M12 40V26h7v14z" fill={STONE_DEEP} />
      <path d="M29 40V22h7v18z" fill={STONE_DEEP} />
      <path d="M19 40V16h10v24z" fill={STONE} />
      {/* 첨탑 */}
      <path d="M24 16l0-4" stroke={RIM} strokeWidth="1.4" />
      <circle cx="24" cy="10.5" r="1.6" fill={tone} />
      {/* 창문 불빛 */}
      <g fill={tone}>
        <rect x="21" y="20" width="2" height="2.4" rx="0.5" />
        <rect x="25" y="20" width="2" height="2.4" rx="0.5" />
        <rect x="21" y="25" width="2" height="2.4" rx="0.5" />
        <rect x="25" y="25" width="2" height="2.4" rx="0.5" />
        <rect x="21" y="30" width="2" height="2.4" rx="0.5" />
        <rect x="25" y="30" width="2" height="2.4" rx="0.5" />
      </g>
      <g fill={RIM} opacity="0.7">
        <rect x="14" y="29" width="1.8" height="2" rx="0.4" />
        <rect x="32" y="26" width="1.8" height="2" rx="0.4" />
      </g>
    </g>
  );
}

/* ── 관계의 호수 — 물결 + 달 반영 ── */
function Lake({ tone }: { tone: string }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* 물 웅덩이 */}
      <ellipse cx="24" cy="30" rx="15" ry="9" fill={tone} opacity="0.32" />
      <ellipse cx="24" cy="30" rx="15" ry="9" fill="none" stroke={STONE} strokeWidth="1.4" opacity="0.6" />
      {/* 달 반영 */}
      <path d="M27 22a5 5 0 1 0 0 8 6 6 0 0 1 0-8z" fill={RIM} opacity="0.9" />
      {/* 물결 */}
      <path d="M15 32c2 1.4 4 1.4 6 0s4-1.4 6 0 4 1.4 6 0" stroke={STONE} strokeWidth="1.3" opacity="0.75" />
      <path d="M17 35.4c1.7 1.2 3.3 1.2 5 0s3.3-1.2 5 0" stroke={STONE} strokeWidth="1.2" opacity="0.5" />
    </g>
  );
}

/* ── 안개의 계곡 — 겹친 봉우리 + 안개 띠 ── */
function Fog({ tone }: { tone: string }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="24" cy="41" rx="14" ry="2.8" fill={tone} opacity="0.24" />
      {/* 뒤 봉우리 */}
      <path d="M8 36l9-15 7 11-3-1-4 5z" fill={STONE_DEEP} opacity="0.85" />
      <path d="M40 36L30 19 22 33l3-1 3.5 4z" fill={STONE_DEEP} />
      {/* 앞 봉우리 */}
      <path d="M15 38l9-16 9 16-4.5-1.4-4.5 2-4.5-2z" fill={STONE} />
      <path d="M24 22l4 7-2.6-.7-1.4.9z" fill={RIM} opacity="0.6" />
      {/* 안개 띠 */}
      <path d="M12 33.5c3-1.6 6-1.6 9 0s6 1.6 9 0 4-0.4 5 .4" stroke={tone} strokeWidth="2.2" opacity="0.85" />
      <path d="M14 38c3-1.4 6-1.4 9 0s7 1.4 10 0" stroke={tone} strokeWidth="2" opacity="0.6" />
    </g>
  );
}

/* ── 현재 위치 — 빛나는 비콘 핀 ── */
function Beacon({ tone }: { tone: string }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="24" cy="41" rx="8" ry="2.4" fill={tone} opacity="0.4" />
      {/* 핀 몸체(물방울) */}
      <path d="M24 9c6 0 10 4.4 10 10.2 0 7-10 18.8-10 18.8S14 26.2 14 19.2C14 13.4 18 9 24 9z" fill={tone} />
      <path d="M24 9c6 0 10 4.4 10 10.2 0 7-10 18.8-10 18.8S14 26.2 14 19.2C14 13.4 18 9 24 9z" fill="none" stroke={RIM} strokeWidth="1.3" opacity="0.75" />
      {/* 중앙 별 */}
      <path d="M24 14.5l1.6 3.6 3.9.4-2.9 2.6.9 3.8-3.5-2-3.5 2 .9-3.8-2.9-2.6 3.9-.4z" fill={RIM} />
    </g>
  );
}
