"use client";

import type { FortuneTeaSajuPillar } from "../data/consult";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type SajuPillarBoardProps = {
  pillars?: FortuneTeaSajuPillar[];
};

const fallbackPillars: FortuneTeaSajuPillar[] = [
  { key: "year", label: "년주", available: false },
  { key: "month", label: "월주", available: false },
  { key: "day", label: "일주", available: false },
  {
    key: "hour",
    label: "시주",
    available: false,
    note: "출생시간을 몰라도 괜찮아요. 이번 상담에서는 시주 없이 큰 흐름을 중심으로 읽습니다.",
  },
];

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    PILLARS 의 label(년주·월주·일주·시주)과 note 는 기둥 정의 데이터라 다음 배치에서 함께 다룬다. */
const KO = {
  eyebrow: "달빛이 비친 명식표",
  title: "달빛 네 기둥",
  empty: "미입력",
  heavenlyStem: "천간",
  earthlyBranch: "지지",
  element: "오행",
  tenGod: "십성",
  tenGodEmpty: "대표 손님과 함께 봐요",
};

export default function SajuPillarBoard({ pillars }: SajuPillarBoardProps) {
  const copy = useTeaHouseCopy("sajuPillarBoard", KO);
  const visiblePillars = pillars?.length ? pillars : fallbackPillars;

  return (
    <section className={styles.sajuPanelSection} aria-labelledby="sajuPillarBoardTitle">
      <div className={styles.sajuPanelSectionHeader}>
        <span>{copy.eyebrow}</span>
        <h4 id="sajuPillarBoardTitle">{copy.title}</h4>
      </div>
      <div className={styles.sajuPillarBoard}>
        {visiblePillars.map((pillar) => (
          <article
            className={styles.sajuPillarCard}
            data-primary={pillar.key === "day" ? "true" : "false"}
            data-available={pillar.available ? "true" : "false"}
            key={pillar.key}
          >
            <div className={styles.sajuPillarTop}>
              <span>{pillar.label}</span>
              <strong>{pillar.ganji || copy.empty}</strong>
            </div>
            <dl className={styles.sajuPillarRows}>
              <div>
                <dt>{copy.heavenlyStem}</dt>
                <dd>{pillar.heavenlyStem || "—"}</dd>
              </div>
              <div>
                <dt>{copy.earthlyBranch}</dt>
                <dd>{pillar.earthlyBranch || "—"}</dd>
              </div>
              <div>
                <dt>{copy.element}</dt>
                <dd>{pillar.element || "—"}</dd>
              </div>
              <div>
                <dt>{copy.tenGod}</dt>
                <dd>{pillar.tenGod || copy.tenGodEmpty}</dd>
              </div>
            </dl>
            {!pillar.available && pillar.note ? <p>{pillar.note}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
