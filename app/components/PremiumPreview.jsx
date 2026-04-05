/**
 * PremiumPreview — 프리미엄 콘텐츠 미리보기 + 잠금 오버레이
 * 저장 경로: app/components/PremiumPreview.jsx
 *
 * 사용법:
 *   <PremiumPreview previewText="여기에 300자 이상의 미리보기 텍스트..." />
 *   <PremiumPreview previewText={article.preview} featureName="상세 사주 분석" coinCost={10} />
 */
"use client";

export default function PremiumPreview({
  previewText = "",
  featureName = "전체 결과",
  coinCost = 10,
  onUnlock,
}) {
  return (
    <div className="cd-preview-container">
      {/* 미리보기 본문 (300자+ 반드시 표시) */}
      <div className="cd-preview-body">
        <p style={{ fontSize: "15px", lineHeight: "1.8", color: "#e2e0f5", padding: "0 0 60px" }}>
          {previewText}
        </p>
        {/* 페이드아웃 효과 */}
        <div className="cd-preview-fade" />
      </div>

      {/* 잠금 언오버레이 */}
      <div className="cd-lock-overlay">
        <span className="cd-lock-icon">🔐</span>
        <div className="cd-lock-title">{featureName} 전체 보기</div>
        <div className="cd-lock-desc">
          코인 {coinCost}개로 전체 내용을 잠금 해제하세요.<br />
          구매한 코인은 모든 분석 기능에 사용 가능합니다.
        </div>
        <button
          className="cd-lock-btn"
          onClick={onUnlock}
          type="button"
        >
          🪙 코인 {coinCost}개로 전체 보기
        </button>
      </div>
    </div>
  );
}
