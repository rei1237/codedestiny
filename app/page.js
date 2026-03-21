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
    "@type": "WebSite",
    name: "연이의 꿀꿀 만세력",
    alternateName: [
      "Code Destiny",
      "Yeonyi Fortune Platform",
      "無料占い 연이",
      "免费算命 연이",
    ],
    url: "https://code-destiny.com",
    description: "무료 사주 타로 운세 플랫폼. AI 타로, 자미두수, 점성술, 주역 등 20가지 이상의 운세 서비스.",
    inLanguage: ["ko", "en", "ja", "zh-CN", "hi", "es", "fr", "de", "nl", "ms"],
    potentialAction: {
      "@type": "SearchAction",
      target: "https://code-destiny.com/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "연이의 꿀꿀 만세력",
      logo: {
        "@type": "ImageObject",
        url: "https://code-destiny.com/icons/honeypig.webp",
      },
    },
  });

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: homeSeoJsonLd }} />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
        }}
      >
        <h1>연이의 꿀꿀 만세력 — 무료 사주 타로 운세 궁합 점성술 자미두수 플랫폼</h1>
        <h2>무료 타로 리딩 서비스</h2>
        <p>
          AI 명리학 타로, 우리는 무슨 사이, 따뜻한 태양 회복 타로,
          자존감 레벨업, 재회운 타로, 십이지신 천운, 애니멀 토템 카드 리딩
        </p>
        <h2>신탁 & 점술 서비스</h2>
        <p>
          고대 이집트 케멧 오라클, 주역 64괘 거북점, 숙요점 27수 별자리,
          화투점 12달 운세
        </p>
        <h2>코즈믹 & 별자리 분석</h2>
        <p>
          서양 점성술 코즈믹 차트, 자미두수 12궁 명반, 베다 점성술 Jyotish
        </p>
        <h2>동물 관상 & 궁합</h2>
        <p>
          AI 동물 관상 셀카 분석, MBTI 동물 궁합 16가지 퍼스널리티
        </p>
        <h2>운명의 꽃 & 해몽</h2>
        <p>
          사주 오행 운명의 꽃, 드림 타로 AI 꿈 해석, 프로이트 정신분석 해몽
        </p>
      </div>
      <LocaleShellPage />
    </main>
  );
}
