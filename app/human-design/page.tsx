import HumanDesignClient from "./HumanDesignClient";

// 회당 결제 후에만 결과가 열리는 화면이라 sitemap·색인 대상이 아니다
// (형제 계약: /nakshatra/muhurta · /nakshatra/compat).
//
// 🔴 그래서 아래 title·description 은 **검색 유입용이 아니다** — noindex 라 검색 결과에 뜨지
//    않고, 실제 쓰임은 브라우저 탭 제목과 공유 카드다. 검색 의도에 맞춰 문구를 재작성하거나
//    이 라우트를 sitemap 에 넣지 말 것(넣으면 AdSense 렌더 텍스트 게이트 대상이 되는데,
//    결제 전 화면에는 보여 줄 본문이 없어 배포가 막힌다).
export const metadata = {
  title: "휴먼 디자인 · 나를 설계한 에너지 지도 | Code Destiny",
  description: "출생 데이터로 실제 바디그래프를 계산합니다. 88° 태양호로 찾은 디자인 시각, 26개 활성, 64 게이트·36 채널·9 센터를 눌러 탐색하세요.",
  robots: { index: false, follow: true },
};

export default function HumanDesignPage() {
  return <HumanDesignClient />;
}
