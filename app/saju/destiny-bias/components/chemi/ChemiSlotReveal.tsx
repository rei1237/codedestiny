"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { ROSTER_PARTNERS, listGroupMembers, type ChemiPartnerRecord, type ChemiTypeId } from "@/lib/idol-chemi";
import { idolSoloSrc, typeSymbolSrc } from "./chemiAssets";
import styles from "../../destiny-bias.module.css";

type Props = {
  partner: ChemiPartnerRecord;
  typeId: ChemiTypeId;
  typeName: string;
  onDone: () => void;
};

const SLOT_WIDTH = 168;
const REEL_LENGTH = 14;
const SPIN_SECONDS = 1.5;
const FLIP_SECONDS = 0.55;
const HOLD_MS = 520;

/** 릴 후보: 같은 그룹 멤버를 우선 쓰고, 모자라면 다른 로스터로 채운다. 마지막 칸은 늘 내가 고른 최애다. */
function buildReel(partner: ChemiPartnerRecord): ChemiPartnerRecord[] {
  const pool: ChemiPartnerRecord[] = [];
  const seen = new Set<string>([partner.id]);
  const push = (row: ChemiPartnerRecord) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    pool.push(row);
  };
  if (partner.groupId) listGroupMembers(partner.groupId).forEach(push);
  for (const row of ROSTER_PARTNERS) {
    if (pool.length >= REEL_LENGTH) break;
    push(row);
  }
  const reel: ChemiPartnerRecord[] = [];
  for (let i = 0; i < REEL_LENGTH - 1 && pool.length; i += 1) reel.push(pool[i % pool.length]);
  reel.push(partner);
  return reel;
}

/**
 * 계산 → 결과 사이 슬롯 공개 연출.
 * 후보 아이돌 카드가 빠르게 돌다 감속해 내 최애에서 멈추고, 카드가 뒤집혀 케미 유형이 드러난 뒤 onDone 을 부른다.
 * 움직임 줄이기 설정이면 연출 없이 바로 onDone.
 */
export default function ChemiSlotReveal({ partner, typeId, typeName, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  const reel = useMemo(() => buildReel(partner), [partner]);
  const [phase, setPhase] = useState<"spin" | "flip">("spin");
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current();
  };

  useEffect(() => {
    if (reduceMotion) finish();
    // 마운트·설정 변경 때만 판단한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  if (reduceMotion) return null;

  const lastIndex = reel.length - 1;
  return (
    <section className={styles.slotReveal} role="status" aria-live="polite" aria-label={`${partner.displayName}와 내 케미 유형 공개`}>
      <p className={styles.stepLabel}>CHEMI MATCH</p>
      <div className={styles.slotWindow} aria-hidden>
        <m.div
          className={styles.slotReel}
          initial={{ x: 0 }}
          animate={{ x: -lastIndex * SLOT_WIDTH }}
          transition={{ duration: SPIN_SECONDS, ease: [0.08, 0.82, 0.17, 1] }}
          onAnimationComplete={() => setPhase("flip")}
        >
          {reel.map((row, index) => {
            const isTarget = index === lastIndex;
            const face = (
              <span className={styles.slotFace}>
                <img src={idolSoloSrc(row.id, row.groupId)} alt="" width={140} height={180} decoding="async" />
                <b>{row.displayName}</b>
              </span>
            );
            if (!isTarget) {
              return (
                <span key={`${row.id}-${index}`} className={styles.slotCard}>
                  {face}
                </span>
              );
            }
            return (
              <span key={`${row.id}-${index}`} className={`${styles.slotCard} ${styles.slotTarget}`}>
                <m.span
                  className={styles.slotFlip}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: phase === "flip" ? 180 : 0 }}
                  transition={{ duration: FLIP_SECONDS, ease: [0.3, 0.7, 0.2, 1] }}
                  onAnimationComplete={() => {
                    if (phase === "flip") window.setTimeout(finish, HOLD_MS);
                  }}
                >
                  {face}
                  <span className={`${styles.slotFace} ${styles.slotBack}`}>
                    <img src={typeSymbolSrc(typeId)} alt="" width={120} height={120} decoding="async" />
                    <b>{typeName}</b>
                  </span>
                </m.span>
              </span>
            );
          })}
        </m.div>
      </div>
      <h2 className={styles.stepTitle}>{phase === "flip" ? `「${typeName}」 케미` : `${partner.displayName}와 맞는 케미를 찾는 중`}</h2>
      <button type="button" className={styles.linkButton} onClick={finish}>
        바로 결과 보기
      </button>
    </section>
  );
}
