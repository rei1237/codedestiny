import type { Metadata } from "next";
import FortuneTeaHousePage from "@/src/features/fortune-tea-house/FortuneTeaHousePage";
import { fortuneTeaHouseAssets } from "@/src/features/fortune-tea-house/data/assets";

export const metadata: Metadata = {
  title: "운명의 찻집 | Code Destiny",
  description:
    "달빛이 머무는 숨겨진 찻집에서 연이가 찻잔과 카드로 마음의 질문을 다정하게 읽어드립니다.",
  alternates: {
    canonical: "https://code-destiny.com/fortune-tea-house",
  },
  openGraph: {
    title: "운명의 찻집 | Code Destiny",
    description: "보라빛 밤의 찻집에서 따뜻한 찻잔과 오라클 카드 상담이 조용히 시작됩니다.",
    url: "https://code-destiny.com/fortune-tea-house",
    siteName: "Code Destiny",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: fortuneTeaHouseAssets.pig.transform,
        width: 1200,
        height: 630,
        alt: "달빛 아래 운명의 찻집에서 연이가 손님을 맞이하는 장면",
      },
    ],
  },
};

export default function Page() {
  return <FortuneTeaHousePage />;
}
