"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { MASTER_MOTION_ENABLED } from "@/lib/master-motion/flags.mjs";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import styles from "./MasterMotion.module.css";

/**
 * 후속 그림(대기 루프) 확장 지점. 값이 있으면 프레임·영상을 쓰고, 없으면 CSS 숨쉬기·흔들림으로 대신한다.
 * 그림 목록과 규격은 docs/design/master-motion-assets.md.
 */
export type MasterMotionArt = { frames?: readonly string[]; video?: string; poster: string };

export type MasterMotionVariant = "ggulggul" | "yeongnyangi";

type MasterMotionProps = {
  children: ReactNode;
  /** 꿀꿀=예화 꽃잎, 영냥이=금빛 별가루(분홍 없음). */
  variant?: MasterMotionVariant;
  /** sm=아바타(꽃잎 3), md=초상(꽃잎 6). 어느 쪽이든 8개 이하. */
  density?: "sm" | "md";
  /** 원래 감싸던 요소. 플래그를 끄면 이 요소만 그대로 그린다(className 이 없으면 자식만). */
  as?: ElementType;
  className?: string;
  /** className 이 없을 때(원래 감싸는 요소가 없을 때) 켜진 상태에서만 만드는 감싸개의 클래스. 없으면 inline-flex. */
  slotClassName?: string;
  art?: MasterMotionArt;
};

const PETAL_COUNT = { sm: 3, md: 6 } as const;

/** 꽃잎 줄 — 각 줄은 높이 100% 레인이라 translateY(100%) 가 컨테이너 높이만큼 내려간다(transform 만). */
export function MasterPetals({ variant = "ggulggul", density = "md" }: { variant?: MasterMotionVariant; density?: "sm" | "md" }) {
  const count = PETAL_COUNT[density];
  return (
    <span className={styles.petals} data-variant={variant} data-density={density} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={styles.petal} data-mm-petal="" style={{ "--mm-i": index } as CSSProperties} />
      ))}
    </span>
  );
}

function MasterMotionLive({ children, variant = "ggulggul", density = "md", as: Tag = "span", className, slotClassName, art }: MasterMotionProps) {
  const gate = useSpritePlaybackGate<HTMLElement>();
  const on = gate.canAnimate;
  const frames = art?.frames?.length ? art.frames : null;
  return (
    <Tag
      ref={gate.ref}
      className={`${styles.root} ${className ?? slotClassName ?? styles.inline}`}
      data-master-motion={variant}
      data-motion={on ? "on" : "off"}
      data-art={art ? (art.video ? "video" : frames ? "frames" : undefined) : undefined}
    >
      {children}
      {on && art?.video ? (
        <video className={styles.art} src={art.video} poster={art.poster} muted playsInline autoPlay loop preload="none" aria-hidden="true" />
      ) : on && frames ? (
        <span className={styles.art} aria-hidden="true">
          <span className={styles.frames} style={{ "--mm-n": frames.length } as CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {frames.map((src) => <img key={src} src={src} alt="" loading="lazy" decoding="async" />)}
          </span>
        </span>
      ) : null}
      {on ? <MasterPetals variant={variant} density={density} /> : null}
    </Tag>
  );
}

/**
 * 마스터 초상 모션 래퍼(W4). CSS 만으로 숨쉬기·흔들림(transform)과 꽃잎/별가루 레이어를 얹는다.
 * - 화면 밖·탭 숨김·움직임 줄이기면 정지하고 꽃잎 DOM 도 그리지 않는다(useSpritePlaybackGate).
 * - 레이어는 absolute·pointer-events:none 이라 레이아웃(CLS)과 터치를 건드리지 않는다.
 * - MASTER_MOTION_ENABLED=false 면 감싸기 전과 같은 DOM 을 그린다.
 */
export default function MasterMotion(props: MasterMotionProps) {
  if (!MASTER_MOTION_ENABLED) {
    const { as: Tag = "span", className, children } = props;
    return className ? <Tag className={className}>{children}</Tag> : <>{children}</>;
  }
  return <MasterMotionLive {...props} />;
}
