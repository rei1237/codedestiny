"use client";
/**
 * STEP 12 목적지 도착 — 오늘의 항해 완료 연출(황금문) + 여정 요약 운명 레이더(STEP 10) + EXP.
 * 읽기 전용 소비.
 */
import { Starfield } from "./Starfield";
import { useRef } from "react";
import { ReportActions } from "./ReportActions";
import { DestinyRadar } from "./DestinyRadar";
import { regionByKey, DIRECTION_TO_REGION } from "./mapRegions";
import { useDestinyCompassCopy } from "../_lib/copy";
import styles from "./map.module.css";
import type { DirectionField } from "../_engine/types";

export function Arrival({
  field,
  onRestart,
}: {
  field: DirectionField;
  onRestart: () => void;
}) {
  const copy = useDestinyCompassCopy();
  const stageRef = useRef<HTMLDivElement>(null);
  const dest = regionByKey(DIRECTION_TO_REGION[field.primary.key]);
  const destLabel = dest ? copy.regionLabel[dest.key as keyof typeof copy.regionLabel] : undefined;
  const primaryLabel = copy.directionLabel[field.primary.key];

  return (
    <div className={`${styles.resultStage} ${styles.nightStage}`} ref={stageRef}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>Destination Reached</span>
        <h1 className={styles.mapTitle}>{copy.arrivalTitle}</h1>
      </header>

      <div className={styles.resultBody} data-pdf-section>
        <div className={styles.arriveHero}>
          <div className={styles.arriveDoor}>
            <span className={styles.arriveRays} aria-hidden="true" />
            <span className={styles.arriveIcon} aria-hidden="true">{dest?.icon}</span>
          </div>
          <p className={styles.arriveLead}>{copy.arrivalLead(destLabel ?? primaryLabel)}</p>
          <div className={styles.arriveStamp}>{copy.arrivalStamp}</div>
        </div>

        <div className={styles.radarWrap}>
          <span className={styles.flowLabel}>{copy.radarSummaryLabel}</span>
          <DestinyRadar directions={field.directions} />
          <p className={styles.arriveNote}>{copy.arrivalNote(primaryLabel)}</p>
        </div>

        <div className={styles.resultCtas}>
          {/* 스텁 토스트("다음 단계에서 연결돼요")를 실제 저장·공유로 교체. 공용 유틸만 쓴다. */}
          <ReportActions targetRef={stageRef} coordinate={`${destLabel ?? primaryLabel}${copy.shareCoordinateSuffix}`} />
          <button type="button" className={styles.resultCtaGhost} onClick={onRestart}>
            {copy.restartQuestButton}
          </button>
        </div>
      </div>
    </div>
  );
}
