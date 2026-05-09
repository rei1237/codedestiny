import Link from "next/link";
import { INSIGHT_SEED_ARTICLES } from "./insights/seed-articles";
import { createI18nMetadata } from "../lib/seo/createI18nMetadata";
import { getAlternatesByRouteKey } from "../lib/i18n/routes";
import { buildOrganizationJsonLd, buildWebPageJsonLd, buildWebsiteJsonLd } from "../lib/structured-data";

export const metadata = createI18nMetadata({
  locale: "ko",
  routeByLocale: getAlternatesByRouteKey("home"),
  title: "무료 사주팔자 · 오늘의 운세 · 꿀꿀 만세력 | 코드 데스티니",
  description:
    "Code Destiny(코드 데스티니)는 사주풀이, 오늘의 운세, 만세력, 궁합, 타로, 자미두수, 점성술을 한곳에서 볼 수 있는 무료 운세 플랫폼입니다.",
  keywords: [
    "Code Destiny",
    "코드 데스티니",
    "꿀꿀 만세력",
    "꿀꿀 운세",
    "꿀꿀 사주",
    "사주",
    "운세",
    "사주풀이",
    "오늘의 운세",
    "자미두수",
    "숙요점",
  ],
});

const SERVICE_LINKS = [
  { href: "/saju", label: "무료 사주풀이 보기" },
  { href: "/daily-fortune", label: "오늘의 운세 확인하기" },
  { href: "/manse", label: "꿀꿀 만세력 확인하기" },
  { href: "/compatibility", label: "사주 궁합 분석하기" },
  { href: "/tarot", label: "AI 타로 리딩 시작하기" },
  { href: "/ziwei", label: "자미두수 명반 보기" },
  { href: "/sukuyo", label: "숙요점 궁합 바로 보기" },
  { href: "/astrology", label: "점성술 차트 보기" },
  { href: "/vedic", label: "베다점성술 라그나 보기" },
  { href: "/dream", label: "무료 꿈해몽 보기" },
  { href: "/physiognomy", label: "동물관상 분석하기" },
  { href: "/premium", label: "프리미엄 운세 리포트 보기" },
];

export default function HomePage() {
  const latestInsights = INSIGHT_SEED_ARTICLES.slice(0, 12);
  const orgJsonLd = buildOrganizationJsonLd();
  const websiteJsonLd = buildWebsiteJsonLd();
  const webPageJsonLd = buildWebPageJsonLd({
    title: "무료 사주팔자 · 오늘의 운세 · 꿀꿀 만세력 | 코드 데스티니",
    description:
      "Code Destiny(코드 데스티니)는 사주풀이, 오늘의 운세, 만세력, 궁합, 타로, 자미두수, 점성술을 한곳에서 볼 수 있는 무료 운세 플랫폼입니다.",
    path: "/",
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <header className="rounded-3xl border border-white/10 bg-[#0f1324] px-5 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-semibold leading-tight text-amber-50 md:text-4xl">
          무료 사주팔자 · 오늘의 운세 · 꿀꿀 만세력 | 코드 데스티니
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-200 md:text-base">
          Code Destiny는 사주·타로·자미두수·점성술·숙요점·베다점을 한곳에서 해석하는 무료 운세 플랫폼입니다.
          검색 사용자가 바로 이해하고 1클릭으로 기능을 시작할 수 있도록 서비스 허브와 인사이트 허브를 연결했습니다.
        </p>
      </header>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#10182c] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">핵심 서비스 링크 허브</h2>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {SERVICE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm hover:bg-white/10">
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1628] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">운세 인사이트 최신 글</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {latestInsights.map((item) => (
            <Link key={item.slug} href={`/insights/${item.slug}`} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10">
              <p className="text-xs text-slate-400">{item.category}</p>
              <h3 className="mt-1 text-sm font-semibold leading-6 text-slate-100">{item.title}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-300 line-clamp-2">{item.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </main>
  );
}
