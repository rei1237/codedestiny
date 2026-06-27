import type { Metadata } from "next";
import FortuneTeaHousePage from "@/src/features/fortune-tea-house/FortuneTeaHousePage";
import { fortuneTeaHouseAssets } from "@/src/features/fortune-tea-house/data/assets";

export const metadata: Metadata = {
  title: "운명의 찻집 | Code Destiny",
  description:
    "달빛이 머무는 찻집에서 꽃돼지?를 만나고, 인간 연이와 마음의 향을 따라가는 스토리형 운세 상담 입구입니다.",
  alternates: {
    canonical: "https://code-destiny.com/fortune-tea-house",
  },
  openGraph: {
    title: "운명의 찻집 | Code Destiny",
    description: "꽃돼지?의 신비로운 안내와 연이의 따뜻한 찻잔 상담이 시작되는 밤.",
    url: "https://code-destiny.com/fortune-tea-house",
    siteName: "Code Destiny",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: fortuneTeaHouseAssets.pig.transform,
        width: 1200,
        height: 630,
        alt: "운명의 찻집에서 꽃돼지?가 연이로 변신하는 장면",
      },
    ],
  },
};

export default function Page() {
  return <FortuneTeaHousePage />;
}
