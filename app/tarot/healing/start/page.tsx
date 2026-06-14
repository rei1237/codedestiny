import { redirect } from "next/navigation";
import { generatePageMetadata } from "../../../../lib/generate-page-metadata";

const META = {
  path: "/tarot/healing",
  title: "무료 힐링 타로 4카드 — 오늘의 회복 에너지 리딩",
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

export default function SunHealingTarotAppPage() {
  redirect("/tarot/healing");
}
