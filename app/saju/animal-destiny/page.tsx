import type { Metadata } from "next";
import AnimalDestinyPage from "./components/AnimalDestinyPage";

const ANIMAL_DESTINY_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "운명의 동물 도감 | 십이운성 동물점 | Code Destiny",
    description: "태어난 사주의 십이운성 흐름으로 나만의 운명 동물을 찾는 동물 운명록. 핵심 성향, 관계, 일과 재물 감각, 성장 미션까지 한눈에 확인하세요.",
  },
  en: {
    title: "Destiny Animal Codex | Twelve Growth Animal Reading | Code Destiny",
    description: "Find your destiny animal through the Twelve Growth flow of your saju chart, with core traits, relationships, work and wealth senses, and growth missions at a glance.",
  },
  ja: {
    title: "運命の動物図鑑 | 十二運星動物占い | Code Destiny",
    description: "生まれた四柱の十二運星の流れから自分だけの運命動物を見つけ、核心性向、関係、仕事と財の感覚、成長ミッションまで一目で確認できます。",
  },
} as const;

const animalDestinyPageCopy = ANIMAL_DESTINY_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: animalDestinyPageCopy.title,
  description: animalDestinyPageCopy.description,
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
