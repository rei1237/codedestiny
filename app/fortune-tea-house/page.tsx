import type { Metadata } from "next";
import FortuneTeaHouseClient from "./FortuneTeaHouseClient";
import { fortuneTeaHouseAssets } from "@/src/features/fortune-tea-house/data/assets";

export const metadata: Metadata = {
  title: "운명의 찻집 | Code Destiny",
  description:
    "달빛이 머무는 숨겨진 찻집에서 꽃돼지 연이를 만나고, 연이가 당신의 이야기를 조용히 맞이하는 감성형 운명의 찻집입니다.",
  alternates: {
    canonical: "https://code-destiny.com/fortune-tea-house",
  },
  openGraph: {
    title: "운명의 찻집 | Code Destiny",
    description: "보라빛 밤의 찻집에서 꽃돼지 연이가 손님을 맞이하고, 연이가 오래 말하지 못한 마음을 한 잔의 온기로 조용히 비춥니다.",
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
  return <FortuneTeaHouseClient />;
}
