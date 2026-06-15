/**
 * PremiumPreview — 프리미엄 콘텐츠 미리보기 + 잠금 오버레이
 * 저장 경로: app/components/PremiumPreview.jsx
 *
 * 사용법:
 *   <PremiumPreview previewText="여기에 300자 이상의 미리보기 텍스트..." />
 *   <PremiumPreview previewText={article.preview} featureName="상세 사주 분석" coinCost={10} />
 */
"use client";

import styles from "./LegalUi.module.css";

export default function PremiumPreview({
  previewText = "",
  featureName = "전체 결과",
  coinCost = 10,
  onUnlock,
}) {
  const displayPrice = `${Math.max(0, Math.floor(Number(coinCost || 0) * 100)).toLocaleString("ko-KR")}원`;

  return (
    <div className={styles.previewContainer}>
      {/* 미리보기 본문 (300자+ 반드시 표시) */}
      <div className={styles.previewBody}>
        <p style={{ fontSize: "15px", lineHeight: "1.8", color: "#e2e0f5", padding: "0 0 60px" }}>
          {previewText}
        </p>
        {/* 페이드아웃 효과 */}
        <div className={styles.previewFade} />
      </div>

      {/* 잠금 언오버레이 */}
      <div className={styles.lockOverlay}>
        <span className={styles.lockIcon}>🔐</span>
        <div className={styles.lockTitle}>{featureName} 전체 보기</div>
        <div className={styles.lockDesc}>
          {displayPrice} 결제로 전체 내용을 잠금 해제하세요.<br />
          선불형 잔액 상품은 판매하지 않으며, 상품별 원화 결제로 이용합니다.
        </div>
        <button
          className={styles.lockBtn}
          onClick={onUnlock}
          type="button"
        >
          {displayPrice} 결제로 전체 보기
        </button>
      </div>
    </div>
  );
}
