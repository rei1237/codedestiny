import PublicRecordLink from '../components/PublicRecordLink';
import { brandCopy } from '../../lib/seo/brand-copy.mjs';
import { PRESS_COVERAGE } from "../../lib/seo/press-coverage.mjs";
import PressCoverage from "../components/PressCoverage";
import Link from "next/link";
import styles from "../home-cosmic.module.css";
import { BRAND_FACTS } from "../../lib/brand/brand-facts.mjs";
import { founder } from "../../lib/brand/founder";
import { BUSINESS_IDENTITY } from "../../lib/site-policy-config";
import { serializeJsonLd } from "../../lib/seo/json-ld.mjs";

const PAGE_URL = "https://code-destiny.com/kkul-kkul-unse/";
const OG_IMAGE = "https://code-destiny.com/og/code-destiny-og-vvip.png?v=42dedf5c85";

// 공식 대표 홈은 `/`, 상담 앱 입구는 /ggulggul/ 이다(2026-10-15). 이 페이지는 공식 주소·표기·운영자·이력을
// 안내한다. 기존 검색·공유 링크를 위해 경로를 유지한다. 제목은 "안내" 성격으로 둬서 대표 홈과 같은 쿼리를 두고
// 다투지 않게 한다(lib/seo/entity-registry.mjs 의 /kkul-kkul-unse 프로필과 같은 제목).
const { service, operator, characters, historyKo } = BRAND_FACTS;
const JOINED_ALIAS = service.alternateNames[0];
const APP_ENTRY_URL = `${service.siteUrl}${service.appEntryPath}`;

const SEO = {
  title: `${service.name} 공식 사이트·서비스 이용 안내`,
  description: `${service.name}의 공식 주소와 표기, 운영자 ${operator.name}, 꽃돼지 연이·영냥이의 관계와 이용 방법을 안내합니다.`,
  ogTitle: `${service.name} 공식 사이트 안내`,
  ogDescription: `${service.name} 공식 홈페이지는 ${service.homeUrl}입니다. 표기와 운영자, 이용 방법, 문의·환불 경로를 한곳에서 확인하세요.`,
};

const FUSION_FORTUNE_SUMMARY =
  "초융합 운세는 사주, 자미두수, 숙요점, 베다 점성술(Jyotish), 서양 점성술, 타로처럼 서로 다른 체계의 관점을 AI가 교차해 하나의 자기성찰 리포트로 정리하는 꿀꿀 운세의 대표 해석 방법론입니다.";

