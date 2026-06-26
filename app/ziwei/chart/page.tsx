import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import ZiweiChartClientLoader from "./ZiweiChartClientLoader";

const ZIWEI_CHART_METADATA_COPY = {
  ko: {
    title: "심화 자미두수 상담 · 12궁·사화·대한 해석",
    description:
      "자미두수(紫微斗數) 명반을 기반으로 12궁·명궁·신궁·사화·대한 흐름을 정밀하게 엮어 내면의 방향과 현실의 선택을 읽는 심화 상담 리포트입니다.",
    keywords: ["자미두수", "자미두수 명반", "심화 자미두수 상담", "12궁", "명궁", "신궁", "사화", "대한", "자미두수 심화", "12궁 심층 분석", "ziwei chart", "zi wei dou shu"],
  },
  en: {
    title: "Advanced Ziwei Dou Shu Consultation · 12 Palaces, Four Transformations, and Major Luck",
    description:
      "An advanced consultation report that weaves the 12 palaces, Ming and Shen palaces, Four Transformations, and major luck flow from a Ziwei Dou Shu chart.",
    keywords: ["Ziwei Dou Shu", "Ziwei chart", "advanced Ziwei consultation", "12 palaces", "Ming palace", "Shen palace", "Four Transformations", "major luck", "advanced Ziwei", "12 palace analysis", "ziwei chart", "zi wei dou shu"],
  },
  ja: {
    title: "深層紫微斗数相談 · 十二宮・四化・大限解釈",
    description:
      "紫微斗数命盤をもとに、十二宮・命宮・身宮・四化・大限の流れを精密に結び、内面の方向と現実の選択を読む深層相談リポートです。",
    keywords: ["紫微斗数", "紫微斗数命盤", "深層紫微斗数相談", "十二宮", "命宮", "身宮", "四化", "大限", "紫微斗数深層", "十二宮深層分析", "ziwei chart", "zi wei dou shu"],
  },
  zh: {
    title: "深度紫微斗数咨询 · 十二宫、四化与大限解读",
    description:
      "基于紫微斗数命盘，精密串联十二宫、命宫、身宫、四化与大限流向，解读内在方向与现实选择的深度咨询报告。",
    keywords: ["紫微斗数", "紫微斗数命盘", "深度紫微斗数咨询", "十二宫", "命宫", "身宫", "四化", "大限", "紫微斗数深度", "十二宫深度分析", "ziwei chart", "zi wei dou shu"],
  },
};

export function generateMetadata() {
  const copy = ZIWEI_CHART_METADATA_COPY.ko;
  return generatePageMetadata({
    path: "/ziwei/chart",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });
}

const ZIWEI_FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "자미두수 명반은 무엇을 보나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "명궁·신궁을 기준으로 12궁에 배치된 주성과 사화, 대한의 흐름을 함께 읽어 성향·관계·진로·재물의 작동 방식을 해석합니다.",
      },
    },
    {
      "@type": "Question",
      name: "사주와 자미두수는 어떻게 다른가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "사주는 오행 균형과 간지 관계를 중심으로 기질을 읽고, 자미두수는 12궁 공간 배치와 시간축 흐름으로 영역별 변화를 읽는 데 강점이 있습니다.",
      },
    },
  ],
});

export default function ZiweiChartPage() {
  return (
    <main className="relative min-h-[100dvh] bg-[#030712] text-slate-100">
      <h1 className="sr-only">
        심화 자미두수 상담으로 보는 내 인생의 12궁
      </h1>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ZIWEI_FAQ_JSON_LD }} />
      <ZiweiChartClientLoader />
    </main>
  );
}
