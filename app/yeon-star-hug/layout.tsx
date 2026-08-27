import type { Metadata } from "next";
import type { ReactNode } from "react";

const YEON_STAR_HUG_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "연이 별빛 상담 | Code Destiny",
    description: "감정과 별자리, 고민 문장으로 오늘의 마음 흐름과 작은 실천 방향을 살피는 상담형 콘텐츠입니다. 결과는 엔터테인먼트와 자기 성찰을 위한 참고 자료입니다.",
    ogDescription: "오늘의 감정과 고민을 별자리 흐름에 비추어 읽고, 지금 해볼 수 있는 작은 행동을 정리합니다.",
    keywords: ["감정 상담", "별자리 상담", "오늘의 조언", "연애 고민", "마음 리딩"],
  },
  en: {
    title: "Yeon’s Starlight Counsel | Code Destiny",
    description: "A consultation-style experience that reads today’s emotional flow and small practical direction from your mood, zodiac sign, and concern. Please treat the result as entertainment and self-reflection.",
    ogDescription: "Read today’s feelings and concerns through the flow of the stars, then gather one small action you can try now.",
    keywords: ["emotional counsel", "zodiac counsel", "today advice", "love concern", "heart reading"],
  },
  ja: {
    title: "ヨンの星明かり相談 | Code Destiny",
    description: "感情、星座、悩みの文章をもとに、今日の心の流れと小さな実践方向を読む相談型コンテンツです。結果はエンターテインメントと自己省察の参考としてお読みください。",
    ogDescription: "今日の感情と悩みを星座の流れに照らして読み、今できる小さな行動を整えます。",
    keywords: ["感情相談", "星座相談", "今日の助言", "恋愛の悩み", "心のリーディング"],
  },
} as const;

const yeonStarHugLayoutCopy = YEON_STAR_HUG_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: yeonStarHugLayoutCopy.title,
  description: yeonStarHugLayoutCopy.description,
  keywords: [...yeonStarHugLayoutCopy.keywords],
  alternates: {
    canonical: "/yeon-star-hug",
  },
  openGraph: {
    title: yeonStarHugLayoutCopy.title,
    description: yeonStarHugLayoutCopy.ogDescription,
    url: "/yeon-star-hug",
    type: "website",
    // og:image 가 없어 공유 카드가 비어 있었다(2026-08-27 dist/ 전수 실측).
    // 사이트 기본 OG 이미지(lib/seo/siteSeo.ts 의 defaultOgImage)와 같은 자산을 쓴다.
    images: [
      {
        url: "https://code-destiny.com/og/code-destiny-og-vvip.png?v=d50dc254ba",
        width: 1200,
        height: 630,
        alt: yeonStarHugLayoutCopy.title,
      },
    ],
  },
};

export default function YeonStarHugLayout({ children }: { children: ReactNode }) {
  return children;
}
