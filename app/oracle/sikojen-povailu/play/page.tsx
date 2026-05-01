import { redirect } from "next/navigation";
import { generatePageMetadata } from "../../../../lib/generate-page-metadata";

const META = {
  path: "/oracle/sikojen-povailu/play",
  title: "핀란드 주석점 Sikojen Povailu — 납점 오라클 | 꿀꿀 만세력",
  description:
    "핀란드 전통 주석점(납점) 의식을 무료로 체험하세요. 납이 물에서 굳는 형태로 미래를 읽는 5단계 인터랙티브 오라클 — Shadow Reading까지 완전 무료.",
  keywords: [
    "핀란드 주석점",
    "Sikojen Povailu",
    "납점",
    "핀란드 신탁",
    "오라클",
    "tin casting oracle",
  ],
  image: "https://code-destiny.com/fortune/sikojen-povailu/images/piggyfortune.webp",
  featureList: ["5단계 인터랙티브 의식", "납 형태 상징 해석", "그림자 의미(Shadow Reading) 제공"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function SikojenpovailuPlayPage() {
  redirect("/static?service=pig-oracle&source=oracle-sikojen-play");
}
