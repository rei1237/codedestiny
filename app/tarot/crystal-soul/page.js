import CrystalSoulTarotClient from "./CrystalSoulTarotClient";

export const metadata = {
  title: "원석 소울 타로",
  description:
    "손끝으로 고른 원석과 다섯 장의 카드가 마음의 결, 관계의 온도, 오늘의 작은 선택을 함께 비추는 크리스탈 오라클 타로.",
  openGraph: {
    title: "원석 소울 타로",
    description:
      "원석을 선택하고 카드의 빛을 깨워 감정의 잔향과 오늘의 선택 방향을 읽는 몰입형 크리스탈 타로.",
    images: [{ url: "https://code-destiny.com/fuctionassets/stonetaro.webp" }],
  },
};

export default function CrystalSoulTarotPage() {
  return <CrystalSoulTarotClient />;
}
