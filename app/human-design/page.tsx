import HumanDesignClient from "./HumanDesignClient";

// 개인 입력·차트 도구는 noindex 유지. 무료 차트와 유료 리포트의 공개 안내는
// /human-design/guide/가 담당한다. 도구 자체를 사이트맵에 넣지 않는다.
export const metadata = {
  title: "휴먼 디자인 · 나를 설계한 에너지 지도 | Code Destiny",
  description: "출생 데이터로 실제 바디그래프를 계산합니다. 88° 태양호로 찾은 디자인 시각, 26개 활성, 64 게이트·36 채널·9 센터를 눌러 탐색하세요.",
  robots: { index: false, follow: true },
};

export default function HumanDesignPage() {
  return <HumanDesignClient />;
}
