"use client";

import type { FortuneTeaHouseConsultResponse, FortuneTeaHouseQuestionInput } from "../data/consult";
import type { TeaHouseStage } from "../data/story";
import type { TeaHouseCup } from "../data/teaCups";
import { getTeaCupSprite } from "../data/teaCupSpriteMap";
import styles from "../styles/fortune-tea-house.module.css";

type FortuneTeaHouseDebugPanelProps = {
  stage: TeaHouseStage;
  selectedCup: TeaHouseCup | null;
  questionInput: Partial<FortuneTeaHouseQuestionInput>;
  consultResult: FortuneTeaHouseConsultResponse | null;
  lastError: string;
  isSubmitting: boolean;
};

export default function FortuneTeaHouseDebugPanel({
  stage,
  selectedCup,
  questionInput,
  consultResult,
  lastError,
  isSubmitting,
}: FortuneTeaHouseDebugPanelProps) {
  if (process.env.NODE_ENV === "production") return null;

  const asset = selectedCup ? getTeaCupSprite(selectedCup.id, "selected").src : "";

  return (
    <aside className={styles.fortuneTeaDebugPanel} aria-label="운명의 찻집 개발용 상태 패널">
      <strong>Fortune Tea Debug</strong>
      <dl>
        <div>
          <dt>stage</dt>
          <dd>{stage}</dd>
        </div>
        <div>
          <dt>selectedCup</dt>
          <dd>{selectedCup ? `${selectedCup.id} / ${selectedCup.topic}` : "null"}</dd>
        </div>
        <div>
          <dt>question</dt>
          <dd>{questionInput.question ? "있음" : "없음"}</dd>
        </div>
        <div>
          <dt>consultResult</dt>
          <dd>{consultResult ? "있음" : "null"}</dd>
        </div>
        <div>
          <dt>isSubmitting</dt>
          <dd>{isSubmitting ? "true" : "false"}</dd>
        </div>
        <div>
          <dt>lastError</dt>
          <dd>{lastError || "없음"}</dd>
        </div>
        <div>
          <dt>asset</dt>
          <dd>{asset || "없음"}</dd>
        </div>
      </dl>
    </aside>
  );
}
