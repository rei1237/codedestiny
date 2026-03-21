import LocaleShellPage from "./_locale/LocaleShellPage";

export const metadata = {
  title: "연이의 꿀꿀 만세력 — 무료 사주 타로 운세 궁합 점성술 플랫폼",
  description:
    "무료 사주팔자·AI 타로·자미두수·점성술·숙요점·궁합을 제공하는 운세 플랫폼. 연이의 꿀꿀 만세력에서 나만의 운명 지도를 확인하세요.",
  alternates: {
    canonical: "https://code-destiny.com/",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/",
    title: "연이의 꿀꿀 만세력 — 무료 사주 타로 운세 궁합 점성술 플랫폼",
    description:
      "무료 사주팔자·AI 타로·자미두수·점성술·숙요점·궁합을 제공하는 운세 플랫폼.",
    siteName: "Code Destiny — 연이의 꿀꿀 만세력",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "연이의 꿀꿀 만세력 — 무료 사주 타로 운세 궁합 점성술 플랫폼",
    description: "무료 사주·AI 타로·자미두수·점성술·숙요점·궁합 운세 플랫폼",
  },
};

// Do not redirect to /index.html: that path is a single segment and is captured by app/[adminHash],
// which returns JSON 404 ("Not found") when ADMIN_SECRET_HASH does not match.
export default function Home() {
  const homeSeoJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://code-destiny.com/#webpage",
        url: "https://code-destiny.com/",
        name: "연이의 꿀꿀 만세력 — 무료 사주 타로 운세 궁합 점성술 플랫폼",
        description:
          "무료 사주팔자·AI 타로·자미두수·점성술·숙요점·궁합을 제공하는 운세 플랫폼.",
        inLanguage: "ko",
        isPartOf: {
          "@id": "https://code-destiny.com/#website",
        },
      },
      {
        "@type": "ItemList",
        "@id": "https://code-destiny.com/#service-list",
        name: "Code Destiny 주요 운세 서비스",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "무료 사주팔자", url: "https://code-destiny.com/" },
          { "@type": "ListItem", position: 2, name: "AI 타로 리딩", url: "https://code-destiny.com/tarot/healing" },
          { "@type": "ListItem", position: 3, name: "운세 인사이트", url: "https://code-destiny.com/insights" },
        ],
      },
    ],
  });

  return (
    <main>
      <h1 className="visually-hidden">연이의 꿀꿀 만세력 — 무료 사주 타로 운세 궁합 점성술 플랫폼</h1>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: homeSeoJsonLd }} />
      <LocaleShellPage />
    </main>
  );
}
