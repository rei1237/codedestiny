import type { Metadata } from "next";
import type { ReactNode } from "react";

const TAROT_PROMPT_MAKER_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "타로 프롬프트 메이커 | Code Destiny",
    description: "질문과 카드 흐름을 바탕으로 타로와 레노먼드 리딩 프롬프트를 정리하는 도구입니다. 상징 해석은 참고용으로 살피고, 의료·법률·투자 판단은 전문가 조언과 함께 확인하세요.",
    ogDescription: "질문, 스프레드, 카드 흐름을 상담형 프롬프트로 정리해 타로 해석의 방향을 차분히 잡습니다.",
    keywords: ["타로 프롬프트", "AI 타로", "레노먼드", "타로 스프레드", "타로 질문"],
  },
  en: {
    title: "Tarot Prompt Maker | Code Destiny",
    description: "A tool for arranging tarot and Lenormand reading prompts from your question and card flow. Treat symbolic readings as reference only and consult professionals for medical, legal, or investment decisions.",
    ogDescription: "Turn questions, spreads, and card flow into a consultation-style prompt that gently frames the direction of a tarot reading.",
    keywords: ["tarot prompt", "AI tarot", "Lenormand", "tarot spread", "tarot question"],
  },
  ja: {
    title: "タロットプロンプトメーカー | Code Destiny",
    description: "質問とカードの流れをもとに、タロットとルノルマンのリーディングプロンプトを整えるツールです。象徴解釈は参考として扱い、医療・法律・投資判断は専門家の助言と併せて確認してください。",
    ogDescription: "質問、スプレッド、カードの流れを相談型プロンプトに整え、タロット解釈の方向を落ち着いて定めます。",
    keywords: ["タロットプロンプト", "AIタロット", "ルノルマン", "タロットスプレッド", "タロット質問"],
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
