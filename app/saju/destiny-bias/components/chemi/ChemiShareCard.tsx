"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { STAGE } from "./chemiAssets";
import { PhotocardFront, type PhotocardView } from "./PhotocardFace";
import styles from "../../destiny-bias.module.css";
import card from "../../share-card.module.css";

export type ShareRatio = "square" | "story";
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT: Record<ShareRatio, number> = { square: 1080, story: 1920 };
export const SHARE_NICKNAME_MAX = 20;

type Props = {
  /** 포토카드 표시용 문자열 묶음. 날짜 입력·명식은 이 타입에 없다. */
  view: PhotocardView;
  /** 기기 안에서만 쓰는 사진. 「이미지 저장」에만 찍히고, 공유 파일을 만들 때는 걸러진다. */
  photoUrl?: string | null;
  ratio: ShareRatio;
  nickname: string;
  showNickname: boolean;
  onRatioChange: (ratio: ShareRatio) => void;
  onNicknameChange: (nickname: string) => void;
  onShowNicknameChange: (show: boolean) => void;
};

/**
 * 공유 카드(1080×1080 · 1080×1920). ref 는 실제 1080px 캔버스 노드를 가리킨다 —
 * 축소는 바깥 래퍼의 transform 으로만 하므로 html-to-image 가 원본 크기로 찍는다.
 * 🔴 날짜 입력·명식은 어떤 형태로도 이 DOM 에 넣지 않는다(공유물에 개인정보 금지).
 */
const ChemiShareCard = forwardRef<HTMLDivElement, Props>(function ChemiShareCard(
  { view, photoUrl, ratio, nickname, showNickname, onRatioChange, onNicknameChange, onShowNicknameChange },
  ref,
) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.3);
  const height = SHARE_CARD_HEIGHT[ratio];

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const update = () => setScale(frame.clientWidth / SHARE_CARD_WIDTH);
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [ratio]);

  return (
    <section className={styles.shareCardSection} aria-labelledby="dbk-share-card-title">
      <h3 id="dbk-share-card-title" className={styles.sectionTitle}>
        공유 카드 미리보기 <small>생일은 카드에 들어가지 않아요</small>
      </h3>

      <div className={styles.ratioToggle} role="group" aria-label="카드 비율">
        <button
          type="button"
          className={`${styles.segment} ${ratio === "square" ? styles.segmentActive : ""}`}
          aria-pressed={ratio === "square"}
          onClick={() => onRatioChange("square")}
        >
          1:1 피드
        </button>
        <button
          type="button"
          className={`${styles.segment} ${ratio === "story" ? styles.segmentActive : ""}`}
          aria-pressed={ratio === "story"}
          onClick={() => onRatioChange("story")}
        >
          9:16 스토리
        </button>
      </div>

      <div ref={frameRef} className={`${styles.sharePreviewFrame} ${card.frame}`} data-ratio={ratio} style={{ height: Math.round(height * scale) }}>
        <div className={styles.shareScaler} style={{ transform: `scale(${scale})` }}>
          <div ref={ref} className={card.canvas} data-ratio={ratio} style={{ width: SHARE_CARD_WIDTH, height }}>
            <img className={card.bg} src={ratio === "story" ? STAGE.heroTall : STAGE.fanOcean} alt="" aria-hidden />
            <div className={card.cardBox}>
              <div className={card.cardScale}>
                <PhotocardFront view={view} photoUrl={photoUrl} flat />
              </div>
            </div>
            <div className={card.copy}>
              <p className={card.kicker}>My Bias Chemi</p>
              <p className={card.pair}>
                {view.me}
                <i aria-hidden>×</i>
                {view.partnerName}
              </p>
              <p className={card.score}>
                {view.total}
                <small>%</small>
              </p>
              <p className={card.grade}>{view.grade}</p>
              <p className={card.type}>
                {view.typeShort} · {view.typeName}
              </p>
              <p className={card.oneLiner}>{view.oneLiner}</p>
            </div>
            <p className={card.foot}>
              <span>꿀꿀 운세 · 최애운명</span>
              <span>code-destiny.com · 오락용</span>
            </p>
          </div>
        </div>
      </div>
      {photoUrl ? <p className={card.photoNote}>넣은 사진은 「이미지 저장」에만 찍혀요. 공유로 보내는 카드와 링크에는 빠져요.</p> : null}

      <div className={styles.shareNickRow}>
        <label className={styles.fieldLabel} htmlFor="dbk-share-nickname">
          카드에 넣을 닉네임 (선택)
        </label>
        <input
          id="dbk-share-nickname"
          className={styles.shareNickInput}
          type="text"
          value={nickname}
          maxLength={SHARE_NICKNAME_MAX}
          placeholder="비워 두면 「나」로 표시돼요"
          autoComplete="off"
          disabled={!showNickname}
          onChange={(e) => onNicknameChange(e.target.value.slice(0, SHARE_NICKNAME_MAX))}
        />
        <label className={`${styles.shareNickToggle} ${card.check}`}>
          <input type="checkbox" checked={!showNickname} onChange={(e) => onShowNicknameChange(!e.target.checked)} />
          닉네임 숨기기
        </label>
      </div>
    </section>
  );
});

export default ChemiShareCard;
