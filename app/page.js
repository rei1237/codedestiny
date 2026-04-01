/**
 * "/" serves legacy HTML via next.config rewrites (URL stays /). This App Router page is a fallback
 * if the rewrite is bypassed; metadata matches the public canonical.
 */
export const metadata = {
  title: "꿀꿀 만세력 — 무료 사주 타로 운세 궁합 점성술 플랫폼",
  description:
    "무료 사주팔자·AI 타로·자미두수·점성술·숙요점·궁합을 제공하는 운세 플랫폼. 꿀꿀 만세력에서 나만의 운명 지도를 확인하세요.",
  alternates: {
    canonical: "https://code-destiny.com/",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/",
    title: "꿀꿀 만세력 — 무료 사주 타로 운세 궁합 점성술 플랫폼",
    description:
      "무료 사주팔자·AI 타로·자미두수·점성술·숙요점·궁합을 제공하는 운세 플랫폼.",
    siteName: "Code Destiny — 꿀꿀 만세력",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "꿀꿀 만세력 — 무료 사주 타로 운세 궁합 점성술 플랫폼",
    description: "무료 사주·AI 타로·자미두수·점성술·숙요점·궁합 운세 플랫폼",
  },
};

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", textAlign: "center" }}>
      <section>
        <h1 style={{ marginBottom: "8px" }}>꿀꿀 만세력</h1>
        <p>홈 서비스는 정적 엔트리에서 제공됩니다.</p>
      </section>
    </main>
  );
}

