import Link from "next/link";
import styles from "../home-cosmic.module.css";
import { siteSeo } from "../../lib/seo/siteSeo";

const PAGE_URL = "https://code-destiny.com/kkul-kkul-unse";
const OG_IMAGE = "https://code-destiny.com/og/code-destiny-og-vvip.png?v=d50dc254ba";

// 브랜드 별칭의 대표 URL 은 홈 "/" 이고 이 페이지는 그 관계를 설명하는 보조 안내다.
// 그래서 제목도 브랜드 헤드텀 단독이 아니라 "안내" 성격의 질문형으로 둔다 —
// 홈과 같은 쿼리를 두고 다투면 둘 다 밀린다.
const SEO = {
  title: "꿀꿀 운세는 어떤 서비스인가요 | Code Destiny 브랜드 안내",
  description:
    "꿀꿀운세와 꽃돼지 운세로 기억하는 Code Destiny를 소개합니다. 사주, 만세력, 자미두수, 숙요점, 베다 점성술, 타로와 AI 상담을 질문에 맞게 연결합니다.",
  ogTitle: "꿀꿀 운세는 어떤 서비스인가요 | Code Destiny 브랜드 안내",
  ogDescription:
    "꿀꿀운세와 꽃돼지 캐릭터로 기억하는 Code Destiny의 사주·만세력·점성술·AI 상담 서비스를 소개합니다.",
};

const BRAND_ALIAS_SENTENCE =
  "CODE DESTINY는 CodeDestiny, code-destiny, 코드데스티니, 코드 데스티니, CODEDESTINY로도 표기되는 같은 공식 서비스입니다.";

const FUSION_FORTUNE_SUMMARY =
  "초융합 운세는 사주, 자미두수, 숙요점, 베다 점성술(Jyotish), 서양 점성술, 타로처럼 서로 다른 체계의 관점을 AI가 교차해 하나의 자기성찰 리포트로 정리하는 CODE DESTINY의 대표 해석 방법론입니다.";

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
  {
    href: "/sukuyo",
    title: "숙요점",
    description: "태어난 날 달이 머문 27수로 본명숙과 두 사람 사이 인연의 거리를 읽습니다.",
  },
  {
    href: "/astrology",
    title: "점성술",
    description: "출생차트의 태양·달·상승궁으로 별자리 운세와 관계의 리듬을 살핍니다.",
  },
  {
    href: "/vedic",
    title: "베다 점성술",
    description: "인도 조티쉬의 라그나와 다샤 흐름으로 지금 지나는 시기의 주제를 봅니다.",
  },
  {
    href: "/fusion-fortune",
    title: "초융합 운세",
    description: "여섯 운세 체계의 관점을 AI가 교차해 하나의 자기성찰 리포트로 정리합니다.",
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
  {
    question: "꿀꿀 운세에서 어떤 운세를 볼 수 있나요?",
    answer:
      "사주팔자와 만세력, 타로, 궁합, 자미두수, 숙요점, 점성술, 베다 점성술, 꿈해몽을 봅니다. 생년월일 하나면 대부분의 기본 해석을 무료로 확인할 수 있습니다.",
  },
  {
    question: "코드 데스티니와 꿀꿀 운세는 같은 곳인가요?",
    answer:
      "같은 곳입니다. 코드 데스티니(Code Destiny)가 플랫폼 이름이고 꿀꿀 운세는 그 한국어 서비스명입니다. 주소는 code-destiny.com 하나입니다.",
  },
  {
    question: "꽃돼지 운세 또는 꿀꿀만세력으로 찾은 서비스도 같은 곳인가요?",
    answer:
      "네. 꽃돼지 캐릭터로 기억하는 꽃돼지 운세와 꿀꿀운세, 꿀꿀만세력은 Code Destiny 안에서 이어지는 브랜드 표현입니다. 찾는 서비스에 맞는 사주, 만세력, 자미두수, 숙요점, 베다점, 점성술 페이지로 이동해 보세요.",
  },
  {
    question: "CodeDestiny와 CODE DESTINY는 어떤 관계인가요?",
    answer: BRAND_ALIAS_SENTENCE,
  },
  {
    question: "초융합 운세란 무엇인가요?",
    answer: FUSION_FORTUNE_SUMMARY,
  },
  {
    question: "사주와 자미두수를 함께 보는 AI 운세는 어떻게 활용하나요?",
    answer:
      "한 체계의 결과를 정답으로 단정하지 않고, 사주의 기질과 자미두수의 삶의 영역처럼 서로 다른 관점에서 반복되는 신호를 비교해 현재의 선택과 관계를 정리하는 참고 정보로 활용합니다.",
  },
  {
    question: "초융합 운세에는 어떤 해석 체계가 연결되나요?",
    answer:
      "사주, 자미두수, 숙요점, 베다 점성술, 서양 점성술, 타로를 중심으로 질문의 성격에 맞는 해석 관점을 연결합니다. 체계마다 보는 기준이 다르므로 같은 말로 섞어 설명하지 않습니다.",
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
    "@id": "https://code-destiny.com/#website",
    // 🔴 같은 @id 의 WebSite 다. lib/seo/siteSeo.ts 의 brandName 과 같아야 한다.
    name: "꿀꿀 운세",
    url: "https://code-destiny.com",
  },
  about: {
    "@id": "https://code-destiny.com/#organization",
  },
};

