import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/tarot/healing",
  title: "무료 힐링 타로 4카드 — 오늘의 회복 에너지 리딩 | Code Destiny",
  description:
    "지금 바로 무료 힐링 타로 4카드 리딩. 마음이 지쳤을 때, 쉬고 싶을 때 — 과거의 상처·현재 에너지·회복 방향·오늘의 선물을 카드 한 장씩 확인하세요. 완전 무료.",
  keywords: ["힐링 타로", "4카드 타로", "Sun and Light", "회복 타로", "무료 타로", "타로 리딩", "healing tarot spread"],
  image: "https://code-destiny.com/fuctionassets/healing.webp",
  featureList: ["4카드 힐링 스프레드", "오늘의 회복 에너지 리딩", "과거·현재·방향·선물 카드 해석"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const HEALING_SERVICE = {
  h1: "따뜻한 태양 회복 타로",
  title: "따뜻한 태양 회복 타로 - 4카드 힐링 스프레드",
  description:
    "햇살 같은 손길에 마음을 어루만지고 다시 일어설 힘을 찾아가는 4카드 타로 리딩. 무료 힐링 타로로 오늘의 회복 에너지를 확인하세요.",
  landingPoints: ["4카드 힐링 스프레드", "오늘의 회복 에너지 리딩", "과거·현재·방향·선물 카드 해석"],
};

export default function SunHealingTarotPage() {
  return <FeatureLandingPage service={HEALING_SERVICE} />;
}
