import TarotHealingClient from "./TarotHealingClient";
import FortunePageSEO from "../../components/FortunePageSEO";
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

const FAQS = [
  {
    question: "태양 회복 타로는 어떤 분에게 적합한가요?",
    answer:
      "마음이 지치거나 에너지가 소진됐을 때, 혹은 다시 시작할 힘이 필요할 때 힐링 타로를 이용하면 효과적입니다.",
  },
  {
    question: "4카드 힐링 스프레드는 어떻게 구성되나요?",
    answer:
      "과거의 상처(1), 현재의 에너지(2), 회복의 방향(3), 오늘의 선물(4) 순서로 4장의 카드를 읽습니다.",
  },
  {
    question: "타로 결과는 얼마나 정확한가요?",
    answer:
      "타로는 심리적 자기 탐색 도구입니다. 단정적 예언이 아닌, 지금의 내면 흐름을 읽는 참고 자료로 활용하세요.",
  },
];

export default function SunHealingTarotPage() {
  return (
    <FortunePageSEO {...META} faqs={FAQS} hideHeader>
      <TarotHealingClient />
    </FortunePageSEO>
  );
}
