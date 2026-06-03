import LoveSimulationClient from "./LoveSimulationClient";

export const metadata = {
  title: "LOVE CODE - 사주 연애 시뮬레이션 | Code Destiny",
  description:
    "상대방의 생년월일로 사주를 분석해 페르소나 캐릭터를 만들고, 다양한 데이트 코스와 선택지를 통해 상대방의 취향·성격을 미리 경험해보는 연애 시뮬레이션.",
  keywords: [
    "연애 시뮬레이션",
    "사주 연애",
    "상대방 사주 분석",
    "데이트 시뮬레이션",
    "love simulation",
    "saju love",
    "사주 궁합 게임",
  ],
  alternates: {
    canonical: "https://code-destiny.com/saju/love-simulation",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/saju/love-simulation",
    title: "LOVE CODE - 사주 연애 시뮬레이션",
    description: "상대방의 생년월일로 사주 분석 후 연애 시뮬레이션을 체험하세요.",
    images: [
      {
        url: "https://code-destiny.com/fuctionassets/love%20code.webp",
        width: 1200,
        height: 630,
        alt: "LOVE CODE 사주 연애 시뮬레이션",
      },
    ],
  },
};

export default function LoveSimulationPage() {
  return (
    <main style={{ background: "#070a16", color: "#e2e8f0" }}>
      <LoveSimulationClient />
    </main>
  );
}
