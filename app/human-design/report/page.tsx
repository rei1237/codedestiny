import HumanDesignReportClient from "./HumanDesignReportClient";

// 회당 결제 후에만 본문이 열리는 화면이라 sitemap·색인 대상이 아니다(형제 계약: /human-design).
//
// 🔴 아래 title·description 은 **검색 유입용이 아니다** — noindex 라 검색 결과에 뜨지 않고,
//    실제 쓰임은 브라우저 탭 제목과 공유 카드다. 이 라우트를 sitemap 에 넣지 말 것: 넣으면
//    AdSense 렌더 텍스트 게이트 대상이 되는데, 결제 전 화면에는 본문이 없어 배포가 막힌다.
export const metadata = {
  title: "휴먼 디자인 프리미엄 리포트 | Code Destiny",
  description: "내 바디그래프 계산 결과만 근거로 쓰는 개인 분석 리포트입니다. 18장 구성으로 웹에서 읽고 PDF 로 내려받으세요.",
  robots: { index: false, follow: true },
};

export default function HumanDesignReportPage() {
  return <HumanDesignReportClient />;
}
