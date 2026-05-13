import Link from "next/link";
import { INSIGHT_SEED_ARTICLES } from "./insights/seed-articles";
import { createI18nMetadata } from "../lib/seo/createI18nMetadata";
import { getAlternatesByRouteKey } from "../lib/i18n/routes";
import { buildOrganizationJsonLd, buildWebPageJsonLd, buildWebsiteJsonLd } from "../lib/structured-data";
import styles from "./home-cosmic.module.css";

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
  { href: "/saju/basic", label: "무료 사주풀이 보기" },
  { href: "/daily-fortune", label: "오늘의 운세 확인하기" },
  { href: "/manse", label: "꿀꿀 만세력 확인하기" },
  { href: "/compatibility", label: "사주 궁합 분석하기" },
  { href: "/tarot/mingri", label: "AI 타로 리딩 시작하기" },
  { href: "/ziwei/chart", label: "자미두수 명반 보기" },
  { href: "/oracle/sukuyo", label: "숙요점 궁합 바로 보기" },
  { href: "/astrology/cosmic", label: "점성술 차트 보기" },
  { href: "/vedic/jyotish", label: "베다점성술 라그나 보기" },
  { href: "/dream", label: "무료 꿈해몽 보기" },
  { href: "/animal/physio", label: "동물관상 분석하기" },
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
    <main className={styles.pageWrap}>
      <div className={styles.pageGlow} aria-hidden />

      <header className={`${styles.panel} ${styles.heroPanel}`}>
        <span className={styles.heroKicker}>COSMIC SERVICE HUB</span>
        <h1 className={styles.heroTitle}>
          무료 사주팔자 · 오늘의 운세 · 꿀꿀 만세력 | 코드 데스티니
        </h1>
        <p className={styles.heroLead}>
          Code Destiny는 사주·타로·자미두수·점성술·숙요점·베다점을 한곳에서 해석하는 무료 운세 플랫폼입니다.
          검색 사용자가 바로 이해하고 1클릭으로 기능을 시작할 수 있도록 서비스 허브와 인사이트 허브를 연결했습니다.
        </p>
        <div className={styles.badgeRow}>
          <span className={styles.badge}>One-click Launch</span>
          <span className={styles.badge}>Star-linked Insights</span>
          <span className={styles.badge}>Cosmic Navigation</span>
        </div>
      </header>

      <section className={`${styles.panel} ${styles.sectionPanel}`}>
        <h2 className={styles.sectionTitle}>핵심 서비스 링크 허브</h2>
        <p className={styles.sectionLead}>오늘 바로 시작할 수 있는 핵심 운세 기능을 우주 항로처럼 빠르게 이동하세요.</p>
        <div className={styles.serviceGrid}>
          {SERVICE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.serviceLink}>
              <span className={styles.serviceText}>{link.label}</span>
              <span className={styles.serviceArrow} aria-hidden>
                ↗
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${styles.panel} ${styles.sectionPanel}`}>
        <h2 className={styles.sectionTitle}>운세 인사이트 최신 글</h2>
        <p className={styles.sectionLead}>해석 팁, 심층 가이드, 관계/커리어 운세 인사이트를 별자리 카드처럼 확인하세요.</p>
        <div className={styles.insightGrid}>
          {latestInsights.map((item) => (
            <Link key={item.slug} href={`/insights/${item.slug}`} className={styles.insightCard}>
              <p className={styles.insightCategory}>{item.category}</p>
              <h3 className={styles.insightTitle}>{item.title}</h3>
              <p className={styles.insightExcerpt}>{item.excerpt}</p>
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
