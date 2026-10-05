"use client";

import { BIAS_MOODS } from "../../engine/chemiReportBridge";
import { PHOTOCARD_THEMES } from "./PhotocardFace";
import styles from "../../photocard.module.css";

type Props = {
  themeKey: string;
  biasMood: string;
  relationMood: string;
  /** 미성년 모드면 우정·팀워크 전용 목록이 넘어온다. */
  relationMoods: readonly string[];
  onThemeChange: (themeKey: string) => void;
  onBiasMoodChange: (mood: string) => void;
  onRelationMoodChange: (mood: string) => void;
};

/** 결과 뒤 「포카 꾸미기」: 테마·무드. 무드는 점수 문구를 다시 계산하고, 테마는 보이는 것만 바꾼다. 사진은 BiasPhotoPicker. */
export default function PhotocardDeco({
  themeKey,
  biasMood,
  relationMood,
  relationMoods,
  onThemeChange,
  onBiasMoodChange,
  onRelationMoodChange,
}: Props) {
  return (
    <section className={styles.deco} aria-labelledby="dbk-deco-title">
      <div className={styles.decoHead}>
        <h3 id="dbk-deco-title" className={styles.decoTitle}>
          포카 꾸미기
        </h3>
        <span className={styles.decoKicker} aria-hidden>
          TOP-KKU STUDIO
        </span>
      </div>

      <fieldset className={styles.decoGroup}>
        <legend className={styles.decoLegend}>카드 테마</legend>
        <div className={styles.decoRow}>
          {PHOTOCARD_THEMES.map((theme) => (
            <button
              key={theme.key}
              type="button"
              className={styles.decoChip}
              aria-pressed={themeKey === theme.key}
              onClick={() => onThemeChange(theme.key)}
            >
              <span className={styles.decoSwatch} data-theme={theme.key} aria-hidden />
              {theme.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.decoGroup}>
        <legend className={styles.decoLegend}>최애 무드</legend>
        <div className={styles.decoRow}>
          {BIAS_MOODS.map((mood) => (
            <button key={mood} type="button" className={styles.decoChip} aria-pressed={biasMood === mood} onClick={() => onBiasMoodChange(mood)}>
              {mood}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.decoGroup}>
        <legend className={styles.decoLegend}>나의 덕질 무드</legend>
        <div className={styles.decoRow}>
          {relationMoods.map((mood) => (
            <button
              key={mood}
              type="button"
              className={styles.decoChip}
              aria-pressed={relationMood === mood}
              onClick={() => onRelationMoodChange(mood)}
            >
              {mood}
            </button>
          ))}
        </div>
      </fieldset>

    </section>
  );
}
