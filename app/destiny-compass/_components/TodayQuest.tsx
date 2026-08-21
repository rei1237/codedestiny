"use client";
/**
 * STEP 9 오늘의 퀘스트 — 대표 방향 헤드라인 + 상위 3방향의 실행 체크리스트(네오 팩폭 + EXP 표시).
 * EXP는 표시 전용(프로필 쓰기 없음). 하나라도 완료 시 목적지 도착으로 진입.
 */
import { useMemo, useState } from "react";
import { Starfield } from "./Starfield";
import { SpriteImage } from "./SpriteImage";
import { compassAssets } from "../data/assets";
import { useDestinyCompassCopy } from "../_lib/copy";
import styles from "./map.module.css";
import type { DirectionField } from "../_engine/types";
import { awardRpg } from "../_lib/rpg-bridge";

// 리텐션 엔진의 quest 규칙(AWARD_RULES.quest.exp)과 동일 — 표시값과 실제 적립을 일치시킨다.
const EXP_PER_ITEM = 15;

export function TodayQuest({
  field,
  onArrive,
  onReset,
}: {
  field: DirectionField;
  onArrive: () => void;
  onReset: () => void;
}) {
  const copy = useDestinyCompassCopy();
  const items = useMemo(() => field.directions.slice(0, 3).map((d) => d.key), [field]);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const doneCount = items.filter((k) => done[k]).length;
  const exp = doneCount * EXP_PER_ITEM;
  const totalExp = items.length * EXP_PER_ITEM;
  const anyDone = doneCount > 0;

  return (
    <div className={`${styles.resultStage} ${styles.nightStage}`}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>The Quest</span>
        <h1 className={styles.mapTitle}>{copy.todayQuestTitle}</h1>
      </header>

      <div className={styles.resultBody}>
        <div className={styles.resultSpeak}>
          <SpriteImage
            src={compassAssets.neo.main}
            alt={copy.neoAlt}
            width={96}
            height={120}
            className={styles.questNeo}
            style={{ height: "auto" }}
          />
          <div className={styles.resultBubble}>
            <div className={styles.resultWho}>{copy.neoName}</div>
            <p>{copy.neoIntroLine}</p>
          </div>
        </div>

        <div className={`${styles.questCard} ${doneCount === items.length ? styles.questCardDone : ""}`}>
          <div className={styles.questTop}>
            <span className={styles.questTag}>{copy.questTag}</span>
            <span className={styles.questExp}>+{exp} / {totalExp} EXP</span>
          </div>
          <p className={styles.questAction}>{copy.todayAction[field.primary.key]}</p>
          <div className={styles.questList}>
            {items.map((k) => {
              const on = !!done[k];
              return (
                <button
                  key={k}
                  type="button"
                  className={`${styles.questCheck} ${on ? styles.questCheckOn : ""}`}
                  role="checkbox"
                  aria-checked={on}
                  onClick={() =>
                    setDone((prev) => {
                      if (!prev[k]) void awardRpg("quest", k); // 켜질 때만 적립(로컬·서버 멱등)
                      return { ...prev, [k]: !prev[k] };
                    })
                  }
                >
                  <span className={styles.questCheckBox} aria-hidden="true">{on ? "✓" : ""}</span>
                  {copy.todayShort[k]}
                </button>
              );
            })}
          </div>
          <p className={styles.questExpNote}>{copy.questExpNote}</p>
        </div>

        <div className={styles.resultCtas}>
          {anyDone && (
            <button type="button" className={styles.resultCta} onClick={onArrive}>
              {copy.arriveButton}
            </button>
          )}
          <button type="button" className={styles.resultCtaText} onClick={onReset}>
            {copy.restartButton}
          </button>
        </div>
      </div>
    </div>
  );
}
