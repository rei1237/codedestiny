import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";

export const metadata = withUniqueRouteMetadata("/saju-picture", {
  title: "사주로 보는 나는 무슨 동물? — AI 파스텔 동물 캐릭터 생성 | 꿀꿀 만세력",
  description:
    "생년월일 사주 오행을 분석해 AI가 나만의 파스텔 동물 캐릭터를 그려드려요. 목·화·토·금·수 오행에 따라 토끼, 호랑이, 말, 용 등 나를 닮은 동물을 만나보세요.",
  alternates: {
    canonical: "https://code-destiny.com/saju-picture",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/saju-picture",
    title: "사주로 보는 나는 무슨 동물? — AI 파스텔 동물 캐릭터",
    description:
      "생년월일 사주 오행 분석으로 AI가 나만의 파스텔 동물 이미지를 생성해 드려요. 토끼·호랑이·말·용 중 내 동물은?",
    siteName: "Code Destiny — 꿀꿀 만세력",
    locale: "ko_KR",
    images: [
      {
        url: "https://code-destiny.com/fuctionassets/Who%20am%20I%20with%20saju.webp",
        width: 1200,
        height: 630,
        alt: "사주로 보는 나는 무슨 동물?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "사주로 보는 나는 무슨 동물? — AI 파스텔 동물 캐릭터",
    description: "생년월일 사주 오행 분석으로 AI가 나만의 파스텔 동물 이미지를 생성해 드려요.",
    images: ["https://code-destiny.com/fuctionassets/Who%20am%20I%20with%20saju.webp"],
  },
  keywords: [
    "사주 동물",
    "사주 오행 동물",
    "나는 무슨 동물",
    "사주 캐릭터",
    "AI 동물 이미지",
    "파스텔 동물 캐릭터",
    "토끼 사주",
    "오행 동물",
    "사주 분석 동물",
    "꿀꿀 만세력",
  ],
});

export default function SajuPictureLayout({ children }) {
  return children;
}
