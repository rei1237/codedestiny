/**
 * "/" serves legacy HTML via next.config rewrites (URL stays /). This App Router page is a fallback
 * if the rewrite is bypassed; metadata matches the public canonical.\n */
export const metadata = {
  title: "무료 사주팔자 · 타로 · 오늘의 운세 | 코드 데스티니(Code Destiny) 꿀꿀 만세력",
  description:
    "생년월일로 보는 무료 사주팔자·타로 리딩·오늘의 운세. 자미두수·점성술·숙요점·궁합·신년운세·토정비결·꿈해몽·대운 분석까지. 코드 데스티니(Code Destiny) 꿀꿀 만세력 — 동서양 운세 무료 통합 플랫폼.",
  alternates: {
    canonical: "https://code-destiny.com/",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/",
    title: "무료 사주팔자·타로·오늘의 운세 | 코드 데스티니",
    description:
      "생년월일 하나로 사주팔자·타로·자미두수·점성술·궁합·신년운세를 무료로. 코드 데스티니(Code Destiny) 꿀꿀 만세력.",
    siteName: "코드 데스티니 꿀꿀 만세력",
    locale: "ko_KR",
    images: [
      {
        url: "https://code-destiny.com/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "코드 데스티니 꿀꿀 만세력",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "코드 데스티니 — 무료 사주·타로·운세",
    description: "무료 사주팔자·타로·궁합·신년운세 통합 — 코드 데스티니(Code Destiny)",
    images: ["https://code-destiny.com/icons/og-image.png"],
  },
};

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#05070f" }}>
      <iframe
        src="/static/index.html"
        title="Code Destiny Main Service"
        style={{
          width: "100%",
          height: "100vh",
          border: 0,
          display: "block",
          background: "transparent",
        }}
      />
    </main>
  );
}

