import HwatuLifeCardTest from "../../components/HwatuLifeCardTest";
import FortunePageSEO from "../../components/FortunePageSEO";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/oracle/hwatu-life",
  title: "무료 화투 인생 패 테스트 — 7문항으로 내 인생 패 찾기 | 꿀꿀 만세력",
  description:
    "7문항 선택으로 나를 상징하는 화투 인생 패(삼광·고도리·청단·똥광)를 무료로 찾아보세요. 돈·사랑·위기 상황에서 내 진짜 선택 패턴은? 지금 바로 무료 테스트!",
  keywords: ["화투", "화투 점", "심리테스트", "인생 패", "운세"],
  featureList: ["7문항 심리테스트", "화투 인생 패 아키타입 분석", "운세 결과 공유"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const FAQS = [
  {
    question: "화투 인생 패란 무엇인가요?",
    answer:
      "돈·사랑·위기 상황에서의 선택 패턴을 통해 나를 상징하는 화투 패(삼광·고도리·청단 등) 아키타입을 찾아주는 심리테스트입니다.",
  },
  {
    question: "결과는 어떻게 해석하나요?",
    answer:
      "삼광은 행운과 성공 추구형, 고도리는 관계 지향형, 청단은 원칙과 신뢰형, 똥광은 현실 유머형으로 해석됩니다.",
  },
];

export default function HwatuLifePage() {
  return (
    <FortunePageSEO {...META} faqs={FAQS} hideHeader>
      <HwatuLifeCardTest />
    </FortunePageSEO>
  );
}

