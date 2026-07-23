"use client";
/**
 * STEP 9 오늘의 퀘스트 — 대표 방향 헤드라인 + 상위 3방향의 실행 체크리스트(네오 팩폭 + EXP 표시).
 * EXP는 표시 전용(프로필 쓰기 없음). 하나라도 완료 시 목적지 도착으로 진입.
 */
import { useMemo, useState } from "react";
import { Starfield } from "./Starfield";
import { SpriteImage } from "./SpriteImage";
import { compassAssets } from "../data/assets";
import styles from "./map.module.css";
import type { DirectionField, DirectionKey } from "../_engine/types";

// 헤드라인용 긴 액션
const TODAY_ACTION: Record<DirectionKey, string> = {
  career: "미뤄둔 그 업무, 오늘 딱 30분만 손을 댄다.",
  venture: "머릿속 아이디어를 오늘 3줄로 적어, 한 사람에게 보낸다.",
  study: "배우고 싶던 것, 오늘 첫 10분만 시작한다.",
  relationship: "연락이 뜸했던 그 사람에게, 오늘 안에 먼저 안부를 묻는다.",
  love: "망설이던 그 마음, 오늘 한 문장으로 표현한다.",
  wealth: "새고 있는 지출 하나를, 오늘 찾아서 끊는다.",
  health: "오늘은 30분 일찍 자거나 20분 걷는다 — 딱 하나만.",
  rest: "오늘 하루, 죄책감 없이 제대로 쉬는 시간을 1시간 확보한다.",
};
// 체크리스트용 짧은 항목
const TODAY_SHORT: Record<DirectionKey, string> = {
  career: "미뤄둔 업무 30분 손대기",
  venture: "아이디어 3줄 적어 보내기",
  study: "배움 첫 10분 시작하기",
  relationship: "먼저 안부 연락하기",
  love: "마음 한 문장 표현하기",
  wealth: "새는 지출 하나 끊기",
  health: "20분 걷거나 일찍 자기",
  rest: "죄책감 없이 1시간 쉬기",
};

const EXP_PER_ITEM = 40;

export function TodayQuest({
  field,
  onArrive,
  onReset,
}: {
  field: DirectionField;
  onArrive: () => void;
  onReset: () => void;
}) {
  const items = useMemo(() => field.directions.slice(0, 3).map((d) => d.key), [field]);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const doneCount = items.filter((k) => done[k]).length;
  const exp = doneCount * EXP_PER_ITEM;
  const totalExp = items.length * EXP_PER_ITEM;
  const anyDone = doneCount > 0;

  return (
    <div className={styles.resultStage}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>The Quest</span>
        <h1 className={styles.mapTitle}>오늘의 퀘스트</h1>
      </header>

      <div className={styles.resultBody}>
        <div className={styles.resultSpeak}>
          <SpriteImage
            src={compassAssets.neo.main}
            alt="전략실의 네오"
            width={96}
            height={120}
            className={styles.questNeo}
            style={{ height: "auto" }}
          />
          <div className={styles.resultBubble}>
            <div className={styles.resultWho}>네오</div>
            <p>고민은 결정을 미루는 가장 세련된 방법이야. 방향은 나왔으니, 오늘 움직일 건 아래 세 가지. 하나라도 해.</p>
          </div>
        </div>

        <div className={`${styles.questCard} ${doneCount === items.length ? styles.questCardDone : ""}`}>
          <div className={styles.questTop}>
            <span className={styles.questTag}>오늘의 퀘스트</span>
            <span className={styles.questExp}>+{exp} / {totalExp} EXP</span>
          </div>
          <p className={styles.questAction}>{TODAY_ACTION[field.primary.key]}</p>
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
                  onClick={() => setDone((prev) => ({ ...prev, [k]: !prev[k] }))}
                >
                  <span className={styles.questCheckBox} aria-hidden="true">{on ? "✓" : ""}</span>
                  {TODAY_SHORT[k]}
                </button>
              );
            })}
          </div>
          <p className={styles.questExpNote}>완료는 표시용이에요 — 오늘의 나에게 주는 작은 보상.</p>
        </div>

        <div className={styles.resultCtas}>
          {anyDone && (
            <button type="button" className={styles.resultCta} onClick={onArrive}>
              목적지 도착 →
            </button>
          )}
          <button type="button" className={styles.resultCtaText} onClick={onReset}>
            지도로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
