import DashaMapClient from "./DashaMapClient";

// 결제 후에만 본문이 열리는 화면이라 sitemap·색인 대상이 아니다(형제 /nakshatra/compat 과 동일).
// 제목만 지정해 탭·공유 링크에서 사이트 기본 제목으로 뭉뚱그려지지 않게 한다.
export const metadata = {
  title: "다샤 인생지도 | 나크샤트라 결정판",
  description: "비쇼타리 120년 마하다샤·안타르다샤 전 구간과 동양 사주 대운을 같은 연도 축에 나란히 놓은 인생 시간표.",
  robots: { index: false, follow: true },
};

export default function NakshatraDashaMapPage() {
  return <DashaMapClient />;
}
