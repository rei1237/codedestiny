"use client";

import { useState } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";
import { MASTER_MOTION_ENABLED } from "@/lib/master-motion/flags.mjs";
import { useLazySpriteSource, useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import styles from "./MasterMotion.module.css";

/**
 * 가로 스프라이트 시트(F, 2026-11-22) — scripts/sprites/build-master-motion.mjs 가 만든다.
 * 칸은 재생 순서대로 한 줄(cols === frames)이고, 각 칸은 cell 크기(초상 상자와 같은 비율)다.
 */
type SheetSource = { src: string; cell: { width: number; height: number } };
export type MasterMotionSheet = SheetSource & {
  mobile?: SheetSource;
  frames: number;
  cols: number;
};

/**
 * 후속 그림(대기 루프) 확장 지점. 값이 있으면 영상·시트·프레임 순으로 쓰고, 없으면 CSS 숨쉬기·흔들림으로 대신한다.
 * 그림 목록과 규격은 docs/design/master-motion-assets.md.
 */
export type MasterMotionArt = { frames?: readonly string[]; video?: string; sheet?: MasterMotionSheet; poster: string };

/** 한 줄 시트만 받는다. 모양이 어긋나면 그리지 않고 CSS 모션으로 남는다(잘못된 칸을 보여 주지 않는다). */
function usableSheet(sheet: MasterMotionSheet | undefined) {
  return sheet && Number.isInteger(sheet.frames) && sheet.frames > 0 && sheet.cols === sheet.frames ? sheet : null;
}

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

/** 시트 이미지의 load 이벤트를 사용해 캐시가 꺼져도 한 번만 전송한다. */
function PortraitSheet({ source, frames, poster }: { source: SheetSource; frames: number; poster: string }) {
  const [ready, setReady] = useState(false);
  return (
    <span className={`${styles.art} ${styles.sheetArt}`} data-mm-sheet="" data-ready={ready ? "" : undefined}
      style={{ backgroundImage: `url("${poster}")` }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.sheet} src={source.src} alt="" decoding="async"
        width={source.cell.width * frames} height={source.cell.height} onLoad={() => setReady(true)}
        style={{ "--mm-n": frames } as CSSProperties} />
    </span>
  );
}

function MasterMotionLive({ children, variant = "ggulggul", density = "md", as: Tag = "span", className, slotClassName, art }: MasterMotionProps) {
  const gate = useSpritePlaybackGate<HTMLElement>({ rootMargin: "0px" });
  const on = gate.canAnimate;
  const frames = art?.frames?.length ? art.frames : null;
  const sheet = art?.video ? null : usableSheet(art?.sheet);
  const source = gate.isMobile && sheet?.mobile ? sheet.mobile : sheet;
  return (
    <Tag
      ref={gate.ref}
      className={`${styles.root} ${className ?? slotClassName ?? styles.inline}`}
      data-master-motion={variant}
      data-motion={on ? "on" : "off"}
      data-art={art ? (art.video ? "video" : sheet ? "sheet" : frames ? "frames" : undefined) : undefined}
    >
      {children}
      {on && art?.video ? (
        <video className={styles.art} src={art.video} poster={art.poster} muted playsInline autoPlay loop preload="none" aria-hidden="true" />
      ) : on && sheet && source && art ? (
        <PortraitSheet key={source.src} source={source} frames={sheet.frames} poster={art.poster} />
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

/** 부분 시트(F7 영냥이) — 정본 좌표(canvas)의 사각형(area) 하나만 덮는 한 줄 시트. lib/master-motion/sheets.mjs masterMotionPatch. */
export type MasterMotionPatchArt = {
  sheet: MasterMotionSheet;
  area: { left: number; top: number; width: number; height: number };
  canvas: { width: number; height: number };
};

const percent = (value: number, total: number) => `${(value / total) * 100}%`;

function MasterMotionPatchLive({ patch, paused }: { patch: MasterMotionPatchArt; paused: boolean }) {
  const gate = useSpritePlaybackGate<HTMLSpanElement>({ rootMargin: "0px" });
  const sheet = usableSheet(patch.sheet);
  const on = gate.canAnimate && !paused && Boolean(sheet);
  // 보이고 움직여도 될 때만 받아 온다. 다 받기 전·멈춤·움직임 줄이기에서는 줄을 그리지 않아 아래 <img> 만 보인다.
  const sheetImage = useLazySpriteSource(sheet?.src ?? "", on);
  const { area, canvas } = patch;
  return (
    <span
      ref={gate.ref}
      className={styles.patch}
      data-mm-patch=""
      data-motion={on && sheetImage.isLoaded ? "on" : "off"}
      style={{ left: percent(area.left, canvas.width), top: percent(area.top, canvas.height), width: percent(area.width, canvas.width), height: percent(area.height, canvas.height) }}
      aria-hidden="true"
    >
      {on && sheet && sheetImage.isLoaded ? (
        <span className={styles.patchRow} style={{ "--mm-n": sheet.frames, backgroundImage: `url("${sheet.src}")` } as CSSProperties} />
      ) : null}
    </span>
  );
}

/**
 * 정본 <img> 위에 겹치는 부분 대기 모션(F7). 부모는 <img> 와 같은 상자(position:relative, 정본 비율)여야 한다 — area 를 백분율로 놓는다.
 * paused 면 줄을 내린다(예: 쓰다듬기 반응 그림이 <img> 를 가린 동안). MASTER_MOTION_ENABLED=false 면 아무것도 그리지 않는다.
 */
export function MasterMotionPatch({ patch, paused = false }: { patch: MasterMotionPatchArt | undefined; paused?: boolean }) {
  if (!MASTER_MOTION_ENABLED || !patch) return null;
  return <MasterMotionPatchLive patch={patch} paused={paused} />;
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
