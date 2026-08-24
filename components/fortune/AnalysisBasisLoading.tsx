"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalysisBasis, BasisItem } from "@/lib/fortune/analysis-basis";
import { BasisItemRow } from "./AnalysisBasisPanel";
import { currentFortuneSharedCopy } from "./_lib/fortune-shared-copy";

const COPY = currentFortuneSharedCopy();
import styles from "./analysis-basis.module.css";

interface AnalysisBasisLoadingProps {
  /** 근거 조회 결과. 아직 도착 전이면 null — 골격만 보여 준다. */
  basis: AnalysisBasis | null;
  /** 근거가 없을 때(조회 실패 포함) 각 기능이 쓰던 기존 문구. */
  fallbackLabel?: string;
  fallbackDetail?: string;
  /** 단계 전환 간격(ms). */
  stageIntervalMs?: number;
  className?: string;
}

const DEFAULT_STAGE_INTERVAL_MS = 2600;

/**
 * 생성 대기 화면의 텍스트 영역.
 *
 * 지금까지 이 자리에는 시간만 흐르는 가짜 단계 라벨이 있었다. 여기서는 서버가 실제로 계산한 값을
 * 단계별로 하나씩 드러낸다. 기다리는 동안 사용자는 자기 명반/차트가 채워지는 것을 보게 되고,
 * 결과가 도착했을 때 그 값들이 본문의 근거로 다시 등장한다.
 *
 * 각 기능의 고유 비주얼(궤도·달·12궁 시길)은 이 컴포넌트를 감싸는 쪽에 그대로 남긴다.
 */
export default function AnalysisBasisLoading({
  basis,
  fallbackLabel = COPY.basisLoadingLabel,
  fallbackDetail = COPY.basisLoadingDetail,
  stageIntervalMs = DEFAULT_STAGE_INTERVAL_MS,
  className = "",
}: AnalysisBasisLoadingProps) {
  const stages = useMemo(() => basis?.stages || [], [basis]);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    setStageIndex(0);
  }, [basis]);

  useEffect(() => {
    if (stages.length < 2) return undefined;
    // 마지막 단계에서 멈춘다. 생성이 길어져도 처음으로 되감기지 않게 해, 이미 드러난 값이 사라지지 않는다.
    const timer = window.setInterval(() => {
      setStageIndex((previous) => (previous + 1 >= stages.length ? stages.length - 1 : previous + 1));
    }, Math.max(900, stageIntervalMs));
    return () => window.clearInterval(timer);
  }, [stages.length, stageIntervalMs]);

  // 지나온 단계의 항목은 남겨 둔다 — 대기가 끝날 즈음엔 전체 근거를 다 본 상태가 된다.
  const revealed = useMemo(() => {
    if (!basis) return [] as BasisItem[];
    const seen = new Set<string>();
    const items: BasisItem[] = [];
    for (const stage of stages.slice(0, stageIndex + 1)) {
      for (const groupKey of stage.groupKeys) {
        const group = basis.groups.find((candidate) => candidate.key === groupKey);
        for (const item of group?.items || []) {
          const dedupeKey = `${item.label}|${item.value}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          items.push(item);
        }
      }
    }
    return items;
  }, [basis, stages, stageIndex]);

  const activeStage = stages[stageIndex];

  return (
    <div className={`${styles.loading} ${className}`.trim()} aria-live="polite" aria-atomic="false">
      <div className={styles.stageHead}>
        <strong className={styles.stageLabel}>{activeStage?.label || fallbackLabel}</strong>
        {(activeStage?.detail || fallbackDetail) && (
          <span className={styles.stageDetail}>{activeStage?.detail || fallbackDetail}</span>
        )}
      </div>

      {stages.length > 1 && (
        <div className={styles.stageRail} aria-hidden="true">
          {stages.map((stage, index) => (
            <span
              key={stage.key}
              className={styles.stageChip}
              data-state={index === stageIndex ? "active" : index < stageIndex ? "done" : "pending"}
            >
              <span className={styles.stageDot} />
              {stage.label}
            </span>
          ))}
        </div>
      )}

      {revealed.length > 0 ? (
        <div className={styles.revealed}>
          {revealed.map((item, index) => (
            <div key={`${item.label}-${index}`} className={styles.revealItem}>
              <BasisItemRow item={item} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.skeleton} aria-hidden="true">
          <span className={styles.skeletonRow} />
          <span className={styles.skeletonRow} />
          <span className={styles.skeletonRow} />
        </div>
      )}
    </div>
  );
}
