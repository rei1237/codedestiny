import type { Metadata } from "next";
import AnimalDestinyPage from "./components/AnimalDestinyPage";

export const metadata: Metadata = {
  title: "사주 가디언 아트 | 내 사주 수호동물 테스트 | Code Destiny",
  description: "사주 오행, 일간, 월지, 십성 흐름으로 나를 지켜주는 수호동물과 운명 방어 타입을 확인하는 사주 가디언 테스트입니다.",
};

export default function Page() {
  return <AnimalDestinyPage />;
}
