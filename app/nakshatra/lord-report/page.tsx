import LordReportClient from "./LordReportClient";

// 결제 후에만 본문이 열리는 화면이라 sitemap·색인 대상이 아니다(형제 /nakshatra/compat 과 동일).
// 제목만 지정해 탭·공유 링크에서 사이트 기본 제목으로 뭉뚱그려지지 않게 한다.
export const metadata = {
  title: "지배성 심화 리포트 | 나크샤트라 결정판",
  description: "나크샤트라를 다스리는 지배성과 파다·나바암샤가 만드는 성격·재능·그림자를 한 편으로 엮은 심화 리포트.",
  robots: { index: false, follow: true },
};

export default function NakshatraLordReportPage() {
  return <LordReportClient />;
}
