import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import TarotHealingLandingContent from "./TarotHealingLandingContent";

const META = {
  path: "/tarot/healing",
  title: "무료 힐링 타로 4카드 — 오늘의 회복 에너지 리딩",
  description:
    "힐링 타로 4카드는 지친 마음을 차분히 바라보고 회복 방향을 정리하는 무료 타로 리딩입니다. 과거의 상처, 현재 에너지, 회복 방향, 오늘의 선물을 카드 흐름으로 확인하세요.",
  keywords: ["힐링 타로", "4카드 타로", "Sun and Light", "회복 타로", "무료 타로", "타로 리딩", "healing tarot spread"],
  image: "https://code-destiny.com/fuctionassets/healing.webp",
  featureList: ["4카드 힐링 스프레드", "오늘의 회복 에너지 리딩", "과거·현재·방향·선물 카드 해석"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function SunHealingTarotPage() {
  return <TarotHealingLandingContent />;
}
