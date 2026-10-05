"use client";

import { useRef, useState, type ChangeEvent } from "react";
import styles from "../../photocard.module.css";

const PHOTO_MAX_BYTES = 12 * 1024 * 1024;

type Props = {
  photoUrl: string | null;
  /** 사진은 data URL 로 메모리에만 둔다. 서버·저장소·분석으로 보내지 않는다. */
  onPhotoChange: (photoUrl: string | null) => void;
};

/** 결과 카드 바로 아래 「최애 사진으로 포토카드 만들기」. 사진은 카드 화면과 「이미지 저장」 파일에만 들어간다. */
export default function BiasPhotoPicker({ photoUrl, onPhotoChange }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");
  const hasPhoto = Boolean(photoUrl);

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
    <section className={`${styles.deco} ${styles.photoPicker}`} aria-labelledby="dbk-photo-title" data-bias-photo-picker>
      <div className={styles.decoHead}>
        <h3 id="dbk-photo-title" className={styles.decoTitle}>
          최애 사진으로 포토카드 만들기
        </h3>
        <span className={styles.decoKicker} aria-hidden>
          PHOTO MERGE
        </span>
      </div>
      <div className={styles.photoPickerBody}>
        <div className={styles.photoThumb} data-empty={hasPhoto ? undefined : ""} aria-hidden>
          {photoUrl ? <img src={photoUrl} alt="" /> : <span>♡</span>}
        </div>
        <div className={styles.decoRow}>
          <button type="button" className={styles.decoPhotoBtn} onClick={() => fileRef.current?.click()}>
            {hasPhoto ? "다른 사진으로 바꾸기" : "최애 사진 고르기"}
          </button>
          {hasPhoto ? (
            <button type="button" className={styles.decoChip} onClick={() => onPhotoChange(null)}>
              사진 빼기
            </button>
          ) : null}
        </div>
      </div>
      <input ref={fileRef} className={styles.decoFile} type="file" accept="image/*" tabIndex={-1} aria-hidden onChange={onFile} />
      {error ? (
        <p className={styles.decoError} role="alert">
          {error}
        </p>
      ) : null}
      <p className={styles.decoNote}>
        사진은 이 기기 화면과 「이미지 저장」 파일에만 들어가요. 서버로 보내지 않고 공유 링크·공유 파일에는 빠져요.
      </p>
    </section>
  );
}