export const metadata = {
  metadataBase: new URL("https://code-destiny.com"),
  title: { absolute: SEO.title },
  description: SEO.description,
  keywords: [
    "꿀꿀운세",
    "꿀꿀 만세력",
    "꽃돼지 운세",
    "코드데스티니",
  ],
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
    siteName: siteSeo.brandName,
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
          {/* 브랜드 앵커("꿀꿀 운세")는 홈으로만 보낸다. 같은 앵커로 /manse 를 가리키면
              브랜드 쿼리에서 만세력 페이지가 홈을 밀어내는 지금 상태가 유지된다. */}
          <div className={styles.ctaRow}>
            <Link className={`${styles.ctaButton} ${styles.ctaPrimary}`} href="/">
              꿀꿀 운세 홈에서 무료로 시작
            </Link>
            <Link className={`${styles.ctaButton} ${styles.ctaSecondary}`} href="/manse">
              만세력 사주 보기
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

      <section className={styles.sectionBand} aria-labelledby="characterBrandHeading">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Brand Identity</p>
          <h2 id="characterBrandHeading" className={styles.sectionTitle}>꽃돼지로 기억하는 꿀꿀 운세</h2>
          <p className={styles.sectionLead}>
            꽃돼지 운세 사이트를 찾았다면 Code Destiny의 꿀꿀운세가 맞습니다. 꽃돼지라는 캐릭터로 기억하는 분들을 위해
            사주, 만세력, 자미두수, 숙요점, 베다 점성술, 점성술과 AI 상담을 하나의 브랜드 안에서 이어 두었습니다.
          </p>
          <p className={styles.sectionLead}>
            꿀꿀 사주나 꿀꿀만세력으로 찾은 경우에도 질문에 맞는 해석 페이지를 선택할 수 있습니다. {BRAND_ALIAS_SENTENCE}
          </p>
        </div>
      </section>

      <section className={styles.sectionBand} aria-labelledby="fusionFortuneHeading">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Fusion Fortune</p>
          <h2 id="fusionFortuneHeading" className={styles.sectionTitle}>CODE DESTINY의 초융합 운세</h2>
          <p className={styles.sectionLead}>{FUSION_FORTUNE_SUMMARY}</p>
          <p className={styles.sectionLead}>
            사주와 자미두수를 함께 보는 운세, 사주와 숙요점을 같이 보는 AI, 베다점과 점성술을 동시에 보는 운세처럼
            질문에 맞는 해석 축을 비교합니다. 결과는 미래를 확정하는 답이 아니라, 반복되는 패턴과 다음 선택을 더 명확히
            살피기 위한 운세 통합 분석으로 제공합니다.
          </p>
          <Link href="/fusion-fortune" className={`${styles.ctaButton} ${styles.ctaPrimary}`}>초융합 운세 자세히 보기</Link>
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
