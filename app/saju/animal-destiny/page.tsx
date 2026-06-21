import type { Metadata } from "next";
import AnimalDestinyPage from "./components/AnimalDestinyPage";

export const metadata: Metadata = {
  title: "운명의 동물 도감 | 십이운성 동물점 | Code Destiny",
  description: "태어난 사주의 십이운성 흐름으로 나만의 운명 동물을 찾는 동물 운명록. 핵심 성향, 관계, 일과 재물 감각, 성장 미션까지 한눈에 확인하세요.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function Page() {
  return <AnimalDestinyPage />;
}
