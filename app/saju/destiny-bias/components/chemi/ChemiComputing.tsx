"use client";

import { STAGE } from "./chemiAssets";
import styles from "../../destiny-bias.module.css";
import art from "../../stage-art.module.css";

type Props = {
  partnerName: string;
};

/** 계산 연출. 실제 계산은 동기이며 연출 길이는 상위에서 ≤1.2초로 제한한다. */
export default function ChemiComputing({ partnerName }: Props) {
  return (
    <section className={styles.computing} role="status" aria-live="polite" aria-busy="true">
      <div className={art.computingStage} aria-hidden>
        <img src={STAGE.fanOcean} alt="" width={960} height={640} decoding="async" />
      </div>
      <p className={styles.stepLabel}>STEP 3 / 3</p>
      <h2 className={styles.stepTitle}>{partnerName}와 내 명식을 겹쳐 보는 중…</h2>
      <ul className={styles.computingSteps}>
        <li>연·월·일주 세우기</li>
        <li>천간·지지 관계 읽기</li>
        <li>9가지 케미 유형 중 하나 고르기</li>
      </ul>
    </section>
  );
}
