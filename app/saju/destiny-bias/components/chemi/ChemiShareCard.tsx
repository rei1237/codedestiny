"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import type { ChemiCopy, ChemiResult } from "@/lib/idol-chemi";
import { ASSETS, STRENGTH_LABEL, TYPE_ACCENT, stickerSrc, typeSymbolSrc } from "./chemiAssets";
import styles from "../../destiny-bias.module.css";

export type ShareRatio = "square" | "story";
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT: Record<ShareRatio, number> = { square: 1080, story: 1920 };
export const SHARE_NICKNAME_MAX = 20;

type Props = {
  result: ChemiResult;
  copy: ChemiCopy;
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
 * 🔴 생년월일·명식은 어떤 형태로도 이 DOM 에 넣지 않는다(공유물에 개인정보 금지).
 */
const ChemiShareCard = forwardRef<HTMLDivElement, Props>(function ChemiShareCard(
  { result, copy, ratio, nickname, showNickname, onRatioChange, onNicknameChange, onShowNicknameChange },
  ref,
) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.3);
  const height = SHARE_CARD_HEIGHT[ratio];
  const me = showNickname && nickname.trim() ? nickname.trim() : "나";

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

      <div
        ref={frameRef}
        className={styles.sharePreviewFrame}
        data-ratio={ratio}
        style={{ height: Math.round(height * scale) }}
      >
        <div className={styles.shareScaler} style={{ transform: `scale(${scale})` }}>
          <div
            ref={ref}
            className={styles.shareCanvas}
            data-ratio={ratio}
            data-accent={TYPE_ACCENT[result.chemiTypeId]}
            style={{ width: SHARE_CARD_WIDTH, height }}
          >
            <img className={styles.shareCanvasBg} src={ratio === "story" ? ASSETS.shareBgStory : ASSETS.shareBgSquare} alt="" aria-hidden />
            <img className={styles.shareCanvasStickerA} src={stickerSrc(1)} alt="" aria-hidden />
            <img className={styles.shareCanvasStickerB} src={stickerSrc(4)} alt="" aria-hidden />
            <div className={styles.shareCanvasPanel}>
              <p className={styles.shareCanvasKicker}>최애운명 · 케미 유형</p>
              <p className={styles.shareCanvasPair}>
                <strong>{me}</strong>
                <i aria-hidden>×</i>
                <strong>{result.partner.displayName}</strong>
              </p>
              {result.partner.groupLabel ? <p className={styles.shareCanvasGroup}>{result.partner.groupLabel}</p> : null}
              <img className={styles.shareCanvasSymbol} src={typeSymbolSrc(result.chemiTypeId)} alt="" aria-hidden />
              <p className={styles.shareCanvasShort}>{result.chemiTypeShortKo}</p>
              <p className={styles.shareCanvasType}>{result.chemiTypeNameKo}</p>
              <p className={styles.shareCanvasOneLiner}>{copy.oneLiner}</p>
              <p className={styles.shareCanvasMeta}>
                {STRENGTH_LABEL[result.signalStrength]} · {result.minorMode ? "우정·팀워크 모드" : "현실 친구 모드"}
              </p>
            </div>
            <p className={styles.shareCanvasFoot}>
              <span>꿀꿀 운세 · 최애운명</span>
              <span>code-destiny.com · 오락용</span>
            </p>
          </div>
        </div>
      </div>

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
        <label className={styles.shareNickToggle}>
          <input type="checkbox" checked={!showNickname} onChange={(e) => onShowNicknameChange(!e.target.checked)} />
          닉네임 숨기기
        </label>
      </div>
    </section>
  );
});

export default ChemiShareCard;
