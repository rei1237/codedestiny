import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";

export const metadata = withUniqueRouteMetadata("/saju-picture", {
  title: "사주로 보는 나는 무슨 동물? — 일주 가디언 동물 분석 | 꿀꿀 만세력",
  description:
    "생년월일 사주 정보를 바탕으로 일주 가디언 동물을 분석해 드려요. 60갑자 매칭으로 나를 닮은 동물과 성향 키워드를 확인해 보세요.",
  alternates: {
    canonical: "https://code-destiny.com/saju-picture",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/saju-picture",
    title: "사주로 보는 나는 무슨 동물? — 일주 가디언 동물",
    description:
      "생년월일 사주 분석과 60갑자 매칭으로 내 일주 가디언 동물을 확인해 보세요.",
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
    title: "사주로 보는 나는 무슨 동물? — 일주 가디언 동물",
    description: "생년월일 사주 분석으로 내 일주 가디언 동물을 확인해 보세요.",
    images: ["https://code-destiny.com/fuctionassets/Who%20am%20I%20with%20saju.webp"],
  },
  keywords: [
    "사주 동물",
    "사주 오행 동물",
    "나는 무슨 동물",
    "사주 캐릭터",
    "일주 동물",
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
