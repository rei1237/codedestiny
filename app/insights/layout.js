import "./insights-hub.css";

/**
 * 인사이트 목록·글 상세(.ins-*) 스타일은 globals.css가 아닌 이 파일에만 둡니다.
 * /insights 레이아웃에서 import해 dev/프로덕션 모두에서 `app/insights/layout.css` 청크로 확실히 로드됩니다.
 */
export default function InsightsLayout({ children }) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=IM+Fell+English:ital@0;1&family=Noto+Sans+KR:wght@400;500;700;800&family=Noto+Serif+KR:wght@400;500;600;700;800&display=swap"
      />
      {children}
    </>
  );
}