const SERVICES = [
  {
    href: "/manse",
    title: "만세력으로 내 사주 보기",
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

const OFFICIAL_FACTS = [
  ["공식 서비스명", service.name],
  ["붙여 쓴 표기", `${JOINED_ALIAS} (같은 서비스)`],
  ["공식 홈페이지", service.homeUrl],
  ["상담 앱 입구", APP_ENTRY_URL],
  ["운영", `${operator.name} (${operator.nameKo})`],
  ["등록 상호", BUSINESS_IDENTITY.companyName],
];

// 답은 brand-facts·founder·사업자 정보에서 만든다. 가격은 결제 화면이 정본이라 금액을 적지 않는다.
// 이력 문항의 계정·구매 내역 문장은 개명이 경로·저장 키·로그인 식별자를 바꾸지 않았기 때문에 쓸 수 있다 —
// 그 전제가 바뀌면 이 답도 함께 고친다.
const FAQS = [
  {
    question: `${service.name} 공식 사이트는 어디인가요?`,
    answer: brandCopy('officialSiteAnswer'),
  },
  {
    question: `${JOINED_ALIAS}와 ${service.name}는 같은 서비스인가요?`,
    answer: `네. 공식 서비스명은 ${service.name}이고, 붙여 쓴 ${JOINED_ALIAS}는 같은 서비스의 다른 표기입니다. 주소와 로그인 계정, 구매 내역은 표기와 관계없이 같습니다.`,
  },
  {
    question: "사주 달빛 정원이나 꿀꿀 사주가 이름을 바꾼 서비스인가요?",
    answer: `${historyKo} 주소(code-destiny.com)와 로그인 계정은 그대로이고, 이전에 구매한 내역과 저장된 결과도 같은 계정에서 다시 볼 수 있습니다.`,
    history: true,
  },
  {
    question: `${operator.name}와 ${service.name}는 어떤 관계인가요?`,
    answer: `${operator.name}(${operator.nameKo})는 ${service.name}를 운영하는 사업자입니다. ${service.name}는 서비스 이름이고, 등록 상호는 ${BUSINESS_IDENTITY.companyName}, 대표는 ${BUSINESS_IDENTITY.representative}입니다.`,
    links: [["/about/", "운영자·사업자 정보"]],
  },
  {
    question: "영냥이는 별도 서비스인가요?",
    answer: `영냥이는 같은 운영자가 제공하는 사주보는 고양이 상담 서비스로, ${service.siteUrl}/yeongnyangi/에서 시작합니다. ${service.name}와 같은 계정으로 로그인하고, 영냥이 상담 기록은 영냥이 상담 기록 페이지에서 다시 볼 수 있습니다.`,
    links: [["/yeongnyangi/", "영냥이 상담 시작"]],
  },
  {
    question: "무료인가요, 유료인가요?",
    answer: "사주·타로·오늘의 운세 같은 기본 기능은 무료로 시작할 수 있습니다. 심층 리포트와 영냥이 상담 같은 유료 상품은 상품별 원화 단건 결제나 이용권으로 이용하며, 가격은 결제 전에 결제 화면에 표시되는 금액이 기준입니다.",
  },
  {
    question: "사람이 상담하나요, AI가 답하나요?",
    answer: `${founder.method} 결과는 자기 이해를 돕는 참고 해석이며, 의료·법률·투자 판단을 대신하지 않습니다.`,
  },
  {
    question: "태어난 시간을 모르면 볼 수 없나요?",
    answer: "출생 시간을 모르면 비워 두고 볼 수 있습니다. 이때는 연·월·일을 기준으로 해석하고, 시주처럼 태어난 시간으로 정해지는 항목은 빼거나 확인할 수 없는 부분으로 남깁니다. 자미두수처럼 시간 비중이 큰 체계는 정확도가 낮아질 수 있으니 임의의 시각을 넣지 않는 편이 정확합니다.",
  },
  {
    question: "결제한 결과는 어디에서 다시 보나요?",
    answer: "결제한 계정으로 로그인하면 꿀꿀 운세 결과는 나의 기록 보관함(/records/)에서, 영냥이 상담은 영냥이 상담 기록(/yeongnyangi/library/)에서 다시 열 수 있습니다.",
    links: [["/records/", "나의 기록 보관함"], ["/yeongnyangi/library/", "영냥이 상담 기록"]],
  },
  {
    question: "문의, 환불, 오류 신고는 어디로 하나요?",
    answer: `문의와 오류 신고는 문의 페이지(/contact/)나 ${BUSINESS_IDENTITY.email}로 보내 주세요. 환불 기준과 절차는 교환/환불 정책(/refund-policy/)에서 확인할 수 있습니다.`,
    links: [["/contact/", "문의하기"], ["/refund-policy/", "교환/환불 정책"]],
  },
];

// 리치결과를 기대하지 않는 의미 마크업이다. 화면에 보이는 문항과 같은 내용만 담는다.
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
  citation: PRESS_COVERAGE.url,
  description: SEO.description,
  inLanguage: "ko-KR",
  isPartOf: {
    "@type": "WebSite",
    "@id": `${service.siteUrl}/#website`,
    // 🔴 같은 @id 의 WebSite 다. 이름은 lib/brand/brand-facts.mjs 의 서비스명과 같아야 한다.
    name: service.name,
    url: service.homeUrl,
  },
  about: {
    "@id": `${service.siteUrl}/#organization`,
  },
};

export const metadata = {
  metadataBase: new URL(service.siteUrl),
  title: { absolute: SEO.title },
  description: SEO.description,
  keywords: [
    service.name,
    ...service.alternateNames,
    `${service.name} 공식 사이트`,
    operator.nameKo,
    "꽃돼지 운세",
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
    siteName: service.name,
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
          <p className={styles.heroKicker}>{service.name}</p>
          <h1 id="kkulKkulUnseTitle" className={styles.heroTitle}>{service.name} 공식 사이트 안내</h1>
          <p className={styles.heroLead}>
            {service.name}의 공식 홈페이지는 {service.homeUrl}입니다. {service.summary}이며, 붙여 쓴 {JOINED_ALIAS}도 같은 서비스입니다.
            공식 주소와 표기, 운영자, 이용 방법을 이 페이지에서 확인하세요.
          </p>
          <div className={styles.ctaRow}>
            <a className={`${styles.ctaButton} ${styles.ctaPrimary}`} href="/">
              {service.name} 공식 홈
            </a>
            <Link className={`${styles.ctaButton} ${styles.ctaSecondary}`} href={service.appEntryPath}>
              {brandCopy('ggulggulLink')}
            </Link>
            <Link className={`${styles.ctaButton} ${styles.ctaSecondary}`} href="/yeongnyangi/">
              {brandCopy('yeongnyangiLink')}
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label={`${service.name} 주요 서비스`}>
          <div className={styles.serviceGrid}>
            {SERVICES.map((item) => (
              <Link key={item.href} href={item.href} className={styles.serviceCard}>
                <span className={styles.serviceMeta}>{service.name}</span>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionBand} aria-labelledby="officialFactsHeading">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Official</p>
          <h2 id="officialFactsHeading" className={styles.sectionTitle}>공식 주소와 표기</h2>
        </div>
        <div className={styles.refundGrid}>
          {OFFICIAL_FACTS.map(([label, value]) => (
            <article key={label} className={styles.refundCard}>
              <h3>{label}</h3>
              <p>{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sectionBand} aria-labelledby="characterBrandHeading">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Characters</p>
          <h2 id="characterBrandHeading" className={styles.sectionTitle}>꽃돼지 연이·네오·영냥이</h2>
          <ul className={styles.sectionLead}>
            {characters.map((character) => (
              <li key={character.key}>
                <strong>{character.serviceName ?? character.name}</strong> — {character.role}
                {character.path ? <> (<Link href={character.path}>{service.siteUrl}{character.path}</Link>)</> : null}
              </li>
            ))}
          </ul>
          <p className={styles.sectionLead}>
            꽃돼지 운세로 기억하셨다면 꽃돼지 연이가 안내하는 {service.name}가 맞습니다. 영냥이 상담 가격은{" "}
            <Link href="/yeongnyangi/#yn-prices">운세보는 영냥이 안내</Link>에서 볼 수 있습니다.
          </p>
        </div>
      </section>

      <section className={styles.sectionBand} aria-labelledby="brandHistoryHeading" data-brand-history="">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>History</p>
          <h2 id="brandHistoryHeading" className={styles.sectionTitle}>이전 이름 안내</h2>
          <p className={styles.sectionLead}>{historyKo}</p>
          <p className={styles.sectionLead}>
            이전 이름으로 된 검색 결과나 게시물을 보셨다면 같은 서비스입니다. 이용은 공식 홈페이지 {service.homeUrl}에서 하시면 됩니다.
          </p>
        </div>
      </section>

      <PublicRecordLink />
      <PressCoverage />

      <section className={styles.sectionBand} aria-labelledby="fusionFortuneHeading">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Fusion Fortune</p>
          <h2 id="fusionFortuneHeading" className={styles.sectionTitle}>{service.name}의 초융합 운세</h2>
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
          <h2 id="faqHeading" className={styles.sectionTitle}>{service.name} 자주 묻는 질문</h2>
        </div>
        <div className={styles.refundGrid}>
          {FAQS.map((item) => (
            <article key={item.question} className={styles.refundCard} data-brand-history={item.history ? "" : undefined}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
              {item.links ? (
                <p>
                  {item.links.map(([href, label], index) => (
                    <span key={href}>
                      {index ? " · " : null}
                      <Link href={href}>{label}</Link>
                    </span>
                  ))}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />
    </main>
  );
}
