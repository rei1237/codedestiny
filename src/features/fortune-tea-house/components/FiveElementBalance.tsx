"use client";

import type { CSSProperties } from "react";
import type { FortuneTeaFiveElementBalance } from "../data/consult";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type FiveElementBalanceProps = {
  elements?: FortuneTeaFiveElementBalance[];
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다. */
const KO = {
  eyebrow: "찻잔 향이 차오르는 결",
  title: "오행 향의 균형",
  empty: "출생정보가 충분하지 않아 오행의 세부 균형은 펼치지 않았어요.",
};

export default function FiveElementBalance({ elements }: FiveElementBalanceProps) {
  const copy = useTeaHouseCopy("fiveElementBalance", KO);
  if (!elements?.length) {
    return (
      <section className={styles.sajuPanelSection} aria-labelledby="fiveElementBalanceTitle">
        <div className={styles.sajuPanelSectionHeader}>
          <span>{copy.eyebrow}</span>
          <h4 id="fiveElementBalanceTitle">{copy.title}</h4>
        </div>
        <p className={styles.sajuMutedText}>{copy.empty}</p>
      </section>
    );
  }

  return (
    <section className={styles.sajuPanelSection} aria-labelledby="fiveElementBalanceTitle">
      <div className={styles.sajuPanelSectionHeader}>
        <span>{copy.eyebrow}</span>
        <h4 id="fiveElementBalanceTitle">{copy.title}</h4>
      </div>
      <div className={styles.fiveElementBalance}>
        {elements.map((element) => (
          <article className={styles.fiveElementItem} data-tone={element.tone} key={element.key}>
            <div className={styles.fiveElementMeta}>
              <span>{element.nameKo}</span>
              <strong>{element.strengthLabel}</strong>
              <em>{Math.round(element.value)}%</em>
            </div>
            <div className={styles.fiveElementTrack} aria-label={`${element.nameKo} ${Math.round(element.value)}%`}>
              <span style={{ "--element-value": `${element.value}%` } as CSSProperties} />
            </div>
            <p>{element.reading}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
