"use client";
/**
 * 공유 페인팅 배경 레이어 — R2 소설/점성 아트를 결과 화면 셸 배경으로 깔고
 * 어두운 베일 + 비네트 + 그레인을 얹어 본문 가독성(WCAG AA)을 지킨다.
 * opt-in: 각 기능 결과 셸에 한 줄 배선(<PaintedBackdrop src=... />). 순수 프레젠테이션.
 * destiny-compass 로컬 버전과 동일 개념의 공유본(전 기능 확산용).
 */
import Image from "next/image";
import styles from "./painted-backdrop.module.css";

interface PaintedBackdropProps {
  src: string;
  /** 장식이면 alt 생략(빈 문자열) → aria-hidden */
  alt?: string;
  /** 베일 강도(0~1). 장문 본문 위면 0.72~0.86 권장. 기본 0.78 */
  veil?: number;
  /** 뷰포트 고정(스크롤해도 배경이 머문다). 기본 true(결과 화면 셸용) */
  fixed?: boolean;
  /** object-position (예: "center 30%") */
  position?: string;
  className?: string;
}

export function PaintedBackdrop({ src, alt = "", veil = 0.78, fixed = true, position = "center", className }: PaintedBackdropProps) {
  return (
    <div
      className={`${styles.painted} ${fixed ? styles.fixed : ""} ${className || ""}`}
      style={{ ["--pb-veil" as string]: veil }}
      aria-hidden={alt ? undefined : true}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        unoptimized
        referrerPolicy="no-referrer"
        className={styles.img}
        style={{ objectPosition: position }}
      />
      <div className={styles.veil} />
    </div>
  );
}
