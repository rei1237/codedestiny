import type { Metadata } from "next";
import type { ReactNode } from "react";

const TAROT_PROMPT_MAKER_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "타로 오라클 상담 | Code Destiny",
    description: "질문과 카드 흐름을 바탕으로 AI가 실제 타로·레노먼드 상담 결과를 작성하는 서비스입니다(회당 5,000원). 상담에 쓰인 프롬프트도 함께 열람할 수 있으며, 의료·법률·투자 판단은 전문가 조언과 함께 확인하세요.",
    ogDescription: "질문, 스프레드, 카드 흐름을 실제 AI 타로 상담으로 완성해 해석의 방향을 차분히 잡습니다.",
    keywords: ["타로 오라클 상담", "AI 타로", "레노먼드", "타로 스프레드", "타로 프롬프트"],
  },
  en: {
    title: "Tarot Oracle Consultation | Code Destiny",
    description: "An AI writes a real tarot or Lenormand consultation from your question and card flow (5,000 KRW per session). The prompt behind the consultation is also available to read. Consult professionals for medical, legal, or investment decisions.",
    ogDescription: "Turn a question, spread, and card flow into a real AI tarot consultation that gently frames the direction of the reading.",
    keywords: ["tarot oracle consultation", "AI tarot", "Lenormand", "tarot spread", "tarot prompt"],
  },
  ja: {
    title: "タロットオラクル相談 | Code Destiny",
    description: "質問とカードの流れをもとに、AIが実際のタロット・ルノルマン相談結果を作成するサービスです(1回5,000ウォン)。相談に使われたプロンプトも確認できます。医療・法律・投資判断は専門家の助言と併せて確認してください。",
    ogDescription: "質問、スプレッド、カードの流れを実際のAIタロット相談に仕上げ、解釈の方向を落ち着いて定めます。",
    keywords: ["タロットオラクル相談", "AIタロット", "ルノルマン", "タロットスプレッド", "タロットプロンプト"],
  },
} as const;

const tarotPromptMakerLayoutCopy = TAROT_PROMPT_MAKER_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: tarotPromptMakerLayoutCopy.title,
  description: tarotPromptMakerLayoutCopy.description,
  keywords: [...tarotPromptMakerLayoutCopy.keywords],
  alternates: {
    canonical: "/tarot/prompt-maker",
  },
  openGraph: {
    title: tarotPromptMakerLayoutCopy.title,
    description: tarotPromptMakerLayoutCopy.ogDescription,
    url: "/tarot/prompt-maker",
    type: "website",
  },
};

export default function TarotPromptMakerLayout({ children }: { children: ReactNode }) {
  return children;
}
