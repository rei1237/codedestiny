import SikojenpovailuApp from "./SikojenpovailuApp";
import FortunePageSEO from "../../components/FortunePageSEO";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/oracle/sikojen-povailu",
  title: "무료 핀란드 주석점 Sikojen Povailu — 납점 오라클 신탁 | 꿀꿀 만세력",
  description:
    "핀란드 전통 주석점(납점) 의식을 무료로 체험하세요. 납이 물에서 굳는 형태로 미래를 읽는 5단계 인터랙티브 오라클 — Shadow Reading까지 완전 무료.",
  keywords: [
    "핀란드 주석점",
    "Sikojen Povailu",
    "납점",
    "핀란드 신탁",
    "오라클",
    "인터랙티브 운세",
    "tin casting oracle",
  ],
  image: "https://code-destiny.com/icons/honeypig.webp",
  featureList: [
    "5단계 인터랙티브 의식",
    "납 형태 상징 해석",
    "그림자 의미(Shadow Reading) 제공",
    "결과 공유 기능",
  ],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const FAQS = [
  {
    question: "Sikojen Povailu(주석점)란 무엇인가요?",
    answer:
      "핀란드의 전통 신년 점 문화로, 납을 녹여 물에 부은 뒤 굳은 형태의 그림자를 보고 미래를 읽는 민속 오라클입니다.",
  },
  {
    question: "Shadow Reading은 무엇인가요?",
    answer:
      "납 형태의 그림자 이미지에서 더 깊은 무의식적 메시지를 읽어내는 추가 해석 단계입니다.",
  },
];

export default function SikojenpovailuPage() {
  return (
    <FortunePageSEO {...META} faqs={FAQS} hideHeader>
      <SikojenpovailuApp />
    </FortunePageSEO>
  );
}

