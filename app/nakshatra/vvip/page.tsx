import VvipClient from "./VvipClient";

// 회당 결제 후에만 본문이 열리는 화면이라 sitemap·색인 대상이 아니다(형제 /nakshatra/compat 과 동일).
export const metadata = {
  title: "결정판 통합서 · VVIP | 나크샤트라 결정판",
  description: "명식 총람 · 세 대가의 해설 · 27수 전체 지형 · 지배성 심화 · 120년 다샤 지도를 한 권으로 묶은 PDF 소장본.",
  robots: { index: false, follow: true },
};

export default function NakshatraVvipPage() {
  return <VvipClient />;
}
