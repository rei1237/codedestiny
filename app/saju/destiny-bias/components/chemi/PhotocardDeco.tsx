"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { BIAS_MOODS } from "../../engine/chemiReportBridge";
import { PHOTOCARD_THEMES } from "./PhotocardFace";
import styles from "../../photocard.module.css";

const PHOTO_MAX_BYTES = 12 * 1024 * 1024;

type Props = {
  themeKey: string;
  biasMood: string;
  relationMood: string;
  /** 미성년 모드면 우정·팀워크 전용 목록이 넘어온다. */
  relationMoods: readonly string[];
  hasPhoto: boolean;
  onThemeChange: (themeKey: string) => void;
  onBiasMoodChange: (mood: string) => void;
  onRelationMoodChange: (mood: string) => void;
  /** 사진은 data URL 로 메모리에만 둔다. 서버·저장소·분석으로 보내지 않는다. */
  onPhotoChange: (photoUrl: string | null) => void;
};

/** 결과 뒤 「포카 꾸미기」: 테마·무드·내 사진. 무드는 점수 문구를 다시 계산하고, 테마·사진은 보이는 것만 바꾼다. */
export default function PhotocardDeco({
  themeKey,
  biasMood,
  relationMood,
  relationMoods,
  hasPhoto,
  onThemeChange,
  onBiasMoodChange,
  onRelationMoodChange,
  onPhotoChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setError("12MB 이하 사진만 올릴 수 있어요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError("");
      onPhotoChange(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => setError("사진을 읽지 못했어요. 다른 사진으로 시도해 주세요.");
    reader.readAsDataURL(file);
  };

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

      <fieldset className={styles.decoGroup}>
        <legend className={styles.decoLegend}>내 사진 넣기</legend>
        <div className={styles.decoRow}>
          <button type="button" className={styles.decoPhotoBtn} onClick={() => fileRef.current?.click()}>
            {hasPhoto ? "다른 사진으로 바꾸기" : "사진 고르기"}
          </button>
          {hasPhoto ? (
            <button type="button" className={styles.decoChip} onClick={() => onPhotoChange(null)}>
              사진 빼기
            </button>
          ) : null}
        </div>
        <input ref={fileRef} className={styles.decoFile} type="file" accept="image/*" tabIndex={-1} aria-hidden onChange={onFile} />
        {error ? (
          <p className={styles.decoError} role="alert">
            {error}
          </p>
        ) : null}
        <p className={styles.decoNote}>
          사진은 이 기기 화면과 「이미지 저장」 파일에만 들어가요. 서버로 보내지 않고, 공유 링크와 미리보기에도 나오지 않아요.
        </p>
      </fieldset>
    </section>
  );
}
