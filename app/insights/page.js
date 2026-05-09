import InsightsCosmicClient from "./InsightsCosmicClient";

export const metadata = {
  title: "운세 인사이트 | Code Destiny",
  description:
    "사주, 자미두수, 숙요점, 타로, 점성술을 실제 생활 전략으로 번역한 장문 인사이트 아카이브입니다.",
  alternates: {
    canonical: "/insights",
  },
  openGraph: {
    type: "website",
    title: "운세 인사이트 | Code Destiny",
    description:
      "사주, 자미두수, 숙요점, 타로, 점성술을 실제 생활 전략으로 번역한 장문 인사이트 아카이브입니다.",
    url: "https://code-destiny.com/insights",
  },
  twitter: {
    card: "summary_large_image",
    title: "운세 인사이트 | Code Destiny",
    description:
      "사주, 자미두수, 숙요점, 타로, 점성술을 실제 생활 전략으로 번역한 장문 인사이트 아카이브입니다.",
  },
};

export default function InsightsPage() {
  return <InsightsCosmicClient />;
}
