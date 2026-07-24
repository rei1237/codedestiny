"use client";
/**
 * 페인팅 배경 레이어(재사용) — R2 소설/자미두수 아트를 몰입 배경으로 깔고
 * 그 위에 어두운 베일 + 비네트 + 그레인을 얹어 본문 가독성(AA)을 지킨다.
 * fixed=뷰포트 고정(스크롤 결과 화면의 하늘), 기본=부모(섹션) 채움. 순수 프레젠테이션.
 */
import Image from "next/image";
import styles from "./map.module.css";

interface PaintedBackdropProps {
  src: string;
  /** 장식이면 alt 생략(빈 문자열) → aria-hidden. 의미 있으면 설명 제공. */
  alt?: string;
  /** 베일 강도(0~1). 본문이 얹히면 0.6~0.78 권장. 기본 0.68 */
  veil?: number;
  /** 뷰포트 고정(스크롤해도 배경이 하늘처럼 머문다) */
  fixed?: boolean;
  /** object-position (예: "center 30%") */
  position?: string;
  className?: string;
}

export function PaintedBackdrop({ src, alt = "", veil = 0.68, fixed = false, position = "center", className }: PaintedBackdropProps) {
  return (
    <div
      className={`${styles.painted} ${fixed ? styles.paintedFixed : ""} ${className || ""}`}
      style={{ ["--veil" as string]: veil }}
      aria-hidden={alt ? undefined : true}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        unoptimized
        referrerPolicy="no-referrer"
        className={styles.paintedImg}
        style={{ objectPosition: position }}
      />
      <div className={styles.paintedVeil} />
    </div>
  );
}
