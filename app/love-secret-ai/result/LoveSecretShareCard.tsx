"use client";

import { forwardRef } from "react";

/**
 * 공유용 이미지 카드 — 1080 × 1350 (4:5).
 *
 * 왜 4:5 인가: 인스타/스레드가 잘라내지 않고 렌더하는 가장 세로로 긴 비율이면서,
 * 메신저가 1:1 로 중앙 크롭해도 살아남는다. 그래서 **모든 텍스트를 중앙 1080×1080
 * 세이프 영역 안**에 두고, 위아래 135px 밴드에는 장식만 놓는다.
 *
 * 🔴 라이브 요약 카드를 캡처하지 않는다. 이 노드는 항상 마운트된 오프스크린 전용이라
 *    "마운트 → 페인트 전 캡처" 경합이 없다. 숨김은 반드시 화면 밖 좌표로 한다 —
 *    display:none / visibility:hidden / opacity:0 은 html2canvas 가 존중해 빈 캔버스가 나온다.
 * 🔴 색은 자체 완결 불투명 값만 쓴다. backdrop-filter·color-mix·conic-gradient 는
 *    html2canvas 1.4.x 가 처리하지 못한다.
 * 🔒 상대방 이름은 넣지 않는다 — 제3자 정보가 공개 이미지로 나가는 것을 막는 의도적 결정.
 */
const LoveSecretShareCard = forwardRef<HTMLDivElement, {
  myName: string;
  summaryTitle: string;
  oneLine: string;
  temperature: string;
  keywords: string[];
  generatedAt: string;
  dark: boolean;
}>(function LoveSecretShareCard({ myName, summaryTitle, oneLine, temperature, keywords, generatedAt, dark }, ref) {
  const palette = dark
    ? { bg: "#24081a", panel: "#341024", ink: "#fff1f7", muted: "#ffd6e8", accent: "#ff9dc2", gold: "#ead089", line: "#4a1a33" }
    : { bg: "#fffaf7", panel: "#ffffff", ink: "#3c1830", muted: "#70445c", accent: "#b31955", gold: "#c9a227", line: "#f3d9e3" };

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: -12000,
        top: 0,
        width: 1080,
        height: 1350,
        background: palette.bg,
        fontFamily: "var(--font-body)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "135px 90px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          background: palette.panel,
          border: `2px solid ${palette.gold}`,
          borderRadius: 48,
          padding: "72px 64px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <p style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: 6, color: palette.accent }}>
          CODE DESTINY
        </p>
        <p style={{ margin: "36px 0 0", fontSize: 76, lineHeight: 1 }}>💖</p>
        <h2
          style={{
            margin: "32px 0 0",
            fontSize: 54,
            lineHeight: 1.25,
            fontWeight: 900,
            color: palette.ink,
            fontFamily: "var(--font-display)",
            wordBreak: "keep-all",
          }}
        >
          {myName}님의 연애 비책
        </h2>
        <p style={{ margin: "18px 0 0", fontSize: 28, fontWeight: 700, color: palette.accent, wordBreak: "keep-all" }}>
          {summaryTitle.slice(0, 34)}
        </p>
        <div style={{ margin: "44px 0 0", height: 2, background: palette.line }} />
        <p
          style={{
            margin: "44px 0 0",
            fontSize: 34,
            lineHeight: 1.7,
            fontWeight: 700,
            color: palette.ink,
            fontFamily: "var(--font-premium)",
            fontStyle: "italic",
            wordBreak: "keep-all",
          }}
        >
          “{oneLine.slice(0, 90)}”
        </p>
        {temperature && (
          <p style={{ margin: "28px 0 0", fontSize: 26, lineHeight: 1.6, color: palette.muted, wordBreak: "keep-all" }}>
            {temperature.slice(0, 56)}
          </p>
        )}
        {keywords.length > 0 && (
          <div style={{ margin: "44px 0 0", display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
            {keywords.slice(0, 3).map((keyword) => (
              <span
                key={keyword}
                style={{
                  border: `2px solid ${palette.accent}`,
                  borderRadius: 999,
                  padding: "12px 26px",
                  fontSize: 24,
                  fontWeight: 800,
                  color: palette.accent,
                }}
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
        <p style={{ margin: "52px 0 0", fontSize: 22, color: palette.muted }}>
          {generatedAt} · code-destiny.com
        </p>
      </div>
    </div>
  );
});

export default LoveSecretShareCard;
