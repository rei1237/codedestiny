"use client";
/**
 * STEP 12 목적지 도착 — 오늘의 항해 완료 연출(황금문) + 여정 요약 운명 레이더(STEP 10) + EXP.
 * 읽기 전용 소비.
 */
import { Starfield } from "./Starfield";
import { DestinyRadar } from "./DestinyRadar";
import { regionByKey, DIRECTION_TO_REGION } from "./mapRegions";
import { DIRECTION_LABEL_KO } from "../_engine/constants";
import styles from "./map.module.css";
import type { DirectionField } from "../_engine/types";

export function Arrival({
  field,
  onRestart,
  onShare,
}: {
  field: DirectionField;
  onRestart: () => void;
  onShare: () => void;
}) {
  const dest = regionByKey(DIRECTION_TO_REGION[field.primary.key]);
  const primaryLabel = DIRECTION_LABEL_KO[field.primary.key];

  return (
    <div className={`${styles.resultStage} ${styles.nightStage}`}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>Destination Reached</span>
        <h1 className={styles.mapTitle}>목적지에 도착했어요</h1>
      </header>

      <div className={styles.resultBody}>
        <div className={styles.arriveHero}>
          <div className={styles.arriveDoor}>
            <span className={styles.arriveRays} aria-hidden="true" />
            <span className={styles.arriveIcon} aria-hidden="true">{dest?.icon}</span>
          </div>
          <p className={styles.arriveLead}>
            오늘의 항해를 마쳤어요. <b>{dest?.label}</b>의 문이 열렸어요.
          </p>
          <div className={styles.arriveStamp}>오늘의 항해 완료 · +10 EXP</div>
        </div>

        <div className={styles.radarWrap}>
          <span className={styles.flowLabel}>여정 요약 · 운명 레이더</span>
          <DestinyRadar directions={field.directions} />
          <p className={styles.arriveNote}>
            가장 열린 방향은 <b>{primaryLabel}</b>. 이 레이더는 오늘 당신의 기운 지도를 담고 있어요.
          </p>
        </div>

        <div className={styles.resultCtas}>
          <button type="button" className={styles.resultCta} onClick={onShare}>
            항로 저장 · 공유
          </button>
          <button type="button" className={styles.resultCtaGhost} onClick={onRestart}>
            새 고민 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
