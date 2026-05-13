import DestinyBiasClient from "./DestinyBiasClient";
import MyDestinyBiasShell from "./components/MyDestinyBiasShell";

export const metadata = {
  title: "최애운명 - 사주 기반 덕질 운명 분석 | Code Destiny",
  description:
    "내 사주와 최애의 사주를 비교해 공명 점수, 오행 보완 포인트, 오늘의 최애운명 액션을 카드로 확인하는 팬덤 맞춤 분석 서비스.",
  alternates: {
    canonical: "https://code-destiny.com/saju/destiny-bias",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/saju/destiny-bias",
    title: "최애운명 - 사주 기반 덕질 운명 분석",
    description: "AI는 해석만, 계산은 내부 명식 엔진으로 처리하는 최애운명 카드 분석.",
    images: [
      {
        url: "https://code-destiny.com/api/destiny-bias/og?title=%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85%20%EC%B9%B4%EB%93%9C&score=88&grade=A&relation=%EC%9A%B4%EB%AA%85%20%EA%B3%B5%EB%AA%85&price=50",
        width: 1200,
        height: 630,
        alt: "최애운명 OG 카드",
      },
    ],
  },
};

export default function DestinyBiasPage() {
  return (
    <MyDestinyBiasShell>
      <DestinyBiasClient />
    </MyDestinyBiasShell>
  );
}
