import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "타로 프롬프트 메이커 | Code Destiny",
  description:
    "질문과 카드 흐름을 바탕으로 타로와 레노먼드 리딩 프롬프트를 정리하는 도구입니다. 상징 해석은 참고용으로 살피고, 의료·법률·투자 판단은 전문가 조언과 함께 확인하세요.",
  keywords: ["타로 프롬프트", "AI 타로", "레노먼드", "타로 스프레드", "타로 질문"],
  alternates: {
    canonical: "/tarot/prompt-maker",
  },
  openGraph: {
    title: "타로 프롬프트 메이커 | Code Destiny",
    description:
      "질문, 스프레드, 카드 흐름을 상담형 프롬프트로 정리해 타로 해석의 방향을 차분히 잡습니다.",
    url: "/tarot/prompt-maker",
    type: "website",
  },
};

export default function TarotPromptMakerLayout({ children }: { children: ReactNode }) {
  return children;
}
