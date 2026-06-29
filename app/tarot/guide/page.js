import TarotGuideRouteClient from "./TarotGuideRouteClient";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const TAROT_GUIDE_METADATA_COPY = {
  ko: {
    title: "타로 카드 리딩 입문 | Code Destiny",
    description:
      "타로 리딩의 기본 구조, 좋은 질문을 세우는 법, 카드 배열과 해석 흐름, 리딩을 안전하게 받아들이는 기준을 안내합니다.",
    keywords: ["타로 가이드", "타로 리딩", "타로 카드", "카드 배열", "Code Destiny"],
  },
  en: {
    title: "Beginner's Guide to Tarot Reading | Code Destiny",
    description:
      "Learn the basic structure of tarot reading, how to shape a question, card spreads, interpretation flow, and the difference between free and paid readings.",
    keywords: ["tarot guide", "tarot reading", "tarot cards", "card spread", "Code Destiny"],
  },
  ja: {
    title: "タロットカードリーディング入門 | Code Destiny",
    description:
      "タロットリーディングの基本構造、質問の立て方、カードスプレッド、解釈の流れ、無料・有料リーディングの違いと注意点を案内します。",
    keywords: ["タロットガイド", "タロットリーディング", "タロットカード", "カードスプレッド", "Code Destiny"],
  },
  zh: {
    title: "塔罗牌解读入门 | Code Destiny",
    description:
      "了解塔罗解读的基本结构、提问方式、牌阵与解读流程，以及免费和付费解读的差异与注意事项。",
    keywords: ["塔罗指南", "塔罗解读", "塔罗牌", "牌阵", "Code Destiny"],
  },
};

export function generateMetadata() {
  const copy = TAROT_GUIDE_METADATA_COPY.ko;
  return generatePageMetadata({
    path: "/tarot/guide",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });
}

export default function TarotGuidePage() {
  return <TarotGuideRouteClient />;
}
