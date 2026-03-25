import "./insights-hub.css";

/**
 * 인사이트 목록·글 상세(.ins-*) 스타일은 globals.css가 아닌 이 파일에만 둡니다.
 * /insights 레이아웃에서 import해 dev/프로덕션 모두에서 `app/insights/layout.css` 청크로 확실히 로드됩니다.
 */
export default function InsightsLayout({ children }) {
  const FONT_URL =
    "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap";
  return (
    <>
      {/* preload: 렌더 블로킹 없이 폰트 CSS를 미리 fetch */}
      <link rel="preload" as="style" href={FONT_URL} />
      {/* 실제 적용 — display=swap 포함으로 font-display:swap 자동 적용 */}
      <link rel="stylesheet" href={FONT_URL} />
      {children}
    </>
  );
}
