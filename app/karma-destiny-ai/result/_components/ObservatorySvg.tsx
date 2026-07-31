"use client";

import type { CSSProperties } from "react";

/*
 * Observatory 모티프.
 *
 * 전부 인라인 SVG 다 — html2canvas 로 PDF 를 캡처하므로 외부 아이콘 라이브러리를 쓰면
 * 캡처 보장이 깨진다. 개편 전 불교 도상(길상매듭·염주·연꽃·법륜)에서 천문관 도상으로
 * 갈아탔지만 **props 계약과 호출 방식은 그대로 유지**한다(회귀 표면 최소화).
 * 전부 장식이므로 aria-hidden.
 */

/** 별자리 문양 — 구 KnotMark 자리. unravel(0~1)이 오를수록 별이 이어지고 코어가 밝아진다. */
export function ConstellationMark({ unravel = 1, className = "" }: { unravel?: number; className?: string }) {
  const value = Math.max(0, Math.min(1, unravel));
  return (
    <svg
      className={`kdo-constellation ${className}`.trim()}
      style={{ "--kdo-unravel": value } as CSSProperties}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <g className="kdo-constellation__lines" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M60 22 34 46M34 46 42 82M42 82 78 88M78 88 90 50M90 50 60 22" />
        <path d="M34 46 60 60M60 60 78 88M60 60 90 50M60 60 42 82" />
      </g>
      <g className="kdo-constellation__stars" fill="currentColor">
        <circle cx="60" cy="22" r="3.4" />
        <circle cx="34" cy="46" r="2.8" />
        <circle cx="42" cy="82" r="2.8" />
        <circle cx="78" cy="88" r="2.8" />
        <circle cx="90" cy="50" r="2.8" />
      </g>
      <circle className="kdo-constellation__core" cx="60" cy="60" r="6.4" fill="currentColor" />
    </svg>
  );
}

/**
 * 별의 사슬 — 구 MalaBeads 자리. `filled/total` progress primitive 이고 스크롤 스파이
 * 레일에 이미 배선되어 있어 마크업을 그대로 두고 색만 바꾼다.
 */
export function StarChain({
  total,
  filled,
  layout = "row",
  className = "",
}: { total: number; filled: number; layout?: "row" | "column"; className?: string }) {
  return (
    <div className={`kdo-chain kdo-chain--${layout} ${className}`.trim()} data-total={total} aria-hidden="true">
      {Array.from({ length: total }).map((_, index) => (
        <span key={index} className={`kdo-chain__star ${index < filled ? "is-filled" : ""}`.trim()} />
      ))}
    </div>
  );
}

/** 북극성(8각성) — 구 LotusIcon 자리. 핵심 키워드·근거 마커. */
export function NorthStarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5 13.7 9c.2.7.6 1.1 1.3 1.3L21.5 12l-6.5 1.7c-.7.2-1.1.6-1.3 1.3L12 21.5l-1.7-6.5c-.2-.7-.6-1.1-1.3-1.3L2.5 12l6.5-1.7c.7-.2 1.1-.6 1.3-1.3z" />
      <path d="M18.5 4.5 19.4 7l2.5.9-2.5.9-.9 2.5" opacity="0.55" />
    </svg>
  );
}

/** 관측일지 — 구 ScrollIcon 자리. 총 글자 수 마커. */
export function ObservatoryLogIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 4.2A1.7 1.7 0 0 1 6.2 2.5h11.6a1.7 1.7 0 0 1 1.7 1.7v15.6a1.7 1.7 0 0 1-1.7 1.7H6.2a1.7 1.7 0 0 1-1.7-1.7z" />
      <path d="M8 2.5v19" />
      <path d="M11 7h5.2M11 10.5h5.2M11 14h3.4" />
      <circle cx="16.2" cy="17.6" r="1.5" />
    </svg>
  );
}

/** 태양계의(orrery) — 구 DharmaWheelIcon 자리. 현재 과제 마커. */
export function OrreryIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2.4" />
      <ellipse cx="12" cy="12" rx="9" ry="4.2" />
      <ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(120 12 12)" />
      <circle cx="20.6" cy="13.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="6.4" cy="7.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 장 사이 구분선 — 3점 별자리 글리프. */
export function SectionDivider() {
  return (
    <div className="kdo-divider" aria-hidden="true">
      <span className="kdo-divider__line" />
      <svg className="kdo-divider__glyph" viewBox="0 0 40 12" fill="none" aria-hidden="true">
        <path d="M4 8 20 3 36 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
        <circle cx="4" cy="8" r="1.6" fill="currentColor" />
        <circle cx="20" cy="3" r="2.2" fill="currentColor" />
        <circle cx="36" cy="8" r="1.6" fill="currentColor" />
      </svg>
      <span className="kdo-divider__line" />
    </div>
  );
}

/**
 * 별 배경 — 단일 요소 + 다중 radial-gradient.
 * 별마다 DOM 노드를 만들면 모바일에서 스크롤이 끊긴다.
 */
export function Starfield() {
  return <div className="kdo-starfield kdo-parallax" aria-hidden="true" />;
}
