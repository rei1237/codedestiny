import CrystalSoulTarotClient from "./CrystalSoulTarotClient";

export const metadata = {
  title: "크리스탈 소울 타로 | Code Destiny",
  description:
    "신비로운 원석 에너지와 함께 감정과 운명의 결을 읽는 프리미엄 힐링 타로. 밤하늘 같은 몰입형 공간에서 따뜻한 상담 흐름을 만나보세요.",
  openGraph: {
    title: "크리스탈 소울 타로 | Code Destiny",
    description:
      "원석을 선택하고 카드의 빛을 깨워 감정과 운명의 흐름을 읽는 몰입형 크리스탈 타로 상담을 경험하세요.",
    images: [{ url: "https://code-destiny.com/fuctionassets/stonetaro.webp" }],
  },
};

export default function CrystalSoulTarotPage() {
  return <CrystalSoulTarotClient />;
}
