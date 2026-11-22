'use client';

import type { CSSProperties } from 'react';
import { MASTER_MOTION_ENABLED } from '@/lib/master-motion/flags.mjs';
import { useSpritePlaybackGate } from '@/src/hooks/useSpritePlaybackGate';
import { MasterPetals } from '@/app/components/master-motion/MasterMotion';
import styles from './NightBloomMotion.module.css';

/**
 * 영냥이 밤꽃 배경 모션(H, 2026-11-22) — 금빛 별가루(MasterPetals yeongnyangi sm) + 아이보리 목련 꽃잎 낙하.
 * 보일 때·탭 활성·reduced-motion 아님·MASTER_MOTION_ENABLED 일 때만 자식을 그린다(꺼지면 빈 상자, data-motion="off").
 * 놓는 쪽이 className 으로 상자(위치·크기)를 준다. 상자는 본문·고양이 뒤 층(z -1 등)에 두고 글자와 겹치지 않게 잡는다.
 * transform·opacity 만 움직인다(NightBloomMotion.module.css).
 */
const BLOOM_PETALS = [
  { left: '8%', duration: 17, delay: -3, size: 11 },
  { left: '34%', duration: 21, delay: -11, size: 9 },
  { left: '66%', duration: 15, delay: -7, size: 10 },
  { left: '90%', duration: 23, delay: -16, size: 8 },
] as const;

export default function NightBloomMotion({ className }: { className?: string }) {
  const gate = useSpritePlaybackGate<HTMLSpanElement>({ enabled: MASTER_MOTION_ENABLED });
  const on = gate.canAnimate;
  return (
    <span ref={gate.ref} className={`${styles.root} ${className ?? ''}`} data-yn-bloom-motion="" data-motion={on ? 'on' : 'off'} aria-hidden="true">
      {on ? (
        <>
          <span className={styles.stars}>
            <MasterPetals variant="yeongnyangi" density="sm" />
          </span>
          <span className={styles.petals}>
            {BLOOM_PETALS.map((petal) => (
              <span
                key={petal.left}
                className={styles.lane}
                style={{ left: petal.left, '--yn-fall': `${petal.duration}s`, '--yn-delay': `${petal.delay}s`, '--yn-size': `${petal.size}px` } as CSSProperties}
              >
                <span className={styles.petal} />
              </span>
            ))}
          </span>
        </>
      ) : null}
    </span>
  );
}
