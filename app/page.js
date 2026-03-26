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
    <main className="min-h-[40vh] bg-slate-950 px-4 py-10 text-center text-slate-300">
      <p className="text-sm">
        메인은{" "}
        <a href="/" className="text-amber-300 underline">
          /
        </a>
        (레거시)입니다. 주소창이 <code className="text-slate-400">/</code>가 아니면 홈으로 이동해 주세요.
      </p>
    </main>
  );
}

