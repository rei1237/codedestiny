"use client";

import type { FortuneTeaHouseConsultResponse, FortuneTeaHouseQuestionInput } from "../data/consult";
import type { TeaHouseStage } from "../data/story";
import type { TeaHouseCup } from "../data/teaCups";
import { getTeaCupSprite } from "../data/teaCupSpriteMap";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type FortuneTeaHouseDebugPanelProps = {
  stage: TeaHouseStage;
  selectedCup: TeaHouseCup | null;
  questionInput: Partial<FortuneTeaHouseQuestionInput>;
  consultResult: FortuneTeaHouseConsultResponse | null;
  lastError: string;
  isSubmitting: boolean;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    키는 문구의 결정론적 해시라 같은 문구가 자동으로 한 키로 합쳐진다(정적 셸의 마커 도구와 같은 방식). */
const KO = {
  k1lcnd8v: "있음",
  k1ynotxc: "없음",
  kn1nriyo: "운명의 찻집 개발용 상태 패널",
};

export default function FortuneTeaHouseDebugPanel({
  stage,
  selectedCup,
  questionInput,
  consultResult,
  lastError,
  isSubmitting,
}: FortuneTeaHouseDebugPanelProps) {
  const copy = useTeaHouseCopy("fortuneTeaHouseDebugPanel", KO);
  if (process.env.NODE_ENV === "production") return null;

  const asset = selectedCup ? getTeaCupSprite(selectedCup.id, "selected").src : "";

  return (
    <aside className={styles.fortuneTeaDebugPanel} aria-label={copy.kn1nriyo}>
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
          <dd>{questionInput.question ? copy.k1lcnd8v : copy.k1ynotxc}</dd>
        </div>
        <div>
          <dt>consultResult</dt>
          <dd>{consultResult ? copy.k1lcnd8v : "null"}</dd>
        </div>
        <div>
          <dt>isSubmitting</dt>
          <dd>{isSubmitting ? "true" : "false"}</dd>
        </div>
        <div>
          <dt>lastError</dt>
          <dd>{lastError || copy.k1ynotxc}</dd>
        </div>
        <div>
          <dt>asset</dt>
          <dd>{asset || copy.k1ynotxc}</dd>
        </div>
      </dl>
    </aside>
  );
}
