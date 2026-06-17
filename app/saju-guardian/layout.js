import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";

export const metadata = withUniqueRouteMetadata("/saju-guardian", {
  title: "Saju Guardian — 사주 가디언 소환진 | 꿀꿀 만세력",
  description:
    "생년월일 사주 정보를 바탕으로 일주·월지·시지의 수호 인장을 열고 7일 실행 의식을 전합니다.",
  alternates: {
    canonical: "https://code-destiny.com/saju-guardian",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/saju-guardian",
    title: "Saju Guardian — 사주 가디언 소환진",
    description:
      "일주·월지·시지의 기운으로 지금 필요한 수호 인장과 7일 의식이 열립니다.",
    siteName: "Code Destiny — 꿀꿀 만세력",
    locale: "ko_KR",
    images: [
      {
        url: "https://code-destiny.com/fuctionassets/saju-guardian-animal-v20260615.png",
        width: 1200,
        height: 630,
        alt: "Saju Guardian 사주 가디언 소환진",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Saju Guardian — 사주 가디언 소환진",
    description: "생년월일 사주 기운으로 수호 인장과 7일 의식이 열립니다.",
    images: ["https://code-destiny.com/fuctionassets/saju-guardian-animal-v20260615.png"],
  },
  keywords: [
    "사주 가디언",
    "Saju Guardian",
    "수호 인장",
    "60갑자",
    "일주 가디언",
    "오행 인장",
    "사주 소환진",
    "꿀꿀 만세력",
  ],
});

export default function SajuGuardianLayout({ children }) {
  return children;
}
