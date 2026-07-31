import MuhurtaClient from "./MuhurtaClient";

// 회당 결제 후에만 결과가 열리는 화면이라 sitemap·색인 대상이 아니다(형제 /nakshatra/compat 과 동일).
export const metadata = {
  title: "택일 · 무후르타 | 나크샤트라 결정판",
  description: "인도 무후르타와 동양 숙요 격각이 함께 좋게 보는 날을 목적별로 찾아 주는 택일 리포트.",
  robots: { index: false, follow: true },
};

export default function NakshatraMuhurtaPage() {
  return <MuhurtaClient />;
}
