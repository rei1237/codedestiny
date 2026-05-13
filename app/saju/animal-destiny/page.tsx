import type { Metadata } from "next";
import AnimalDestinyPage from "./components/AnimalDestinyPage";

export const metadata: Metadata = {
  title: "십이운성 동물점 | Code Destiny",
  description: "사주 일간·지지 기반 십이운성을 12동물 캐릭터로 보여주는 수집형 동물점 콘텐츠",
};

export default function Page() {
  return <AnimalDestinyPage />;
}
