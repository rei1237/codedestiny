import CrystalSoulTarotClient from "./CrystalSoulTarotClient";

export const metadata = {
  title: "크리스탈 소울 타로 | Code Destiny",
  description:
    "7가지 원석 에너지와 함께하는 크리스탈 소울 타로. 재물·연애·재회·이동수·진로·건강·대인관계를 원석 배치와 함께 AI 타로 마스터가 깊이 있게 리딩해 드립니다.",
  openGraph: {
    title: "크리스탈 소울 타로 | Code Destiny",
    description:
      "원석을 선택하고 카드를 배열해 AI 타로 마스터의 신비로운 리딩을 경험하세요.",
    images: [{ url: "https://code-destiny.com/fuctionassets/stonetaro.webp" }],
  },
};

export default function CrystalSoulTarotPage() {
  return <CrystalSoulTarotClient />;
}
