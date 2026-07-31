import Link from "next/link";
import styles from "../home-cosmic.module.css";

const PAGE_URL = "https://code-destiny.com/kkul-kkul-unse";
const OG_IMAGE = "https://code-destiny.com/og/code-destiny-og-vvip-v2.png";

const SEO = {
  title: "꿀꿀 운세 | 무료 사주·타로·궁합 통합 플랫폼 — Code Destiny",
  description:
    "꿀꿀 운세는 꿀꿀 만세력에서 시작해 코드 데스티니로 이어진 무료 운세 플랫폼입니다. 사주팔자, 타로, 궁합, 자미두수, 신년운세를 한곳에서 봅니다.",
  ogTitle: "꿀꿀 운세 | 무료 사주·타로·궁합 — Code Destiny",
  ogDescription:
    "꿀꿀 운세는 생년월일 하나로 사주팔자, 타로, 자미두수, 궁합, 신년운세를 살피는 코드 데스티니 공식 브랜드입니다.",
};

const SERVICES = [
  {
    href: "/manse",
    title: "사주",
    description: "생년월일과 출생시간을 바탕으로 오행, 십성, 대운의 흐름을 살핍니다.",
  },
  {
    href: "/tarot",
    title: "타로",
    description: "카드의 상징으로 마음의 결, 관계의 거리, 선택의 방향을 비춥니다.",
  },
  {
    href: "/compatibility",
    title: "궁합",
    description: "두 사람 사이에 흐르는 기질, 소통 방식, 가까워지는 타이밍을 읽습니다.",
  },
  {
    href: "/ziwei",
    title: "자미두수",
    description: "12궁 명반의 별 흐름으로 성향, 일, 인연의 길을 입체적으로 살핍니다.",
  },
];

const FAQS = [
  {
    question: "꿀꿀 운세가 무엇인가요?",
    answer:
      "꿀꿀 운세는 코드 데스티니(code-destiny.com)의 브랜드명으로, 생년월일 하나로 사주팔자·타로·궁합·신년운세를 무료로 볼 수 있는 서비스입니다.",
  },
  {
    question: "꿀꿀 만세력과 꿀꿀 운세의 차이는?",
    answer:
      "동일한 서비스입니다. 기존 명칭인 '꿀꿀 만세력'에서 '꿀꿀 운세'로 서비스명이 변경되었습니다.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${PAGE_URL}#webpage`,
  url: PAGE_URL,
  name: SEO.title,
  description: SEO.description,
  inLanguage: "ko-KR",
  isPartOf: {
    "@type": "WebSite",
    name: "꿀꿀 운세 — Code Destiny",
    url: "https://code-destiny.com",
  },
};

export const metadata = {
  metadataBase: new URL("https://code-destiny.com"),
  title: { absolute: SEO.title },
  description: SEO.description,
  keywords: ["꿀꿀 운세", "꿀꿀운세", "꿀꿀 만세력", "꿀꿀 사주", "무료 사주", "무료 타로", "궁합"],
  alternates: {
    canonical: PAGE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: PAGE_URL,
    siteName: "Code Destiny",
    title: SEO.ogTitle,
    description: SEO.ogDescription,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SEO.ogTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.ogTitle,
    description: SEO.ogDescription,
    images: [OG_IMAGE],
  },
};

export default function KkulKkulUnsePage() {
  return (
    <main className={styles.pageWrap}>
      <div className={styles.starLayer} aria-hidden />

      <section className={styles.heroSection} aria-labelledby="kkulKkulUnseTitle">
        <div className={styles.heroCopy}>
          <p className={styles.heroKicker}>Code Destiny / 꿀꿀 운세</p>
          <h1 id="kkulKkulUnseTitle" className={styles.heroTitle}>꿀꿀 운세 — 무료 사주·타로·궁합 통합 플랫폼</h1>
          <p className={styles.heroLead}>
            꿀꿀 운세는 &apos;꿀꿀 만세력&apos;으로 시작해 코드 데스티니(Code Destiny)로 성장한 무료 운세 플랫폼입니다.
            사주팔자, 타로, 자미두수, 숙요점을 한곳에서 살피며 오늘의 흐름을 부드럽게 열어 줍니다.
          </p>
          <div className={styles.ctaRow}>
            <Link className={`${styles.ctaButton} ${styles.ctaPrimary}`} href="/#inputPage">
              무료 운세 시작
            </Link>
            <Link className={`${styles.ctaButton} ${styles.ctaSecondary}`} href="/manse">
              꿀꿀 만세력 보기
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="꿀꿀 운세 주요 서비스">
          <div className={styles.serviceGrid}>
            {SERVICES.map((service) => (
              <Link key={service.href} href={service.href} className={styles.serviceCard}>
                <span className={styles.serviceMeta}>꿀꿀 운세</span>
                <strong>{service.title}</strong>
                <span>{service.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionBand} aria-labelledby="brandHistoryHeading">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Brand Story</p>
          <h2 id="brandHistoryHeading" className={styles.sectionTitle}>꿀꿀 만세력에서 꿀꿀 운세로</h2>
          <p className={styles.sectionLead}>
            처음에는 사주와 만세력의 기본 흐름을 쉽게 펼치는 이름으로 시작했습니다.
            이제는 타로, 궁합, 자미두수, 숙요점까지 이어지며 한 사람의 하루와 관계, 선택의 기운을 함께 비춥니다.
          </p>
        </div>
      </section>

      <section className={`${styles.sectionBand} ${styles.refundSection}`} aria-labelledby="faqHeading">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>FAQ</p>
          <h2 id="faqHeading" className={styles.sectionTitle}>꿀꿀 운세 자주 묻는 질문</h2>
        </div>
        <div className={styles.refundGrid}>
          {FAQS.map((item) => (
            <article key={item.question} className={styles.refundCard}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </main>
  );
}
